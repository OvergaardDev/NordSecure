import { NextResponse } from 'next/server'
import { clearAdminSession } from '@/src/server/admin/service'

export async function POST() {
  clearAdminSession()
  return NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
}
