'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  campaignPrices,
  modelForOrder,
  postCampaignStandardModel,
  postCampaignStandardPrice
} from '@/src/lib/campaign'

export function CampaignPrice() {
  const [soldCount, setSoldCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/campaign-state', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setSoldCount(d.soldCount))
      .catch(() => setSoldCount(0))
  }, [])

  if (soldCount === null) {
    return <div className="animate-pulse bg-slate-800 h-32 rounded-xl" />
  }

  const isCampaignActive = soldCount < campaignPrices.length
  const nextPrice = isCampaignActive ? campaignPrices[soldCount] : postCampaignStandardPrice
  const currentModel = modelForOrder(soldCount)
  const soldWithinCampaign = Math.max(0, Math.min(soldCount, campaignPrices.length))
  const unitsForSale = Math.max(0, campaignPrices.length - soldWithinCampaign)
  const nextNextPrice =
    isCampaignActive && soldCount < campaignPrices.length - 1
      ? campaignPrices[soldCount + 1]
      : null

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)] text-center lg:text-left">
      <p className="text-slate-400 text-sm mb-1">
        {isCampaignActive ? 'Launch price' : 'Standard price'}
      </p>
      <p className="text-4xl font-bold text-white">€{nextPrice}</p>
      <p className="text-slate-400 text-sm mt-1">
        Model for this order: <span className="text-white font-medium">{currentModel}</span>
      </p>

      {isCampaignActive ? (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-center lg:justify-start gap-2 text-amber-400 text-sm font-medium">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            {soldWithinCampaign} sold · {unitsForSale} still for sale
          </div>
          {nextNextPrice && (
            <p className="text-slate-500 text-xs">Next price: €{nextNextPrice}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-slate-500 text-sm">Standard price — restock available</p>
      )}

      {/* Campaign ladder bars */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {campaignPrices.map((price, i) => (
          <div
            key={i}
            className={`rounded py-2 text-center text-xs font-medium border ${
              i < soldWithinCampaign
                ? 'bg-brand-500/20 border-brand-500/40 text-brand-400'
                : i === soldWithinCampaign
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-600'
            }`}
            title={`Unit ${i + 1}: €${price}`}
          >
            {i < soldWithinCampaign ? '✓' : `€${price}`}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        After the launch promo ends, all phones are sold at a flat
        <span className="text-white font-semibold"> €{postCampaignStandardPrice}</span>
        {' '}as
        <span className="text-white font-semibold"> {postCampaignStandardModel}</span>.
      </p>

      <Link
        href="/checkout"
        className="mt-5 w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-6 py-3 rounded-xl font-semibold text-base transition-colors min-h-[44px]"
      >
        Buy Now — €{nextPrice}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </Link>
    </div>
  )
}
