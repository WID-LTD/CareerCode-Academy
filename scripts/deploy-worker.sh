#!/bin/bash
# Deploy the API worker, retrying through intermittent sandbox egress failures.
set -a; . "$HOME/.config/cloudflare/wid-ltd.env"; set +a
export CLOUDFLARE_API_TOKEN
cd "$(dirname "$0")/../workers" || exit 1
for i in $(seq 1 12); do
  OUT=$(CI=true WRANGLER_SEND_METRICS=false npx wrangler deploy 2>&1)
  if echo "$OUT" | grep -q "Deployed"; then
    echo "$OUT" | grep -aE "Deployed|Version ID|Current Version ID|workers.dev" | head -5
    exit 0
  fi
  echo "attempt $i failed: $(echo "$OUT" | grep -aE 'ERROR|fetch failed' | head -1 | sed 's/\x1b\[[0-9;]*m//g')"
  sleep 20
done
echo "DEPLOY FAILED after 12 attempts"
exit 1
