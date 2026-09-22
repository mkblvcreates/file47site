# FILE47 — the OSD face

The overlay is set in **VCR OSD Mono**, the on-screen-display face a VCR burned
into the top of the picture.

|         |                                       |
| ------- | ------------------------------------- |
| File    | `vcr-osd-mono.woff2`                  |
| Family  | VCR OSD Mono, Regular                 |
| Version | 1.001, March 31 2015                  |
| Glyphs  | 204                                   |
| Size    | 17,992 bytes (from a 75,864-byte TTF) |

Supplied by MKBLV on 2026-09-12 and converted here from TTF to WOFF2. The TTF
carries no embedded copyright or licence name record, so the record of what was
supplied and by whom is this file.

## Committed, by a named exception

**MKBLV confirmed distribution rights for this copy on 2026-09-12**, and the
face is committed and served.

That crosses a rule the repo states plainly — `.gitignore` blocks `*.woff2`
under "Licensed font binaries — never commit", `.claude/rules/security.md` says
never commit font binaries, and `scripts/import-local-fonts.sh` permits it only
once distribution rights are confirmed. This is that confirmation, and the
exception is written to be as narrow as it can be:

```gitignore
!apps/file47/public/fonts/vcr-osd-mono.woff2
```

One path, by name. Every other font is still blocked — including a second copy
of this same face under any other filename, and anything dropped into
`apps/web/public/fonts/` or `packages/ui/fonts/`. The guard is not weakened;
one file is lifted out of it.

Why it had to be committed at all: the route deploys from git, so a face that
is not in the repository is not on the live page, and there is no other path
that puts it there.

**To reverse it**, delete the file and the negation line. The `@font-face`
falls back on its own and the overlay still reads — less specific, not broken.

## How it is wired

`@font-face` in `file47-room.css` serves this file and nothing else, then falls
back to the platform's monospace.

**No `local()` lookup, deliberately.** `local('VCR OSD Mono')` would resolve
ahead of the served file on any machine with a face by that name installed, and
there is no way to know it is this cut — VCR OSD Mono has circulated in several
versions. A visitor's copy with different metrics would quietly reflow the HUD
on their machine and nowhere else. Typography is the product on a design
studio's site, so everyone gets the same 18 KB.

It is declared at `font-weight: 100 900` from a single Regular cut. The HUD asks
for 700, and a face declared only at 400 would be synthesised into a fake bold
by smearing the outlines — on a face built from hard pixel stems that is
precisely the wrong failure. Claiming the full range hands every weight the real
glyphs.

The paper booking screen keeps its own monospace stack. An OSD face on a form a
client types into costs legibility the room can afford and the form cannot.

## Replacing it

Drop a new `vcr-osd-mono.woff2` here. If what you have is a TTF:

```bash
npx --yes wawoff2   # or fonttools: pyftsubset / ttx
```
