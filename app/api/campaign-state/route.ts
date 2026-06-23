import { NextResponse } from 'next/server'
import { getCampaignStateResponse } from '@/src/server/storefront/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    await getCampaignStateResponse(),
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  )
}
