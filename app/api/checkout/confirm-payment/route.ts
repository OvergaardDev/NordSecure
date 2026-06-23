import { NextResponse } from 'next/server'
import { prisma } from '../../../../src/lib/prisma'
import { getCryptoProvider, getStripeProvider, isLivePaymentMode } from '../../../../src/lib/paymentProvider'
import { includeTestOrdersForStorefront, soldCountWhere } from '../../../../src/lib/sales'
import { normalizeCountryCode } from '../../../../src/lib/shipping'
import { isCryptoPaymentPaid } from '@/src/lib/simulatedCryptoPayments'
import { sendOrderConfirmation } from '@/src/lib/email'

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
  if (!reservation.paymentId || reservation.paymentId !== paymentId) {
    return NextResponse.json({ error: 'payment_mismatch' }, { status: 409 })
  }

  let verified
  try {
    if (reservation.paymentMethod === 'stripe') {
      const provider = getStripeProvider()
      verified = await provider.verifyPayment(reservation.paymentId)
    } else {
      const provider = getCryptoProvider()
      verified = await provider.verifyPayment(reservation.paymentId)
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'btcpay_not_configured') {
      return NextResponse.json({ error: 'live_crypto_not_configured' }, { status: 500 })
    }
    if (error instanceof Error && error.message === 'stripe_not_configured') {
      return NextResponse.json({ error: 'live_stripe_not_configured' }, { status: 500 })
    }
    return NextResponse.json({ error: 'payment_provider_error' }, { status: 500 })
  }

  if (verified && !paymentMatchesReservation(reservation, verified)) {
    return NextResponse.json({ error: 'payment_verification_mismatch' }, { status: 409 })
  }

  const liveMode = isLivePaymentMode()
  const simulatedPaid = !liveMode && isCryptoPaymentPaid(reservation.paymentId)
  const isPaid = verified?.status === 'paid' || reservation.paymentStatus === 'paid' || simulatedPaid

  if (!isPaid) return NextResponse.json({ status: 'pending' })

  // Get product details for email
  const product = await prisma.product.findUnique({
    where: { id: reservation.productId },
  })

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

    return { ok: true, orderId: order.id, orderNumber: order.orderNumber, totalAmount: order.totalAmount }
  })

  // Send order confirmation email after transaction completes
  if (result.ok && product) {
    await sendOrderConfirmation(
      customerEmail,
      result.orderNumber,
      result.totalAmount,
      !liveMode,
      {
        customerName,
        items: [
          {
            productName: product.name,
            quantity: reservation.quantity,
            unitPrice: result.totalAmount,
          },
        ],
        paymentMethod: reservation.paymentMethod,
        shippingAddress: {
          addressLine1: shippingAddressLine1,
          addressLine2: shippingAddressLine2,
          city: shippingCity,
          region: shippingRegion,
          postalCode: shippingPostalCode,
          country: normalizedCountry,
        },
      }
    ).catch((err) => console.error('Email send error (non-fatal):', err))
  }

  return NextResponse.json(result)
}
