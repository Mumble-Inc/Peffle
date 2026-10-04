#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$(mktemp -d "${TMPDIR:-/tmp}/razorflow-verify.XXXXXX")"
cleanup() { rm -rf "$DIR"; }
trap cleanup EXIT

git clone --local --no-hardlinks "$ROOT" "$DIR/repo"
cd "$DIR/repo"
git checkout -q HEAD

if [[ -f "$ROOT/.env" ]]; then cp "$ROOT/.env" .env; fi
if [[ -f "$ROOT/.env.local" ]]; then cp "$ROOT/.env.local" .env.local; fi

npm ci
npx prisma generate
npm test
npm run build
echo "verify:clean PASS"
