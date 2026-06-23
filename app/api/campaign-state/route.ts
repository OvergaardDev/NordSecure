import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { getCampaignState } from '@/src/lib/campaign'
import { includeTestOrdersForStorefront, soldCountWhere } from '@/src/lib/sales'

export const dynamic = 'force-dynamic'

export async function GET() {
  const soldCount = await prisma.order.count({
    where: soldCountWhere(includeTestOrdersForStorefront())
  })
  const state = getCampaignState(soldCount)
  return NextResponse.json(
    { soldCount, ...state },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  )
}
