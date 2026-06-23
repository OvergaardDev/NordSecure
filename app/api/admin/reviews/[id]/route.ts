import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

interface Params { params: { id: string } }

function parseRouteId(rawId: string) {
  const id = Number.parseInt(rawId, 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function POST(req: Request, { params }: Params) {
  const id = parseRouteId(params.id)
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const formData = body ?? Object.fromEntries(new URLSearchParams())
  const status = body?.status ?? formData?.status
  const valid = ['pending', 'approved', 'rejected']
  if (!valid.includes(status)) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const review = await prisma.review.update({ where: { id }, data: { status } })
  return NextResponse.json(review)
}
