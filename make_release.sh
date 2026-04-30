#!/bin/bash
set -e

# Usage: ./make_release.sh [version]
# e.g.:  ./make_release.sh 1.0.0
VERSION="${1:-$(date +%Y%m%d)}"
RELEASE_DIR="releases/dnd-vtt-v${VERSION}"

if [ -d "$RELEASE_DIR" ]; then
  echo "ERROR: $RELEASE_DIR already exists. Remove it or use a different version."
  exit 1
fi

echo "Building release: $RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# --- Core files ---
cp docker-compose.yml "$RELEASE_DIR/"
cp init.sql           "$RELEASE_DIR/"
cp default_player.png "$RELEASE_DIR/"

# --- scripts ---
cp start.sh   "$RELEASE_DIR/"
cp rebuild.sh "$RELEASE_DIR/"
chmod +x "$RELEASE_DIR/start.sh"
chmod +x "$RELEASE_DIR/rebuild.sh"

# --- .env.example ---
cat > "$RELEASE_DIR/.env.example" <<'EOF'
# Postgres password (default: vttpassword)
DB_PASSWORD=vttpassword

# DM master password used to create/manage campaigns
DM_MASTER_PASSWORD=dungeonmaster

# Host port to expose the app on (default: 8899)
PORT=8899
EOF

# --- backend (source + Dockerfile, no node_modules/dist) ---
mkdir -p "$RELEASE_DIR/backend"
cp backend/Dockerfile    "$RELEASE_DIR/backend/"
cp backend/package.json  "$RELEASE_DIR/backend/"
cp backend/package-lock.json "$RELEASE_DIR/backend/" 2>/dev/null || true
rsync -a --exclude='node_modules' --exclude='dist' backend/src/ "$RELEASE_DIR/backend/src/"

# --- frontend (source + Dockerfile + config, no node_modules/dist) ---
mkdir -p "$RELEASE_DIR/frontend"
cp frontend/Dockerfile          "$RELEASE_DIR/frontend/"
cp frontend/package.json        "$RELEASE_DIR/frontend/"
cp frontend/package-lock.json   "$RELEASE_DIR/frontend/" 2>/dev/null || true
cp frontend/vite.config.js      "$RELEASE_DIR/frontend/"
cp frontend/postcss.config.js   "$RELEASE_DIR/frontend/"
cp frontend/tailwind.config.js  "$RELEASE_DIR/frontend/"
cp frontend/index.html          "$RELEASE_DIR/frontend/"
cp frontend/nginx.conf          "$RELEASE_DIR/frontend/"
rsync -a --exclude='node_modules' --exclude='dist' frontend/src/    "$RELEASE_DIR/frontend/src/"
rsync -a --exclude='node_modules' --exclude='dist' frontend/public/ "$RELEASE_DIR/frontend/public/" 2>/dev/null || true

# --- sounds (mounted into backend container by docker-compose) ---
rsync -a sounds/ "$RELEASE_DIR/sounds/"

# --- plugins (mounted into backend container by docker-compose) ---
# The host's `./backend/plugins:/app/plugins` bind mount means the
# directory MUST exist when `docker compose up` runs — even if empty.
# We always create it. Only plugins flagged `"builtin": true` in their
# manifest are bundled with the release; everything else is meant to
# be downloaded from the website's plugin store and uploaded via the
# in-app manager (so the DM gets exactly the plugins they want, not
# whatever happened to be in the maintainer's working tree).
mkdir -p "$RELEASE_DIR/backend/plugins"
if [ -d backend/plugins ]; then
  for d in backend/plugins/*/; do
    [ -f "$d/plugin.json" ] || continue
    if grep -q '"builtin"[[:space:]]*:[[:space:]]*true' "$d/plugin.json"; then
      name=$(basename "$d")
      rsync -a "$d" "$RELEASE_DIR/backend/plugins/$name/"
      echo "  bundled plugin: $name"
    fi
  done
fi

# --- top-level docs ---
# README.md is the operator-facing install guide; PLUGINS.md is the
# plugin authoring guide. Both ship with the release so the DM can
# read them offline without reaching for GitHub.
[ -f README.md  ]  && cp README.md  "$RELEASE_DIR/"
[ -f PLUGINS.md ]  && cp PLUGINS.md "$RELEASE_DIR/"

echo ""
echo "Release ready: $RELEASE_DIR"
echo ""
echo "To install on a fresh machine:"
echo "  1. cd $RELEASE_DIR"
echo "  2. cp .env.example .env   (then edit passwords)"
echo "  3. ./start.sh"
echo ""
echo "To rebuild after an update:"
echo "  ./rebuild.sh"
echo ""

# Optional: create a zip archive
if command -v zip &>/dev/null; then
  ZIP="releases/dnd-vtt-v${VERSION}.zip"
  (cd releases && zip -r "dnd-vtt-v${VERSION}.zip" "dnd-vtt-v${VERSION}")
  echo "Archive: $ZIP"
fi
