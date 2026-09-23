#!/usr/bin/env bash
# Rebuild app/icon.png and app/apple-icon.png from brand/file47-mark.png.
#
# sharp is installed into a temp directory rather than carried as a dependency:
# this runs when the mark changes, which is close to never, and nobody should
# hold a native image library in their install for it. Same reasoning as
# scripts/work.sh.
set -euo pipefail

SHARP_VERSION="${SHARP_VERSION:-0.34.2}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Installing sharp@${SHARP_VERSION}…"
npm install --prefix "$TMP" --no-audit --no-fund --loglevel=error "sharp@${SHARP_VERSION}"

SHARP_PATH="$TMP/node_modules" node "$ROOT/scripts/icons.mjs"
