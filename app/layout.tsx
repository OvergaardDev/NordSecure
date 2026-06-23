import './globals.css'
import React from 'react'
import type { Metadata } from 'next'
import { DemoBanner } from '@/components/DemoBanner'
import { Nav } from '@/components/Nav'

export const metadata: Metadata = {
  title: { default: 'NordSecure', template: '%s | NordSecure' },
  description: 'Google Pixel phones pre-flashed with GrapheneOS. Privacy-first, EU-operated.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isDemo = process.env.NEXT_PUBLIC_PAYMENT_MODE !== 'live'

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {isDemo && <DemoBanner />}
        <Nav />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-slate-800 py-10 mt-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid sm:grid-cols-3 gap-6 text-sm text-slate-400 mb-6">
              <div>
                <p className="font-semibold text-white mb-2">NordSecure</p>
                <p>Privacy-first Pixel phones,<br />operated in the EU.</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">Shop</p>
                <ul className="space-y-1">
                  <li><a href="/" className="hover:text-brand-400 transition-colors">Buy a phone</a></li>
                  <li><a href="/about" className="hover:text-brand-400 transition-colors">Why GrapheneOS?</a></li>
                  <li><a href="/blog" className="hover:text-brand-400 transition-colors">Blog</a></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">Legal</p>
                <ul className="space-y-1">
                  <li><a href="/privacy" className="hover:text-brand-400 transition-colors">Privacy Policy</a></li>
                  <li><a href="/terms" className="hover:text-brand-400 transition-colors">Terms</a></li>
                  <li><a href="/shipping" className="hover:text-brand-400 transition-colors">Shipping &amp; Returns</a></li>
                </ul>
              </div>
            </div>
            <p className="text-center text-slate-600 text-xs">
              © {new Date().getFullYear()} NordSecure
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
