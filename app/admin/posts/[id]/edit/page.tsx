import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/src/lib/prisma'
import { PostEditor } from '@/components/admin/PostEditor'

export const metadata: Metadata = { title: 'Edit Post | Admin' }

interface Props {
  params: { id: string }
}

export default async function EditPostPage({ params }: Props) {
  const post = await prisma.post.findUnique({ where: { id: parseInt(params.id) } })
  if (!post) return notFound()

  const tags = post.tags ? (JSON.parse(post.tags) as string[]).join(', ') : ''

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Edit Post</h1>
      <PostEditor
        postId={post.id}
        initialTitle={post.title}
        initialSlug={post.slug}
        initialContent={post.content}
        initialExcerpt={post.excerpt ?? ''}
        initialTags={tags}
        initialStatus={post.status}
        initialFeaturedImage={post.featuredImage ?? ''}
      />
    </div>
  )
}
