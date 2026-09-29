#!/usr/bin/env bash
# Builds the Lambda deployment zip for the API. Run from the repo root after
# `npm ci` and `npm run build -w @site/api`.
#
# Only files the API actually loads are included: scripts/trace-api.mjs follows
# the require graph from apps/api/dist/main.js (dev tooling, type files and the
# `prisma` CLI never make it in). The zip mirrors the repo layout so Node's
# module resolution works unchanged; run.sh at the root is the Lambda handler.
#
# Usage: scripts/package-api.sh [output.zip]
set -euo pipefail

OUT="$(realpath -m "${1:-api-lambda.zip}")"
STAGE="$(mktemp -d)"
MAX_MB=240 # Lambda's unzipped limit is 250 MB
trap 'rm -rf "$STAGE"' EXIT

test -f apps/api/dist/main.js || { echo "apps/api/dist missing: build the API first" >&2; exit 1; }

node scripts/trace-api.mjs > "$STAGE/.files"
grep -v '\.d\.ts$\|\.map$' "$STAGE/.files" | while IFS= read -r f; do
  mkdir -p "$STAGE/$(dirname "$f")"
  cp -P "$f" "$STAGE/$f"
done
rm "$STAGE/.files"

cat > "$STAGE/run.sh" <<'SH'
#!/bin/sh
# Lambda handler for the AWS Lambda Web Adapter (AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap).
exec node apps/api/dist/main.js
SH
chmod +x "$STAGE/run.sh"

SIZE_MB=$(du -sm "$STAGE" | cut -f1)
echo "Unzipped bundle: ${SIZE_MB} MB ($(find "$STAGE" -type f | wc -l) files)"
if [ "$SIZE_MB" -gt "$MAX_MB" ]; then
  echo "Bundle exceeds ${MAX_MB} MB" >&2
  exit 1
fi

rm -f "$OUT"
(cd "$STAGE" && zip -qr -y - .) > "$OUT"
echo "Wrote $OUT ($(du -h "$OUT" | cut -f1))"
