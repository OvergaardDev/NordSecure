import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Why GrapheneOS?',
  description: 'The case for de-Googled Android. What GrapheneOS is and why it matters.',
}

export default function AboutPage() {
  return (
    <article className="max-w-2xl mx-auto prose prose-invert prose-sm max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Why GrapheneOS?</h1>
      <p className="text-slate-400 text-lg mb-8">The case for a truly private phone.</p>

      <div className="space-y-6 text-slate-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white">Your phone knows everything</h2>
          <p>
            The average smartphone sends location, app usage, browsing habits, contacts, and more to
            Google (Android) or Apple (iOS) by default. This data is used for advertising, sold to
            data brokers, and accessible to governments under legal requests.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">What is GrapheneOS?</h2>
          <p>
            GrapheneOS is a privacy and security focused mobile OS built on Android Open Source
            Project. It ships without Google apps or services, has significantly hardened security
            compared to stock Android, and gives you full control of your device.
          </p>
          <p className="mt-3">
            It&rsquo;s developed by a team of security researchers and is recommended by{' '}
            <strong className="text-white">Edward Snowden</strong>,{' '}
            <strong className="text-white">Privacy Guides</strong>, and the broader security
            community.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">Key privacy features</h2>
          <ul className="space-y-2 mt-3 list-none pl-0">
            {[
              'Network permission controls — apps can only use the internet if you allow them',
              'Sensors permission — apps can be denied microphone and camera access system-wide',
              'Storage scoped access — apps can only access the files you explicitly share',
              'Sandboxed Google Play — run any Android app without giving Google access to your device',
              'Memory allocator hardening — prevents many classes of exploits',
              'Verified boot — ensures your OS hasn\'t been tampered with',
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-brand-400 flex-shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">Why buy from NordSecure?</h2>
          <p>
            Installing GrapheneOS correctly requires unlocking and relocking the bootloader, which
            invalidates warranty if not done properly. We handle the installation professionally,
            verify the installation, and reship to you with the bootloader properly relocked.
          </p>
          <p className="mt-3">
            We&rsquo;re a small EU operation. We don&rsquo;t track you, don&rsquo;t collect
            unnecessary data, and all analytics are first-party and privacy-respecting.
          </p>
        </section>

        <div className="mt-8 text-center">
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
          >
            Get yours →
          </Link>
        </div>
      </div>
    </article>
  )
}
