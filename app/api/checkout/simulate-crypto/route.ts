import { NextResponse } from 'next/server'
import { parseSimulateCryptoPaymentCommand, simulateCryptoPayment } from '@/src/server/storefront/service'
import { RouteError } from '@/src/server/routeErrors'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => {
      throw new RouteError(400, 'invalid_payload')
    })
    return NextResponse.json(simulateCryptoPayment(parseSimulateCryptoPaymentCommand(body)))
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
