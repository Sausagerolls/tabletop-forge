#!/bin/bash
set -e

# Build a release zip and update the website's download CTA in one step.
#
# Usage: ./publish_release.sh <version>
#   e.g. ./publish_release.sh 1.3.0
#
# What it does:
#   1. Runs ./make_release.sh <version> to produce releases/dnd-vtt-v<version>.zip
#   2. Copies the zip to website/releases/ (the public download folder)
#   3. Edits website/index.html so the "Download" button's href and label
#      point at the new version
#   4. Prints the next-steps git commands — the script does NOT auto-commit
#      so you can eyeball the diff first
#
# Idempotent: re-running with the same version overwrites cleanly.

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  echo "  e.g. $0 1.3.0"
  exit 1
fi

# Run from the script's own directory so relative paths line up regardless
# of where the user invoked it from.
cd "$(dirname "$0")"

ZIP_NAME="dnd-vtt-v${VERSION}.zip"
ZIP_SRC="releases/${ZIP_NAME}"
ZIP_DST_DIR="website/releases"
INDEX_HTML="website/index.html"

echo "▶ Building release v${VERSION}..."
./make_release.sh "$VERSION"

if [ ! -f "$ZIP_SRC" ]; then
  echo "ERROR: $ZIP_SRC was not produced by make_release.sh." >&2
  exit 1
fi

echo ""
echo "▶ Staging zip for the website..."
mkdir -p "$ZIP_DST_DIR"
cp "$ZIP_SRC" "$ZIP_DST_DIR/"
echo "  copied → $ZIP_DST_DIR/$ZIP_NAME"

echo ""
echo "▶ Bumping download link in $INDEX_HTML..."
# Two replacements: the href on the download button, and the visible
# button label "Download vX.Y.Z (.zip)". perl -i is portable across
# macOS BSD sed and Linux GNU sed.
perl -i -pe \
  "s|href=\"releases/dnd-vtt-v[0-9][0-9A-Za-z.\\-]*\\.zip\"|href=\"releases/${ZIP_NAME}\"|g" \
  "$INDEX_HTML"
perl -i -pe \
  "s|Download v[0-9][0-9A-Za-z.\\-]* \\(\\.zip\\)|Download v${VERSION} (.zip)|g" \
  "$INDEX_HTML"

# Sanity-check the edits actually landed — protects against a regex
# typo silently no-op'ing the bump.
if ! grep -q "$ZIP_NAME" "$INDEX_HTML"; then
  echo "ERROR: $INDEX_HTML was not updated to reference $ZIP_NAME." >&2
  echo "       Expected the regex to match an existing href=\"releases/dnd-vtt-vX.Y.Z.zip\"." >&2
  exit 1
fi
if ! grep -q "Download v${VERSION} (.zip)" "$INDEX_HTML"; then
  echo "WARNING: button label might not have updated. Check the diff." >&2
fi

echo "  href + label now point at v${VERSION}"

echo ""
echo "✅ Release v${VERSION} published locally."
echo ""
echo "Review the changes:"
echo "  git diff -- $INDEX_HTML"
echo ""
echo "When ready to ship:"
echo "  git add $ZIP_DST_DIR/$ZIP_NAME $INDEX_HTML"
echo "  git commit -m \"website: download v${VERSION}\""
echo "  git tag -a v${VERSION} -m \"v${VERSION}\""
echo "  git push origin main && git push origin v${VERSION}"
echo ""
