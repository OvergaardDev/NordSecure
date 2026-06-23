import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/src/lib/prisma'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Privacy tips, GrapheneOS news, and updates from NordSecure.',
}

export default async function BlogPage() {
  const posts = await prisma.post.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
  })

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">Blog</h1>
        <p className="text-slate-400 mt-2">Privacy tips, GrapheneOS news, and updates.</p>
      </div>

      {posts.length === 0 ? (
        <p className="text-slate-400">No posts published yet.</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-600 transition-colors"
            >
              <Link href={`/blog/${post.slug}`} className="group">
                {post.featuredImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.featuredImage}
                    alt=""
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                {post.tags && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(JSON.parse(post.tags) as string[]).map((tag) => (
                      <span
                        key={tag}
                        className="bg-brand-500/10 text-brand-400 text-xs px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <h2 className="text-xl font-semibold text-white group-hover:text-brand-400 transition-colors mb-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-slate-400 text-sm leading-relaxed mb-3">{post.excerpt}</p>
                )}
                <p className="text-slate-500 text-xs">
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString('en-DK', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : ''}
                </p>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
