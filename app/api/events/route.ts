import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, sessionId, country, referrer } = body
    if (!type || !sessionId) return NextResponse.json({ ok: false }, { status: 400 })

    await prisma.event.create({ data: { type, sessionId, country, referrer } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
