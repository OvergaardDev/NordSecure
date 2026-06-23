#!/bin/bash

# SendGrid Email Setup Script for NordSecure Production
# Usage: ./setup-sendgrid.sh <YOUR_SENDGRID_API_KEY>

if [ -z "$1" ]; then
  echo "❌ Error: SendGrid API key required"
  echo ""
  echo "Usage: $0 SG.YOUR_API_KEY_HERE"
  echo ""
  echo "To get your SendGrid API key:"
  echo "1. Sign up at https://sendgrid.com/free"
  echo "2. Create API key at https://app.sendgrid.com/settings/api_keys"
  echo "3. Copy the key (starts with 'SG.')"
  exit 1
fi

API_KEY=$1
HETZNER_HOST="root@178.105.218.169"
SSH_KEY="$HOME/.ssh/hetzner_nordsecure"
SERVER_PATH="/var/www/nordsecure"

echo "🚀 Setting up SendGrid email for NordSecure..."
echo ""

# Update .env on production server
echo "📝 Updating .env with SendGrid credentials..."
ssh -i "$SSH_KEY" "$HETZNER_HOST" "cd $SERVER_PATH && sed -i 's/^SMTP_HOST=.*/SMTP_HOST=smtp.sendgrid.net/' .env && sed -i 's/^SMTP_PORT=.*/SMTP_PORT=587/' .env && sed -i 's/^# SMTP_USER=/SMTP_USER=/' .env && sed -i 's/^SMTP_USER=.*/SMTP_USER=apikey/' .env && sed -i \"s|^# SMTP_PASS=|SMTP_PASS=$API_KEY|\" .env && sed -i \"s|^SMTP_PASS=.*|SMTP_PASS=$API_KEY|\" .env && sed -i 's/^EMAIL_FROM=.*/EMAIL_FROM=orders@nordsecure.eu/' .env && echo '✓ .env updated'"

echo ""
echo "🔨 Rebuilding Next.js..."
ssh -i "$SSH_KEY" "$HETZNER_HOST" "cd $SERVER_PATH && npm run build && echo '✓ Build complete'"

echo ""
echo "♻️  Restarting application..."
ssh -i "$SSH_KEY" "$HETZNER_HOST" "cd $SERVER_PATH && pm2 restart nordsecure --update-env && sleep 2 && pm2 status"

echo ""
echo "✅ SendGrid email setup complete!"
echo ""
echo "Next steps:"
echo "1. Test by placing an order at https://nordsecure.eu/checkout"
echo "2. Check email inbox for order confirmation"
echo "3. Monitor logs: ssh -i $SSH_KEY $HETZNER_HOST 'pm2 logs nordsecure'"
echo ""
