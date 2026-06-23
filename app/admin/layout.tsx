import Link from 'next/link'
import React from 'react'

const navLinks = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/orders', label: 'Orders', icon: '📦' },
  { href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
  { href: '/admin/posts/new', label: 'New Post', icon: '➕' },
  { href: '/admin/posts', label: 'Blog / CMS', icon: '✏️' },
  { href: '/admin/inventory', label: 'Inventory', icon: '🏪' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-amber-400 text-amber-950 text-center text-xs font-semibold py-1 px-4">
        ADMIN DASHBOARD — {process.env.NEXT_PUBLIC_PAYMENT_MODE === 'live' ? '🔴 LIVE' : '🟡 DEMO MODE'}
      </div>

      <div className="flex min-h-[calc(100vh-24px)]">
        {/* Sidebar — hidden on mobile, drawer via CSS */}
        <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950 pt-6 pb-4">
          <div className="px-4 mb-6">
            <Link href="/" className="text-brand-400 font-bold text-sm">← NordSecure</Link>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
              >
                <span aria-hidden="true">{l.icon}</span>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="px-4 mt-4">
            <form action="/api/admin/logout" method="POST">
              <button className="text-slate-600 hover:text-slate-400 text-xs transition-colors w-full text-left">
                Log out
              </button>
            </form>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="md:hidden w-full">
          <div className="border-b border-slate-800 bg-slate-950 px-4 py-3 overflow-x-auto">
            <div className="flex gap-3 min-w-max">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <span aria-hidden="true">{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-auto px-4 md:px-8 py-8">{children}</main>
      </div>
    </div>
  )
}
