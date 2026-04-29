#!/bin/bash
set -e

# deploy_release.sh — full release-and-deploy pipeline.
#
# Usage: ./deploy_release.sh <version> [--no-build] [--no-git] [--dry-run]
#   e.g. ./deploy_release.sh 1.3.0
#
# What it does, in order:
#   1. Build:   ./publish_release.sh <version>
#               (builds the release zip and bumps website/index.html)
#   2. Git:     stage + commit + tag + push (skip with --no-git)
#   3. Deploy:  rsync website/ → live server via SSH (skip with --dry-run
#               to preview the file changes without uploading)
#
# Credentials live in .deploy-env (gitignored). Format:
#   DEPLOY_HOST=192.168.50.131
#   DEPLOY_USER=root
#   DEPLOY_PATH=/mnt/user/appdata/forge
#   DEPLOY_PASSWORD=...     # optional — leave blank if SSH keys are set up
#
# If DEPLOY_PASSWORD is set, `sshpass` must be installed locally.

# ── Args ────────────────────────────────────────────────────────────────
VERSION=""
SKIP_BUILD=0
SKIP_GIT=0
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --no-build) SKIP_BUILD=1 ;;
    --no-git)   SKIP_GIT=1 ;;
    --dry-run)  DRY_RUN=1 ;;
    -h|--help)
      echo "Usage: $0 <version> [--no-build] [--no-git] [--dry-run]"
      echo "  --no-build  skip make_release + website-bump (just commit + deploy)"
      echo "  --no-git    skip git add/commit/tag/push"
      echo "  --dry-run   rsync --dry-run for the deploy step (preview only)"
      exit 0 ;;
    -*) echo "Unknown flag: $arg" >&2; exit 1 ;;
    *)  VERSION="$arg" ;;
  esac
done

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version> [--no-build] [--no-git] [--dry-run]" >&2
  exit 1
fi

cd "$(dirname "$0")"

# ── Load credentials ────────────────────────────────────────────────────
ENV_FILE=".deploy-env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found." >&2
  echo "Copy .deploy-env.example to $ENV_FILE and fill in your server details." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
: "${DEPLOY_HOST:?missing DEPLOY_HOST in $ENV_FILE}"
: "${DEPLOY_USER:?missing DEPLOY_USER in $ENV_FILE}"
: "${DEPLOY_PATH:?missing DEPLOY_PATH in $ENV_FILE}"

