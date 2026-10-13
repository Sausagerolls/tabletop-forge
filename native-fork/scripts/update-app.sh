#!/usr/bin/env bash
# Push the live app's current code into /Applications, start to finish.
#
#   ./scripts/update-app.sh              # quits the app if running, installs, relaunches it
#   ./scripts/update-app.sh --no-restart # leave it closed afterwards
#   ./scripts/update-app.sh --skip-build # bundle already built; just install
#
# The whole chain in one command, because it is four steps and skipping any of
# them leaves the desktop app behind the server — which does not merely mean
# missing features. A desktop build older than a session pack drops columns it
# does not recognise on import, and that reads as lost data rather than an out of
# date app.
#
#   1. sync the live source into the fork (re-applying the fork's own deltas)
#   2. build the React app
#   3. build the Tauri bundle (Rust, ~90s warm)
#   4. quit /Applications/TableTop Forge.app, replace it, relaunch
#
# Deliberately quits the app rather than refusing: an update nobody remembers to
# apply is not an update. The quit is a graceful AppleScript quit — the same thing
# ⌘Q does — because a hard kill can corrupt PGlite, and this script must never be
# the thing that eats a campaign.

set -euo pipefail
cd "$(dirname "$0")/.."

RESTART=1
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --no-restart) RESTART=0 ;;
    --skip-build) SKIP_BUILD=1 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

APP_NAME="TableTop Forge"
BUILT="src-tauri/target/release/bundle/macos/${APP_NAME}.app"
DEST="/Applications/${APP_NAME}.app"

step() { printf '\n\033[1m→ %s\033[0m\n' "$1"; }

# ── Was it running? ─────────────────────────────────────────────────────────
WAS_RUNNING=0
if pgrep -f "${APP_NAME}.app/Contents/MacOS/tabletopforge" >/dev/null 2>&1; then WAS_RUNNING=1; fi

if [ "$SKIP_BUILD" = "0" ]; then
  step "Syncing from the live tree"
  node scripts/sync-from-live.mjs

  # Only when the manifest actually moved — `npm install` on every change turns a
  # two-minute update into a five-minute one.
  for part in backend frontend; do
    if [ ! -d "$part/node_modules" ] || [ "$part/package.json" -nt "$part/node_modules" ]; then
      step "Installing $part dependencies (package.json changed)"
      (cd "$part" && npm install --silent)
    fi
  done

  step "Building the interface"
  (cd frontend && npx vite build >/dev/null)

  step "Building the app bundle"
  # shellcheck disable=SC1091
  [ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"
  command -v cargo >/dev/null || { echo "cargo not found — install Rust: https://rustup.rs"; exit 1; }
  # A disk image left mounted from an earlier build blocks bundle_dmg.sh, and the
  # .app is what matters here, so the DMG failing is not fatal.
  npm run tauri:build || echo "  (bundle_dmg failed — the .app itself is built; a mounted disk image is the usual cause)"
fi

[ -d "$BUILT" ] || { echo "No built app at $BUILT"; exit 1; }

# ── Quit, replace, relaunch ─────────────────────────────────────────────────
if [ "$WAS_RUNNING" = "1" ]; then
  step "Quitting ${APP_NAME} (gracefully — never kill -9, it can corrupt the database)"
  osascript -e "quit app \"${APP_NAME}\"" 2>/dev/null || true
  for _ in $(seq 1 20); do
    pgrep -f "${APP_NAME}.app/Contents/MacOS/tabletopforge" >/dev/null 2>&1 || break
    sleep 1
  done
  # The Tauri shell kills its node sidecar on close, but an orphan left behind
  # would be a SECOND process on the same PGlite database — which is what
  # corrupted it once already.
  if pgrep -f "${APP_NAME}.app/Contents/MacOS/node" >/dev/null 2>&1; then
    echo "  stopping a leftover backend process"
    pkill -TERM -f "${APP_NAME}.app/Contents/MacOS/node" || true
    sleep 2
  fi
  if pgrep -f "${APP_NAME}.app/Contents/MacOS/tabletopforge" >/dev/null 2>&1; then
    echo "  it is still running — close it by hand and re-run with --skip-build"
    exit 1
  fi
fi

step "Installing into /Applications"
rm -rf "$DEST"
cp -R "$BUILT" "$DEST"
# Gatekeeper flags anything built locally; without this the first launch can be
# refused outright rather than merely warned about.
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

VERSION=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$DEST/Contents/Info.plist" 2>/dev/null || echo '?')
BACKEND_LINES=$(wc -l < "$DEST/Contents/Resources/_up_/backend/src/index.js" | tr -d ' ')
echo "  ${APP_NAME} ${VERSION} installed (backend ${BACKEND_LINES} lines)"

if [ "$RESTART" = "1" ] && [ "$WAS_RUNNING" = "1" ]; then
  step "Relaunching"
  open -a "$DEST"
  echo "  running again — your data in ~/.tabletopforge is untouched"
elif [ "$RESTART" = "1" ]; then
  echo
  echo "Not relaunching: it wasn't running when this started. Open it from Applications."
fi
