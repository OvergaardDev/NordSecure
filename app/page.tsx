import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/src/lib/prisma'
import { campaignPrices, getCampaignState } from '@/src/lib/campaign'
import { includeTestOrdersForStorefront, soldCountWhere } from '@/src/lib/sales'
import { CampaignPrice } from '@/components/CampaignPrice'
import { ReviewCard } from '@/components/ReviewCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'GrapheneOS-flashed Pixel | NordSecure',
  description:
    'Buy a Google Pixel pre-flashed with GrapheneOS. Privacy-first, EU-operated, fast shipping to all EU countries.',
}

async function getPageData() {
  const [soldCount, reviews] = await Promise.all([
    prisma.order.count({ where: soldCountWhere(includeTestOrdersForStorefront()) }),
    prisma.review.findMany({ where: { status: 'approved' }, orderBy: { createdAt: 'desc' }, take: 3 }),
  ])
  return { soldCount, reviews }
}

export default async function HomePage() {
  const { soldCount, reviews } = await getPageData()
  const state = getCampaignState(soldCount)
  const soldWithinCampaign = Math.max(0, Math.min(soldCount, campaignPrices.length))
  const unitsForSale = Math.max(0, campaignPrices.length - soldWithinCampaign)

  return (
    <div className="space-y-16 md:space-y-20">
      {/* Hero */}
      <section className="pt-6 md:pt-10 pb-2 md:pb-4">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-8 md:gap-10 lg:gap-12 items-start">
          <div className="min-w-0 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-400 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-500/20 mb-5 md:mb-6 mx-auto lg:mx-0">
              <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" aria-hidden="true" />
              Launch campaign — {soldWithinCampaign} sold · {unitsForSale} for sale
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4 max-w-2xl mx-auto lg:mx-0">
              Pixel with{' '}
              <span className="text-brand-400">GrapheneOS</span>{' '}
              pre-installed
            </h1>
            <p className="text-slate-400 text-base md:text-lg mb-7 md:mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Take back your privacy. Your phone ships with GrapheneOS already installed and
              configured — no Google, no tracking, no compromises. Ready to use from day one.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2.5 md:gap-3 mb-8 md:mb-10">
              {['\uD83D\uDD12 No Google spyware','\uD83D\uDEE1\uFE0F Hardened security','\uD83C\uDDEA\uD83C\uDDFA EU-based, GDPR','\u2705 Ready out of box'].map((f) => (
                <span key={f} className="bg-slate-900 border border-slate-800 text-slate-300 text-sm px-3 py-1.5 rounded-full">{f}</span>
              ))}
            </div>
            <div className="lg:hidden max-w-md mx-auto"><CampaignPrice /></div>
            <div className="mt-7 md:mt-8 max-w-xl mx-auto lg:mx-0 text-left">
              <p className="text-slate-500 text-sm mb-2">Launch campaign progress (5 total phones)</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {campaignPrices.map((price, i) => (
                  <div key={i} className={`rounded-lg py-2.5 text-center text-xs font-medium border ${
                    i < soldWithinCampaign ? 'bg-brand-500/20 border-brand-500/40 text-brand-400'
                    : i === soldWithinCampaign ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}>{i < soldWithinCampaign ? '\u2713' : `€${price}`}</div>
                ))}
              </div>
              <p className="text-slate-500 text-xs mt-2">
                {soldWithinCampaign < campaignPrices.length
                  ? `${soldWithinCampaign}/${campaignPrices.length} total phones sold · ${unitsForSale} still for sale`
                  : 'All launch phones sold · standard pricing applies'}
              </p>
            </div>
          </div>
          <div className="hidden lg:block w-full max-w-[20rem] justify-self-center"><CampaignPrice /></div>
        </div>
      </section>

      {/* Why GrapheneOS */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">Why GrapheneOS?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: '\uD83D\uDD12', title: 'No Google tracking', desc: 'Android without Google apps or services. Your location, contacts, and messages stay yours.' },
            { icon: '\uD83D\uDEE1\uFE0F', title: 'Hardened security', desc: 'Memory allocator protections, network permission sandbox, verified boot.' },
            { icon: '\u2705', title: 'Ready to use', desc: 'Pre-configured and ready. Just insert your SIM and start.' },
            { icon: '\uD83D\uDCE1', title: 'Sandboxed Play', desc: 'Run Android apps in a fully sandboxed container — no Google access to your device.' },
            { icon: '\uD83D\uDD04', title: 'OTA updates', desc: 'GrapheneOS ships security updates independently from Google.' },
            { icon: '\uD83C\uDDEA\uD83C\uDDFA', title: 'EU-operated', desc: 'Operated under strict GDPR. Your data is never sold.' },
          ].map((f) => (
            <div key={f.title} className="smooth-card bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="text-2xl mb-3" aria-hidden="true">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/about" className="text-brand-400 hover:text-brand-500 text-sm">Read more about GrapheneOS →</Link>
        </div>
      </section>

      {reviews.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Customer Reviews</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((r) => (
              <ReviewCard key={r.id} author={r.author} rating={r.rating} text={r.text} createdAt={r.createdAt} />
            ))}
          </div>
        </section>
      )}

      <section className="smooth-card bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to take back your privacy?</h2>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          {state.isCampaignActive
            ? `Only ${state.unitsLeft} launch units left at €${state.nextPrice}. Price rises with each sale.`
            : `Standard price: €${state.nextPrice}. Ships 3–5 business days.`}
        </p>
        <Link href="/checkout" className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors min-h-[44px]">
          Buy Now — €{state.nextPrice}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
        <p className="mt-4 text-slate-500 text-sm">14-day right of withdrawal · EU consumer law</p>
      </section>
    </div>
  )
}
