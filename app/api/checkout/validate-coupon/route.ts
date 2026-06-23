import { NextResponse } from 'next/server'
import { validateCouponForAmount } from '@/src/lib/coupons'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const couponCode = String(body.couponCode ?? '').trim()
  const amount = Number(body.amount)

  if (!couponCode) {
    return NextResponse.json({ error: 'missing_coupon_code' }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 })
  }

  const result = await validateCouponForAmount(couponCode, amount)
  if (!result.ok) {
    return NextResponse.json({ error: 'invalid_coupon', reason: result.reason }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    code: result.code,
    discountAmount: result.discountAmount,
    finalAmount: result.finalAmount,
  })
}
