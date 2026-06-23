import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

interface Params { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  const order = await prisma.order.findUnique({
    where: { id: parseInt(params.id) },
    include: { items: { include: { product: true } } },
  })
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PATCH(req: Request, { params }: Params) {
  const { status } = await req.json()
  const valid = ['pending', 'paid', 'shipped', 'cancelled']
  if (!valid.includes(status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  const order = await prisma.order.update({ where: { id: parseInt(params.id) }, data: { status } })
  return NextResponse.json(order)
}
