import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/src/lib/prisma'

export const metadata: Metadata = { title: 'Blog CMS | Admin' }

export default async function AdminPostsPage() {
  const posts = await prisma.post.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Blog / CMS</h1>
        <Link
          href="/admin/posts/new"
          className="bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New post
        </Link>
      </div>

      <div className="space-y-3">
        {posts.length === 0 && <p className="text-slate-400">No posts yet.</p>}
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded border ${
                  post.status === 'published'
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>{post.status}</span>
                <h3 className="font-medium text-white truncate">{post.title}</h3>
              </div>
              <p className="text-slate-500 text-xs font-mono">/{post.slug}</p>
              {post.excerpt && (
                <p className="text-slate-400 text-sm mt-1 line-clamp-1">{post.excerpt}</p>
              )}
            </div>
            <div className="flex gap-3 flex-shrink-0">
              {post.status === 'published' && (
                <Link
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  className="text-slate-400 hover:text-white text-xs"
                >
                  View ↗
                </Link>
              )}
              <Link
                href={`/admin/posts/${post.id}/edit`}
                className="text-brand-400 hover:underline text-xs"
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
