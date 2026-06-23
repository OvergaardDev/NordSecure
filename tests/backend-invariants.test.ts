import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findUniqueMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
}))

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    coupon: {
      findUnique: findUniqueMock,
    },
  },
}))

import { calculateReservedProductSubtotal, buildOrderItemLines } from '../src/server/checkout/pricing'
import {
  isReservationExpired,
  paymentMatchesReservation,
} from '../src/server/checkout/invariants'
import { validateCouponForAmount } from '../src/lib/coupons'
import { calculateShippingCost } from '../src/lib/shipping'
import {
  ANALYTICS_EVENT_TYPES,
  buildAnalyticsFunnel,
  isAnalyticsEventType,
} from '../src/shared/analyticsEvents'

describe('Checkout pricing invariants', () => {
  it('locks campaign ladder pricing across quantity, not just first unit', () => {
    expect(calculateReservedProductSubtotal(0, 1)).toBe(400)
    expect(calculateReservedProductSubtotal(0, 2)).toBe(865)
    expect(calculateReservedProductSubtotal(3, 2)).toBe(1305)
  })

  it('builds order item lines with per-unit prices that sum to total', () => {
    const lines = buildOrderItemLines(1, 3, 1000)

    expect(lines).toHaveLength(3)
    expect(lines.every((line) => line.quantity === 1)).toBe(true)
    expect(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)).toBe(1000)
  })
})

describe('Payment verification invariants', () => {
  const reservation = { id: 42, lockedPrice: 465, paymentId: 'pi_123' }

  it('rejects mismatched reservation metadata', () => {
    const matches = paymentMatchesReservation(reservation, {
      amount: 465,
      currency: 'EUR',
      meta: { reservationId: '43' },
    })

    expect(matches).toBe(false)
  })

  it('rejects mismatched amount or currency', () => {
    expect(
      paymentMatchesReservation(reservation, {
        amount: 464,
        currency: 'EUR',
        meta: { reservationId: '42' },
      })
    ).toBe(false)

    expect(
      paymentMatchesReservation(reservation, {
        amount: 465,
        currency: 'USD',
        meta: { reservationId: '42' },
      })
    ).toBe(false)
  })

  it('treats expired reservations as expired by timestamp', () => {
    const now = Date.now()
    const reservationState = { expiresAt: new Date(now - 1000) }
    expect(isReservationExpired(reservationState, now)).toBe(true)
  })
})

describe('Coupon invariants', () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
  })

  it('applies percent coupons against full amount', async () => {
    findUniqueMock.mockResolvedValue({
      code: 'SAVE10',
      active: true,
      discountType: 'percent',
      discountValue: 10,
      minOrderAmount: null,
      maxUses: null,
      usedCount: 0,
      startsAt: null,
      expiresAt: null,
    })

    const result = await validateCouponForAmount('save10', 865)
    expect(result.ok).toBe(true)
    expect(result.discountAmount).toBe(86)
    expect(result.finalAmount).toBe(779)
  })

  it('rejects coupon when max uses reached', async () => {
    findUniqueMock.mockResolvedValue({
      code: 'LIMITED',
      active: true,
      discountType: 'fixed',
      discountValue: 25,
      minOrderAmount: null,
      maxUses: 5,
      usedCount: 5,
      startsAt: null,
      expiresAt: null,
    })

    const result = await validateCouponForAmount('limited', 465)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('max_uses')
  })
})

describe('Shipping invariants', () => {
  it('uses expected country-based shipping tiers', () => {
    expect(calculateShippingCost('DK')).toBe(0)
    expect(calculateShippingCost('DE')).toBe(25)
    expect(calculateShippingCost('CH')).toBe(40)
  })
})

describe('Analytics event taxonomy', () => {
  it('uses one canonical ordered event type list', () => {
    expect(ANALYTICS_EVENT_TYPES).toEqual([
      'page_view',
      'product_view',
      'checkout_start',
      'purchase',
    ])
  })

  it('validates analytics event types at runtime', () => {
    expect(isAnalyticsEventType('page_view')).toBe(true)
    expect(isAnalyticsEventType('product_view')).toBe(true)
    expect(isAnalyticsEventType('checkout_start')).toBe(true)
    expect(isAnalyticsEventType('purchase')).toBe(true)
    expect(isAnalyticsEventType('random_event')).toBe(false)
  })

  it('builds funnel counts from canonical taxonomy', () => {
    const events = [
      { type: 'page_view' },
      { type: 'page_view' },
      { type: 'product_view' },
      { type: 'checkout_start' },
      { type: 'purchase' },
      { type: 'invalid' },
    ]

    expect(buildAnalyticsFunnel(events)).toEqual([
      { step: 'Page views', count: 2 },
      { step: 'Product views', count: 1 },
      { step: 'Checkout starts', count: 1 },
      { step: 'Purchases', count: 1 },
    ])
  })
})