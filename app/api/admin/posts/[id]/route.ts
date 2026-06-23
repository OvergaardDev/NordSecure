import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

interface Params { params: { id: string } }

function parseRouteId(rawId: string) {
  const id = Number.parseInt(rawId, 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function GET(_req: Request, { params }: Params) {
  const id = parseRouteId(params.id)
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  const post = await prisma.post.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(post)
}

export async function PUT(req: Request, { params }: Params) {
  const id = parseRouteId(params.id)
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  const body = await req.json()
  const { title, slug, content, excerpt, tags, status, featuredImage } = body
  const post = await prisma.post.update({
    where: { id },
    data: {
      title,
      slug,
      content,
      excerpt,
      tags: tags ?? null,
      status,
      featuredImage: featuredImage ?? null,
      publishedAt: status === 'published' ? new Date() : undefined,
    },
  })
  return NextResponse.json(post)
}

export async function DELETE(_req: Request, { params }: Params) {
  const id = parseRouteId(params.id)
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  await prisma.post.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
