import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminToken } from '@/src/lib/auth'

export async function POST(req: Request) {
  const { password } = await req.json()
  const expected = process.env.ADMIN_PASSWORD || 'admin'

  if (password !== expected) {
    return NextResponse.json({ error: 'invalid' }, { status: 401 })
  }

  const token = createAdminToken()
  cookies().set('admin_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return NextResponse.json({ ok: true })
}
