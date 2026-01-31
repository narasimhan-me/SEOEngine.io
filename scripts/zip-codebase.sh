#!/usr/bin/env bash
#
# Zip the codebase excluding files matched by .gitignore.
# Output: one zip in a folder, named with a timestamp; previous zips are removed.
#
# Usage: from repo root, run:
#   ./scripts/zip-codebase.sh
# Or: bash scripts/zip-codebase.sh
#

set -e

# Go to repo root (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Output folder and naming
ARCHIVE_DIR="${REPO_ROOT}/archives"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ZIP_NAME="codebase-${TIMESTAMP}.zip"
ZIP_PATH="${ARCHIVE_DIR}/${ZIP_NAME}"

# Ensure archive directory exists
mkdir -p "$ARCHIVE_DIR"

# Remove any existing zip(s) in the folder so only one remains
if compgen -G "${ARCHIVE_DIR}/*.zip" > /dev/null 2>&1; then
  rm -f "${ARCHIVE_DIR}"/*.zip
fi

# Build file list: tracked files + untracked files not ignored by .gitignore
# (git ls-files --others --exclude-standard = untracked, not ignored)
{
  git ls-files
  git ls-files --others --exclude-standard
} | sort -u | zip -r "$ZIP_PATH" -@ -q

echo "Created: $ZIP_PATH"
echo "Files in archive: $(zipinfo -t "$ZIP_PATH" | tail -1)"
