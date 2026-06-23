#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/nordsecure"

cd "$APP_DIR"

echo "[0/7] Ensure runtime env exists"
if [ ! -f .env ] && [ -f .env.example ]; then
	cp .env.example .env
fi

echo "[1/7] Pull latest code"
git pull --ff-only

echo "[2/7] Install dependencies"
npm ci

echo "[3/7] Generate Prisma client"
npx prisma generate

echo "[4/7] Apply schema changes"
npx prisma migrate deploy || npx prisma db push

echo "[5/7] Build app"
npm run build

echo "[6/7] Restart PM2"
pm2 startOrReload ecosystem.config.js --update-env

echo "[7/7] Save PM2 process list"
pm2 save

echo "Deploy complete"
