# SendGrid Email Setup Guide

## 1. Get SendGrid API Key

1. Go to https://sendgrid.com/free
2. Sign up for free tier (100 emails/day is plenty for testing)
3. Click "Create API Key" → https://app.sendgrid.com/settings/api_keys
4. Create a **Restricted Access** key with:
   - Mail Send: ✓ Full Access
   - Name: `nordsecure-production`
5. Copy the key (starts with `SG.`)

## 2. Update Production .env

SSH into Hetzner and update the .env file:

```bash
ssh -i ~/.ssh/hetzner_nordsecure root@178.105.218.169

# Edit the .env file
nano /var/www/nordsecure/.env
```

**Find and update these lines:**

```bash
# Change from:
SMTP_HOST=localhost
SMTP_PORT=1025
# SMTP_USER=
# SMTP_PASS=
EMAIL_FROM=orders@nordsecure.shop

# Change to:
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.YOUR_API_KEY_HERE
EMAIL_FROM=orders@nordsecure.eu
```

Replace `SG.YOUR_API_KEY_HERE` with your actual SendGrid API key.

**Save and exit:** Press `Ctrl+O`, then `Enter`, then `Ctrl+X`

## 3. Rebuild and Restart

```bash
cd /var/www/nordsecure
npm run build
pm2 restart nordsecure --update-env
pm2 status
```

## 4. Test Email Sending

Place a test order on checkout to trigger an order confirmation email.

Check logs for success:
```bash
pm2 logs nordsecure
```

Look for: `✓ Order confirmation email sent to [email]`

## Verify Setup

- Emails should arrive in customer inbox within seconds
- Subject: `Order confirmed: ORD-[timestamp]`
- Beautiful HTML template with order details, shipping address, payment method

## Support

If emails don't send:
1. Check SendGrid API key is correct
2. Verify sender email is authorized in SendGrid
3. Check PM2 logs: `pm2 logs nordsecure`
