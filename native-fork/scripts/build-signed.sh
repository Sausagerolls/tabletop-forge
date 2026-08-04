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

# ── Parse args ────────────────────────────────────────────────────
# `--apple-intelligence` is an opt-in flag that can be combined with any
# target (e.g. `./build-signed.sh appstore --apple-intelligence`). It
# compiles the Swift FoundationModels sidecar, stages it as an externalBin,
# and turns on the matching cargo feature + config overlay. The first
# non-flag arg is the entitlements target (developerid / appstore / --no-bundle).
APPLE_AI=0
POSITIONAL=()
for a in "$@"; do
  case "$a" in
    --apple-intelligence) APPLE_AI=1 ;;
    *) POSITIONAL+=("$a") ;;
  esac
done
TARGET="${POSITIONAL[0]:-developerid}"

# ── Sanity-check required vars ────────────────────────────────────
# Mac App Store builds are NOT notarized (App Store Connect runs its own
# checks), so they only need the signing identity + team. Direct-dist
# (Developer ID) builds additionally need APPLE_ID + APPLE_PASSWORD for
# the notarytool pass that `tauri build` runs.
if [ "$TARGET" = "appstore" ]; then
  required=(APPLE_TEAM_ID APPLE_SIGNING_IDENTITY)
else
  required=(APPLE_TEAM_ID APPLE_ID APPLE_PASSWORD APPLE_SIGNING_IDENTITY)
fi
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

# The App Store build always ships the Apple Intelligence sidecar (its
# externalBin is in tauri.appstore.conf.json), so force the flag on.
if [ "$TARGET" = "appstore" ]; then
  APPLE_AI=1
fi

# ── Apple Intelligence sidecar (opt-in) ───────────────────────────
# Compile the Swift FoundationModels bridge and stage it under
# src-tauri/binaries/ with the host target-triple suffix Tauri's
# externalBin resolver expects. A config overlay adds the binary to the
# bundle's externalBin list; the cargo feature turns on the Rust spawn
# wiring. Requires the macOS 26 SDK (Xcode 26+).
if [ "$APPLE_AI" = "1" ]; then
  echo "▶ Building Apple Intelligence sidecar (FoundationModels)…"
  TARGET_TRIPLE="$(rustc -Vv | sed -n 's/^host: //p')"
  if [ -z "$TARGET_TRIPLE" ]; then
    echo "ERROR: could not determine host target triple via rustc." >&2
    exit 3
  fi
  swift build -c release --package-path apple-intelligence
  SIDECAR_SRC="apple-intelligence/.build/release/apple-intelligence-server"
  if [ ! -f "$SIDECAR_SRC" ]; then
    echo "ERROR: swift build did not produce $SIDECAR_SRC." >&2
    exit 3
  fi
  mkdir -p src-tauri/binaries
  cp "$SIDECAR_SRC" "src-tauri/binaries/apple-intelligence-server-${TARGET_TRIPLE}"
  chmod +x "src-tauri/binaries/apple-intelligence-server-${TARGET_TRIPLE}"
  echo "  staged → src-tauri/binaries/apple-intelligence-server-${TARGET_TRIPLE}"
  # Pick the config overlay + cargo features. The App Store build uses the
  # appstore overlay (all plugins bundled) + the app-store hardening feature;
  # a plain notarized AI build uses the lighter apple overlay.
  if [ "$TARGET" = "appstore" ]; then
    BUILD_FLAGS="$BUILD_FLAGS --config src-tauri/tauri.appstore.conf.json --features apple-intelligence,app-store"
  else
    BUILD_FLAGS="$BUILD_FLAGS --config src-tauri/tauri.apple.conf.json --features apple-intelligence"
  fi
fi

# ── Build ─────────────────────────────────────────────────────────
echo "▶ Identity:       $APPLE_SIGNING_IDENTITY"
echo "▶ Team ID:        $APPLE_TEAM_ID"
echo "▶ Apple ID:       $APPLE_ID"
echo "▶ Entitlements:   ${ENT_FILE:-none}"
echo "▶ Apple Intel.:   $([ "$APPLE_AI" = "1" ] && echo enabled || echo off)"
echo ""

# Tauri's bundler reads APPLE_SIGNING_IDENTITY automatically.
# Notarization runs when APPLE_ID + APPLE_PASSWORD + APPLE_TEAM_ID
# are all set — the CLI uses notarytool under the hood. Mac App Store
# builds must NOT be notarized (App Store Connect handles validation),
# so hide those creds from tauri for the appstore target.
if [ "$TARGET" = "appstore" ]; then
  unset APPLE_ID APPLE_PASSWORD
