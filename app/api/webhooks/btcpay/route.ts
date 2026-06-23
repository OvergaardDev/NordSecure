import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false
  const normalized = signatureHeader.trim()
  const provided = normalized.includes('=') ? normalized : `sha256=${normalized}`
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`

  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(providedBuf, expectedBuf)
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const secret = String(process.env.BTCPAY_WEBHOOK_SECRET || '')
  const signature = req.headers.get('btcpay-sig') || req.headers.get('BTCPay-Sig')

  if (secret && !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  const body = JSON.parse(rawBody || '{}') as Record<string, unknown>
  const invoiceId = String(
    body.invoiceId ||
      ((body.invoiceData as Record<string, unknown> | undefined)?.id as string | undefined) ||
      ((body.data as Record<string, unknown> | undefined)?.id as string | undefined) ||
      ''
  )
  const status = String(
    body.status ||
      ((body.invoiceData as Record<string, unknown> | undefined)?.status as string | undefined) ||
      ((body.data as Record<string, unknown> | undefined)?.status as string | undefined) ||
      ''
  ).toLowerCase()

  if (!invoiceId) {
    return NextResponse.json({ error: 'missing_invoice_id' }, { status: 400 })
  }

  let paymentStatus = 'pending'
  if (status === 'settled' || status === 'processing' || status === 'complete') {
    paymentStatus = 'paid'
  }
  if (status === 'expired' || status === 'invalid') {
    paymentStatus = 'failed'
  }

  await prisma.reservation.updateMany({
    where: { paymentId: invoiceId },
    data: { paymentStatus },
  })

  return NextResponse.json({ ok: true })
}
