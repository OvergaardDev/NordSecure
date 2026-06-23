import { prisma } from './prisma'

type CouponValidationResult = {
  ok: boolean
  reason?: 'not_found' | 'inactive' | 'not_started' | 'expired' | 'min_order' | 'max_uses' | 'invalid_value'
  code?: string
  discountAmount?: number
  finalAmount?: number
}

export async function validateCouponForAmount(rawCode: string, amount: number): Promise<CouponValidationResult> {
  const code = String(rawCode || '').trim().toUpperCase()
  if (!code) return { ok: false, reason: 'not_found' }

  const coupon = await prisma.coupon.findUnique({ where: { code } })
  if (!coupon) return { ok: false, reason: 'not_found' }
  if (!coupon.active) return { ok: false, reason: 'inactive' }

  const now = Date.now()
  if (coupon.startsAt && coupon.startsAt.getTime() > now) return { ok: false, reason: 'not_started' }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now) return { ok: false, reason: 'expired' }
  if (coupon.minOrderAmount != null && amount < coupon.minOrderAmount) return { ok: false, reason: 'min_order' }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return { ok: false, reason: 'max_uses' }

  let discountAmount = 0
  if (coupon.discountType === 'percent') {
    discountAmount = Math.floor((amount * coupon.discountValue) / 100)
  } else if (coupon.discountType === 'fixed') {
    discountAmount = coupon.discountValue
  } else {
    return { ok: false, reason: 'invalid_value' }
  }

  if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
    return { ok: false, reason: 'invalid_value' }
  }

  if (discountAmount >= amount) {
    discountAmount = Math.max(0, amount - 1)
  }

  const finalAmount = amount - discountAmount
  if (finalAmount < 1) {
    return { ok: false, reason: 'invalid_value' }
  }

  return {
    ok: true,
    code,
    discountAmount,
    finalAmount,
  }
}
