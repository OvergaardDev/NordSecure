import { NextResponse } from 'next/server'
import { markCryptoPaymentPaid } from '@/src/lib/simulatedCryptoPayments'
import { isLivePaymentMode } from '@/src/lib/paymentProvider'

export async function POST(req: Request) {
  if (isLivePaymentMode()) {
    return NextResponse.json({ error: 'disabled_in_live_mode' }, { status: 403 })
  }

  const { paymentId } = await req.json()
  if (!paymentId) return NextResponse.json({ error: 'missing paymentId' }, { status: 400 })
  markCryptoPaymentPaid(paymentId)
  return NextResponse.json({ ok: true, paymentId })
}
