import { NextResponse } from 'next/server'
import { getAnalytics, parseAnalyticsQuery } from '@/src/server/admin/service'

export async function GET(req: Request) {
  return NextResponse.json(await getAnalytics(parseAnalyticsQuery(req.url)))
}
