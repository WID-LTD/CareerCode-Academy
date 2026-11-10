#!/bin/bash
# Back up the D1 database to Cloudflare R2 ("S3") and keep a local copy.
#
#   ./scripts/backup-d1.sh
#
# Produces:
#   backups/d1/careercode-<UTC timestamp>.sql.gz   (local, last 7 kept)
#   r2://careercode-backups/d1/careercode-<UTC timestamp>.sql.gz
#
# Restore:
#   gunzip -c backups/d1/<file>.sql.gz | \
#     npx wrangler d1 execute careercode-academy --remote --file=/dev/stdin
set -euo pipefail

set -a; . "$HOME/.config/cloudflare/wid-ltd.env"; set +a
export CLOUDFLARE_API_TOKEN

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="careercode-${STAMP}.sql.gz"
LOCAL_DIR="$ROOT/backups/d1"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$LOCAL_DIR"
cd "$ROOT/workers"

echo "→ exporting D1 (remote)…"
CI=true WRANGLER_SEND_METRICS=false npx wrangler d1 export careercode-academy \
  --remote --output="$TMP/dump.sql" >/dev/null

gzip -9 -c "$TMP/dump.sql" > "$LOCAL_DIR/$NAME"
SIZE=$(du -h "$LOCAL_DIR/$NAME" | cut -f1)
echo "→ local: $LOCAL_DIR/$NAME ($SIZE)"

echo "→ uploading to R2 careercode-backups/d1/$NAME …"
CI=true WRANGLER_SEND_METRICS=false npx wrangler r2 object put \
  "careercode-backups/d1/$NAME" --file="$LOCAL_DIR/$NAME" \
  --content-type=application/gzip >/dev/null
echo "→ uploaded"

# Keep the last 7 local dumps (R2 has a lifecycle rule for the remote copies).
ls -1t "$LOCAL_DIR"/careercode-*.sql.gz 2>/dev/null | tail -n +8 | while read -r old; do
  echo "→ pruning local $old"
  rm -f "$old"
done

echo "done."
