import { NextResponse } from 'next/server'
import { prisma } from '../../../../src/lib/prisma'
import { getCryptoProvider, isLivePaymentMode } from '../../../../src/lib/paymentProvider'
import { includeTestOrdersForStorefront, soldCountWhere } from '../../../../src/lib/sales'
import { normalizeCountryCode } from '../../../../src/lib/shipping'
import { isCryptoPaymentPaid } from '@/src/lib/simulatedCryptoPayments'

export async function POST(req: Request) {
  const body = await req.json()
  const {
    reservationId,
    paymentId,
    customerName,
    customerEmail,
    country,
    shippingPhone,
    shippingCompany,
    shippingAddressLine1,
    shippingAddressLine2,
    shippingCity,
    shippingRegion,
    shippingPostalCode,
    deliveryInstructions,
    recipientTaxId,
  } = body

  if (!reservationId || !paymentId || !customerName || !customerEmail || !country || !shippingPhone || !shippingAddressLine1 || !shippingCity || !shippingPostalCode) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const normalizedCountry = normalizeCountryCode(country)

  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } })
  if (!reservation) return NextResponse.json({ error: 'reservation_not_found' }, { status: 404 })
  if (reservation.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'reservation_expired' }, { status: 410 })
  }

  let verified
  try {
    const provider = getCryptoProvider()
    verified = await provider.verifyPayment(paymentId)
  } catch (error) {
    if (error instanceof Error && error.message === 'btcpay_not_configured') {
      return NextResponse.json({ error: 'live_crypto_not_configured' }, { status: 500 })
    }
    return NextResponse.json({ error: 'payment_provider_error' }, { status: 500 })
  }

  const liveMode = isLivePaymentMode()
  const simulatedPaid = !liveMode && isCryptoPaymentPaid(paymentId)
  const isPaid = verified?.status === 'paid' || reservation.paymentStatus === 'paid' || simulatedPaid

  if (!isPaid) return NextResponse.json({ status: 'pending' })

  // atomic create order and ensure campaign index hasn't advanced
  const result = await prisma.$transaction(async (tx) => {
    const soldCount = await tx.order.count({
      where: soldCountWhere(includeTestOrdersForStorefront())
    })
    if (soldCount > reservation.reservedIndex) {
      // price changed — instruct client to re-quote
      return { error: 'price_changed', newSoldCount: soldCount }
    }

    const lockedPrice = reservation.lockedPrice

    // create a simple order record and items
    const order = await tx.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        paymentMethod: reservation.paymentMethod,
        paymentAsset: reservation.paymentAsset,
        couponCode: reservation.couponCode,
        discountAmount: reservation.discountAmount,
        customerName,
        customerEmail,
        shippingPhone,
        shippingCompany,
        shippingAddressLine1,
        shippingAddressLine2,
        shippingCity,
        shippingRegion,
        shippingPostalCode,
        deliveryInstructions,
        recipientTaxId,
        country: normalizedCountry,
        vatAmount: 0,
        totalAmount: lockedPrice,
        isTest: !liveMode,
        status: 'paid',
        items: {
          create: {
            productId: reservation.productId,
            quantity: reservation.quantity,
            unitPrice: lockedPrice
          }
        }
      },
      include: { items: true }
    })

    if (reservation.couponCode) {
      await tx.coupon.update({
        where: { code: reservation.couponCode },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      })
    }

    // remove reservation
    await tx.reservation.delete({ where: { id: reservation.id } })

    return { ok: true, orderId: order.id }
  })

  return NextResponse.json(result)
}
