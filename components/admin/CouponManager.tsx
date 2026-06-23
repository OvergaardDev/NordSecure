'use client'

import { useMemo, useState } from 'react'

type Coupon = {
  id: number
  code: string
  description: string | null
  discountType: string
  discountValue: number
  minOrderAmount: number | null
  maxUses: number | null
  usedCount: number
  active: boolean
  startsAt: string | Date | null
  expiresAt: string | Date | null
}

type NewCoupon = {
  code: string
  description: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  minOrderAmount: string
  maxUses: string
  startsAt: string
  expiresAt: string
  active: boolean
}

const defaultNewCoupon: NewCoupon = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: 10,
  minOrderAmount: '',
  maxUses: '',
  startsAt: '',
  expiresAt: '',
  active: true,
}

function toDatetimeLocal(value: string | Date | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

export function CouponManager({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [draft, setDraft] = useState<NewCoupon>(defaultNewCoupon)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const activeCount = useMemo(() => coupons.filter((c) => c.active).length, [coupons])

  const createCoupon = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const payload = {
        ...draft,
        code: draft.code.toUpperCase(),
        minOrderAmount: draft.minOrderAmount ? Number(draft.minOrderAmount) : null,
        maxUses: draft.maxUses ? Number(draft.maxUses) : null,
        startsAt: draft.startsAt || null,
        expiresAt: draft.expiresAt || null,
      }
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || 'Could not create coupon')
        return
      }
      setCoupons((prev) => [data as Coupon, ...prev])
      setDraft(defaultNewCoupon)
      setMessage('Coupon created')
    } catch {
      setMessage('Network error')
    } finally {
      setSaving(false)
    }
  }

  const toggleCoupon = async (id: number, active: boolean) => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || 'Could not update coupon')
        return
      }
      setCoupons((prev) => prev.map((c) => (c.id === id ? (data as Coupon) : c)))
    } catch {
      setMessage('Network error')
    } finally {
      setSaving(false)
    }
  }

  const deleteCoupon = async (id: number) => {
    const yes = window.confirm('Delete this coupon?')
    if (!yes) return

    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || 'Could not delete coupon')
        return
      }
      setCoupons((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setMessage('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-300">{coupons.length} total coupon(s)</p>
        <p className="text-slate-500">{activeCount} active</p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-white">Create coupon</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Code (e.g. SUMMER10)"
            value={draft.code}
            onChange={(e) => setDraft((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <select
            value={draft.discountType}
            onChange={(e) => setDraft((prev) => ({ ...prev, discountType: e.target.value as 'percent' | 'fixed' }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed EUR off</option>
          </select>
          <input
            type="number"
            min={1}
            step={1}
            placeholder={draft.discountType === 'percent' ? 'Discount (%)' : 'Discount (EUR)'}
            value={draft.discountValue}
            onChange={(e) => setDraft((prev) => ({ ...prev, discountValue: Number(e.target.value || '0') }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="number"
            min={0}
            step={1}
            placeholder="Min order (EUR, optional)"
            value={draft.minOrderAmount}
            onChange={(e) => setDraft((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="number"
            min={1}
            step={1}
            placeholder="Max uses (optional)"
            value={draft.maxUses}
            onChange={(e) => setDraft((prev) => ({ ...prev, maxUses: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft((prev) => ({ ...prev, active: e.target.checked }))}
            />
            Active now
          </label>
          <input
            type="datetime-local"
            value={draft.startsAt}
            onChange={(e) => setDraft((prev) => ({ ...prev, startsAt: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="datetime-local"
            value={draft.expiresAt}
            onChange={(e) => setDraft((prev) => ({ ...prev, expiresAt: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <textarea
            placeholder="Description (optional)"
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="sm:col-span-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          type="button"
          onClick={createCoupon}
          disabled={saving}
          className="bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {saving ? 'Saving…' : 'Create coupon'}
        </button>
      </div>

      <div className="space-y-3">
        {coupons.length === 0 && (
          <p className="text-sm text-slate-500">No coupons yet.</p>
        )}
        {coupons.map((coupon) => (
          <div key={coupon.id} className="bg-slate-800/40 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-semibold">{coupon.code}</p>
                <p className="text-slate-400 text-sm">
                  {coupon.discountType === 'percent' ? `${coupon.discountValue}% off` : `€${coupon.discountValue} off`}
                  {coupon.minOrderAmount != null ? ` · min €${coupon.minOrderAmount}` : ''}
                </p>
                {coupon.description && <p className="text-slate-500 text-xs mt-1">{coupon.description}</p>}
                <p className="text-slate-500 text-xs mt-1">
                  Used {coupon.usedCount}
                  {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ''}
                  {coupon.startsAt ? ` · starts ${toDatetimeLocal(coupon.startsAt).replace('T', ' ')}` : ''}
                  {coupon.expiresAt ? ` · ends ${toDatetimeLocal(coupon.expiresAt).replace('T', ' ')}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleCoupon(coupon.id, !coupon.active)}
                  disabled={saving}
                  className={`px-3 py-1.5 rounded text-xs font-medium ${coupon.active ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-brand-500/20 text-brand-300 border border-brand-500/40'}`}
                >
                  {coupon.active ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteCoupon(coupon.id)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/40"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {message && <p className="text-xs text-slate-400">{message}</p>}
    </div>
  )
}
