import { prisma } from '@/src/lib/prisma'
import { getCryptoProvider, getStripeProvider, isLivePaymentMode } from '@/src/lib/paymentProvider'
import { includeTestOrdersForStorefront, soldCountWhere } from '@/src/lib/sales'
import { validateCouponForAmount } from '@/src/lib/coupons'
import { calculateShippingCost, normalizeCountryCode } from '@/src/lib/shipping'
import { isCryptoPaymentPaid } from '@/src/lib/simulatedCryptoPayments'
import { sendOrderConfirmation } from '@/src/lib/email'
import { RouteError } from '@/src/server/routeErrors'
import {
  getOptionalStringField,
  getPositiveIntegerField,
  getStringField,
  requireRecord,
} from '@/src/server/input'
import { buildOrderItemLines, calculateReservedProductSubtotal } from '@/src/server/checkout/pricing'
import { createOrderWithGeneratedNumber } from '@/src/server/checkout/orderNumbers'
import { isReservationExpired, paymentMatchesReservation } from '@/src/server/checkout/invariants'

const CRYPTO_ASSETS = new Set(['btc'])

export type CreateReservationCommand = {
  productSku: string
  quantity: number
  customerName: string
  customerEmail: string
  country: string
  shippingPhone: string
  shippingAddressLine1: string
  shippingCity: string
  shippingPostalCode: string
  paymentMethod: 'crypto' | 'stripe'
  paymentAsset?: string
  couponCode?: string
  sessionId?: string
}

export type ConfirmPaymentCommand = {
  reservationId: number
  paymentId: string
  customerName: string
  customerEmail: string
  country: string
  shippingPhone: string
  shippingCompany?: string
  shippingAddressLine1: string
  shippingAddressLine2?: string
  shippingCity: string
  shippingRegion?: string
  shippingPostalCode: string
  deliveryInstructions?: string
  recipientTaxId?: string
}

function mapProviderError(error: unknown): never {
  if (error instanceof Error && error.message === 'btcpay_not_configured') {
    throw new RouteError(500, 'live_crypto_not_configured')
  }
  if (error instanceof Error && error.message === 'stripe_not_configured') {
    throw new RouteError(500, 'live_stripe_not_configured')
  }

  throw new RouteError(500, 'payment_provider_error')
}

export function parseCreateReservationCommand(payload: unknown): CreateReservationCommand {
  const body = requireRecord(payload)
  const paymentMethod = getStringField(body, 'paymentMethod', { required: true })

  if (paymentMethod !== 'crypto' && paymentMethod !== 'stripe') {
    throw new RouteError(400, 'invalid_payment_method')
  }

  const paymentAsset = getOptionalStringField(body, 'paymentAsset')?.toLowerCase()
  if (paymentMethod === 'crypto' && (!paymentAsset || !CRYPTO_ASSETS.has(paymentAsset))) {
    throw new RouteError(400, 'invalid_crypto_asset')
  }

  return {
    productSku: getStringField(body, 'productSku', { required: true }),
    quantity: getPositiveIntegerField(body, 'quantity', 1),
    customerName: getStringField(body, 'customerName', { required: true }),
    customerEmail: getStringField(body, 'customerEmail', { required: true }),
    country: getStringField(body, 'country', { required: true }),
    shippingPhone: getStringField(body, 'shippingPhone', { required: true }),
    shippingAddressLine1: getStringField(body, 'shippingAddressLine1', { required: true }),
    shippingCity: getStringField(body, 'shippingCity', { required: true }),
    shippingPostalCode: getStringField(body, 'shippingPostalCode', { required: true }),
    paymentMethod,
    paymentAsset,
    couponCode: getOptionalStringField(body, 'couponCode'),
    sessionId: getOptionalStringField(body, 'sessionId'),
  }
}

export function parseConfirmPaymentCommand(payload: unknown): ConfirmPaymentCommand {
  const body = requireRecord(payload)

  return {
    reservationId: getPositiveIntegerField(body, 'reservationId'),
    paymentId: getStringField(body, 'paymentId', { required: true }),
    customerName: getStringField(body, 'customerName', { required: true }),
    customerEmail: getStringField(body, 'customerEmail', { required: true }),
    country: getStringField(body, 'country', { required: true }),
    shippingPhone: getStringField(body, 'shippingPhone', { required: true }),
    shippingCompany: getOptionalStringField(body, 'shippingCompany'),
    shippingAddressLine1: getStringField(body, 'shippingAddressLine1', { required: true }),
    shippingAddressLine2: getOptionalStringField(body, 'shippingAddressLine2'),
    shippingCity: getStringField(body, 'shippingCity', { required: true }),
    shippingRegion: getOptionalStringField(body, 'shippingRegion'),
    shippingPostalCode: getStringField(body, 'shippingPostalCode', { required: true }),
    deliveryInstructions: getOptionalStringField(body, 'deliveryInstructions'),
    recipientTaxId: getOptionalStringField(body, 'recipientTaxId'),
  }
}

