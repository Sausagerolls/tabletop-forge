#!/usr/bin/env bash
# Push the tile-map visibility fix to the live server and restart what needs it.
#
# Four files, listed explicitly rather than rsyncing a tree: the server holds
# its own uploads, plugins and database, and a broad sync is how those get
# clobbered. Nothing else on the box is touched.
#
#   tools/deploy-tile-fix.sh              # uses .deploy-env
#   DEPLOY_PASS=... tools/deploy-tile-fix.sh
#   tools/deploy-tile-fix.sh --check      # connect and report, change nothing
#
# The BACKEND must restart, not just the frontend: the walls for tiles already
# laid are written by a backfill that runs at boot.
set -euo pipefail
cd "$(dirname "$0")/.."

CHECK_ONLY=0
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=1

[[ -f .deploy-env ]] && source .deploy-env
HOST="${DEPLOY_HOST:-192.168.50.131}"
USER_="${DEPLOY_USER:-root}"
# NOT $DEPLOY_PATH — that points at the marketing site, which has no app in it.
APP="${APP_PATH:-/mnt/user/appdata/TableTopForge}"

# The variable in .deploy-env is DEPLOY_PASSWORD. Reading DEPLOY_PASS instead
# handed sshpass an EMPTY password, and the resulting "Permission denied" reads
# exactly like a stale credential — which cost a deploy that should have gone
# out hours earlier. Both names are accepted now.
DEPLOY_PASS="${DEPLOY_PASS:-${DEPLOY_PASSWORD:-}}"

if [[ -z "${DEPLOY_PASS:-}" ]]; then
  echo "No password: set DEPLOY_PASSWORD in .deploy-env, or:" >&2
  echo "  DEPLOY_PASS='...' tools/deploy-tile-fix.sh" >&2
  exit 2
fi
command -v sshpass >/dev/null || { echo "sshpass not installed (brew install sshpass)" >&2; exit 2; }

SSH=(sshpass -p "$DEPLOY_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$USER_@$HOST")
RSYNC_RSH="sshpass -p $DEPLOY_PASS ssh -o StrictHostKeyChecking=no"

echo "→ checking $USER_@$HOST:$APP"
"${SSH[@]}" "test -f '$APP/docker-compose.yml' && test -f '$APP/backend/src/index.js'" || {
  echo "That path does not look like the app (no docker-compose.yml + backend/src/index.js)." >&2
  echo "Find it with:  ssh $USER_@$HOST 'docker ps --format \"{{.Names}}\t{{.Labels}}\" | grep -i forge'" >&2
  echo "then re-run with APP_PATH=/the/right/path" >&2
  exit 1
}
echo "  ok"

FILES=(
  "restored-live/frontend/src/components/Map3DView.jsx:frontend/src/components/Map3DView.jsx"
  "restored-live/frontend/src/components/MapStage.jsx:frontend/src/components/MapStage.jsx"
  "restored-live/backend/src/index.js:backend/src/index.js"
  "restored-live/backend/src/tileSegments.js:backend/src/tileSegments.js"
)

if (( CHECK_ONLY )); then
  echo "→ would copy:"
  for pair in "${FILES[@]}"; do echo "    ${pair%%:*}  ->  $APP/${pair##*:}"; done
  echo "→ would then: docker compose build backend frontend && docker compose up -d backend frontend"
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
echo "→ backing up and copying"
for pair in "${FILES[@]}"; do
  src="${pair%%:*}"; dst="${pair##*:}"
  # The project's own convention: a dated copy alongside, before overwriting.
  "${SSH[@]}" "test -f '$APP/$dst' && cp '$APP/$dst' '$APP/$dst.bak-$STAMP' || true"
  rsync -av --rsh="$RSYNC_RSH" "$src" "$USER_@$HOST:$APP/$dst"
done

echo "→ rebuilding backend and frontend (this takes a few minutes)"
"${SSH[@]}" "cd '$APP' && docker compose build backend frontend && docker compose up -d backend frontend"

echo "→ waiting for the backend to come up and run the wall backfill"
sleep 25
"${SSH[@]}" "cd '$APP' && docker compose logs --tail=200 backend | grep -Ei 'tiles\]|backfill|error' | tail -20" || true

cat <<'DONE'

Done. Two things to confirm:

  * the log above should carry a line like
        [tiles] backfilled N edge wall(s) across M laid tile(s)
    That is the tiles already on your board gaining their walls. If N is 0 and
    you have tiles laid, say so — it means they already had walls and the cause
    is elsewhere.

  * then point the diagnostic at the board and read the VERDICT:
        node tools/diagnose-tiles.sh   # see tools/diagnose-tiles.mjs
DONE
