# NordSecure Store

Privacy-first e-commerce platform selling GrapheneOS-flashed Pixels.  
Built with **Next.js 13 App Router · TypeScript · Prisma/SQLite · Tailwind CSS**.

---

## Quick start (local dev)

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — defaults work for demo mode without any changes

# 3. Create DB and generate Prisma client
npm run prisma:migrate
npm run prisma:generate

# 4. Seed demo data
npm run seed

# 5. Run
npm run dev
```

Open http://localhost:3000  
Admin dashboard: http://localhost:3000/admin (password: `admin`)

---

## Demo → Live checklist

To go live, make the following changes:

| What | How |
|------|-----|
| Enable real payments | Set `NEXT_PUBLIC_PAYMENT_MODE=live` in env |
| Stripe live keys | Replace `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` with live keys |
| Crypto (required for live crypto) | Set `BTCPAY_SERVER_URL`, `BTCPAY_API_KEY`, and `BTCPAY_STORE_ID` |
| BTCPay webhook | Point BTCPay webhook to `/api/webhooks/btcpay` and set `BTCPAY_WEBHOOK_SECRET` |
| Admin password | Set a strong `ADMIN_PASSWORD` and `ADMIN_SECRET` |
| Email | Set real SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) |
| Domain | Set `NEXT_PUBLIC_SITE_URL` to your domain |
| Legal pages | Fill in placeholder content in `/privacy`, `/terms`, `/shipping` |
| VAT / OSS | Confirm OSS VAT registration with your tax advisor |

---

## Useful commands

```bash
npm run test          # run all tests
npm run db:reset      # wipe database
npm run seed          # seed demo data
npm run prisma:migrate  # apply schema changes
```

---

## Docker

```bash
docker-compose up --build
```

The app will be available at http://localhost:3000.

---

## Production deploy

The live site is proxied to the Next.js server on port 3000 and managed by PM2.

On the server, the deploy flow is:

```bash
cd /var/www/nordsecure
git pull --ff-only
npm ci
npx prisma generate
npx prisma migrate deploy || npx prisma db push
npm run build
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
```

Relevant files:

- PM2 config: [ecosystem.config.js](ecosystem.config.js)
- Deploy script: [deploy/deploy.sh](deploy/deploy.sh)
- Nginx proxy: [deploy/nordsecure.nginx.conf](deploy/nordsecure.nginx.conf)

Verification:

1. Open the domain in a browser and confirm the homepage loads.
2. Visit `/admin/posts/new` and confirm the editor appears.
3. If the site still shows old content, restart the PM2 app and reload Nginx if needed.

---

## Production deployment files

- PM2 process file: `ecosystem.config.js`
- Nginx vhost template: `deploy/nordsecure.nginx.conf`
- One-command deploy script: `deploy/deploy.sh`

---

## Stack

- **Framework:** Next.js 13 (App Router, TypeScript)
- **Database:** SQLite via Prisma (schema written for easy Postgres migration)
- **Styling:** Tailwind CSS (dark mode, mobile-first)
- **Charts:** Recharts
- **Payments:** Stripe test mode + crypto sandbox (BTCPay-ready interface)
- **Email:** Nodemailer (mailcatcher in demo, real SMTP in live)
