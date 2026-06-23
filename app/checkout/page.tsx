import type { Metadata } from 'next'
import { prisma } from '@/src/lib/prisma'
import { getCampaignState, modelForOrder, priceForOrder } from '@/src/lib/campaign'
import { includeTestOrdersForStorefront, soldCountWhere } from '@/src/lib/sales'
import { CheckoutForm } from '@/components/CheckoutForm'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false },
}

export default async function CheckoutPage() {
  const soldCount = await prisma.order.count({
    where: soldCountWhere(includeTestOrdersForStorefront())
  })
  const state = getCampaignState(soldCount)
  const lockedPrice = priceForOrder(soldCount)
  const phoneModel = modelForOrder(soldCount)
  const total = lockedPrice
  const product = await prisma.product.findFirst()

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Checkout</h1>
        {state.isCampaignActive && (
          <p className="text-amber-400 text-sm mt-1">
            ⚡ {state.unitsLeft} launch units left at this price. Your price is locked at reservation.
          </p>
        )}
      </div>

      <CheckoutForm
        productSku={product?.sku ?? 'pixel-6-pro'}
        phoneModel={phoneModel}
        lockedPrice={lockedPrice}
        total={total}
      />

      <p className="mt-6 text-slate-600 text-xs text-center">
        By placing an order you agree to our{' '}
        <a href="/terms" className="underline">Terms</a>
        {' '}and{' '}
        <a href="/privacy" className="underline">Privacy Policy</a>.
        You have a 14-day right of withdrawal under EU consumer law.
      </p>
    </div>
  )
}
