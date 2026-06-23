import { prisma } from '@/src/lib/prisma'
import { getCampaignState } from '@/src/lib/campaign'
import { includeTestOrdersForStorefront, soldCountWhere } from '@/src/lib/sales'
import { validateCouponForAmount } from '@/src/lib/coupons'
import { markCryptoPaymentPaid } from '@/src/lib/simulatedCryptoPayments'
import { isLivePaymentMode } from '@/src/lib/paymentProvider'
import { RouteError } from '@/src/server/routeErrors'
import { getOptionalStringField, getPositiveIntegerField, getStringField, requireRecord } from '@/src/server/input'
import { AnalyticsEventType, isAnalyticsEventType } from '@/src/shared/analyticsEvents'

const COIN_IDS: Record<string, string> = {
  btc: 'bitcoin',
}

const COIN_SYMBOLS: Record<string, string> = {
  btc: '₿',
}

export function parseCouponValidationCommand(payload: unknown) {
  const body = requireRecord(payload)
  const couponCode = getStringField(body, 'couponCode', { required: true })
  const amount = getPositiveIntegerField(body, 'amount')
  return { couponCode, amount }
}

export async function validateCoupon(command: { couponCode: string; amount: number }) {
  const result = await validateCouponForAmount(command.couponCode, command.amount)
  if (!result.ok) {
    throw new RouteError(400, 'invalid_coupon', { reason: result.reason })
  }

  return {
    ok: true,
    code: result.code,
    discountAmount: result.discountAmount,
    finalAmount: result.finalAmount,
  }
}

export function parseSimulateCryptoPaymentCommand(payload: unknown) {
  const body = requireRecord(payload)
  return { paymentId: getStringField(body, 'paymentId', { required: true }) }
}

export function simulateCryptoPayment(command: { paymentId: string }) {
  if (isLivePaymentMode()) {
    throw new RouteError(403, 'disabled_in_live_mode')
  }

  markCryptoPaymentPaid(command.paymentId)
  return { ok: true, paymentId: command.paymentId }
}

export async function getCampaignStateResponse() {
  const soldCount = await prisma.order.count({
    where: soldCountWhere(includeTestOrdersForStorefront()),
  })
  return { soldCount, ...getCampaignState(soldCount) }
}

export function parseEventCommand(payload: unknown) {
  const body = requireRecord(payload)
  const type = getStringField(body, 'type', { required: true })
  const sessionId = getStringField(body, 'sessionId', { required: true })
  const country = getOptionalStringField(body, 'country')
  const referrer = getOptionalStringField(body, 'referrer')

  if (!isAnalyticsEventType(type)) {
    throw new RouteError(400, 'invalid_event_type')
  }
  if (sessionId.length < 8 || sessionId.length > 128) {
    throw new RouteError(400, 'invalid_session_id')
  }
  if (country && !/^[A-Z]{2}$/i.test(country)) {
    throw new RouteError(400, 'invalid_country')
  }
  if (referrer && referrer.length > 1024) {
    throw new RouteError(400, 'invalid_referrer')
  }

  return {
    type,
    sessionId,
    country: country?.toUpperCase(),
    referrer,
  }
}

export async function recordEvent(command: {
  type: AnalyticsEventType
  sessionId: string
  country?: string
  referrer?: string
}) {
  await prisma.event.create({ data: command })
  return { ok: true }
}

export async function getCryptoPrices() {
  const assets = ['btc']
  const coinGeckoIds = assets.map((asset) => COIN_IDS[asset]).join(',')
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoIds}&vs_currencies=eur&include_market_cap=false&include_24hr_vol=false`,
    {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    }
  )

  if (!response.ok) {
    throw new RouteError(500, 'crypto_price_fetch_failed')
  }

  const data = (await response.json()) as Record<string, { eur?: number }>
  const prices: Record<string, { eur: number; symbol: string; name: string }> = {}

  for (const asset of assets) {
    const geckoId = COIN_IDS[asset]
    const priceEur = data[geckoId]?.eur
    if (priceEur !== undefined) {
      prices[asset] = {
        eur: priceEur,
        symbol: COIN_SYMBOLS[asset],
        name: asset.toUpperCase(),
      }
    }
  }

  return prices
}