export async function createReservation(command: CreateReservationCommand) {
  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    await tx.reservation.deleteMany({ where: { expiresAt: { lt: now } } })

    const product = await tx.product.findUnique({ where: { sku: command.productSku } })
    if (!product) throw new RouteError(404, 'product_not_found')
    if (!product.isActive) throw new RouteError(409, 'product_inactive')
    if (command.quantity > product.maxPerOrder) throw new RouteError(400, 'invalid_quantity')

    const soldUnitsAgg = await tx.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        productId: product.id,
        order: soldCountWhere(includeTestOrdersForStorefront()),
      },
    })
    const soldUnits = soldUnitsAgg._sum.quantity ?? 0

    const reservedUnitsAgg = await tx.reservation.aggregate({
      _sum: { quantity: true },
      where: {
        productId: product.id,
        expiresAt: { gte: now },
      },
    })
    const reservedUnits = reservedUnitsAgg._sum.quantity ?? 0

    if (soldUnits + reservedUnits + command.quantity > product.standardStock) {
      throw new RouteError(409, 'out_of_stock')
    }

    const reservedIndex = soldUnits + reservedUnits
    const productSubtotal = calculateReservedProductSubtotal(reservedIndex, command.quantity)

    let appliedCouponCode: string | null = null
    let discountAmount = 0
    let discountedProductTotal = productSubtotal

    if (command.couponCode) {
      const couponCheck = await validateCouponForAmount(command.couponCode, productSubtotal)
      if (!couponCheck.ok) {
        throw new RouteError(400, 'invalid_coupon', { reason: couponCheck.reason })
      }
      appliedCouponCode = couponCheck.code || null
      discountAmount = couponCheck.discountAmount || 0
      discountedProductTotal = couponCheck.finalAmount || productSubtotal
    }

    const normalizedCountry = normalizeCountryCode(command.country)
    const shippingCost = calculateShippingCost(normalizedCountry)
    const lockedPrice = discountedProductTotal + shippingCost

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    const reservation = await tx.reservation.create({
      data: {
        productSku: command.productSku,
        paymentMethod: command.paymentMethod,
        paymentAsset: command.paymentAsset ?? null,
        paymentStatus: 'pending',
        lockedPrice,
        couponCode: appliedCouponCode,
        discountAmount,
        sessionId: command.sessionId || 'anon',
        quantity: command.quantity,
        productId: product.id,
        expiresAt,
        reservedIndex,
      },
    })

    return {
      reservation,
      lockedPrice,
      discountedProductTotal,
      shippingCost,
      normalizedCountry,
      appliedCouponCode,
      discountAmount,
    }
  })

  const { reservation, lockedPrice, discountedProductTotal, shippingCost, normalizedCountry, appliedCouponCode, discountAmount } = result

  try {
    const payment = command.paymentMethod === 'crypto'
      ? await getCryptoProvider().createPayment(lockedPrice, 'EUR', {
          reservationId: reservation.id,
          asset: command.paymentAsset,
        })
      : await getStripeProvider().createPayment(lockedPrice, 'EUR', {
          reservationId: reservation.id,
          country: normalizedCountry,
          shippingCost,
          productTotal: discountedProductTotal,
        })

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { paymentId: payment.id },
    })

    return {
      reservationId: reservation.id,
      lockedPrice,
      productTotal: discountedProductTotal,
      shippingCost,
      payment,
      coupon: appliedCouponCode
        ? {
            code: appliedCouponCode,
            discountAmount,
          }
        : null,
    }
  } catch (error) {
    await prisma.reservation.delete({ where: { id: reservation.id } }).catch(() => undefined)
    mapProviderError(error)
  }
}

