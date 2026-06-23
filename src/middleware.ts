import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from './lib/auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAdminPage = pathname.startsWith('/admin')
  const isAdminApi = pathname.startsWith('/api/admin')

  if (isAdminPage || isAdminApi) {
    if (pathname === '/admin/login' || pathname === '/api/admin/auth') {
      return NextResponse.next()
    }

    const session = req.cookies.get('admin_session')?.value
    if (!(await verifyAdminSession(session))) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }

      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
