# FILE47 — the surveillance room

The 3D scene behind `/file47`.

## Provenance

Read straight out of the supplied GLB's `asset.extras`, unedited:

|           |                                                                                    |
| --------- | ---------------------------------------------------------------------------------- |
| Title     | Surveillance room                                                                  |
| Author    | wa_rouk — https://sketchfab.com/wa_rouk                                            |
| Source    | https://sketchfab.com/3d-models/surveillance-room-7fd56cd3917443a99966352beefd8304 |
| Licence   | **SKETCHFAB Standard** — https://sketchfab.com/licenses                            |
| Generator | Sketchfab-16.65.0                                                                  |

## Licence — settled

Cleared by MKBLV on 2026-09-12: the client is satisfied the asset may be used
and served on this site, and the route was authorised to go public on that
basis. The provenance above is kept as the record of what was cleared.

If the model is ever re-exported or swapped, this clearance does not travel
with it — it was given for this file.

## What was done to it

Source was 15.0 MB. Pipeline, via `@gltf-transform/cli` v4:

| Step                            | Result                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| source                          | 15.0 MB                                                                                      |
| `dedup`                         | 15.0 MB                                                                                      |
| `prune --keep-attributes false` | 11.0 MB — every material is `KHR_materials_unlit`, so the `NORMAL` attribute was dead weight |
| `weld`                          | 9.3 MB                                                                                       |
| `webp --quality 82`             | 7.6 MB — three 1024² PNG bakes                                                               |
| `meshopt`                       | **2.79 MB** (1.72 MB gzipped)                                                                |

Kept at 181,358 triangles. `simplify --ratio 0.5` was measured and rejected: it
returned 6% for a real risk to the monitor bezels, because the size is carried
by UV data at seams rather than by triangle count.

**Meshopt over Draco deliberately.** Draco reached 1.30 MB (1.22 MB gzipped),
about 500 KB better on the wire, but costs a WASM decoder fetch and a much
slower decode. Meshopt's decoder is a 29 KB ES module already inside `three`,
and the scene decodes in ~266 ms under software rendering. The room is not
served below 760px at all, so the 500 KB buys less than the decode time costs.

Regenerate with `scripts/file47-room.sh`. The 15 MB original is **not** in the
repository — keep it wherever the licence copy is kept.

## What is in the scene

One curved bank of CRT monitors, equipment racks, a chair, a desk and cable
runs, on a 14.9 × 15.4 floor plane. Scene AABB is
`[-5.15, -2.90, -5.83] … [9.74, 2.95, 9.57]`; the room a visitor actually sees
sits within x `-0.3…5.8`, z `-1.8…4.7`.

Everything is **unlit with baked textures**, which is why the route adds no
lights: the bake is the lighting, and adding any would flatten it.

The bake is a yellow/black duotone, close enough to FILE47's marker `#f2f04a`
that the palette needed no reconciliation. That is luck, not design.

### Why nothing is mounted on a modelled monitor

The meshes are `Object_0`…`Object_15` — no monitor is a named node, and the
~20 CRTs are welded into three large meshes. Locating individual screen faces
was attempted twice: a 378k-ray probe (abandoned, no BVH, far too slow) and a
28k-ray probe that graded hits by baked luminance and clustered them. The best
cluster it returned landed on a bezel rather than on glass.

So FILE47 carries **its own screen**, placed at the focal point of the monitor
arc at a transform we control and can unit-test. Reverse-engineering someone
else's weld to hang a booking form off it would put the client's booking flow
on a foundation that a single re-export would break.
