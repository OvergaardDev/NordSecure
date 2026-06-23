import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

function normalizeCode(input: unknown) {
  return String(input ?? '').trim().toUpperCase()
}

export async function GET() {
  const coupons = await prisma.coupon.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(coupons)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const code = normalizeCode(body.code)
  const description = body.description == null ? null : String(body.description).trim() || null
  const discountType = String(body.discountType ?? '').trim().toLowerCase()
  const discountValue = Number(body.discountValue)
  const minOrderAmount = body.minOrderAmount == null || body.minOrderAmount === '' ? null : Number(body.minOrderAmount)
  const maxUses = body.maxUses == null || body.maxUses === '' ? null : Number(body.maxUses)
  const startsAt = body.startsAt ? new Date(body.startsAt) : null
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
  const active = body.active == null ? true : Boolean(body.active)

  if (!code || code.length < 3) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
  }
  if (discountType !== 'percent' && discountType !== 'fixed') {
    return NextResponse.json({ error: 'invalid_discount_type' }, { status: 400 })
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return NextResponse.json({ error: 'invalid_discount_value' }, { status: 400 })
  }
  if (discountType === 'percent' && discountValue > 100) {
    return NextResponse.json({ error: 'percent_too_high' }, { status: 400 })
  }
  if (minOrderAmount != null && (!Number.isFinite(minOrderAmount) || minOrderAmount < 0)) {
    return NextResponse.json({ error: 'invalid_min_order_amount' }, { status: 400 })
  }
  if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1)) {
    return NextResponse.json({ error: 'invalid_max_uses' }, { status: 400 })
  }
  if (startsAt && Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: 'invalid_starts_at' }, { status: 400 })
  }
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: 'invalid_expires_at' }, { status: 400 })
  }

  try {
    const created = await prisma.coupon.create({
      data: {
        code,
        description,
        discountType,
        discountValue,
        minOrderAmount,
        maxUses,
        startsAt,
        expiresAt,
        active,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'coupon_create_failed' }, { status: 400 })
  }
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const id = Number(body.id)
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid_coupon_id' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.code != null) {
    const code = normalizeCode(body.code)
    if (!code || code.length < 3) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
    }
    updates.code = code
  }

  if (body.description !== undefined) {
    updates.description = body.description == null ? null : String(body.description).trim() || null
  }

  if (body.discountType != null) {
    const discountType = String(body.discountType).trim().toLowerCase()
    if (discountType !== 'percent' && discountType !== 'fixed') {
      return NextResponse.json({ error: 'invalid_discount_type' }, { status: 400 })
    }
    updates.discountType = discountType
  }

  if (body.discountValue != null) {
    const discountValue = Number(body.discountValue)
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: 'invalid_discount_value' }, { status: 400 })
    }
    updates.discountValue = discountValue
  }

  if (body.minOrderAmount !== undefined) {
    const minOrderAmount = body.minOrderAmount == null || body.minOrderAmount === '' ? null : Number(body.minOrderAmount)
    if (minOrderAmount != null && (!Number.isFinite(minOrderAmount) || minOrderAmount < 0)) {
      return NextResponse.json({ error: 'invalid_min_order_amount' }, { status: 400 })
    }
    updates.minOrderAmount = minOrderAmount
  }

  if (body.maxUses !== undefined) {
    const maxUses = body.maxUses == null || body.maxUses === '' ? null : Number(body.maxUses)
    if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1)) {
      return NextResponse.json({ error: 'invalid_max_uses' }, { status: 400 })
    }
    updates.maxUses = maxUses
  }

  if (body.active != null) {
    updates.active = Boolean(body.active)
  }

  if (body.startsAt !== undefined) {
    if (body.startsAt == null || body.startsAt === '') {
      updates.startsAt = null
    } else {
      const startsAt = new Date(body.startsAt)
      if (Number.isNaN(startsAt.getTime())) {
        return NextResponse.json({ error: 'invalid_starts_at' }, { status: 400 })
      }
      updates.startsAt = startsAt
    }
  }

  if (body.expiresAt !== undefined) {
    if (body.expiresAt == null || body.expiresAt === '') {
      updates.expiresAt = null
    } else {
      const expiresAt = new Date(body.expiresAt)
      if (Number.isNaN(expiresAt.getTime())) {
        return NextResponse.json({ error: 'invalid_expires_at' }, { status: 400 })
      }
      updates.expiresAt = expiresAt
    }
  }

  try {
    const updated = await prisma.coupon.update({
      where: { id },
      data: updates,
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'coupon_update_failed' }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const id = Number(body.id)
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid_coupon_id' }, { status: 400 })
  }

  await prisma.coupon.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
