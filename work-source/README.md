# Adding work to the site

Four folders, one per discipline. Drop a file in one and it appears on the
site — in that folder's drawer, under WORK, in the room and on the flat page
alike.

| Folder                       | What goes in it                                      |
| ---------------------------- | ---------------------------------------------------- |
| [logos](logos)               | marks, wordmarks, logo sheets, identity systems       |
| [production](production)     | packaging, dielines, labels, product graphics         |
| [clothing](clothing)         | garments, tees, apparel mockups, separations          |
| [marketing](marketing)       | flyers, campaigns, cards, banners, social artwork     |

**The folder is what files the piece.** Nothing is guessed from a filename, so
a file in the wrong folder shows up on the wrong shelf — move it and commit,
and the site follows.

## From a browser

1. Open the folder you want on GitHub.
2. **Add file → Upload files.**
3. Drag the files in and **Commit changes**.

That is the whole job. A few minutes later the site has them.

## What happens after you commit

A GitHub Action (`.github/workflows/work.yml`) wakes up, converts everything in
these folders, and commits the results back to the repository. Vercel sees that
commit and redeploys. You do not have to run anything.

Each piece comes out twice, because the site shows work in two places that want
opposite things:

- **`public/work/<id>.webp`** — 512px on the long edge. This is what lands on a
  CRT face in the room and then goes through the dither, where a big file would
  buy nothing visible.
- **`public/work/hd/<id>.webp`** — up to 2560px. This is what opens when someone
  selects a piece, at their screen's own resolution, with pinch and zoom. It is
  fetched one at a time and never on the critical path.

The Action's summary (**Actions** tab → the run → the summary at the top) lists
every piece it made, its size, and anything it left out and why.

## What it accepts

**Images** — `.png` `.jpg` `.jpeg` `.webp` `.tif` `.tiff` `.avif` `.gif`, any size.

**PDFs** — rendered properly, at a resolution computed from the page's own size,
so a business card and a banner both land near 2560px. Up to six pages of any
one file; a seven-page brand book is not seven portfolio pieces.

**Not accepted:** `.ai`, `.psd`, `.eps`, `.indd` and video. These need the
application that made them. Export a PNG at full size and upload that instead —
the Action names any file it could not open, so nothing goes missing quietly.

## Naming

A new piece is labelled from its filename in capitals, which is a placeholder,
not a name. `sick.png` would read **SICK** on a client's portfolio when the
artwork says LOVSICK.

Give it a real name in `LABELS` in `src/lib/file47-room.ts`:

```ts
'lovsick-mark': 'LOVSICK — LETTERING',
```

The Action's summary lists every piece still on a filename, so you always know
which ones are waiting. Names come off the artwork, not the file — see
[docs/WORK.md](../docs/WORK.md).

## Things worth knowing

- **Upload limit.** GitHub's web uploader takes files up to **25 MB**. Anything
  larger has to go in with `git push` from a machine that has the file, or be
  exported smaller first.
- **Blank pages are dropped.** Print files carry blank backs, dielines and trim
  slivers. Every rendered page is measured for ink, and anything under 1.5% —
  or thinner than 6:1 — is left out and named in the summary rather than hung
  as an empty panel. If one of those is a piece, say so.
- **The same picture twice is one piece.** Sources are compared by content, so a
  file uploaded under two names, or filed in two folders, appears once.
- **Nothing is deleted for you.** Removing a file from these folders and
  committing removes its piece from the site on the next run.
- **Only the wall is hand-placed.** Every piece is in its drawer automatically.
  The fourteen that hang on screens in the room are composed by hand against
  the room's geometry, in `HUNG` in `src/lib/file47-room.ts`.

## Running it yourself

You never need to, but it is one command on a machine with Node:

```sh
pnpm work
```
