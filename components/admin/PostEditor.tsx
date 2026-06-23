'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import { marked } from 'marked'

interface PostFormProps {
  initialTitle?: string
  initialSlug?: string
  initialContent?: string
  initialExcerpt?: string
  initialTags?: string
  initialStatus?: string
  initialFeaturedImage?: string
  initialSeoKeywords?: string
  postId?: number
  isNew?: boolean
}

interface FrontmatterData {
  seoTitle: string
  seoDescription: string
  canonicalUrl: string
  seoKeywords: string
  body: string
}

function parseFrontmatter(content: string): FrontmatterData {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) {
    return { seoTitle: '', seoDescription: '', canonicalUrl: '', seoKeywords: '', body: content }
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

function buildFrontmatterContent(
  body: string,
  seoTitle: string,
  seoDescription: string,
  canonicalUrl: string,
  seoKeywords: string,
) {
  const lines = [
    `seoTitle: ${seoTitle}`,
    `seoDescription: ${seoDescription}`,
    `canonicalUrl: ${canonicalUrl}`,
    `seoKeywords: ${seoKeywords}`,
  ]
  return `---\n${lines.join('\n')}\n---\n${body}`.trim()
}

function isHtmlContent(content: string) {
  return /<([a-z][\w-]*)(\s[^>]*)?>/i.test(content) || /&[a-z]+;/.test(content)
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function articlePreviewClassName() {
  return 'prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-200 prose-strong:text-white prose-a:text-brand-300 prose-blockquote:border-brand-400 prose-blockquote:text-slate-300 prose-img:rounded-xl prose-img:border prose-img:border-slate-800'
}

function htmlToEditorContent(content: string) {
  const parsed = parseFrontmatter(content)
  if (!parsed.body) return '<p></p>'
  return isHtmlContent(parsed.body) ? parsed.body : marked.parse(parsed.body, { breaks: true })
}

export function PostEditor({
  initialTitle = '',
  initialSlug = '',
  initialContent = '',
  initialExcerpt = '',
  initialTags = '',
  initialStatus = 'draft',
  initialFeaturedImage = '',
  initialSeoKeywords = '',
  postId,
  isNew = false,
}: PostFormProps) {
  const router = useRouter()
  const initialData = useMemo(() => parseFrontmatter(initialContent), [initialContent])
  const initialEditorHtml = useMemo(() => htmlToEditorContent(initialContent), [initialContent])

  const [title, setTitle] = useState(initialTitle)
  const [slug, setSlug] = useState(initialSlug)
  const [excerpt, setExcerpt] = useState(initialExcerpt)
  const [tags, setTags] = useState(initialTags)
  const [status, setStatus] = useState(initialStatus)
  const [featuredImage, setFeaturedImage] = useState(initialFeaturedImage)
  const [seoTitle, setSeoTitle] = useState(initialData.seoTitle)
  const [seoDescription, setSeoDescription] = useState(initialData.seoDescription)
  const [canonicalUrl, setCanonicalUrl] = useState(initialData.canonicalUrl)
  const [seoKeywords, setSeoKeywords] = useState(initialSeoKeywords || initialData.seoKeywords)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  const autoSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: false,
        underline: false,
      }),
      Underline,
      Highlight,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: 'Write a polished article. Use headings, links, quotes, images, and lists like a real publish-ready page.',
      }),
    ],
    content: initialEditorHtml,
    editorProps: {
      attributes: {
        class:
          'min-h-[720px] rounded-b-2xl bg-slate-950 px-6 py-6 text-[16px] leading-8 text-slate-200 focus:outline-none prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-200 prose-strong:text-white prose-a:text-brand-300 prose-blockquote:border-brand-400 prose-blockquote:text-slate-300 prose-img:rounded-xl prose-img:border prose-img:border-slate-800',
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() === '<p></p>' && initialEditorHtml !== '<p></p>') {
      editor.commands.setContent(initialEditorHtml)
    }
  }, [editor, initialEditorHtml])

  const handleTitleChange = (t: string) => {
    setTitle(t)
    if (isNew) setSlug(autoSlug(t))
    if (!seoTitle) setSeoTitle(t.slice(0, 60))
  }

  const insertLink = () => {
    if (!editor) return
    const url = window.prompt('Paste the URL')
    if (!url) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const insertImageByUrl = () => {
    if (!editor || !imageUrl.trim()) return
    editor.chain().focus().setImage({ src: imageUrl.trim(), alt: title || 'Blog image' }).run()
    setImageUrl('')
  }

  const insertImageFromFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !editor) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }

    setUploadingImage(true)
    setError('')
    const imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('Failed to read image'))
      reader.readAsDataURL(file)
    }).catch(() => '')

    if (imageDataUrl) {
      editor.chain().focus().setImage({ src: imageDataUrl, alt: file.name }).run()
    }
    setUploadingImage(false)
    event.target.value = ''
  }

  const setParagraphVariant = (variant: 'normal' | 'lead' | 'muted') => {
    if (!editor) return
    const { state } = editor
    const { from, to } = state.selection
    const className = variant === 'lead' ? 'lead-paragraph' : variant === 'muted' ? 'muted-paragraph' : ''

    if (from === to) {
      editor.chain().focus().updateAttributes('paragraph', { class: className }).run()
      return
    }

    editor.commands.setTextSelection({ from, to })
    editor.chain().focus().updateAttributes('paragraph', { class: className }).run()
  }

  const addCallout = () => {
    if (!editor) return
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, '\n') || 'Callout text'
    editor.chain().focus().insertContent(`<blockquote class="callout-block">${selectedText}</blockquote>`).run()
  }

  const handleSave = async (publish = false) => {
    if (!editor) return
    setSaving(true)
    setError('')
    const payload = {
      title,
      slug,
      content: buildFrontmatterContent(editor.getHTML(), seoTitle, seoDescription, canonicalUrl, seoKeywords),
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

  const previewHtml = editor?.getHTML() ?? initialEditorHtml
  const wordCount = countWords(editor?.getText() ?? '')
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200))

  const articlePreview = (
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 px-6 py-8 shadow-2xl shadow-black/30">
      {featuredImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={featuredImage} alt={title} className="mb-6 w-full rounded-xl border border-slate-800 object-cover" />
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {(tags ? tags.split(',').map((tag) => tag.trim()).filter(Boolean) : []).map((tag) => (
          <span key={tag} className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs text-brand-300">
            {tag}
          </span>
        ))}
      </div>
      <h1 className="mb-3 text-4xl font-semibold tracking-tight text-white">{title || 'Post title'}</h1>
      <div className="mb-8 flex items-center gap-3 text-sm text-slate-400">
        <span>{wordCount} words</span>
        <span>•</span>
        <span>{readingMinutes} min read</span>
      </div>
      <div
        className="blog-article-content prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-200 prose-strong:text-white prose-a:text-brand-300 prose-blockquote:border-brand-400 prose-blockquote:text-slate-300 prose-img:rounded-xl prose-img:border prose-img:border-slate-800"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
    </article>
  )

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Post Details</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Edit Post</h2>
              </div>
              <div className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                {previewMode === 'split' ? 'Split view' : previewMode === 'preview' ? 'Preview' : 'Editor'}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Title</label>
                <input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-brand-500"
                  placeholder="Post title"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">SEO title</label>
                  <input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-brand-500"
                    placeholder="Search title"
                    maxLength={70}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Canonical URL</label>
                  <input
                    value={canonicalUrl}
                    onChange={(e) => setCanonicalUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-brand-500"
                    placeholder="https://nordsecure.eu/blog/..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-400">SEO description</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={2}
                  maxLength={160}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-brand-500"
                  placeholder="Search snippet description"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-400">SEO keywords</label>
                <input
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-brand-500"
                  placeholder="grapheneos, privacy phone, secure pixel"
                />
              </div>

              <p className="text-xs text-slate-500">SEO metadata is stored in the post body so the current database stays unchanged.</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Slug</label>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-white outline-none transition focus:border-brand-500"
                    placeholder="url-slug"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-brand-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-400">Excerpt</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-brand-500"
                  placeholder="Short description for SEO and blog list"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Tags</label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-brand-500"
                    placeholder="grapheneos, privacy, android"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Featured image URL</label>
                  <input
                    value={featuredImage}
                    onChange={(e) => setFeaturedImage(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-brand-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setPreviewMode('edit')} className={`rounded-lg px-3 py-2 text-sm transition ${previewMode === 'edit' ? 'bg-brand-500 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>Edit only</button>
              <button type="button" onClick={() => setPreviewMode('split')} className={`rounded-lg px-3 py-2 text-sm transition ${previewMode === 'split' ? 'bg-brand-500 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>Split view</button>
              <button type="button" onClick={() => setPreviewMode('preview')} className={`rounded-lg px-3 py-2 text-sm transition ${previewMode === 'preview' ? 'bg-brand-500 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>Preview only</button>
              <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">H1</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">H2</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">H3</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Bold</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Italic</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Underline</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">List</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Quote</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Code</button>
                <button type="button" onClick={insertLink} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Link</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleHighlight().run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Highlight</button>
                <button type="button" onClick={() => setParagraphVariant('lead')} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Lead</button>
                <button type="button" onClick={() => setParagraphVariant('muted')} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Muted</button>
                <button type="button" onClick={() => editor?.chain().focus().setTextAlign('left').run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Left</button>
                <button type="button" onClick={() => editor?.chain().focus().setTextAlign('center').run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Center</button>
                <button type="button" onClick={() => editor?.chain().focus().setTextAlign('right').run()} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Right</button>
                <button type="button" onClick={addCallout} className="rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">Callout</button>
                <label className="cursor-pointer rounded-lg bg-slate-900 px-2 py-1 hover:bg-slate-800">
                  {uploadingImage ? 'Uploading…' : 'Upload image'}
                  <input type="file" accept="image/*" onChange={insertImageFromFile} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {(previewMode === 'edit' || previewMode === 'split') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950">
              <EditorContent editor={editor} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {(previewMode === 'preview' || previewMode === 'split') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live Preview</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Exactly how it will look</h2>
                </div>
                <div className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                  {wordCount} words · {readingMinutes} min
                </div>
              </div>
              {articlePreview}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-300">
            <h3 className="mb-3 text-base font-semibold text-white">SEO + layout controls</h3>
            <div className="space-y-2 text-slate-400">
              <p>Use headings to structure the article, bold and callouts for emphasis, and text alignment for layout control.</p>
              <p>Inline images and image uploads are supported, so you can place visuals where they belong in the story.</p>
              <p>The live preview uses the same article styling as the public blog page, so you can fine-tune the post before publishing.</p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !editor}
              className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-600 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !editor}
              className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-400 disabled:opacity-60"
            >
              {saving ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .ProseMirror {
          min-height: 720px;
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #64748b;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror p.lead-paragraph {
          font-size: 1.15rem;
          line-height: 1.9rem;
          color: #e2e8f0;
        }
        .ProseMirror p.muted-paragraph {
          color: #94a3b8;
          font-size: 0.95rem;
        }
        .ProseMirror blockquote.callout-block {
          border-left: 4px solid rgb(94 234 212);
          background: rgba(15, 23, 42, 0.8);
          border-radius: 0.75rem;
          padding: 1rem 1.25rem;
          color: #e2e8f0;
        }
        .ProseMirror img {
          max-width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(30 41 59);
        }
        .blog-article-content p {
          margin-bottom: 1.15rem;
        }
        .blog-article-content h1,
        .blog-article-content h2,
        .blog-article-content h3,
        .blog-article-content h4 {
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  )
}