# Refuse to deploy to obviously-dangerous paths since rsync --delete-after
# would happily wipe non-website files there.
case "$DEPLOY_PATH" in
  /|/usr|/usr/*|/etc|/etc/*|/bin|/bin/*|/var|/var/lib|/home|/root)
    echo "ERROR: refusing to deploy to $DEPLOY_PATH (looks like a system path)." >&2
    exit 1 ;;
esac

# ── 1) Build ────────────────────────────────────────────────────────────
if [ "$SKIP_BUILD" = "0" ]; then
  echo "▶ Step 1/3: Build release v${VERSION}"
  ./publish_release.sh "$VERSION"
  echo ""
fi

# ── 2) Git commit + tag + push ──────────────────────────────────────────
if [ "$SKIP_GIT" = "0" ]; then
  echo "▶ Step 2/3: Commit + tag + push"
  git add "website/releases/dnd-vtt-v${VERSION}.zip" website/index.html 2>/dev/null || true
  if git diff --staged --quiet; then
    echo "  (no website changes to commit)"
  else
    git commit -m "website: download v${VERSION}"
  fi
  if git rev-parse "v${VERSION}" >/dev/null 2>&1; then
    echo "  (tag v${VERSION} already exists — skipping)"
  else
    git tag -a "v${VERSION}" -m "v${VERSION}"
  fi
  git push origin main
  git push origin "v${VERSION}" 2>/dev/null || true

  # ── GitHub Release ──────────────────────────────────────────────────
  # Pushing a tag does NOT create a Release entry on github.com — the
  # /releases page stays empty unless you explicitly create one. Use the
  # gh CLI to publish a Release for this tag with auto-generated notes
  # (commit log since the previous tag, minus housekeeping commits) and
  # the downloadable zip attached as an asset.
  if command -v gh >/dev/null 2>&1; then
    if gh release view "v${VERSION}" >/dev/null 2>&1; then
      echo "  (gh release v${VERSION} already exists — skipping)"
    else
      # Find the immediately previous tag for the release-notes diff.
      # Falls back to the empty tree if this is the very first tag.
      prev_tag=$(git tag --sort=-v:refname | grep -v "^v${VERSION}\$" | head -1 || true)
      if [ -n "$prev_tag" ]; then
        # Filter out website-only commits — they're noise in user-facing notes.
        notes=$(git log --pretty=format:"- %s" "${prev_tag}..v${VERSION}" \
          | grep -v '^- website:' || true)
      fi
      [ -z "${notes:-}" ] && notes="- See commit log for changes."
      zip_path="website/releases/dnd-vtt-v${VERSION}.zip"
      if [ -f "$zip_path" ]; then
        gh release create "v${VERSION}" "$zip_path" \
          --title "v${VERSION}" --notes "$notes" \
          && echo "  GitHub Release created with $zip_path attached"
      else
        gh release create "v${VERSION}" \
          --title "v${VERSION}" --notes "$notes" \
          && echo "  GitHub Release created (no zip found at $zip_path)"
      fi
    fi
  else
    echo "  (gh CLI not installed — skipping GitHub Release creation)"
    echo "  Install it from https://cli.github.com or run:"
    echo "    gh release create v${VERSION} website/releases/dnd-vtt-v${VERSION}.zip"
  fi
  echo ""
fi

# ── 3) Deploy via rsync over SSH ────────────────────────────────────────
echo "▶ Step 3/3: Deploy website/ → ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"

# Prefer SSH keys; fall back to sshpass if a password is provided.
SSH_OPTS="-o StrictHostKeyChecking=accept-new -o LogLevel=ERROR"
if [ -n "${DEPLOY_PASSWORD:-}" ]; then
  if ! command -v sshpass >/dev/null 2>&1; then
    cat >&2 <<EOF
ERROR: DEPLOY_PASSWORD set in $ENV_FILE but sshpass is not installed.
Install one of:
  macOS:  brew install hudochenkov/sshpass/sshpass
  Linux:  apt install sshpass    (or your distro's equivalent)

Or set up SSH keys (recommended) and remove DEPLOY_PASSWORD from $ENV_FILE:
  ssh-copy-id ${DEPLOY_USER}@${DEPLOY_HOST}
EOF
    exit 1
  fi
  # Force password auth and disable pubkey attempts. Without this, ssh
  # will offer every key in ~/.ssh/ before falling back to the password,
  # and OpenSSH's MaxAuthTries (default 6) cuts the connection before
  # sshpass gets a turn — surfacing as "Too many authentication failures".
  SSH_OPTS="$SSH_OPTS -o PubkeyAuthentication=no -o PreferredAuthentications=password"
  export SSHPASS="$DEPLOY_PASSWORD"
  SSH_CMD="sshpass -e ssh $SSH_OPTS"
else
  SSH_CMD="ssh $SSH_OPTS"
fi

# Sanity-check the remote path exists and we can reach it. Catches
# wrong host / wrong password / wrong path before rsync starts pumping.
echo "  checking remote path…"
if ! $SSH_CMD "${DEPLOY_USER}@${DEPLOY_HOST}" "test -d '${DEPLOY_PATH}'"; then
  echo "ERROR: ${DEPLOY_PATH} doesn't exist on ${DEPLOY_HOST}, or login failed." >&2
  exit 1
fi

RSYNC_FLAGS="-avz --delete-after"
[ "$DRY_RUN" = "1" ] && RSYNC_FLAGS="$RSYNC_FLAGS --dry-run"

rsync $RSYNC_FLAGS -e "$SSH_CMD" website/ "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo ""
if [ "$DRY_RUN" = "1" ]; then
  echo "✅ Dry run complete. No files actually uploaded."
else
  echo "✅ Deploy complete. Public site should now serve v${VERSION}."
fi
