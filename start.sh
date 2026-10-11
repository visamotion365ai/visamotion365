#!/usr/bin/env bash
# VisaMotion365 — full cold start (the sandbox wipes node_modules/.next between turns)
set -e
cd "$(dirname "$0")"

if [ ! -x node_modules/.bin/next ]; then
  echo "[1/3] Installing dependencies..."
  npm install
else
  echo "[1/3] node_modules present — skipping install"
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "[2/3] Building production bundle..."
  NODE_OPTIONS=--max-old-space-size=5120 node_modules/.bin/next build
else
  echo "[2/3] Build present — skipping"
fi

echo "[3/3] Starting production server on http://0.0.0.0:3000"
exec node_modules/.bin/next start -H 0.0.0.0 -p 3000
