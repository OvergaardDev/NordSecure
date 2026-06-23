import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000)
}

async function main() {
  console.log('🌱 Seeding NordSecure demo data…')

  const product = await prisma.product.upsert({
    where: { sku: 'pixel-8-pro-grapheneos' },
    update: {},
    create: {
      sku: 'pixel-8-pro-grapheneos',
      name: 'Google Pixel 8 Pro — GrapheneOS pre-installed',
      description: 'The Pixel 8 Pro offers the best hardware for GrapheneOS. Pre-flashed, bootloader relocked, and ready to use.',
      images: JSON.stringify([]),
      standardPrice: 800,
      standardStock: 25,
    },
  })
  console.log(`  ✓ Product: ${product.name}`)

  // SQLite: sequential writes to avoid lock contention
  const c0 = await prisma.customer.upsert({ where: { email: 'lars.andersen@example.dk' }, update: {}, create: { email: 'lars.andersen@example.dk', name: 'Lars Andersen' } })
  const c1 = await prisma.customer.upsert({ where: { email: 'emma.hansen@example.de' }, update: {}, create: { email: 'emma.hansen@example.de', name: 'Emma Hansen' } })
  const c2 = await prisma.customer.upsert({ where: { email: 'jan.kowalski@example.pl' }, update: {}, create: { email: 'jan.kowalski@example.pl', name: 'Jan Kowalski' } })
  const c3 = await prisma.customer.upsert({ where: { email: 'demo@test.example' }, update: {}, create: { email: 'demo@test.example', name: 'Demo Test User' } })
  const customers = [c0, c1, c2, c3]
  console.log(`  ✓ ${customers.length} customers`)

  const orderData = [
    // Exactly 1 real sold launch phone, 4 still for sale
    { orderNumber: 'ORD-2001', customerName: 'Lars Andersen', customerEmail: 'lars.andersen@example.dk', shippingPhone: '+45 20 10 10 10', shippingAddressLine1: 'Nordre Frihavnsgade 12', shippingCity: 'Kobenhavn', shippingPostalCode: '2100', customerId: customers[0].id, country: 'DK', vatAmount: 0, totalAmount: 400, isTest: false, status: 'shipped', unitPrice: 400, createdAt: daysAgo(42) },
    { orderNumber: 'ORD-2002', customerName: 'Emma Hansen', customerEmail: 'emma.hansen@example.de', shippingPhone: '+49 160 1234567', shippingAddressLine1: 'Friedrichstrasse 44', shippingCity: 'Berlin', shippingPostalCode: '10117', customerId: customers[1].id, country: 'DE', vatAmount: 0, totalAmount: 465, isTest: false, status: 'pending', unitPrice: 465, createdAt: daysAgo(30) },
    { orderNumber: 'ORD-2003', customerName: 'Jan Kowalski', customerEmail: 'jan.kowalski@example.pl', shippingPhone: '+48 501 444 222', shippingAddressLine1: 'ul. Chmielna 22', shippingCity: 'Warszawa', shippingPostalCode: '00-020', customerId: customers[2].id, country: 'PL', vatAmount: 0, totalAmount: 535, isTest: false, status: 'pending', unitPrice: 535, createdAt: daysAgo(14) },
    { orderNumber: 'ORD-T001', customerName: 'Test User', customerEmail: 'test@example.com', shippingPhone: '+45 31 00 00 00', shippingAddressLine1: 'Testvej 1', shippingCity: 'Aarhus', shippingPostalCode: '8000', customerId: customers[3].id, country: 'DK', vatAmount: 0, totalAmount: 605, isTest: true, status: 'pending', unitPrice: 605, createdAt: daysAgo(7) },
    { orderNumber: 'ORD-T002', customerName: 'Demo User', customerEmail: 'demo@test.example', shippingPhone: '+46 70 123 45 67', shippingAddressLine1: 'Drottninggatan 10', shippingCity: 'Stockholm', shippingPostalCode: '111 51', customerId: customers[3].id, country: 'SE', vatAmount: 0, totalAmount: 465, isTest: true, status: 'pending', unitPrice: 465, createdAt: daysAgo(2) },
  ]

  for (const od of orderData) {
    const { unitPrice, ...rest } = od
    await prisma.order.upsert({ where: { orderNumber: od.orderNumber }, update: {}, create: { ...rest, items: { create: { productId: product.id, quantity: 1, unitPrice } } } })
  }
  console.log(`  ✓ ${orderData.length} orders`)

  const reviewData = [
    { author: 'Lars A.', rating: 5, text: 'Excellent device, arrived quickly. GrapheneOS is running smoothly.', status: 'approved', createdAt: daysAgo(38) },
    { author: 'Emma H.', rating: 5, text: 'Love it. Very professional installation. Bootloader relocked, everything verified.', status: 'approved', createdAt: daysAgo(26) },
    { author: 'J. Kowalski', rating: 4, text: 'Great phone. Small shipping delay but communicated well. Very happy.', status: 'approved', createdAt: daysAgo(10) },
    { author: 'Anonymous', rating: 5, text: 'Sandboxed Play works great for the few apps I still need.', status: 'pending', createdAt: daysAgo(3) },
  ]
  for (const rd of reviewData) {
    await prisma.review.create({ data: { ...rd, productId: product.id } })
  }
  console.log(`  ✓ ${reviewData.length} reviews`)

  const postsData = [
    { title: 'Why GrapheneOS is the gold standard for mobile privacy', slug: 'why-grapheneos-gold-standard', excerpt: 'A deep dive into what makes GrapheneOS the most secure and private Android-based OS.', content: '## The Problem with Stock Android\n\nEvery Android phone ships with Google Play Services deeply integrated...\n\n## What GrapheneOS Does Differently\n\nGrapheneOS removes all Google services and builds on AOSP.\n\n- **Network permissions per app**\n- **Sensors permission**\n- **Hardened memory allocator**\n- **Verified boot**\n- **Sandboxed Google Play**', tags: JSON.stringify(['grapheneos', 'privacy', 'android']), status: 'published', publishedAt: daysAgo(35) },
    { title: '5 things you should do on a new GrapheneOS phone', slug: 'five-things-new-grapheneos-phone', excerpt: 'Just received your GrapheneOS phone? Here are the five most important settings to configure.', content: '## 1. Set up a strong PIN\n\n## 2. Configure per-app network permissions\n\n## 3. Install Sandboxed Google Play (optional)\n\n## 4. Enable auto-updates\n\n## 5. Review sensor permissions', tags: JSON.stringify(['grapheneos', 'tips', 'setup']), status: 'published', publishedAt: daysAgo(20) },
    { title: 'Privacy phones 2025: GrapheneOS vs CalyxOS vs stock Android', slug: 'comparing-privacy-phones-2025', excerpt: 'How does GrapheneOS stack up against other privacy-focused Android alternatives?', content: '## GrapheneOS\n\nBest for maximum security. Only supports Pixel hardware.\n\n## CalyxOS\n\nIncludes microG. Weaker security model.\n\n## Our Recommendation\n\nIf you own a Pixel, GrapheneOS is the clear winner.', tags: JSON.stringify(['grapheneos', 'comparison', 'privacy']), status: 'published', publishedAt: daysAgo(8) },
    { title: 'How we verify every installation before shipping', slug: 'verification-process', excerpt: 'Our quality control process.', content: '## Why Verification Matters\n\nAn incorrectly flashed device can leave the bootloader unlocked.\n\n## Our Process\n\n1. Flash GrapheneOS\n2. Verify via attestation tools\n3. Relock bootloader\n4. Confirm verified boot', tags: JSON.stringify(['process', 'quality']), status: 'draft', publishedAt: null },
  ]
  for (const p of postsData) {
    await prisma.post.upsert({ where: { slug: p.slug }, update: {}, create: p })
  }
  console.log(`  ✓ ${postsData.length} blog posts`)

  const countries = ['DK', 'DE', 'SE', 'PL', 'NL', 'FI', 'NO']
  const sessions = Array.from({ length: 60 }, (_, i) => `sess_${i.toString().padStart(3, '0')}`)
  const eventRows: Array<{ type: string; sessionId: string; country: string; referrer: string | null; createdAt: Date }> = []
  for (const sess of sessions) {
    const country = countries[Math.floor(Math.random() * countries.length)]
    const age = Math.floor(Math.random() * 60)
    eventRows.push({ type: 'page_view', sessionId: sess, country, referrer: Math.random() > 0.6 ? 'https://www.google.com' : null, createdAt: daysAgo(age) })
    if (Math.random() > 0.3) {
      eventRows.push({ type: 'product_view', sessionId: sess, country, referrer: null, createdAt: daysAgo(age) })
      if (Math.random() > 0.6) {
        eventRows.push({ type: 'checkout_start', sessionId: sess, country, referrer: null, createdAt: daysAgo(age) })
        if (Math.random() > 0.5) {
          eventRows.push({ type: 'purchase', sessionId: sess, country, referrer: null, createdAt: daysAgo(age) })
        }
      }
    }
  }
  for (const row of eventRows) {
    await prisma.event.create({ data: row })
  }
  console.log(`  ✓ ${eventRows.length} analytics events`)

  console.log('\n✅ Seed complete!')
  console.log('   Storefront:  http://localhost:3000')
  console.log('   Admin:       http://localhost:3000/admin  (password: "admin")')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
