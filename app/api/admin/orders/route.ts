import { NextResponse } from 'next/server'
import { listOrders } from '@/src/server/admin/service'

export async function GET() {
  return NextResponse.json(await listOrders())
}
