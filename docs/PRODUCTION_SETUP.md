# Production Setup Guide - NordSecure

Complete guide for deploying NordSecure to production with full e-commerce functionality.

## Table of Contents

1. [Database Setup](#database-setup)
2. [Payment Providers](#payment-providers)
3. [Email Configuration](#email-configuration)
4. [Shipping & Order Management](#shipping--order-management)
5. [Admin Panel](#admin-panel)
6. [Deployment Options](#deployment-options)
7. [Security Checklist](#security-checklist)
8. [Monitoring & Logging](#monitoring--logging)

---

## Database Setup

### PostgreSQL (Recommended for Production)

**Option 1: Self-Hosted PostgreSQL**

```bash
# Install PostgreSQL 14+
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE nordsecure;
CREATE USER nordsecure_user WITH PASSWORD 'strong-password-here';
ALTER ROLE nordsecure_user SET client_encoding TO 'utf8';
ALTER ROLE nordsecure_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE nordsecure_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE nordsecure TO nordsecure_user;
\q

# Test connection
psql -h localhost -U nordsecure_user -d nordsecure
```

**Option 2: AWS RDS**

1. Go to AWS RDS Console → Create Database
2. Choose PostgreSQL engine (version 14+)
3. Set db.t3.micro for dev, db.t3.small for production
4. Enable automated backups (30 days retention)
5. Get connection string:
   ```
   postgresql://username:password@your-instance.xxxxx.us-east-1.rds.amazonaws.com:5432/nordsecure
   ```

**Option 3: Supabase (Managed PostgreSQL)**

1. Sign up at https://supabase.com
2. Create new project → Get connection string
3. Use in `.env.production`:
   ```
   DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
   ```

### Run Migrations

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:5432/nordsecure"

# Run Prisma migrations
npx prisma migrate deploy

# Seed initial data (optional)
npx prisma db seed
```

---

## Payment Providers

### Stripe (Recommended for Primary Payment)

1. **Create Stripe Account**: https://dashboard.stripe.com/register
2. **Get Live Keys**:
   - Secret Key: `sk_live_...`
   - Publishable Key: `pk_live_...`
3. **Configure Webhooks** (optional but recommended):
   - Endpoint: `https://nordsecure.eu/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. **Update .env.production**:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

### BTCPay Server (Cryptocurrency Payments)

**Option 1: Hosted BTCPay Cloud**

1. Sign up at https://mainnet.demo.btcpayserver.org
2. Create store → Generate API Key
3. Get Server URL, API Key, Store ID
4. **Update .env.production**:
   ```
   BTCPAY_SERVER_URL=https://your-instance.btcpayserver.com
   BTCPAY_API_KEY=your_api_key
   BTCPAY_STORE_ID=your_store_id
   ```

**Option 2: Self-Hosted BTCPay**

```bash
# Using Docker
docker run -d --name btcpay -p 80:80 -p 443:443 \
  -e BTCPAY_HOST=btcpay.yourdomain.com \
  -e ACME_CA_URI=https://acme-v02.api.letsencrypt.org/directory \
  btcpayserver/btcpayserver:latest

# Generate API key in BTCPay UI and configure above
```

### Test Payment Flow

```bash
# Set to demo first
PAYMENT_MODE=demo npm run dev

# Test Stripe with card 4242 4242 4242 4242
# Test Crypto with generated sandbox address

# Switch to live
PAYMENT_MODE=live npm run build
```

---

## Email Configuration

### SendGrid (Recommended for Production)

1. **Create Account**: https://sendgrid.com
2. **Get API Key**:
   - Go to Settings → API Keys → Create API Key (Full Access)
3. **Verify Sender Email**:
   - Settings → Sender Authentication
   - Add `orders@nordsecure.eu`
4. **Configure .env.production**:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=SG.xxxxxxxxxxxxx
   EMAIL_FROM=orders@nordsecure.eu
   EMAIL_REPLY_TO=support@nordsecure.eu
   ```

### Postmark (Alternative)

1. **Create Account**: https://postmarkapp.com
2. **Verify Domain**: Add DKIM/DMARC records
3. **Get API Token**: Account Settings → Credentials
4. **Configure .env.production**:
   ```
   SMTP_HOST=smtp.postmarkapp.com
   SMTP_PORT=587
   SMTP_USER=your_api_token
   SMTP_PASS=your_api_token
   ```

### AWS SES (Cost-Effective)

1. **Create AWS Account** and enable SES in your region
2. **Verify Sender Email**: SES → Verified Identities
3. **Request Production Access**: SES → Sending Limits
4. **Get SMTP Credentials**: SES → Account Dashboard → SMTP Settings
5. **Configure .env.production**:
   ```
   SMTP_HOST=email-smtp.region.amazonaws.com
   SMTP_PORT=587
   SMTP_USER=your_smtp_username
   SMTP_PASS=your_smtp_password
   ```

### Test Email Sending

```bash
# Check email configuration
node -e "const email = require('./src/lib/email'); 
console.log('Email transport configured')"

# Emails are sent on:
# - Order confirmation (after payment)
# - Order status updates (via admin)
```

---

## Shipping & Order Management

### Order Workflow

**Status Flow**:
```
pending → paid → shipped → delivered
          ↓
        cancelled (at any stage)
```

**Admin Panel** (`/admin/orders`):
- View all orders with customer details
- See shipping address, payment method, items
- Update order status
- Track payment confirmation

**Order Detail Page** (`/admin/orders/[id]`):
```
Customer Information:
- Name, Email, Phone
- Company (optional)
- Full shipping address
- Tax ID / EORI (for EU)
- Delivery instructions

Order Items:
- Product SKU
- Quantity, Unit Price
- Total line amount

Shipping Requirements:
- EU vs non-EU handling
- Customs declaration needed
- Required documentation
```

### Order Status Updates

**From Admin Panel**:
1. Click order number → Update Status dropdown
2. Select: pending | paid | shipped | cancelled
3. Automatic email sent to customer on status change
4. Timestamp recorded

**API Endpoint**:
```bash
curl -X POST https://nordsecure.eu/api/admin/orders/123 \
  -H "Content-Type: application/json" \
  -b "admin_session=token" \
  -d '{"status": "shipped"}'
```

### Email Notifications

**Order Confirmation**:
- Sent after successful payment
- Includes: Order number, items, total, tracking info
- Contains shipping address and delivery instructions

**Status Update Emails**:
- Auto-sent when admin changes status
- Format: "Order #123 has been [status]"
- Allows customer to track progress

### Shipping Requirements by Country

**EU Countries (No Customs)**:
- Standard shipping
- Delivery confirmation
- No customs forms needed

**Non-EU Europe (UK, Switzerland, Norway, etc.)**:
- Customs declaration required
- Invoice copy in package
- EORI number tracking
- Potential import duties

**Rest of World**:
- Full customs forms
- EORI / Tax ID verification
- International carrier coordination

### Shipping Carriers Integration (Optional)

**DHL (Recommended for EU)**:
```bash
# Install DHL API client
npm install dhl-express

# Add to env
DHL_API_KEY=your_dhl_api_key
DHL_ACCOUNT_NUMBER=your_account
```

**Implementation Example**:
```typescript
// src/lib/shipping.ts
import { DHLClient } from 'dhl-express';

export async function createDHLShipment(order: Order) {
  const dhl = new DHLClient({
    apiKey: process.env.DHL_API_KEY,
    accountNumber: process.env.DHL_ACCOUNT_NUMBER,
  });
  
  const shipment = await dhl.createShipment({
    shipper: { /* your company */ },
    recipient: {
      name: order.customerName,
      address: order.shippingAddressLine1,
      city: order.shippingCity,
      postalCode: order.shippingPostalCode,
      country: order.country,
    },
    contents: order.items.map(item => ({
      description: item.product.name,
      quantity: item.quantity,
      weight: 0.5, // kg
    })),
  });
  
  return shipment.trackingNumber;
}
```

---

## Admin Panel

### Features

✅ **Dashboard** (`/admin`):
- Order analytics
- Revenue charts
- Customer funnel
- Recent orders
- Paid vs test orders

✅ **Orders** (`/admin/orders`):
- List all orders
- Filter by status
- Sort by date
- Quick status updates

✅ **Order Details** (`/admin/orders/[id]`):
- Full customer info
- Shipping requirements
- Item breakdown
- Status history
- Update order status

✅ **Inventory** (`/admin/inventory`):
- Product management
- Stock levels
- Price updates
- Low stock alerts

✅ **Coupons** (`/admin/coupons`):
- Create discount codes
- Set usage limits
- Expiry dates
- Track redemptions

✅ **Reviews** (`/admin/reviews`):
- Approve/reject reviews
- Spam filtering
- Moderation queue

✅ **Blog** (`/admin/posts`):
- Create/edit posts
- Publish/draft status
- SEO optimization

### Authentication

**Login**: `/admin/login`
- Username: `admin` (built-in)
- Password: Value of `ADMIN_PASSWORD` env var
- Session stored in secure cookie
- Auto-logout after inactivity

**Reset Password**:
```bash
# Only through env var change and redeploy
ADMIN_PASSWORD=new-password
```

---

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Connect Vercel**:
   - Go to https://vercel.com → New Project
   - Import from GitHub → Select repository
   - Framework: Next.js
   - Root Directory: ./

3. **Environment Variables**:
   - Add all vars from `.env.production`
   - Vercel → Settings → Environment Variables

4. **Database**:
   - Use AWS RDS or Supabase (not Vercel Postgres for first time)
   - Update `DATABASE_URL` in Vercel settings

5. **Deploy**:
   - Automatic on push to main
   - Or manual trigger in Vercel dashboard

```bash
# Check deployment
# Your app runs at: https://your-project.vercel.app
```

### Option 2: Docker + AWS ECS/Heroku

**Create Dockerfile**:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]
```

**Deploy to AWS ECS**:

```bash
# Build and push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker build -t nordsecure .
docker tag nordsecure:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/nordsecure:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/nordsecure:latest

# Create ECS task definition and service
```

### Option 3: VPS (Linode, DigitalOcean, AWS EC2)

```bash
# 1. Create Ubuntu 22.04 LTS VPS (2GB RAM minimum)

# 2. SSH and configure
ssh root@your_ip

# 3. Install Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib nginx

# 4. Clone repository
git clone https://github.com/yourusername/NordSecure.git
cd NordSecure

# 5. Install and configure
npm install
cp .env.production.example .env.production
# Edit .env.production with real values

# 6. Build application
npm run build

# 7. Setup PM2 for process management
npm install -g pm2
pm2 start npm --name "nordsecure" -- start
pm2 save
pm2 startup

# 8. Setup Nginx reverse proxy
sudo tee /etc/nginx/sites-available/nordsecure > /dev/null <<EOF
server {
    listen 80;
    server_name nordsecure.eu www.nordsecure.eu;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/nordsecure /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 9. Setup SSL with Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d nordsecure.eu -d www.nordsecure.eu
```

---

## Security Checklist

### Environment & Secrets

- [ ] ✅ `.env.production` is in `.gitignore` (not in repo)
- [ ] ✅ All `ADMIN_*` secrets are changed from defaults
- [ ] ✅ Database password is 32+ random characters
- [ ] ✅ `STRIPE_SECRET_KEY` uses live keys, not test keys
- [ ] ✅ Email credentials are stored securely
- [ ] ✅ No secrets logged in console or error messages

### Database Security

- [ ] ✅ PostgreSQL uses SSL/TLS connections
- [ ] ✅ Database user has minimal required permissions
- [ ] ✅ Automated daily backups configured
- [ ] ✅ Backup retention set to 30+ days
- [ ] ✅ Database publicly accessible = FALSE

### HTTPS/SSL

- [ ] ✅ HTTPS enforced on all pages (redirect HTTP → HTTPS)
- [ ] ✅ Certificate valid and auto-renewing
- [ ] ✅ HSTS header enabled (max-age=31536000)
- [ ] ✅ Security headers configured:
  ```
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  ```

### Application Security

- [ ] ✅ Admin panel protected behind authentication
- [ ] ✅ Session cookies are httpOnly and Secure
- [ ] ✅ CSRF protection enabled
- [ ] ✅ Input validation on all forms
- [ ] ✅ SQL injection prevention (using Prisma)
- [ ] ✅ XSS prevention (sanitized user input)
- [ ] ✅ Rate limiting on login attempts
- [ ] ✅ No sensitive data in URL parameters
- [ ] ✅ Payment data never stored locally (PCI compliance)

### API Security

- [ ] ✅ Admin API requires authentication
- [ ] ✅ Webhook verification (Stripe, BTCPay signatures)
- [ ] ✅ API rate limiting configured
- [ ] ✅ CORS properly configured

---

## Monitoring & Logging

### Error Tracking with Sentry

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure sentry.client.config.js and sentry.server.config.js
```

**Update .env.production**:
```
SENTRY_DSN=https://xxx@oxxxxx.ingest.sentry.io/123456
NEXT_PUBLIC_SENTRY_ENABLED=true
```

### Application Monitoring

**Key Metrics to Track**:
- Order success rate
- Payment processing time
- Email delivery success
- Admin panel performance
- Database query performance
- Error rates and types

**Uptime Monitoring**:
```bash
# Use Uptime Robot or Pingdom
# Monitor: https://nordsecure.eu/api/health
# Alert on any downtime
```

### Log Aggregation

**CloudWatch** (AWS):
```bash
# Logs automatically collected from:
# - Application errors
# - Payment processing
# - Email sending
# - Admin actions
```

**View Logs**:
```bash
aws logs tail /aws/lambda/nordsecure --follow
```

---

## Troubleshooting

### "Payment failed" on production

```bash
# Check payment provider credentials
echo $STRIPE_SECRET_KEY | grep sk_live_
echo $BTCPAY_API_KEY | wc -c  # should be 29+ chars

# Test payment creation
curl -X POST https://nordsecure.eu/api/checkout/create-reservation \
  -H "Content-Type: application/json" \
  -d '{"products": [{"sku": "test", "quantity": 1}], ...}'
```

### "Email not sending"

```bash
# Test SMTP connection
node -e "const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
t.verify(console.log);"

# Check spam folder if using Gmail
# Verify sender domain (SPF/DKIM/DMARC records)
```

### "Admin login not working"

```bash
# Verify ADMIN_SECRET is set
echo $ADMIN_SECRET | wc -c  # should be 32+

# Check cookie storage
# Open DevTools → Application → Cookies
# Look for "admin_session" cookie

# If stuck, clear cookies and try again
```

---

## Post-Launch Checklist

- [ ] ✅ Test complete checkout flow with real payment
- [ ] ✅ Receive and confirm order confirmation email
- [ ] ✅ Admin login works
- [ ] ✅ Can update order status
- [ ] ✅ Status change email received by customer
- [ ] ✅ HTTPS working and enforced
- [ ] ✅ Database backups running
- [ ] ✅ Error monitoring configured
- [ ] ✅ Analytics tracking verified
- [ ] ✅ Mobile responsiveness tested
- [ ] ✅ DNS records pointing to production
- [ ] ✅ SSL certificate valid
- [ ] ✅ All env vars documented
- [ ] ✅ Team access configured

---

## Support & Help

**Documentation**:
- [Stripe Integration](https://stripe.com/docs/)
- [BTCPay Server](https://docs.btcpayserver.org/)
- [SendGrid Email](https://sendgrid.com/docs/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma ORM](https://www.prisma.io/docs/)

**Status & Incidents**:
- Stripe: https://status.stripe.com/
- AWS: https://status.aws.amazon.com/
- GitHub: https://www.githubstatus.com/
