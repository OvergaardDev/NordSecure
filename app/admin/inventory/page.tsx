import type { Metadata } from 'next'
import { prisma } from '@/src/lib/prisma'
import {
  campaignPrices,
  getCampaignState,
  modelForOrder,
  postCampaignStandardModel,
  postCampaignStandardPrice,
  promoModelsAfterHistoricFirstSale
} from '@/src/lib/campaign'
import { includeTestOrdersForStorefront, soldCountWhere } from '@/src/lib/sales'
import { InventorySettingsForm } from '@/components/admin/InventorySettingsForm'
import { CouponManager } from '@/components/admin/CouponManager'

export const metadata: Metadata = { title: 'Inventory | Admin' }

export default async function AdminInventoryPage() {
  const soldCount = await prisma.order.count({
    where: soldCountWhere(includeTestOrdersForStorefront())
  })
  const state = getCampaignState(soldCount)
  const currentModel = modelForOrder(soldCount)
  const product = await prisma.product.findFirst()
  const coupons = await prisma.coupon.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
  })
  const productImages = (() => {
    if (!product?.images) return [] as string[]
    try {
      const parsed = JSON.parse(product.images)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((x): x is string => typeof x === 'string')
    } catch {
      return []
    }
  })()

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Inventory &amp; Pricing</h1>

      {/* Campaign state */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-white">Campaign State</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 mb-1">Units sold (non-test)</p>
            <p className="text-2xl font-bold text-white">{soldCount} / {campaignPrices.length}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-1">Current price</p>
            <p className="text-2xl font-bold text-brand-400">€{state.nextPrice}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-1">Current model</p>
            <p className="text-2xl font-bold text-white">{currentModel}</p>
          </div>
        </div>

        <div>
          <p className="text-slate-400 text-sm mb-2">Campaign ladder</p>
          <div className="flex gap-2">
            {campaignPrices.map((price, i) => (
              <div
                key={i}
                className={`flex-1 rounded-lg py-3 text-center text-xs font-medium border ${
                  i < soldCount
                    ? 'bg-brand-500/20 border-brand-500/40 text-brand-400'
                    : i === soldCount
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-600'
                }`}
              >
                {i < soldCount ? `✓ €${price}` : `€${price}`}
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-2">
            Post-campaign standard price: €{postCampaignStandardPrice}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Post-campaign standard model: {postCampaignStandardModel}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Promo model allocation (after historic first sale): {promoModelsAfterHistoricFirstSale.join(' · ')}
          </p>
        </div>

        {state.isCampaignActive ? (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-lg p-3">
            Campaign is active. {state.unitsLeft} unit(s) remaining at current launch prices.
          </div>
        ) : (
          <div className="bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm rounded-lg p-3">
            Campaign complete. Shop is now selling at standard price €{postCampaignStandardPrice}.
          </div>
        )}
      </div>

      {/* Product info */}
      {product && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
          <h2 className="font-semibold text-white">Product</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-slate-400">SKU</dt><dd className="text-white font-mono">{product.sku}</dd>
            <dt className="text-slate-400">Name</dt><dd className="text-white">{product.name}</dd>
            <dt className="text-slate-400">Status</dt><dd className="text-white">{product.isActive ? 'Active' : 'Inactive'}</dd>
            <dt className="text-slate-400">Standard price</dt><dd className="text-white">€{product.standardPrice}</dd>
            <dt className="text-slate-400">Standard stock</dt><dd className="text-white">{product.standardStock}</dd>
            <dt className="text-slate-400">Low stock threshold</dt><dd className="text-white">{product.lowStockThreshold}</dd>
            <dt className="text-slate-400">Max per order</dt><dd className="text-white">{product.maxPerOrder}</dd>
          </dl>

          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-3">Edit inventory settings</h3>
            <InventorySettingsForm
              productId={product.id}
              initialSku={product.sku}
              initialName={product.name}
              initialDescription={product.description ?? ''}
              initialImages={productImages}
              initialStandardPrice={product.standardPrice}
              initialStandardStock={product.standardStock}
              initialLowStockThreshold={product.lowStockThreshold}
              initialMaxPerOrder={product.maxPerOrder}
              initialIsActive={product.isActive}
            />
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-white">Coupons</h2>
          <p className="text-sm text-slate-400 mt-1">Create and manage discount codes for checkout campaigns.</p>
        </div>
        <CouponManager initialCoupons={coupons} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm text-slate-400">
        <p className="font-medium text-white mb-2">To change campaign prices:</p>
        <p>Edit the <code className="text-brand-400 bg-slate-800 px-1 rounded">campaignPrices</code> array in{' '}
          <code className="text-brand-400 bg-slate-800 px-1 rounded">src/lib/campaign.ts</code>.
          Changes take effect on next deployment. Campaign prices are intentionally stored as a
          fixed array to prevent rounding bugs.
        </p>
      </div>
    </div>
  )
}
