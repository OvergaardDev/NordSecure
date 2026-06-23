import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/email', () => ({
  sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
}))

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db'
}

import { prisma } from '../src/lib/prisma'
import { createReservation, confirmPayment } from '../src/server/checkout/service'
import { markCryptoPaymentPaid } from '../src/lib/simulatedCryptoPayments'
import { RouteError } from '../src/server/routeErrors'

const TEST_EMAIL_DOMAIN = '@itest.local'
const TEST_SKU_PREFIX = 'it-checkout-'
const TEST_COUPON_PREFIX = 'ITEST_'

async function resetCheckoutTestData() {
  const testOrders = await prisma.order.findMany({
    where: { customerEmail: { endsWith: TEST_EMAIL_DOMAIN } },
    select: { id: true },
  })
  const testOrderIds = testOrders.map((order) => order.id)

  if (testOrderIds.length > 0) {
    await prisma.orderItem.deleteMany({ where: { orderId: { in: testOrderIds } } })
    await prisma.order.deleteMany({ where: { id: { in: testOrderIds } } })
  }

  await prisma.reservation.deleteMany({
    where: {
      OR: [
        { sessionId: { startsWith: TEST_SKU_PREFIX } },
        { productSku: { startsWith: TEST_SKU_PREFIX } },
      ],
    },
  })
  await prisma.coupon.deleteMany({ where: { code: { startsWith: TEST_COUPON_PREFIX } } })
  await prisma.product.deleteMany({ where: { sku: { startsWith: TEST_SKU_PREFIX } } })
}

