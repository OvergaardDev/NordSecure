export const ANALYTICS_EVENT_TYPES = [
  'page_view',
  'product_view',
  'checkout_start',
  'purchase',
] as const

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number]

const ANALYTICS_EVENT_TYPE_SET = new Set<string>(ANALYTICS_EVENT_TYPES)

export function isAnalyticsEventType(value: string): value is AnalyticsEventType {
  return ANALYTICS_EVENT_TYPE_SET.has(value)
}

const FUNNEL_STEP_LABELS: Record<AnalyticsEventType, string> = {
  page_view: 'Page views',
  product_view: 'Product views',
  checkout_start: 'Checkout starts',
  purchase: 'Purchases',
}

export function countAnalyticsEventsByType(events: Array<{ type: string }>) {
  const counts = {
    page_view: 0,
    product_view: 0,
    checkout_start: 0,
    purchase: 0,
  } satisfies Record<AnalyticsEventType, number>

  for (const event of events) {
    if (isAnalyticsEventType(event.type)) {
      counts[event.type] += 1
    }
  }

  return counts
}

export function buildAnalyticsFunnel(events: Array<{ type: string }>) {
  const counts = countAnalyticsEventsByType(events)
  return ANALYTICS_EVENT_TYPES.map((type) => ({
    step: FUNNEL_STEP_LABELS[type],
    count: counts[type],
  }))
}