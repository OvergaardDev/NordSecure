import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') ?? '30d'
  const includeTest = searchParams.get('includeTest') === 'true'
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
  const since = new Date(Date.now() - days * 86400000)

  const [orders, events] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: since },
        ...(includeTest ? {} : { isTest: false }),
      },
      include: { items: true },
    }),
    prisma.event.findMany({ where: { createdAt: { gte: since } } }),
  ])

  const paidOrders = orders.filter((o) => o.status === 'paid')
  const totalRevenue = paidOrders.reduce((s, o) => s + o.totalAmount, 0)
  const aov = paidOrders.length ? Math.round(totalRevenue / paidOrders.length) : 0

  // Revenue by day
  const revenueMap = new Map<string, number>()
  for (const o of paidOrders) {
    const day = o.createdAt.toISOString().slice(0, 10)
    revenueMap.set(day, (revenueMap.get(day) ?? 0) + o.totalAmount)
  }
  const revenueByDay = Array.from(revenueMap.entries()).map(([date, revenue]) => ({ date, revenue }))

  // Funnel
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

  // Conversion rates
  const conversionRates = {
    visitorToProductView: pageViews ? ((productViews / pageViews) * 100).toFixed(1) : '0',
    productViewToCheckout: productViews ? ((checkoutStarts / productViews) * 100).toFixed(1) : '0',
    checkoutToPurchase: checkoutStarts ? ((purchases / checkoutStarts) * 100).toFixed(1) : '0',
    overall: pageViews ? ((purchases / pageViews) * 100).toFixed(1) : '0',
  }

  // Countries
  const countryMap = new Map<string, number>()
  for (const o of paidOrders) {
    countryMap.set(o.country, (countryMap.get(o.country) ?? 0) + 1)
  }
  const countries = Array.from(countryMap.entries()).map(([country, count]) => ({ country, count }))

  return NextResponse.json({
    totalRevenue,
    aov,
    orderCount: paidOrders.length,
    revenueByDay,
    funnel,
    conversionRates,
    countries,
  })
}
