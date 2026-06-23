import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/src/lib/prisma'

export const metadata: Metadata = { title: 'Orders | Admin' }

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  paid: 'bg-brand-500/20 text-brand-400 border-brand-500/30',
  shipped: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Orders</h1>

      <div className="table-responsive rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Order #</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Country</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Test?</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-slate-800 hover:bg-slate-900/50">
                <td className="px-4 py-3 font-mono text-xs text-slate-300">{order.orderNumber}</td>
                <td className="px-4 py-3 text-white">{order.customerName}</td>
                <td className="px-4 py-3 text-slate-400">{order.country}</td>
                <td className="px-4 py-3 text-right text-white font-medium">€{order.totalAmount}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs border ${STATUS_COLORS[order.status] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{order.isTest ? '🧪 test' : '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{order.createdAt.toLocaleDateString('en-DK')}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="text-brand-400 hover:underline text-xs">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
