import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl mx-auto space-y-6 text-slate-300 leading-relaxed">
      <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
      <p className="text-slate-500 text-sm">Last updated: [TODO — insert date]. <strong className="text-amber-400">⚠️ This is a placeholder. Have this reviewed by a legal professional before going live.</strong></p>

      <section>
        <h2 className="text-lg font-semibold text-white">Who we are</h2>
        <p>NordSecure is a sole proprietorship operated in the EU. Contact: <a href="mailto:support@nordsecure.eu" className="text-brand-400 hover:underline">support@nordsecure.eu</a>.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">What data we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Order data: name, email, shipping address, country — to fulfill your order.</li>
          <li>Anonymous analytics events: page views, checkout starts, purchases (no cross-site tracking, no PII).</li>
          <li>No advertising trackers. No Google Analytics. No third-party scripts that phone home.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Legal basis (GDPR)</h2>
        <p>Order data is processed on the basis of contract performance (Art. 6(1)(b) GDPR). Analytics are processed on the basis of legitimate interests (Art. 6(1)(f) GDPR) — the analytics are first-party only and use an anonymous session ID with no cross-site tracking.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Data retention</h2>
        <p>Order data is retained for 5 years for tax purposes. Analytics data is retained for 2 years. You may request deletion at any time.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Your rights</h2>
        <p>Under GDPR you have the right to access, rectify, erase, restrict, or port your data. Contact <a href="mailto:support@nordsecure.eu" className="text-brand-400 hover:underline">support@nordsecure.eu</a> to exercise these rights.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Cookies</h2>
        <p>We set one session cookie for analytics (anonymous, no PII) and one for admin login. No advertising or tracking cookies are used.</p>
      </section>
    </article>
  )
}
