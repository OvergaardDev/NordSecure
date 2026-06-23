import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { marked } from 'marked'
import { prisma } from '@/src/lib/prisma'

interface Props {
  params: { slug: string }
}

function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) {
    return { seoTitle: '', seoDescription: '', canonicalUrl: '', body: content }
  }

  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    meta[key] = value
  }

  return {
    seoTitle: meta.seoTitle ?? '',
    seoDescription: meta.seoDescription ?? '',
    canonicalUrl: meta.canonicalUrl ?? '',
    seoKeywords: meta.seoKeywords ?? '',
    body: match[2],
  }
}

function isHtmlContent(content: string) {
  return /<([a-z][\w-]*)(\s[^>]*)?>/i.test(content) || /&[a-z]+;/.test(content)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await prisma.post.findUnique({ where: { slug: params.slug } })
  if (!post) return {}
  const seo = parseFrontmatter(post.content)
  return {
    title: seo.seoTitle || post.title,
    description: seo.seoDescription || post.excerpt || undefined,
    keywords: seo.seoKeywords ? seo.seoKeywords.split(',').map((keyword) => keyword.trim()).filter(Boolean) : undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
  }
}

export default async function BlogPostPage({ params }: Props) {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug, status: 'published' },
  })
  if (!post) return notFound()

  const seo = parseFrontmatter(post.content)
  const html = isHtmlContent(seo.body) ? seo.body : marked.parse(seo.body, { breaks: true })

  return (
    <article className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/blog" className="text-slate-500 hover:text-slate-300 text-sm">
          ← Blog
        </Link>
      </div>

      {post.featuredImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.featuredImage}
          alt=""
          className="w-full h-56 object-cover rounded-xl mb-8"
        />
      )}

      {post.tags && (
        <div className="flex flex-wrap gap-2 mb-4">
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

      <h1 className="text-3xl font-bold text-white mb-3">{post.title}</h1>
      {post.publishedAt && (
        <time className="text-slate-500 text-sm">
          {new Date(post.publishedAt).toLocaleDateString('en-DK', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
      )}

      <div
        className="mt-8 prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-brand-400"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  )
}
