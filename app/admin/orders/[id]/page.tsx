import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/src/lib/prisma'
import { OrderStatusUpdater } from '@/components/admin/OrderStatusUpdater'
import { countryName, shippingRequirementsFromDenmark } from '@/src/lib/shipping'

interface Props {
  params: { id: string }
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const id = parseInt(params.id)
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  })
  if (!order) return notFound()
  const shippingRequirements = shippingRequirementsFromDenmark(order.country)

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders" className="text-slate-500 hover:text-slate-300 text-sm">← Orders</Link>
        <h1 className="text-2xl font-bold text-white">{order.orderNumber}</h1>
        {order.isTest && (
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2 py-0.5 rounded">
            TEST
          </span>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-white">Customer</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-slate-400">Payment</dt><dd className="text-white">{order.paymentMethod.toUpperCase()}</dd>
          <dt className="text-slate-400">Payment asset</dt><dd className="text-white">{order.paymentAsset?.toUpperCase() ?? '—'}</dd>
          <dt className="text-slate-400">Name</dt><dd className="text-white">{order.customerName}</dd>
          <dt className="text-slate-400">Email</dt><dd className="text-white">{order.customerEmail}</dd>
          <dt className="text-slate-400">Phone</dt><dd className="text-white">{order.shippingPhone ?? 'Missing'}</dd>
          <dt className="text-slate-400">Company</dt><dd className="text-white">{order.shippingCompany ?? '—'}</dd>
          <dt className="text-slate-400">Address line 1</dt><dd className="text-white">{order.shippingAddressLine1 ?? 'Missing'}</dd>
          <dt className="text-slate-400">Address line 2</dt><dd className="text-white">{order.shippingAddressLine2 ?? '—'}</dd>
          <dt className="text-slate-400">Postal code</dt><dd className="text-white">{order.shippingPostalCode ?? 'Missing'}</dd>
          <dt className="text-slate-400">City</dt><dd className="text-white">{order.shippingCity ?? 'Missing'}</dd>
          <dt className="text-slate-400">State/region</dt><dd className="text-white">{order.shippingRegion ?? '—'}</dd>
          <dt className="text-slate-400">Country</dt><dd className="text-white">{countryName(order.country)} ({order.country})</dd>
          <dt className="text-slate-400">Tax ID / EORI</dt><dd className="text-white">{order.recipientTaxId ?? '—'}</dd>
          <dt className="text-slate-400">Delivery notes</dt><dd className="text-white">{order.deliveryInstructions ?? '—'}</dd>
        </dl>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-white">Shipping Requirements</h2>
        <p className="text-sm text-slate-300">
          Destination: <span className="text-white">{countryName(order.country)}</span>.
          {' '}Customs declaration required:{' '}
          <span className={shippingRequirements.customsRequired ? 'text-amber-400' : 'text-emerald-400'}>
            {shippingRequirements.customsRequired ? 'Yes' : 'No (EU single market)'}
          </span>
        </p>
        <div>
          <h3 className="text-sm font-semibold text-white mb-2">Always required</h3>
          <ul className="text-sm text-slate-300 list-disc pl-5 space-y-1">
            {shippingRequirements.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {shippingRequirements.customsChecklist.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">For non-EU Europe destinations</h3>
            <ul className="text-sm text-slate-300 list-disc pl-5 space-y-1">
              {shippingRequirements.customsChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-white">Items</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-white">{item.product.name} × {item.quantity}</span>
            <span className="text-slate-300">€{item.unitPrice} (locked)</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold">
          <span className="text-white">Total</span>
          <span className="text-white">€{order.totalAmount}</span>
        </div>
      </div>

      {/* Status update form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-white">Status</h2>
        <OrderStatusUpdater orderId={order.id} initialStatus={order.status as 'pending' | 'paid' | 'shipped' | 'cancelled'} />
        <p className="text-slate-500 text-xs">
          Note: use the API endpoint PATCH /api/admin/orders/{'{'}id{'}'} for programmatic updates.
        </p>
      </div>
    </div>
  )
}
