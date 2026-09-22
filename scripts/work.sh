#!/usr/bin/env bash
# Rebuild public/work/** from the files in work-source/.
#
# Normally you never run this: pushing to work-source/ on GitHub runs it for
# you (.github/workflows/work.yml). It is here for working offline, and for
# files too large for GitHub's 25 MB web uploader.
#
#   pnpm work                        # reads work-source/
#   SRC=~/somewhere-else pnpm work   # reads somewhere else
#
# Each piece comes out twice — a 512px copy for the wall and, where the source
# is big enough to be worth it, a master of up to 2560px for the plate that
# opens when a piece is selected. See scripts/work.mjs for the rules,
# and docs/WORK.md for what has been cleared for display.
#
# sharp is installed into a temp directory rather than added to the workspace:
# this runs when new work arrives, not on every build, and nobody should carry
# a native image dependency in their install for it. Same reasoning as the
# `npx --yes @gltf-transform/cli` in room.sh.
set -euo pipefail

# Defaults to the repository's own folders, which is the case that matters.
SRC="${SRC:-work-source}"

SHARP_VERSION="${SHARP_VERSION:-0.34.2}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Installing sharp@${SHARP_VERSION}…"
npm install --prefix "$TMP" --no-audit --no-fund --loglevel=error "sharp@${SHARP_VERSION}"

# SHARP_PATH, not NODE_PATH: the script is ESM, and ESM resolution ignores
# NODE_PATH entirely. It builds an explicit require rooted here instead.
SHARP_PATH="$TMP/node_modules" SRC="$SRC" node "$ROOT/scripts/work.mjs"
