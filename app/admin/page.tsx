import type { Metadata } from 'next'
import { prisma } from '@/src/lib/prisma'
import { getCampaignState, campaignPrices } from '@/src/lib/campaign'
import { includeTestOrdersForStorefront, soldCountWhere } from '@/src/lib/sales'
import { AnalyticsCharts } from '@/components/admin/AnalyticsCharts'

export const metadata: Metadata = { title: 'Admin Overview' }

type DateRange = '7d' | '30d' | '90d'

async function getAnalytics(range: DateRange) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const since = new Date(Date.now() - days * 86400000)

  const [orders, events, soldCount] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.event.findMany({ where: { createdAt: { gte: since } } }),
    prisma.order.count({ where: soldCountWhere(includeTestOrdersForStorefront()) }),
  ])

  // Revenue by day
  const revenueMap = new Map<string, { revenue: number; orders: number }>()
  for (const order of orders.filter((o) => o.status === 'paid' && !o.isTest)) {
    const day = order.createdAt.toISOString().slice(0, 10)
    const prev = revenueMap.get(day) ?? { revenue: 0, orders: 0 }
    revenueMap.set(day, { revenue: prev.revenue + order.totalAmount, orders: prev.orders + 1 })
  }
  const revenue = Array.from(revenueMap.entries()).map(([date, v]) => ({ date, ...v }))

  // Countries
  const countryMap = new Map<string, number>()
  for (const order of orders.filter((o) => o.status === 'paid')) {
    countryMap.set(order.country, (countryMap.get(order.country) ?? 0) + 1)
  }
  const countries = Array.from(countryMap.entries()).map(([country, count]) => ({ country, count }))

  // Payment methods
  const methodMap = new Map<string, number>()
  for (const order of orders) {
    const m = order.paymentAsset
      ? `${order.paymentMethod}:${order.paymentAsset}`
      : order.paymentMethod
    methodMap.set(m, (methodMap.get(m) ?? 0) + 1)
  }
  const methods = Array.from(methodMap.entries()).map(([method, count]) => ({ method, count }))

  // Funnel from events
  const pageViews = events.filter((e) => e.type === 'page_view').length
  const productViews = events.filter((e) => e.type === 'product_view').length
  const checkoutStarts = events.filter((e) => e.type === 'checkout_start').length
  const purchases = events.filter((e) => e.type === 'purchase').length

  const funnel = [
    { step: 'Page views', count: pageViews },
    { step: 'Product views', count: productViews },
    { step: 'Checkout starts', count: checkoutStarts },
    { step: 'Purchases', count: purchases },
  ]

  const paidOrders = orders.filter((o) => o.status === 'paid' && !o.isTest)
  const totalRevenue = paidOrders.reduce((s, o) => s + o.totalAmount, 0)
  const aov = paidOrders.length ? Math.round(totalRevenue / paidOrders.length) : 0
  const convRate = pageViews ? ((purchases / pageViews) * 100).toFixed(1) : '0.0'

  return { revenue, countries, methods, funnel, totalRevenue, aov, paidCount: paidOrders.length, convRate, soldCount }
}

interface Props {
  searchParams: { range?: string }
}

export default async function AdminOverviewPage({ searchParams }: Props) {
  const range = (searchParams.range ?? '30d') as DateRange
  const data = await getAnalytics(range)
  const campaignState = getCampaignState(data.soldCount)

  const kpis = [
    { label: 'Revenue', value: `€${data.totalRevenue}` },
    { label: 'Orders', value: data.paidCount },
    { label: 'AOV', value: `€${data.aov}` },
    { label: 'Conv. rate', value: `${data.convRate}%` },
    { label: 'Campaign units sold', value: `${data.soldCount}/${campaignPrices.length}` },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
            <a
              key={r}
              href={`?range=${r}`}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                range === r
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {r}
            </a>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">Campaign Progress</h2>
        <div className="flex gap-2">
          {campaignPrices.map((price, i) => (
            <div
              key={i}
              className={`flex-1 rounded-lg py-3 text-center text-sm font-medium border ${
                i < data.soldCount
                  ? 'bg-brand-500/20 border-brand-500/40 text-brand-400'
                  : i === data.soldCount
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-600'
              }`}
            >
              {i < data.soldCount ? `✓ €${price}` : `€${price}`}
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-sm mt-2">
          Current price: €{campaignState.nextPrice} · {campaignState.unitsLeft} campaign units remaining
        </p>
      </div>

      {/* Charts */}
      <AnalyticsCharts
        revenue={data.revenue}
        countries={data.countries}
        methods={data.methods}
        funnel={data.funnel}
      />
    </div>
  )
}
