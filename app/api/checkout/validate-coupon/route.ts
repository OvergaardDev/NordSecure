import { NextResponse } from 'next/server'
import { parseCouponValidationCommand, validateCoupon } from '@/src/server/storefront/service'
import { RouteError } from '@/src/server/routeErrors'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => {
      throw new RouteError(400, 'invalid_payload')
    })
    return NextResponse.json(await validateCoupon(parseCouponValidationCommand(body)))
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json(
        error.details ? { error: error.code, ...error.details } : { error: error.code },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
