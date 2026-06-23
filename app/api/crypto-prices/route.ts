import { NextResponse } from 'next/server'
import { getCryptoPrices } from '@/src/server/storefront/service'
import { RouteError } from '@/src/server/routeErrors'

export async function GET(req: Request) {
  try {
    return NextResponse.json(await getCryptoPrices(), {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    })
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    console.error('Crypto price fetch error:', error)
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 }
    )
  }
}
