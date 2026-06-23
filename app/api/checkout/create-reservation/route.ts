import { NextResponse } from 'next/server'
import { prisma } from '../../../../src/lib/prisma'
import { priceForOrder } from '../../../../src/lib/campaign'
import { getCryptoProvider, getStripeProvider } from '../../../../src/lib/paymentProvider'
import { includeTestOrdersForStorefront, soldCountWhere } from '../../../../src/lib/sales'
import { validateCouponForAmount } from '@/src/lib/coupons'
import { calculateShippingCost, normalizeCountryCode } from '@/src/lib/shipping'

const CRYPTO_ASSETS = new Set(['btc'])

export async function POST(req: Request) {
  const body = await req.json()
  const {
    productSku,
    quantity = 1,
    customerName,
    customerEmail,
    country,
    shippingPhone,
    shippingAddressLine1,
    shippingCity,
    shippingPostalCode,
    paymentMethod,
    paymentAsset,
    couponCode,
  } = body

  if (!customerName || !customerEmail || !country || !shippingPhone || !shippingAddressLine1 || !shippingCity || !shippingPostalCode) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  if (paymentMethod !== 'crypto' && paymentMethod !== 'stripe') {
    return NextResponse.json({ error: 'invalid_payment_method' }, { status: 400 })
  }

  const normalizedAsset = String(paymentAsset ?? '').toLowerCase()
  if (paymentMethod === 'crypto' && !CRYPTO_ASSETS.has(normalizedAsset)) {
    return NextResponse.json({ error: 'invalid_crypto_asset' }, { status: 400 })
  }

  // compute soldCount from DB (count paid orders)
  const soldCount = await prisma.order.count({
    where: soldCountWhere(includeTestOrdersForStorefront())
  })
  const reservedIndex = soldCount
  const baseLockedPrice = priceForOrder(reservedIndex)

  let appliedCouponCode: string | null = null
  let discountAmount = 0
  let productTotal = baseLockedPrice

  if (couponCode) {
    const couponCheck = await validateCouponForAmount(String(couponCode), baseLockedPrice)
    if (!couponCheck.ok) {
      return NextResponse.json({ error: 'invalid_coupon', reason: couponCheck.reason }, { status: 400 })
    }
    appliedCouponCode = couponCheck.code || null
    discountAmount = couponCheck.discountAmount || 0
    productTotal = couponCheck.finalAmount || baseLockedPrice
  }

  const normalizedCountry = normalizeCountryCode(country)
  const shippingCost = calculateShippingCost(normalizedCountry)
  const lockedPrice = productTotal + shippingCost

  // find product
  const product = await prisma.product.findUnique({ where: { sku: productSku } })
  if (!product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 })
  if (!product.isActive) {
    return NextResponse.json({ error: 'product_inactive' }, { status: 409 })
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.maxPerOrder) {
    return NextResponse.json({ error: 'invalid_quantity' }, { status: 400 })
  }
  if (soldCount + quantity > product.standardStock) {
    return NextResponse.json({ error: 'out_of_stock' }, { status: 409 })
  }

  // create reservation expires in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  const reservation = await prisma.reservation.create({
    data: {
      productSku,
      paymentMethod,
      paymentAsset: normalizedAsset,
      paymentStatus: 'pending',
      lockedPrice,
      couponCode: appliedCouponCode,
      discountAmount,
      sessionId: body.sessionId || 'anon',
      quantity,
      productId: product.id,
      expiresAt,
      reservedIndex
    }
  })

  let payment
  try {
    if (paymentMethod === 'crypto') {
      const provider = getCryptoProvider()
      payment = await provider.createPayment(lockedPrice, 'EUR', {
        reservationId: reservation.id,
        asset: normalizedAsset,
      })
    } else if (paymentMethod === 'stripe') {
      const provider = getStripeProvider()
      payment = await provider.createPayment(lockedPrice, 'EUR', {
        reservationId: reservation.id,
        country: normalizedCountry,
        shippingCost,
        productTotal,
      })
    } else {
      throw new Error('invalid_payment_method')
    }
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { paymentId: payment.id },
    })
  } catch (error) {
    await prisma.reservation.delete({ where: { id: reservation.id } }).catch(() => {})
    if (error instanceof Error && error.message === 'btcpay_not_configured') {
      return NextResponse.json({ error: 'live_crypto_not_configured' }, { status: 500 })
    }
    if (error instanceof Error && error.message === 'stripe_not_configured') {
      return NextResponse.json({ error: 'live_stripe_not_configured' }, { status: 500 })
    }
    return NextResponse.json({ error: 'payment_provider_error' }, { status: 500 })
  }

  return NextResponse.json({
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
  })
}
