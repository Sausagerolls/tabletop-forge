#!/bin/bash
set -e
cd "$(dirname "$0")"

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit it to change passwords!"
fi

# ── Detect the host's `.local` hostname ──────────────────────────────────
# Players on phones / iPads connect via mDNS (`<hostname>.local`)
# rather than a raw LAN IP — the iOS App Store + Android Play Store
# both restrict cleartext to known-private destinations, and `.local`
# is on the allow-list while bare IPs are not. The backend's own
# bonjour-service publish handles `tabletopforge.local` when multicast
# can escape (Linux + network_mode: host); for Mac/Windows Docker
# we surface the HOST machine's existing `.local` name instead, since
# Docker Desktop traps the container's multicast inside the VM.
EXTERNAL_LOCAL_HOST=""
case "$(uname -s)" in
  Darwin)
    # macOS auto-advertises `<computer-name>.local` via mDNSResponder.
    EXTERNAL_LOCAL_HOST="$(scutil --get LocalHostName 2>/dev/null || true)"
    ;;
  Linux)
    # Avahi advertises `<hostname>.local` if avahi-daemon is running.
    if command -v avahi-resolve >/dev/null 2>&1 && systemctl is-active --quiet avahi-daemon 2>/dev/null; then
      EXTERNAL_LOCAL_HOST="$(hostname -s 2>/dev/null || hostname || true)"
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*)
    # Git Bash / Cygwin on Windows. We can't easily check whether
    # Bonjour Print Services is installed from here; just hand the
    # bare COMPUTERNAME through and let the user verify.
    EXTERNAL_LOCAL_HOST="$(hostname 2>/dev/null || true)"
    ;;
esac
export EXTERNAL_LOCAL_HOST

# Build and start
docker compose down
docker compose build --no-cache
docker compose up -d

PORT_VAL="$(grep -E '^PORT=' .env | head -1 | cut -d= -f2 | tr -d '\r' || true)"
[ -z "$PORT_VAL" ] && PORT_VAL=80
PORT_SUFFIX=""
[ "$PORT_VAL" != "80" ] && PORT_SUFFIX=":${PORT_VAL}"

echo ""
echo "✅ TableTop Forge is running!"
echo ""
echo "   GM (this machine):   http://localhost${PORT_SUFFIX}/"
if [ -n "$EXTERNAL_LOCAL_HOST" ]; then
  echo "   Players (LAN):       http://${EXTERNAL_LOCAL_HOST}.local${PORT_SUFFIX}/"
  echo "                        (mDNS — works for Android NSC + iOS)"
else
  echo "   Players (LAN):       http://<your-LAN-IP>${PORT_SUFFIX}/"
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
      echo "                        ⚠ For phone players to use a .local URL, install"
      echo "                          Apple's free Bonjour Print Services for Windows:"
      echo "                          https://support.apple.com/kb/DL999"
      ;;
    Linux)
      echo "                        ⚠ For phone players to use a .local URL, install Avahi:"
      echo "                          sudo apt install avahi-daemon  (or your distro's equivalent)"
      ;;
  esac
fi
echo ""
echo "   GM master password:  $(grep DM_MASTER_PASSWORD .env | cut -d= -f2)"
echo ""
