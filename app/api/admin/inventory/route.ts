import { NextResponse } from 'next/server'
import { getInventoryProduct, parseInventoryUpdateCommand, updateInventoryProduct } from '@/src/server/admin/service'
import { RouteError } from '@/src/server/routeErrors'

export async function GET() {
  try {
    return NextResponse.json(await getInventoryProduct())
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
    return NextResponse.json(await updateInventoryProduct(parseInventoryUpdateCommand(body)))
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
