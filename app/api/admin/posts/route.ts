import { NextResponse } from 'next/server'
import { createPost, listPosts, parsePostCreateCommand } from '@/src/server/admin/service'
import { RouteError } from '@/src/server/routeErrors'

export async function GET() {
  return NextResponse.json(await listPosts())
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => {
      throw new RouteError(400, 'invalid_payload')
    })
    return NextResponse.json(await createPost(parsePostCreateCommand(body)), { status: 201 })
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
