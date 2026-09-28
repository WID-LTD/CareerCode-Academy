#!/bin/bash
# Deploy CareerCode Academy on careercode-prod.
# Run on the VPS as the careercode user:  bash ~/repo/deploy/deploy.sh
# Or via CI over SSH. Expects backend env at /srv/careercode/backend.env (0600).
set -euo pipefail

APP_DIR="/srv/careercode"
REPO="$APP_DIR/repo"
ENV_FILE="$APP_DIR/backend.env"

echo "==> Pulling latest main"
cd "$REPO"
git fetch origin --prune
git checkout main
git pull --ff-only origin main
echo "Deployed commit: $(git rev-parse --short HEAD)"

echo "==> Backend: install + build"
cd "$REPO/backend"
npm ci --no-audit --no-fund
npm run build

echo "==> Backend: run migrations"
npm run migrate

echo "==> Backend: (re)start service"
sudo systemctl restart careercode-api || sudo systemctl start careercode-api
sleep 5
curl -fsS -m 15 http://127.0.0.1:5000/health
curl -fsS -m 30 http://127.0.0.1:5000/db-health

echo "==> Frontend: install + build"
cd "$REPO/frontend"
npm ci --no-audit --no-fund
VITE_API_URL="https://api.careercode.com.ng/api/v1" \
VITE_PAYSTACK_PUBLIC_KEY="${VITE_PAYSTACK_PUBLIC_KEY:-pk_test_1e7dfb9ee157a0da6f9d4866146ab497584a9991}" \
  npm run build

echo "==> Frontend: publish static bundle"
rm -rf "$APP_DIR/frontend/dist"
cp -r "$REPO/frontend/dist" "$APP_DIR/frontend/dist"

echo "==> Reload Caddy"
sudo systemctl reload caddy

echo "==> Live checks"
curl -fsS -m 20 https://api.careercode.com.ng/health
curl -fsS -m 20 https://careercode.com.ng/ | head -c 200
echo
echo "DEPLOY OK: $(git -C "$REPO" rev-parse --short HEAD)"
