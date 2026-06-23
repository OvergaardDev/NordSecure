import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminSession, parseAdminLoginCommand } from '@/src/server/admin/service'
import { RouteError } from '@/src/server/routeErrors'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => {
      throw new RouteError(400, 'invalid_payload')
    })
    const token = await createAdminSession(parseAdminLoginCommand(body).password)

    cookies().set('admin_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
