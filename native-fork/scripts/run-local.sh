#!/usr/bin/env bash
# Run the whole VTT on this machine, offline. No Docker, no Rust, no bundle.
#
# This is the same code the .app wraps — Express serving the built React app and
# PGlite holding the data — just started directly. Use it when the Tauri bundle is
# stale or the Rust toolchain isn't installed, which is the case on a fresh Mac.
#
#   ./scripts/run-local.sh                 # data in ~/.tabletopforge, port 3001
#   PORT=4000 ./scripts/run-local.sh       # somewhere else
#   VTT_DATA_DIR=/Volumes/stick/ttf ./scripts/run-local.sh
#
# Ctrl-C stops it cleanly, which matters: PGlite is a real Postgres and killing it
# hard can leave a database it refuses to reopen.

set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3001}"
export VTT_DATA_DIR="${VTT_DATA_DIR:-$HOME/.tabletopforge}"
export DM_MASTER_PASSWORD="${DM_MASTER_PASSWORD:-}"

if [ ! -d backend/node_modules ]; then
  echo "Installing backend dependencies (once)…"
  (cd backend && npm install --silent)
fi
if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies (once)…"
  (cd frontend && npm install --silent)
fi

# The frontend is served from disk, so it has to be built at least once — and
# rebuilt whenever the source is newer than the build, which after a sync it is.
needs_build=0
if [ ! -f frontend/dist/index.html ]; then
  needs_build=1
elif [ -n "$(find frontend/src -newer frontend/dist/index.html -type f -print -quit 2>/dev/null)" ]; then
  needs_build=1
fi
if [ "$needs_build" = "1" ]; then
  echo "Building the interface…"
  (cd frontend && npx vite build >/dev/null)
fi

# The LAN address, so players' phones and tablets can reach it without anyone
# reading an IP off a terminal.
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"

echo
echo "  TableTop Forge — local"
echo "  ─────────────────────────────────────────"
echo "  This Mac      http://localhost:${PORT}/"
[ -n "$LAN_IP" ] && echo "  Players       http://${LAN_IP}:${PORT}/"
echo "  Data          ${VTT_DATA_DIR}"
echo "  ─────────────────────────────────────────"
echo "  Ctrl-C to stop. Let it exit on its own —"
echo "  a hard kill can corrupt the database."
echo

cd backend
exec node src/index.js