export async function confirmPayment(command: ConfirmPaymentCommand) {
  const normalizedCountry = normalizeCountryCode(command.country)
  const reservation = await prisma.reservation.findUnique({ where: { id: command.reservationId } })

  if (!reservation) throw new RouteError(404, 'reservation_not_found')
  if (isReservationExpired(reservation)) {
    throw new RouteError(410, 'reservation_expired')
  }
  if (!reservation.paymentId || reservation.paymentId !== command.paymentId) {
    throw new RouteError(409, 'payment_mismatch')
  }

  let verified
  try {
    verified = reservation.paymentMethod === 'stripe'
      ? await getStripeProvider().verifyPayment(reservation.paymentId)
      : await getCryptoProvider().verifyPayment(reservation.paymentId)
  } catch (error) {
    mapProviderError(error)
  }

  if (verified && !paymentMatchesReservation(reservation, verified)) {
    throw new RouteError(409, 'payment_verification_mismatch')
  }

  const liveMode = isLivePaymentMode()
  const simulatedPaid = !liveMode && isCryptoPaymentPaid(reservation.paymentId)
  const isPaid = verified?.status === 'paid' || reservation.paymentStatus === 'paid' || simulatedPaid

  if (!isPaid) {
    return { status: 'pending' as const }
  }

  const product = await prisma.product.findUnique({ where: { id: reservation.productId } })

  const result = await prisma.$transaction(async (tx) => {
    const soldUnitsAgg = await tx.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        productId: reservation.productId,
        order: soldCountWhere(includeTestOrdersForStorefront()),
      },
    })
    const soldUnits = soldUnitsAgg._sum.quantity ?? 0
    if (soldUnits > reservation.reservedIndex) {
      return { error: 'price_changed', newSoldCount: soldUnits }
    }

    const orderItemLines = buildOrderItemLines(
      reservation.productId,
      reservation.quantity,
      reservation.lockedPrice
    )

    const order = await createOrderWithGeneratedNumber(tx, (orderNumber) => ({
      orderNumber,
      paymentMethod: reservation.paymentMethod,
      paymentAsset: reservation.paymentAsset,
      couponCode: reservation.couponCode,
      discountAmount: reservation.discountAmount,
      customerName: command.customerName,
      customerEmail: command.customerEmail,
      shippingPhone: command.shippingPhone,
      shippingCompany: command.shippingCompany,
      shippingAddressLine1: command.shippingAddressLine1,
      shippingAddressLine2: command.shippingAddressLine2,
      shippingCity: command.shippingCity,
      shippingRegion: command.shippingRegion,
      shippingPostalCode: command.shippingPostalCode,
      deliveryInstructions: command.deliveryInstructions,
      recipientTaxId: command.recipientTaxId,
      country: normalizedCountry,
      vatAmount: 0,
      totalAmount: reservation.lockedPrice,
      isTest: !liveMode,
      status: 'paid',
      items: {
        create: orderItemLines,
      },
    }))

    if (reservation.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: reservation.couponCode } })
      if (!coupon || !coupon.active) {
        throw new RouteError(409, 'coupon_max_uses_reached')
      }

      if (coupon.maxUses == null) {
        await tx.coupon.update({
          where: { code: reservation.couponCode },
          data: { usedCount: { increment: 1 } },
        })
      } else {
        const updated = await tx.coupon.updateMany({
          where: {
            code: reservation.couponCode,
            usedCount: coupon.usedCount,
          },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        })

        const newUsedCount = coupon.usedCount + 1
        if (updated.count !== 1 || newUsedCount > coupon.maxUses) {
          throw new RouteError(409, 'coupon_max_uses_reached')
        }
      }
    }

    await tx.reservation.delete({ where: { id: reservation.id } })

    return {
      ok: true as const,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      orderItemUnitPrice: order.items[0]?.unitPrice ?? reservation.lockedPrice,
      orderItemQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    }
  })

  if ('ok' in result && result.ok && product) {
    await sendOrderConfirmation(command.customerEmail, result.orderNumber, result.totalAmount, !liveMode, {
      customerName: command.customerName,
      items: [
        {
          productName: product.name,
          quantity: result.orderItemQuantity,
          unitPrice: result.orderItemUnitPrice,
        },
      ],
      paymentMethod: reservation.paymentMethod,
      shippingAddress: {
        addressLine1: command.shippingAddressLine1,
        addressLine2: command.shippingAddressLine2,
        city: command.shippingCity,
        region: command.shippingRegion || '',
        postalCode: command.shippingPostalCode,
        country: normalizedCountry,
      },
    }).catch((error) => console.error('Email send error (non-fatal):', error))
  }

  return result
}
