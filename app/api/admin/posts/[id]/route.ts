import { NextResponse } from 'next/server'
import { deletePost, getPost, parsePostUpdateCommand, updatePost } from '@/src/server/admin/service'
import { parseRouteId } from '@/src/server/input'
import { RouteError } from '@/src/server/routeErrors'

interface Params { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  try {
    return NextResponse.json(await getPost(parseRouteId(params.id)))
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const body = await req.json().catch(() => {
      throw new RouteError(400, 'invalid_payload')
    })
    return NextResponse.json(await updatePost(parseRouteId(params.id), parsePostUpdateCommand(body)))
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    return NextResponse.json(await deletePost(parseRouteId(params.id)))
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
