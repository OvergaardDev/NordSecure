import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const posts = await prisma.post.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(posts)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { title, slug, content, excerpt, tags, status, featuredImage } = body
  if (!title || !slug || !content) {
    return NextResponse.json({ error: 'title, slug, content required' }, { status: 400 })
  }
  const post = await prisma.post.create({
    data: {
      title,
      slug,
      content,
      excerpt,
      tags: tags ?? null,
      status: status ?? 'draft',
      featuredImage: featuredImage ?? null,
      publishedAt: status === 'published' ? new Date() : null,
    },
  })
  return NextResponse.json(post, { status: 201 })
}
