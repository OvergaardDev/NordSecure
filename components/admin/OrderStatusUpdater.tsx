'use client'

import { useState } from 'react'

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled'

interface Props {
  orderId: number
  initialStatus: OrderStatus
}

const STATUS_OPTIONS: OrderStatus[] = ['pending', 'paid', 'shipped', 'cancelled']

export function OrderStatusUpdater({ orderId, initialStatus }: Props) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const save = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage(data.error || 'Update failed')
        return
      }
      setMessage('Status updated')
    } catch {
      setMessage('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as OrderStatus)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? 'Updating…' : 'Update status'}
      </button>
      {message && <p className="text-xs text-slate-400">{message}</p>}
    </div>
  )
}
