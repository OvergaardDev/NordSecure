import { NextResponse } from 'next/server'
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  parseCouponCreateCommand,
  parseCouponDeleteCommand,
  parseCouponUpdateCommand,
  updateCoupon,
} from '@/src/server/admin/service'
import { RouteError } from '@/src/server/routeErrors'

export async function GET() {
  return NextResponse.json(await listCoupons())
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => {
      throw new RouteError(400, 'invalid_payload')
    })
    return NextResponse.json(await createCoupon(parseCouponCreateCommand(body)), { status: 201 })
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => {
      throw new RouteError(400, 'invalid_payload')
    })
    return NextResponse.json(await updateCoupon(parseCouponUpdateCommand(body)))
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => {
      throw new RouteError(400, 'invalid_payload')
    })
    return NextResponse.json(await deleteCoupon(parseCouponDeleteCommand(body).id))
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
