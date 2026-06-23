'use client'

import { useState } from 'react'

interface Props {
  productId: number
  initialSku: string
  initialName: string
  initialDescription: string
  initialImages: string[]
  initialStandardPrice: number
  initialStandardStock: number
  initialLowStockThreshold: number
  initialMaxPerOrder: number
  initialIsActive: boolean
}

export function InventorySettingsForm({
  productId,
  initialSku,
  initialName,
  initialDescription,
  initialImages,
  initialStandardPrice,
  initialStandardStock,
  initialLowStockThreshold,
  initialMaxPerOrder,
  initialIsActive,
}: Props) {
  const [sku, setSku] = useState(initialSku)
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [images, setImages] = useState(initialImages.join('\n'))
  const [standardPrice, setStandardPrice] = useState(initialStandardPrice)
  const [standardStock, setStandardStock] = useState(initialStandardStock)
  const [lowStockThreshold, setLowStockThreshold] = useState(initialLowStockThreshold)
  const [maxPerOrder, setMaxPerOrder] = useState(initialMaxPerOrder)
  const [isActive, setIsActive] = useState(initialIsActive)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          sku,
          name,
          description,
          images,
          standardPrice,
          standardStock,
          lowStockThreshold,
          maxPerOrder,
          isActive,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage(data.error || 'Update failed')
        return
      }
      setMessage('Inventory updated')
    } catch {
      setMessage('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Product name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">SKU (used in URL)</label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Image URLs (one per line)</label>
        <textarea
          value={images}
          onChange={(e) => setImages(e.target.value)}
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Post-campaign standard price (EUR)</label>
          <input
            type="number"
            min={1}
            step={1}
            value={standardPrice}
            onChange={(e) => setStandardPrice(parseInt(e.target.value || '0'))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Post-campaign standard stock</label>
          <input
            type="number"
            min={0}
            step={1}
            value={standardStock}
            onChange={(e) => setStandardStock(parseInt(e.target.value || '0'))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setStandardStock((prev) => Math.max(0, prev - 1))}
          className="px-3 py-1.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-300"
        >
          -1 stock
        </button>
        <button
          type="button"
          onClick={() => setStandardStock((prev) => Math.max(0, prev - 5))}
          className="px-3 py-1.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-300"
        >
          -5 stock
        </button>
        <button
          type="button"
          onClick={() => setStandardStock((prev) => prev + 1)}
          className="px-3 py-1.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-300"
        >
          +1 stock
        </button>
        <button
          type="button"
          onClick={() => setStandardStock((prev) => prev + 5)}
          className="px-3 py-1.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-300"
        >
          +5 stock
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Low stock threshold</label>
          <input
            type="number"
            min={0}
            step={1}
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(parseInt(e.target.value || '0'))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Max units per order</label>
          <input
            type="number"
            min={1}
            step={1}
            value={maxPerOrder}
            onChange={(e) => setMaxPerOrder(parseInt(e.target.value || '1'))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300 pt-7">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Product active
        </label>
      </div>

      <div className="flex gap-3 items-center">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Saving…' : 'Save inventory settings'}
        </button>
        {message && <p className="text-xs text-slate-400">{message}</p>}
      </div>
    </div>
  )
}