describe.sequential('Checkout flow integration', () => {
  beforeAll(() => {
    process.env.PAYMENT_MODE = 'demo'
  })

  beforeEach(async () => {
    await resetCheckoutTestData()
  })

  it('creates and confirms a quantity > 1 reservation with correct persisted order lines', async () => {
    const product = await prisma.product.create({
      data: {
        sku: `${TEST_SKU_PREFIX}qty2`,
        name: 'Integration Quantity Product',
        description: 'Integration test product',
        standardPrice: 800,
        standardStock: 20,
        maxPerOrder: 3,
        isActive: true,
      },
    })

    const reservationResult = await createReservation({
      productSku: product.sku,
      quantity: 2,
      customerName: 'Test Buyer',
      customerEmail: `buyer${TEST_EMAIL_DOMAIN}`,
      country: 'DE',
      shippingPhone: '+49123456789',
      shippingAddressLine1: 'Integrationstrasse 1',
      shippingCity: 'Berlin',
      shippingPostalCode: '10115',
      paymentMethod: 'crypto',
      paymentAsset: 'btc',
      sessionId: `${TEST_SKU_PREFIX}session-qty-two`,
    })

    markCryptoPaymentPaid(reservationResult.payment.id)

    const confirmResult = await confirmPayment({
      reservationId: reservationResult.reservationId,
      paymentId: reservationResult.payment.id,
      customerName: 'Test Buyer',
      customerEmail: `buyer${TEST_EMAIL_DOMAIN}`,
      country: 'DE',
      shippingPhone: '+49123456789',
      shippingCompany: 'Acme GmbH',
      shippingAddressLine1: 'Integrationstrasse 1',
      shippingAddressLine2: 'Floor 2',
      shippingCity: 'Berlin',
      shippingRegion: 'BE',
      shippingPostalCode: '10115',
      deliveryInstructions: 'Leave at front desk',
      recipientTaxId: 'DE123456789',
    })

    expect('ok' in confirmResult && confirmResult.ok).toBe(true)
    if (!('ok' in confirmResult) || !confirmResult.ok) {
      throw new Error('Expected paid checkout confirmation to succeed')
    }

    const order = await prisma.order.findUnique({
      where: { id: confirmResult.orderId },
      include: { items: true },
    })

    expect(order).not.toBeNull()
    expect(order?.totalAmount).toBe(reservationResult.lockedPrice)
    expect(order?.items).toHaveLength(2)
    expect(order?.items.every((item) => item.quantity === 1)).toBe(true)
    expect(order?.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)).toBe(
      reservationResult.lockedPrice
    )

    const reservationLeft = await prisma.reservation.findUnique({
      where: { id: reservationResult.reservationId },
    })
    expect(reservationLeft).toBeNull()
  })

  it('allows only one confirm when two payments race for a maxUses=1 coupon', async () => {
    const product = await prisma.product.create({
      data: {
        sku: `${TEST_SKU_PREFIX}coupon-race`,
        name: 'Coupon Race Product',
        description: 'Race test product',
        standardPrice: 800,
        standardStock: 20,
        maxPerOrder: 1,
        isActive: true,
      },
    })

    await prisma.coupon.create({
      data: {
        code: `${TEST_COUPON_PREFIX}ONEUSE`,
        discountType: 'fixed',
        discountValue: 20,
        maxUses: 1,
        usedCount: 0,
        active: true,
      },
    })

    const firstReservation = await createReservation({
      productSku: product.sku,
      quantity: 1,
      customerName: 'Buyer One',
      customerEmail: `one${TEST_EMAIL_DOMAIN}`,
      country: 'DK',
      shippingPhone: '+4511111111',
      shippingAddressLine1: 'Road 1',
      shippingCity: 'Copenhagen',
      shippingPostalCode: '2100',
      paymentMethod: 'crypto',
      paymentAsset: 'btc',
      couponCode: `${TEST_COUPON_PREFIX}ONEUSE`,
      sessionId: `${TEST_SKU_PREFIX}session-one`,
    })

    const secondReservation = await createReservation({
      productSku: product.sku,
      quantity: 1,
      customerName: 'Buyer Two',
      customerEmail: `two${TEST_EMAIL_DOMAIN}`,
      country: 'DK',
      shippingPhone: '+4522222222',
      shippingAddressLine1: 'Road 2',
      shippingCity: 'Copenhagen',
      shippingPostalCode: '2200',
      paymentMethod: 'crypto',
      paymentAsset: 'btc',
      couponCode: `${TEST_COUPON_PREFIX}ONEUSE`,
      sessionId: `${TEST_SKU_PREFIX}session-two`,
    })

    markCryptoPaymentPaid(firstReservation.payment.id)
    markCryptoPaymentPaid(secondReservation.payment.id)

    const [firstResult, secondResult] = await Promise.allSettled([
      confirmPayment({
        reservationId: firstReservation.reservationId,
        paymentId: firstReservation.payment.id,
        customerName: 'Buyer One',
        customerEmail: `one${TEST_EMAIL_DOMAIN}`,
        country: 'DK',
        shippingPhone: '+4511111111',
        shippingAddressLine1: 'Road 1',
        shippingCity: 'Copenhagen',
        shippingPostalCode: '2100',
      }),
      confirmPayment({
        reservationId: secondReservation.reservationId,
        paymentId: secondReservation.payment.id,
        customerName: 'Buyer Two',
        customerEmail: `two${TEST_EMAIL_DOMAIN}`,
        country: 'DK',
        shippingPhone: '+4522222222',
        shippingAddressLine1: 'Road 2',
        shippingCity: 'Copenhagen',
        shippingPostalCode: '2200',
      }),
    ])

    const settled = [firstResult, secondResult]
    const fulfilled = settled.filter((result) => result.status === 'fulfilled')
    const rejected = settled.filter((result) => result.status === 'rejected')

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)

    const rejection = rejected[0]
    if (rejection.status !== 'rejected') {
      throw new Error('Expected one confirmation rejection')
    }

    if (rejection.reason instanceof RouteError) {
      expect(rejection.reason.code).toBe('coupon_max_uses_reached')
    } else {
      const reasonMessage = String((rejection.reason as { message?: string })?.message || '')
      const normalizedReason = reasonMessage.toLowerCase()
      const sqliteContentionHints = ['transaction', 'timed out during query execution', 'connectionerror']
      expect(sqliteContentionHints.some((hint) => normalizedReason.includes(hint))).toBe(true)
    }

    const coupon = await prisma.coupon.findUnique({ where: { code: `${TEST_COUPON_PREFIX}ONEUSE` } })
    expect(coupon?.usedCount).toBe(1)

    const paidOrders = await prisma.order.count({
      where: {
        couponCode: `${TEST_COUPON_PREFIX}ONEUSE`,
        status: 'paid',
      },
    })
    expect(paidOrders).toBe(1)
  })
})