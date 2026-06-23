'use client'

import { useState } from 'react'

type ReviewStatus = 'pending' | 'approved' | 'rejected'

interface Props {
  reviewId: number
  currentStatus: ReviewStatus
}

export function ReviewActions({ reviewId, currentStatus }: Props) {
  const [status, setStatus] = useState<ReviewStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  const update = async (next: ReviewStatus) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) setStatus(next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 text-xs">
      {status !== 'approved' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => update('approved')}
          className="text-brand-400 hover:underline disabled:opacity-60"
        >
          Approve
        </button>
      )}
      {status !== 'rejected' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => update('rejected')}
          className="text-red-400 hover:underline disabled:opacity-60"
        >
          Reject
        </button>
      )}
      {status !== 'pending' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => update('pending')}
          className="text-slate-400 hover:underline disabled:opacity-60"
        >
          Reset
        </button>
      )}
    </div>
  )
}
