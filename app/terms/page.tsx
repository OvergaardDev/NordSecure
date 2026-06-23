import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms & Conditions' }

export default function TermsPage() {
  return (
    <article className="max-w-2xl mx-auto space-y-6 text-slate-300 leading-relaxed">
      <h1 className="text-3xl font-bold text-white">Terms &amp; Conditions</h1>
      <p className="text-slate-500 text-sm"><strong className="text-amber-400">⚠️ Placeholder — have reviewed by a legal professional before going live.</strong></p>

      <section>
        <h2 className="text-lg font-semibold text-white">Seller</h2>
        <p>NordSecure (EU). Contact: <a href="mailto:support@nordsecure.eu" className="text-brand-400 hover:underline">support@nordsecure.eu</a>.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Products</h2>
        <p>We sell Google Pixel smartphones pre-flashed with GrapheneOS. Devices are new unless otherwise stated. GrapheneOS is open-source software; we are not affiliated with the GrapheneOS project.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Prices</h2>
        <p>All prices are shown in EUR. Any shipping costs are shown at checkout before payment confirmation.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">14-day right of withdrawal</h2>
        <p>As an EU consumer you have the right to withdraw from this contract within 14 days of receiving your order, without giving a reason. To exercise this right, contact us at <a href="mailto:support@nordsecure.eu" className="text-brand-400 hover:underline">support@nordsecure.eu</a> within 14 days. Return shipping is at your cost. The device must be in original condition. Refund is issued within 14 days of receiving the returned item.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Warranty</h2>
        <p>Hardware carries a 2-year statutory warranty under EU consumer law. GrapheneOS software is provided as-is; we provide setup support but are not responsible for third-party app issues.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Governing law</h2>
        <p>These terms are governed by applicable EU and local consumer law in your jurisdiction. Please have this section reviewed by legal counsel before launch.</p>
      </section>
    </article>
  )
}
