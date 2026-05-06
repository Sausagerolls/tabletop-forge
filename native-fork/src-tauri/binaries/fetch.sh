#!/usr/bin/env bash
# Fetch the Node binaries Tauri's externalBin config bundles into
# the .app / .exe. Tauri looks for `node-<target-triple>` under
# this directory at bundle time and embeds the matching binary
# next to the main executable so the packaged app needs no system
# Node install.
#
# We don't commit the binaries — they're 100+ MB each — but the
# build script depends on them existing locally. Run this script
# once after cloning, or whenever you bump NODE_VERSION.
#
# Usage:
#   bash src-tauri/binaries/fetch.sh
#
# Targets currently fetched: aarch64-apple-darwin (Apple Silicon).
# Add more lines for x86_64 Mac, Windows, Linux, etc., when you
# need to cross-bundle for those platforms.

set -e
NODE_VERSION="v22.11.0"
DIR="$(cd "$(dirname "$0")" && pwd)"

# (target-triple, nodejs-dist-folder-suffix, archive-extension,
# node-binary-path-inside-archive)
PLATFORMS=(
  "aarch64-apple-darwin|darwin-arm64|tar.gz|bin/node"
  "x86_64-apple-darwin|darwin-x64|tar.gz|bin/node"
  "x86_64-pc-windows-msvc|win-x64|zip|node.exe"
  "x86_64-unknown-linux-gnu|linux-x64|tar.gz|bin/node"
)

# Default: only fetch the host's own target unless ALL_PLATFORMS=1.
HOST_TRIPLE="$(rustc --version --verbose 2>/dev/null \
  | awk '/^host:/ { print $2 }' || true)"
[ -z "$HOST_TRIPLE" ] && HOST_TRIPLE="aarch64-apple-darwin"

fetch_one() {
  local triple="$1" suffix="$2" ext="$3" inner="$4"
  local outname="$DIR/node-${triple}"
  if [ "${triple%-msvc}" != "$triple" ] || [ "${triple%-gnu}" != "$triple" ]; then
    # Windows binaries get .exe suffix appended by Tauri's bundler;
    # the source file should be named node-<triple>.exe.
    [ "$ext" = "zip" ] && outname="${outname}.exe"
  fi
  if [ -f "$outname" ]; then
    echo "✓ $outname already exists, skipping"
    return
  fi
  local archive="/tmp/node-${NODE_VERSION}-${suffix}.${ext}"
  local url="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${suffix}.${ext}"
  echo "↓ $url"
  curl -fsSL "$url" -o "$archive"
  case "$ext" in
    tar.gz)
      tar -xzf "$archive" -C /tmp/
      cp "/tmp/node-${NODE_VERSION}-${suffix}/${inner}" "$outname" ;;
    zip)
      unzip -qo "$archive" -d /tmp/
      cp "/tmp/node-${NODE_VERSION}-${suffix}/${inner}" "$outname" ;;
  esac
  chmod +x "$outname"
  echo "  → $outname ($(du -h "$outname" | awk '{print $1}'))"
}

if [ "${ALL_PLATFORMS:-0}" = "1" ]; then
  for entry in "${PLATFORMS[@]}"; do
    IFS='|' read -r triple suffix ext inner <<< "$entry"
    fetch_one "$triple" "$suffix" "$ext" "$inner"
  done
else
  echo "Fetching host target only ($HOST_TRIPLE) — set ALL_PLATFORMS=1 to grab every supported triple."
  for entry in "${PLATFORMS[@]}"; do
    IFS='|' read -r triple suffix ext inner <<< "$entry"
    if [ "$triple" = "$HOST_TRIPLE" ]; then
      fetch_one "$triple" "$suffix" "$ext" "$inner"
    fi
  done
fi
