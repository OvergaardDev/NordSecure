import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Shipping & Returns' }

export default function ShippingPage() {
  return (
    <article className="max-w-2xl mx-auto space-y-6 text-slate-300 leading-relaxed">
      <h1 className="text-3xl font-bold text-white">Shipping &amp; Returns</h1>
      <p className="text-slate-500 text-sm"><strong className="text-amber-400">⚠️ Placeholder — update with your actual carrier and policies.</strong></p>

      <section>
        <h2 className="text-lg font-semibold text-white">Shipping</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>We ship to all EU countries.</li>
          <li>Processing time: 1–2 business days after payment confirmation.</li>
          <li>Estimated delivery: 3–5 business days within EU.</li>
          <li>Shipments are tracked. You will receive a tracking number by email.</li>
        </ul>
        
        <div className="mt-4 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50">
                <th className="px-4 py-3 text-left text-slate-300 font-semibold">Region</th>
                <th className="px-4 py-3 text-left text-slate-300 font-semibold">Countries</th>
                <th className="px-4 py-3 text-right text-slate-300 font-semibold">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-3 text-white font-medium">Denmark (Cheapest)</td>
                <td className="px-4 py-3 text-slate-400">Denmark</td>
                <td className="px-4 py-3 text-right text-white font-semibold">€7</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-3 text-white font-medium">Nordic</td>
                <td className="px-4 py-3 text-slate-400">Sweden, Norway, Finland</td>
                <td className="px-4 py-3 text-right text-white font-semibold">€10</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-3 text-white font-medium">Central Europe</td>
                <td className="px-4 py-3 text-slate-400">Germany, Poland, Netherlands, Belgium, France</td>
                <td className="px-4 py-3 text-right text-white font-semibold">€12</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-3 text-white font-medium">Southern Europe</td>
                <td className="px-4 py-3 text-slate-400">Italy, Spain, Portugal, Austria, Czech Republic</td>
                <td className="px-4 py-3 text-right text-white font-semibold">€18</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-3 text-white font-medium">Eastern Europe</td>
                <td className="px-4 py-3 text-slate-400">Hungary, Romania, Bulgaria, Slovakia, Croatia</td>
                <td className="px-4 py-3 text-right text-white font-semibold">€16</td>
              </tr>
              <tr className="border-t border-slate-800 bg-slate-900/50">
                <td className="px-4 py-3 text-amber-400 font-medium">Remote/Islands (Most Expensive)</td>
                <td className="px-4 py-3 text-slate-400">Greece, Cyprus, Malta, Portugal (Azores), Ireland (remote)</td>
                <td className="px-4 py-3 text-right text-amber-400 font-semibold">€28</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Returns (14-day withdrawal)</h2>
        <p>You have 14 days from receipt to return your order for any reason under EU consumer law.</p>
        <ul className="list-disc pl-5 mt-3 space-y-2">
          <li>Email <a href="mailto:support@nordsecure.eu" className="text-brand-400 hover:underline">support@nordsecure.eu</a> within 14 days of delivery to initiate a return.</li>
          <li>Device must be returned in original condition with original packaging.</li>
          <li>Return shipping costs are your responsibility.</li>
          <li>Refund is processed within 14 days of receiving the returned device.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Damaged or missing items</h2>
        <p>If your order arrives damaged or is missing, contact us within 48 hours of delivery at <a href="mailto:support@nordsecure.eu" className="text-brand-400 hover:underline">support@nordsecure.eu</a> with photos and your order number.</p>
      </section>
    </article>
  )
}
