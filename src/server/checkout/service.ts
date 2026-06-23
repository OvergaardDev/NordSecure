import { prisma } from '@/src/lib/prisma'
import { priceForOrder } from '@/src/lib/campaign'
import { getCryptoProvider, getStripeProvider, isLivePaymentMode } from '@/src/lib/paymentProvider'
import { includeTestOrdersForStorefront, soldCountWhere } from '@/src/lib/sales'
import { validateCouponForAmount } from '@/src/lib/coupons'
import { calculateShippingCost, normalizeCountryCode } from '@/src/lib/shipping'
import { isCryptoPaymentPaid } from '@/src/lib/simulatedCryptoPayments'
import { sendOrderConfirmation } from '@/src/lib/email'
import { RouteError, requireRecord } from '@/src/server/routeErrors'

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

function getStringField(body: Record<string, unknown>, key: string, options?: { required?: boolean }) {
  const raw = body[key]
  const value = typeof raw === 'string' ? raw.trim() : ''

  if (options?.required && !value) {
    throw new RouteError(400, 'invalid_input', { field: key })
  }

  return value
}

function getOptionalStringField(body: Record<string, unknown>, key: string) {
  const value = getStringField(body, key)
  return value || undefined
}

function getPositiveIntegerField(body: Record<string, unknown>, key: string, defaultValue?: number) {
  const raw = body[key]
  if ((raw == null || raw === '') && defaultValue != null) return defaultValue

  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new RouteError(400, 'invalid_input', { field: key })
  }

  return value
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

function paymentMatchesReservation(
  reservation: { id: number; lockedPrice: number; paymentId: string | null },
  verified: { amount: number; currency: string; meta?: Record<string, unknown> } | null
) {
  if (!verified) return false

  const amountMatches = Math.abs(Number(verified.amount || 0) - Number(reservation.lockedPrice)) < 0.01
  const currencyMatches = String(verified.currency || '').toUpperCase() === 'EUR'
  const verifiedReservationId = String(verified.meta?.reservationId || '')
  const reservationIdMatches = !verifiedReservationId || verifiedReservationId === String(reservation.id)

  return amountMatches && currencyMatches && reservationIdMatches
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
  const soldCount = await prisma.order.count({
    where: soldCountWhere(includeTestOrdersForStorefront()),
  })
  const reservedIndex = soldCount
  const baseLockedPrice = priceForOrder(reservedIndex)

  let appliedCouponCode: string | null = null
  let discountAmount = 0
  let productTotal = baseLockedPrice

  if (command.couponCode) {
    const couponCheck = await validateCouponForAmount(command.couponCode, baseLockedPrice)
    if (!couponCheck.ok) {
      throw new RouteError(400, 'invalid_coupon', { reason: couponCheck.reason })
    }
    appliedCouponCode = couponCheck.code || null
    discountAmount = couponCheck.discountAmount || 0
    productTotal = couponCheck.finalAmount || baseLockedPrice
  }

  const normalizedCountry = normalizeCountryCode(command.country)
  const shippingCost = calculateShippingCost(normalizedCountry)
  const lockedPrice = productTotal + shippingCost

  const product = await prisma.product.findUnique({ where: { sku: command.productSku } })
  if (!product) throw new RouteError(404, 'product_not_found')
  if (!product.isActive) throw new RouteError(409, 'product_inactive')
  if (command.quantity > product.maxPerOrder) throw new RouteError(400, 'invalid_quantity')
  if (soldCount + command.quantity > product.standardStock) throw new RouteError(409, 'out_of_stock')

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  const reservation = await prisma.reservation.create({
    data: {
      productSku: command.productSku,
      paymentMethod: command.paymentMethod,
      paymentAsset: command.paymentAsset || '',
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
          productTotal,
        })

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { paymentId: payment.id },
    })

    return {
      reservationId: reservation.id,
      lockedPrice,
      productTotal,
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
  if (reservation.expiresAt.getTime() < Date.now()) {
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
    const soldCount = await tx.order.count({
      where: soldCountWhere(includeTestOrdersForStorefront()),
    })
    if (soldCount > reservation.reservedIndex) {
      return { error: 'price_changed', newSoldCount: soldCount }
    }

    const order = await tx.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
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
          create: {
            productId: reservation.productId,
            quantity: reservation.quantity,
            unitPrice: reservation.lockedPrice,
          },
        },
      },
      include: { items: true },
    })

    if (reservation.couponCode) {
      await tx.coupon.update({
        where: { code: reservation.couponCode },
        data: { usedCount: { increment: 1 } },
      })
    }

    await tx.reservation.delete({ where: { id: reservation.id } })

    return { ok: true as const, orderId: order.id, orderNumber: order.orderNumber, totalAmount: order.totalAmount }
  })

  if ('ok' in result && result.ok && product) {
    await sendOrderConfirmation(command.customerEmail, result.orderNumber, result.totalAmount, !liveMode, {
      customerName: command.customerName,
      items: [
        {
          productName: product.name,
          quantity: reservation.quantity,
          unitPrice: result.totalAmount,
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