fi
PATH="/opt/homebrew/bin:$PATH" npx --no-install tauri build $BUILD_FLAGS

APP_PATH="src-tauri/target/release/bundle/macos/TableTop Forge.app"

# ── Mac App Store: re-sign helpers + build the signed .pkg ─────────
# Tauri signs the bundle with $APPLE_SIGNING_IDENTITY but applies the
# main entitlements to the nested helpers too. Under the sandbox the
# bundled Node aborts in V8::Initialize() unless cs.allow-jit is on the
# HELPER itself (inherit doesn't propagate cs.* entitlements). So we
# re-sign each helper with Entitlements.AppStore.Helper.plist, then
# re-seal the .app, then wrap it in an installer .pkg — the artifact
# App Store Connect actually accepts.
if [ "$TARGET" = "appstore" ]; then
  echo ""
  echo "▶ App Store post-processing (re-sign helpers + .pkg)"

  PROFILE="src-tauri/macos/embedded.provisionprofile"
  if [ ! -f "$PROFILE" ]; then
    echo "  ⚠ $PROFILE not found." >&2
    echo "    Create a Mac App Store provisioning profile for" >&2
    echo "    studio.giantmushroom.tabletopforge (signed by your Apple" >&2
    echo "    Distribution cert) at developer.apple.com, download it, and" >&2
    echo "    save it there. Without it the upload will be rejected." >&2
  fi

  HELPER_ENT="src-tauri/macos/Entitlements.AppStore.Helper.plist"
  MAIN_ENT="src-tauri/macos/Entitlements.AppStore.plist"

  # Re-sign nested helpers first (inside-out). codesign chokes on
  # extended attributes, so strip them before each sign.
  for helper in node apple-intelligence-server; do
    HP="$APP_PATH/Contents/MacOS/$helper"
    [ -f "$HP" ] || continue
    xattr -cr "$HP" 2>/dev/null || true
    codesign --force --options runtime --timestamp \
      --entitlements "$HELPER_ENT" \
      --sign "$APPLE_SIGNING_IDENTITY" "$HP"
    echo "  re-signed helper: $helper"
  done

  # Embed the provisioning profile (Tauri's bundler doesn't reliably
  # copy it). It must live at Contents/embedded.provisionprofile and be
  # in place BEFORE the final codesign so it gets sealed into the bundle.
  if [ -f "$PROFILE" ]; then
    cp "$PROFILE" "$APP_PATH/Contents/embedded.provisionprofile"
    echo "  embedded provisioning profile"
  fi

  # Re-seal the main bundle (picks up the re-signed helpers + the
  # embedded provisioning profile).
  xattr -cr "$APP_PATH" 2>/dev/null || true
  codesign --force --options runtime --timestamp \
    --entitlements "$MAIN_ENT" \
    --sign "$APPLE_SIGNING_IDENTITY" "$APP_PATH"
  echo "  re-signed app bundle"

  # Build the installer .pkg signed with the "3rd Party Mac Developer
  # Installer" cert. Override with $APPLE_INSTALLER_IDENTITY if set.
  INSTALLER_ID="${APPLE_INSTALLER_IDENTITY:-$(security find-identity -v 2>/dev/null | sed -n 's/.*"\(3rd Party Mac Developer Installer:[^"]*\)".*/\1/p' | head -1)}"
  if [ -z "$INSTALLER_ID" ]; then
    echo "  ⚠ No '3rd Party Mac Developer Installer' cert in keychain — skipping .pkg." >&2
    echo "    Create one at developer.apple.com (Mac Installer Distribution)." >&2
  else
    PKG_OUT="src-tauri/target/release/bundle/TableTop Forge.pkg"
    xcrun productbuild --component "$APP_PATH" /Applications \
      --sign "$INSTALLER_ID" "$PKG_OUT"
    echo "  ✅ Signed installer: $PKG_OUT"
    echo "     Upload with: xcrun notarytool ... OR Transporter.app,"
    echo "     or: xcrun altool --upload-app -t macos -f \"$PKG_OUT\" \\"
    echo "          --apple-id \"$APPLE_ID\" --password \"\$APPLE_PASSWORD\" --team-id \"$APPLE_TEAM_ID\""
  fi
fi

# ── Verify the output ─────────────────────────────────────────────
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
