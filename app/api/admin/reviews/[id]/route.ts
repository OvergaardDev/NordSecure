import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

interface Params { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
  const body = await req.json().catch(() => null)
  const formData = body ?? Object.fromEntries(new URLSearchParams())
  const status = body?.status ?? formData?.status
  const valid = ['pending', 'approved', 'rejected']
  if (!valid.includes(status)) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const review = await prisma.review.update({ where: { id: parseInt(params.id) }, data: { status } })
  return NextResponse.json(review)
}
