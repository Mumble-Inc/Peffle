#!/usr/bin/env bash
# Peffle uses better-sqlite3; Node 26+ often lacks a matching native build. Prefer Node 22 LTS.
set -euo pipefail

if [ -x "/opt/homebrew/opt/node@22/bin/node" ]; then
  ACTIVE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$ACTIVE_MAJOR" -ge 26 ] 2>/dev/null; then
    export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
  fi
fi

exec "$@"
