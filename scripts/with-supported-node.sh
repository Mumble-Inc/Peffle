#!/usr/bin/env bash
# Peffle uses better-sqlite3; Node 26+ often lacks a matching native build. Prefer Node 22 LTS.
set -euo pipefail

NODE22_BIN="/opt/homebrew/opt/node@22/bin"
if [ -x "$NODE22_BIN/node" ]; then
  export PATH="$NODE22_BIN:$PATH"
elif ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(0)' 2>/dev/null; then
  echo "Peffle needs Node 22 (see .nvmrc). Install: brew install node@22" >&2
  exit 1
else
  ACTIVE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$ACTIVE_MAJOR" -ge 26 ] 2>/dev/null; then
    echo "Peffle does not support Node $ACTIVE_MAJOR (native Peffle ledger). Use Node 22: brew install node@22" >&2
    exit 1
  fi
fi

exec "$@"
