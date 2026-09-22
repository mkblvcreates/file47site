# FILE47

WebGL custom interactive 3D portfolio and branding site for **File.47_**, a
design firm. The site is a surveillance room, and the site is on one of its
screens.

**Live:** https://file47-site.vercel.app · **Contact:** file47studios@pm.me

---

## Adding work — the short version

Drag files into one of these folders on GitHub and commit. That is the whole
job; a few minutes later they are on the site.

| Folder                                           | What goes in it                                   |
| ------------------------------------------------ | ------------------------------------------------- |
| [work-source/logos](work-source/logos)           | marks, wordmarks, logo sheets, identity systems   |
| [work-source/production](work-source/production) | packaging, dielines, labels, product graphics     |
| [work-source/clothing](work-source/clothing)     | garments, tees, apparel mockups, separations      |
| [work-source/marketing](work-source/marketing)   | flyers, campaigns, cards, banners, social artwork |

PNG, JPG, WebP, TIFF and PDF, any size up to GitHub's 25 MB web-upload limit.
A GitHub Action converts each file into the two sizes the site serves and
commits them back; Vercel redeploys off that commit.

New pieces arrive labelled from their filename, which is a placeholder rather
than a name — give them a real one in `LABELS` in `src/lib/file47-room.ts`.
The full instructions, including what is not accepted and why, are in
[work-source/README.md](work-source/README.md).

## Running it

```sh
pnpm install
pnpm dev          # http://localhost:3200
```

| Command         | What it does                                                  |
| --------------- | ------------------------------------------------------------- |
| `pnpm dev`      | the site, with hot reload                                     |
| `pnpm verify`   | the whole gate: format, lint, types, unit tests, build        |
| `pnpm test`     | unit tests only — fast, no browser                            |
| `pnpm test:e2e` | end-to-end, in a real browser                                 |
| `pnpm work`     | convert `work-source/` by hand (the Action does this for you) |
| `pnpm build`    | a production build                                            |

**There is nothing to configure.** No `.env`, no API key, no database. The app
has no dynamic route and builds fully static, so a deployment cannot break for
want of a variable being set.

## How it is put together

```
app/               routes — the site, the privacy notice, the icon, 404
src/components/    the room (React Three Fiber), the screen, the plate
src/lib/           the arithmetic: geometry, framing, zoom, the work index
  file47-room.ts     where every piece hangs, what it is called, the camera
  file47-work.generated.json   written by the converter — not hand-edited
public/work/       the converted work, two sizes
work-source/       the originals you upload
scripts/           the converters
tests/e2e/         end-to-end tests
docs/              how and why — start with docs/BUILD.md
```

**The room** is one baked, unlit GLB rendered into a low-resolution buffer and
run through a PS2-era ordered dither, so the work on the walls is part of the
picture rather than pasted over it. Selecting a piece flies the camera to it and
opens the full-resolution master in DOM, where it can be pinched and zoomed.

**The flat page** is the same screen without the room — the automatic choice
without WebGL, on reduced motion, on a data saver, and whenever the scene
throws. Everything a client can do in the room, they can do there, and an
end-to-end test asserts the whole booking flow works with no canvas on the page
at all.

**Booking** opens the visitor's own mail app with the brief already written. The
site has no server, sends nothing itself, stores nothing, and never claims
otherwise.

## Reading further

| Document                               | What it covers                                     |
| -------------------------------------- | -------------------------------------------------- |
| [docs/BUILD.md](docs/BUILD.md)         | how the room, the screen and the booking path work |
| [docs/WORK.md](docs/WORK.md)           | every piece, where it came from, and its clearance |
| [docs/ROOM.md](docs/ROOM.md)           | the 3D asset, its licence and how it was optimised |
| [docs/DECISIONS.md](docs/DECISIONS.md) | the decisions that shaped this, and the reversals  |

## Things that are deliberate

- **No fabricated anything.** No invented case studies, no placeholder client
  names, no reference number for a record that does not exist. Where something
  is unknown the page says so — the privacy notice reads `TO CONFIRM` for the
  registered entity rather than inventing one.
- **Rate bands are indicative.** A committed number belongs in a written scope.
- **The work is never stretched.** Every panel is sized to its picture, and the
  zoom is capped at the pixels that actually exist.
- **Built by MKBLV**, credited once, on the studio screen.

## Outstanding

- The registered legal name and address for the privacy notice — set `entity` in
  `PRIVACY` in `src/lib/file47.ts` and the page follows.
- 23 files in the original handover are larger than GitHub's web uploader
  accepts and are not on the site yet. They are listed in
  [docs/WORK.md](docs/WORK.md); `pnpm work` converts them from a machine that
  has them.
