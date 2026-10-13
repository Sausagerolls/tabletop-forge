#!/usr/bin/env bash
# Put the freshly built app into /Applications.
#
# Quicker than opening the .dmg and dragging, and it refuses to run while the app
# is open — replacing a bundle underneath a running process gives you an app that
# half-works until the next launch, which is a confusing thing to debug.

set -euo pipefail
cd "$(dirname "$0")/.."

BUILT="src-tauri/target/release/bundle/macos/TableTop Forge.app"
DEST="/Applications/TableTop Forge.app"

[ -d "$BUILT" ] || { echo "No built app at $BUILT — run: npm run tauri:build"; exit 1; }

if pgrep -f "TableTop Forge.app/Contents/MacOS/tabletopforge" >/dev/null 2>&1; then
  echo "TableTop Forge is running. Quit it (⌘Q) and run this again."
  echo "Quit it properly, not Force Quit — a hard kill can corrupt the database."
  exit 1
fi

echo "Installing $(du -sh "$BUILT" | cut -f1) → $DEST"
rm -rf "$DEST"
cp -R "$BUILT" "$DEST"

# Gatekeeper marks anything built locally as unsigned; without this the first
# launch can be refused outright rather than merely warned about.
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

echo "Done. Version: $(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$DEST/Contents/Info.plist" 2>/dev/null || echo '?')"
echo "Open it from Applications — not from a mounted .dmg, or ejecting the disk image kills it."
