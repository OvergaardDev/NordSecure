import { NextResponse } from 'next/server'
import { parseReviewStatusUpdateCommand, updateReviewStatus } from '@/src/server/admin/service'
import { parseRouteId } from '@/src/server/input'
import { RouteError } from '@/src/server/routeErrors'

interface Params { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
  try {
    const body = await req.json().catch(() => {
      throw new RouteError(400, 'invalid_payload')
    })
    const command = parseReviewStatusUpdateCommand(body)
    return NextResponse.json(await updateReviewStatus(parseRouteId(params.id), command.status))
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
