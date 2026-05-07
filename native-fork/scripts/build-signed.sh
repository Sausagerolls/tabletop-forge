#!/usr/bin/env bash
# Wrapper around `tauri build` that pulls four signing creds out of
# `.signing-env` (gitignored), validates the keychain has a matching
# cert, kicks off the build, and verifies the output is properly
# signed + notarized.
#
# Usage:
#   ./scripts/build-signed.sh             # build + notarize
#   ./scripts/build-signed.sh --no-bundle # cargo-only check
#   ./scripts/build-signed.sh appstore    # use the App Store entitlements
#
# Run from native-fork/ (or anywhere — the script cd's to its own
# project root before invoking tauri).

set -e

# ── Resolve project root + load creds ─────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

ENV_FILE=".signing-env"
if [ ! -f "$ENV_FILE" ]; then
  cat <<'EOF' >&2
ERROR: .signing-env not found in native-fork/.

Copy the template:
  cp .signing-env.example .signing-env

Then fill in your APPLE_PASSWORD (app-specific password from
appleid.apple.com) and double-check APPLE_SIGNING_IDENTITY
matches the cert name in your keychain — run
`security find-identity -p codesigning -v` to see what's there.
EOF
  exit 1
fi

# Source the file with `set -a` so every assignment is auto-
# exported into the env for `tauri build` to pick up.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# ── Sanity-check the four required vars ───────────────────────────
required=(APPLE_TEAM_ID APPLE_ID APPLE_PASSWORD APPLE_SIGNING_IDENTITY)
for var in "${required[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: $var is empty in .signing-env." >&2
    exit 1
  fi
done

# ── Verify the cert is actually in the keychain ────────────────────
# Strip the parenthesised team ID off the identity string for the
# grep, so a typo in the team-ID half doesn't fail the match — we
# just need to know SOME cert with that CN is installed.
identity_cn="${APPLE_SIGNING_IDENTITY%% (*}"
if ! security find-identity -p codesigning -v 2>/dev/null \
     | grep -q "\"$APPLE_SIGNING_IDENTITY\""; then
  cat <<EOF >&2
ERROR: the signing identity in .signing-env doesn't match anything
in your keychain.

  Looking for: $APPLE_SIGNING_IDENTITY

Currently installed identities:
EOF
  security find-identity -p codesigning -v 2>/dev/null \
    | grep -E '^ *[0-9]+\)' | sed 's/^/  /' >&2
  echo "" >&2
  echo "Either fix .signing-env to match an installed cert, or open" >&2
  echo "Xcode → Settings → Accounts → Manage Certificates and create" >&2
  echo "the missing cert (Developer ID Application for direct-dist," >&2
  echo "Apple Distribution for App Store)." >&2
  exit 2
fi

# ── Pick which entitlements file the bundler uses ────────────────
# `appstore` flips tauri.conf.json's macOS.entitlements over to the
# sandbox-on plist for App Store submissions. Default stays on the
# Developer ID plist for the standard .dmg release.
TARGET="${1:-developerid}"
case "$TARGET" in
  appstore)
    ENT_FILE="macos/Entitlements.AppStore.plist"
    BUILD_FLAGS=""
    echo "▶ Building with App Store entitlements (sandbox enabled)"
    ;;
  --no-bundle)
    ENT_FILE=""
    BUILD_FLAGS="--no-bundle"
    ;;
  *)
    ENT_FILE="macos/Entitlements.DeveloperID.plist"
    BUILD_FLAGS=""
    echo "▶ Building with Developer ID entitlements (notarized direct-distribution)"
    ;;
esac

# Patch tauri.conf.json's entitlements pointer in-place if a target
# was specified. Uses python3 for a JSON-safe rewrite — sed is too
# brittle when the surrounding whitespace can change.
if [ -n "$ENT_FILE" ]; then
  python3 - <<PY
import json, sys
with open('src-tauri/tauri.conf.json') as f:
    cfg = json.load(f)
cfg.setdefault('bundle', {}).setdefault('macOS', {})
cfg['bundle']['macOS']['entitlements'] = "$ENT_FILE"
with open('src-tauri/tauri.conf.json', 'w') as f:
    json.dump(cfg, f, indent=2)
    f.write('\n')
PY
fi

# ── Build ─────────────────────────────────────────────────────────
echo "▶ Identity:       $APPLE_SIGNING_IDENTITY"
echo "▶ Team ID:        $APPLE_TEAM_ID"
echo "▶ Apple ID:       $APPLE_ID"
echo "▶ Entitlements:   ${ENT_FILE:-none}"
echo ""

# Tauri's bundler reads APPLE_SIGNING_IDENTITY automatically.
# Notarization runs when APPLE_ID + APPLE_PASSWORD + APPLE_TEAM_ID
# are all set — the CLI uses notarytool under the hood.
PATH="/opt/homebrew/bin:$PATH" npx --no-install tauri build $BUILD_FLAGS

# ── Verify the output ─────────────────────────────────────────────
APP_PATH="src-tauri/target/release/bundle/macos/TableTop Forge.app"
if [ -d "$APP_PATH" ]; then
  echo ""
  echo "▶ Verifying signature on $APP_PATH"
  codesign --verify --verbose=2 "$APP_PATH" 2>&1 | sed 's/^/    /'
  echo ""
  echo "▶ Gatekeeper assessment"
  spctl --assess --verbose=4 "$APP_PATH" 2>&1 | sed 's/^/    /' || true
fi

DMG_PATH="$(ls -1t src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null | head -1 || true)"
if [ -n "$DMG_PATH" ]; then
  echo ""
  echo "▶ Stapled .dmg: $DMG_PATH"
  xcrun stapler validate "$DMG_PATH" 2>&1 | sed 's/^/    /' || true
fi

echo ""
echo "✅ Done."
