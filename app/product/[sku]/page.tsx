import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/src/lib/prisma'
import { getCampaignState } from '@/src/lib/campaign'
import { includeTestOrdersForStorefront, soldCountWhere } from '@/src/lib/sales'
import { ReviewCard } from '@/components/ReviewCard'
import { CampaignPrice } from '@/components/CampaignPrice'

interface Props {
  params: { sku: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await prisma.product.findUnique({ where: { sku: params.sku } })
  if (!product) return {}
  return {
    title: product.name,
    description: product.description ?? undefined,
  }
}

export default async function ProductPage({ params }: Props) {
  const [product, soldCount, reviews] = await Promise.all([
    prisma.product.findUnique({ where: { sku: params.sku } }),
    prisma.order.count({ where: soldCountWhere(includeTestOrdersForStorefront()) }),
    prisma.review.findMany({
      where: { status: 'approved', product: { sku: params.sku } },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  if (!product) return notFound()
  const state = getCampaignState(soldCount)

  const specs = [
    { label: 'Operating System', value: 'GrapheneOS (latest stable)' },
    { label: 'Base Device', value: 'Google Pixel (latest supported model)' },
    { label: 'Bootloader', value: 'Relocked after flash' },
    { label: 'Google services', value: 'None by default (optional sandboxed)' },
    { label: 'Warranty', value: '1 year limited (hardware)' },
    { label: 'Ships from', value: 'EU' },
    { label: 'Estimated delivery', value: '3–5 business days (EU)' },
  ]

  return (
    <div className="space-y-16">
      {/* Product hero */}
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Image */}
        <div className="lg:w-1/2">
          <div className="aspect-square bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-8xl mb-4" aria-hidden="true">📱</div>
              <p className="text-slate-400 text-sm">
                Google Pixel<br />
                <span className="text-brand-400 font-medium">GrapheneOS pre-installed</span>
              </p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="lg:w-1/2 space-y-6">
          <div>
            <p className="text-brand-400 text-sm font-medium mb-2">Privacy Phone</p>
            <h1 className="text-3xl font-bold text-white">{product.name}</h1>
            {product.description && (
              <p className="text-slate-400 mt-3 leading-relaxed">{product.description}</p>
            )}
          </div>

          <CampaignPrice />

          <div className="text-sm text-slate-400 space-y-1">
            <p>✓ 14-day right of withdrawal (EU)</p>
            <p>✓ Ships within 3–5 business days</p>
            <p>✓ Support via email</p>
          </div>
        </div>
      </div>

      {/* Specs table */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">What&rsquo;s included &amp; specs</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {specs.map((s, i) => (
                <tr key={s.label} className={i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/50'}>
                  <td className="px-5 py-3 text-slate-400 font-medium w-1/3">{s.label}</td>
                  <td className="px-5 py-3 text-white">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-slate-500 text-sm">
          <Link href="/about" className="text-brand-400 hover:underline">Learn more about GrapheneOS</Link> and what it means for your privacy.
        </p>
      </section>

      {/* What is GrapheneOS */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8">
        <h2 className="text-xl font-bold text-white mb-4">What&rsquo;s pre-configured?</h2>
        <ul className="space-y-3 text-slate-300 text-sm">
          {[
            'GrapheneOS installed and verified — bootloader relocked for maximum security',
            'No Google apps, no Google Play Services by default',
            'Sandboxed Google Play available optionally (install any Android app safely)',
            'Network permission controls per app',
            'Storage scoped access for all apps',
            'Auto-reboot and auto-updates enabled',
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="text-brand-400 mt-0.5 flex-shrink-0">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Reviews */}
      <section>
        <h2 className="text-xl font-bold text-white mb-6">
          Customer Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="text-slate-400">No reviews yet. Be the first!</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {reviews.map((r) => (
              <ReviewCard
                key={r.id}
                author={r.author}
                rating={r.rating}
                text={r.text}
                createdAt={r.createdAt}
              />
            ))}
          </div>
        )}
      </section>

      {/* Buy CTA */}
      <div className="text-center py-4">
        <Link
          href="/checkout"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors min-h-[44px]"
        >
          Buy Now — €{state.nextPrice}
        </Link>
      </div>
    </div>
  )
}
