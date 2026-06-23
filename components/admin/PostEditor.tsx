'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PostFormProps {
  initialTitle?: string
  initialSlug?: string
  initialContent?: string
  initialExcerpt?: string
  initialTags?: string
  initialStatus?: string
  initialFeaturedImage?: string
  postId?: number
  isNew?: boolean
}

export function PostEditor({
  initialTitle = '',
  initialSlug = '',
  initialContent = '',
  initialExcerpt = '',
  initialTags = '',
  initialStatus = 'draft',
  initialFeaturedImage = '',
  postId,
  isNew = false,
}: PostFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [slug, setSlug] = useState(initialSlug)
  const [content, setContent] = useState(initialContent)
  const [excerpt, setExcerpt] = useState(initialExcerpt)
  const [tags, setTags] = useState(initialTags)
  const [status, setStatus] = useState(initialStatus)
  const [featuredImage, setFeaturedImage] = useState(initialFeaturedImage)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const autoSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleTitleChange = (t: string) => {
    setTitle(t)
    if (isNew) setSlug(autoSlug(t))
  }

  const handleSave = async (publish = false) => {
    setSaving(true)
    setError('')
    const payload = {
      title,
      slug,
      content,
      excerpt,
      tags: JSON.stringify(tags.split(',').map((t) => t.trim()).filter(Boolean)),
      status: publish ? 'published' : status,
      featuredImage,
    }
    const url = isNew ? '/api/admin/posts' : `/api/admin/posts/${postId}`
    const method = isNew ? 'POST' : 'PUT'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      router.push('/admin/posts')
      router.refresh()
    } else {
      const d = await res.json()
      setError(d.error ?? 'Save failed')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg p-3">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
            placeholder="Post title"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-brand-500 focus:outline-none"
              placeholder="url-slug"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Excerpt</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none resize-none"
            placeholder="Short description for SEO and blog list"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
              placeholder="grapheneos, privacy, android"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Featured image URL</label>
            <input
              value={featuredImage}
              onChange={(e) => setFeaturedImage(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* Content editor */}
      <div>
        <div className="flex gap-2 mb-2">
          {(['write', 'preview'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'write' ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={18}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm font-mono focus:border-brand-500 focus:outline-none resize-y"
            placeholder="Write in Markdown…"
          />
        ) : (
          <div
            className="min-h-[300px] bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: content || '<p class="text-slate-500">Nothing to preview.</p>',
            }}
          />
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  )
}
