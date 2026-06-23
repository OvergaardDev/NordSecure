import { NextResponse } from 'next/server'
import { getOrder, parseOrderStatusUpdateCommand, updateOrderStatus } from '@/src/server/admin/service'
import { parseRouteId } from '@/src/server/input'
import { RouteError } from '@/src/server/routeErrors'

interface Params { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  try {
    return NextResponse.json(await getOrder(parseRouteId(params.id)))
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await req.json().catch(() => {
      throw new RouteError(400, 'invalid_payload')
    })
    const command = parseOrderStatusUpdateCommand(body)
    return NextResponse.json(await updateOrderStatus(parseRouteId(params.id), command.status))
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
