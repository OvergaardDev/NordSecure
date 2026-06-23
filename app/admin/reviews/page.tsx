import type { Metadata } from 'next'
import { prisma } from '@/src/lib/prisma'
import { ReviewActions } from '@/components/admin/ReviewActions'

export const metadata: Metadata = { title: 'Reviews | Admin' }

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    include: { product: true },
  })

  const pending = reviews.filter((r) => r.status === 'pending')
  const ReviewRow = ({ r }: { r: typeof reviews[0] }) => (
    <tr className="border-t border-slate-800 hover:bg-slate-900/50">
      <td className="px-4 py-3 text-white text-sm">{r.author}</td>
      <td className="px-4 py-3 text-slate-400 text-sm">{r.product.name}</td>
      <td className="px-4 py-3 text-amber-400 text-sm">{'★'.repeat(r.rating)}</td>
      <td className="px-4 py-3 text-slate-300 text-sm max-w-xs truncate">{r.text}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded text-xs border ${
          r.status === 'approved'
            ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
            : r.status === 'rejected'
            ? 'bg-red-500/20 text-red-400 border-red-500/30'
            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        }`}>{r.status}</span>
      </td>
      <td className="px-4 py-3">
        <ReviewActions reviewId={r.id} currentStatus={r.status as 'pending' | 'approved' | 'rejected'} />
      </td>
    </tr>
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        {pending.length > 0 && (
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2 py-1 rounded">
            {pending.length} pending
          </span>
        )}
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Pending moderation</h2>
          <div className="table-responsive rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Author</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Rating</th>
                  <th className="px-4 py-3 text-left">Review</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => <ReviewRow key={r.id} r={r} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">All reviews ({reviews.length})</h2>
        <div className="table-responsive rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Author</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Rating</th>
                <th className="px-4 py-3 text-left">Review</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => <ReviewRow key={r.id} r={r} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
