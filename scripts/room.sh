#!/usr/bin/env bash
# Rebuild public/surveillance-room.glb from the licensed source.
#
# The 15 MB original is deliberately not in this repository — see
# docs/ROOM.md. Point SRC at wherever it is kept.
#
#   SRC=~/assets/surveillance_room_2.glb ./scripts/room.sh
set -euo pipefail

SRC="${SRC:?set SRC to the source .glb}"
OUT="public/surveillance-room.glb"
GT="${GT:-npx --yes @gltf-transform/cli@4}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Every material is KHR_materials_unlit, so NORMAL is never read — dropping it
# is a third of the vertex payload for no visual change.
$GT dedup "$SRC"        "$TMP/a.glb"
$GT prune "$TMP/a.glb"  "$TMP/b.glb" --keep-attributes false
$GT weld  "$TMP/b.glb"  "$TMP/c.glb"
$GT webp  "$TMP/c.glb"  "$TMP/d.glb" --quality 82

# Meshopt, not Draco: 500 KB worse on the wire, but the decoder is already
# inside three and it decodes an order of magnitude faster.
$GT meshopt "$TMP/d.glb" "$OUT"

ls -l "$OUT"
