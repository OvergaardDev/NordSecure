import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/src/lib/prisma'

export const metadata: Metadata = {
  title: 'Order Confirmed',
  robots: { index: false },
}

interface Props {
  searchParams: { order?: string }
}

export default async function SuccessPage({ searchParams }: Props) {
  const orderId = searchParams.order ? parseInt(searchParams.order) : null
  const order = orderId
    ? await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
    : null

  return (
    <div className="max-w-lg mx-auto text-center py-16 animate-fade-in">
      <div className="text-6xl mb-6 inline-block animate-bounce-gentle" aria-hidden="true">🎉</div>
      <h1 className="text-3xl font-bold text-white mb-3">Order Confirmed!</h1>
      {order ? (
        <>
          <p className="text-slate-400 mb-2">
            Order <span className="text-white font-mono">{order.orderNumber}</span>
          </p>
          <p className="text-slate-400 mb-2">
            Total paid: <span className="text-white font-semibold">€{order.totalAmount}</span>
          </p>
          <p className="text-slate-400 text-sm mb-6">
            A confirmation email has been sent to <span className="text-white">{order.customerEmail}</span>.
          </p>
          {order.isTest && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-lg p-3 mb-6 text-left">
              ⚠️ This was a <strong>test order</strong> — no real payment was taken and no device will be shipped.
            </div>
          )}
        </>
      ) : (
        <p className="text-slate-400 mb-6">Your order has been placed successfully.</p>
      )}

      <div className="space-y-3">
        <p className="text-slate-500 text-sm">
          Expected delivery: 3–5 business days within EU.
        </p>
        <p className="text-slate-500 text-sm">
          You have a <strong className="text-slate-300">14-day right of withdrawal</strong> under EU consumer law.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-500 mt-4"
        >
          ← Back to shop
        </Link>
      </div>
    </div>
  )
}
