/**
 * FILE47 — turn a folder of supplied work into the two sizes the site serves.
 *
 * Drop the client's images in a folder, point SRC at it, run it. Every piece
 * comes out twice, because the site shows the work in two places that want
 * opposite things:
 *
 *   /work/<id>.webp      512 on the long edge. Lands on a CRT face a few
 *                        hundred pixels across and then goes through an
 *                        ordered dither. All of them load with the room, so
 *                        this is the one that has to stay small.
 *
 *   /work/hd/<id>.webp   Up to 2560 on the long edge, quality 88. Fetched one
 *                        at a time, only when a piece is opened, and shown in
 *                        DOM at the device's own resolution with pinch, wheel
 *                        and drag. A visitor deciding whether to hire the
 *                        studio wants to read the fine print.
 *
 * **It never upscales.** The master is the source's own pixels, capped at
 * 2560 — never stretched past them. A viewer that magnifies beyond the pixels
 * that exist is showing a guess about a client's work, and `file47-zoom.ts`
 * caps zoom at `master.w`, so an inflated number here would become invented
 * detail on screen. Sources too small to be worth a second file get no master
 * at all: the manifest points `master` at the room texture and the plate reads
 * FULL SIZE, which is the truth.
 *
 * Output is a manifest, not an edit to `PIECES`. Where a piece hangs in the
 * room — position, rotation, panel size — is composed by hand against the
 * geometry, and no script should guess at it. This writes the half that is a
 * fact about the file (id, dimensions, paths) and leaves the half that is a
 * judgement to a person.
 *
 *   SRC=work-source node scripts/work.mjs
 *   SRC=work-source ./scripts/work.sh    (installs sharp for you)
 *
 * SRC holds one folder per discipline, named for the section it fills:
 *
 *   work-source/logos/…  production/…  clothing/…  marketing/…
 *
 * The folder a file sits in is how a piece gets filed, because that is a fact
 * about the handover and not something to infer from a filename. Files loose
 * at the top level are converted and reported as unfiled; they will not appear
 * in a drawer until they are given a section.
 *
 * Clearance is not automatic: a piece added here needs its own line in
 * docs/WORK.md saying what was cleared for public display and
 * when. Nothing on this site may be represented by fabricated data, and a
 * client's work on a public site is the same promise.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';

/**
 * sharp, from wherever it actually is.
 *
 * `import sharp from 'sharp'` would be the obvious line and it does not work
 * here: the wrapper installs sharp into a temp directory, and ESM resolution
 * ignores NODE_PATH — that is a CommonJS mechanism. So the lookup is an
 * explicit require rooted at SHARP_PATH when the wrapper sets it, falling back
 * to ordinary resolution for anyone who has sharp installed already.
 */
const sharpPath = process.env['SHARP_PATH'];
const sharp = createRequire(
  sharpPath ? join(resolve(sharpPath), 'noop.cjs') : import.meta.url,
)('sharp');

/** The wall copy: small, dithered, all of them loaded at once. */
const ROOM_EDGE = 512;

/** The opened copy: big enough to read, never bigger than the source. */
const MASTER_EDGE = 2560;
const MASTER_QUALITY = 88;

/**
 * Below this, a second file buys nothing.
 *
 * A master only earns its download if it has meaningfully more to show than
 * the 512px wall copy already does. Half again on the long edge is the line —
 * 1.5× linear is 2.25× the pixels, which is the difference between reading
 * "Department of Psychiatry" under a logo and guessing at it. Under that the
 * manifest points `master` at the room texture, and the plate — which asks
 * `canZoom` for real headroom before offering a control — says FULL SIZE
 * rather than offering a magnification that would be invented.
 *
 * It was 2× and that was too blunt: a 941px crop of a logo sheet has real
 * detail to show and was being denied a master by 83 pixels.
 */
const MASTER_WORTH_IT = ROOM_EDGE * 1.5;

/** What sharp can actually open here. */
const RASTER = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.tif',
  '.tiff',
  '.avif',
  '.gif',
]);

/**
 * Page formats, rendered with poppler when it is installed.
 *
 * Most of what a design studio hands over is a PDF, so refusing them would
 * refuse the portfolio. `pdftoppm` renders each page at a DPI computed to land
 * on the master's long edge — a real rasteriser, unlike the browser PDF engine
 * that was tried first and returned a flat frame above the reference size.
 * That failure is why DAT-STUFF shipped without a master; measured against the
 * same file, poppler returns 21% ink where the browser returned 100%.
 */
const PAGE = new Set(['.pdf']);

/**
 * Formats nothing here can open.
 *
 * `.ai` is usually a PDF underneath and often renders, but not reliably enough
 * to promise; `.psd` and `.indd` need the application that made them. Named
 * individually so the report says which file and what to do about it rather
 * than silently dropping work.
 */
const VECTOR = new Set(['.eps', '.ai', '.svg', '.psd', '.indd']);

/**
 * The disciplines, in the order `SECTIONS` in file47-room.ts shows them.
 *
 * Duplicated here rather than imported: this script runs under plain node with
 * no build step, and a folder name is checked against this list so a typo
 * (`marekting/`) is reported instead of quietly producing work nothing files.
 */
const SECTIONS = ['logos', 'production', 'clothing', 'marketing'];

/** How many pages of one PDF to take. A deck is not twelve portfolio pieces. */
const MAX_PAGES = 6;

/**
 * Ink below this, and the page is treated as blank.
 *
 * Print files carry pages that are not artwork: a blank inside back, a dieline,
 * a colour bar, a trailing sliver. Rendered blind they become panels on the
 * wall with nothing on them, which reads as a broken site rather than as a
 * portfolio. Measured the same way the DAT-STUFF investigation measured it —
 * share of pixels that are not near-white — and reported rather than silently
 * dropped, because "your page 3 looked empty" is something the studio may
 * disagree with.
 */
const BLANK_INK = 0.015;

/**
 * A page that is nearly all one edge is a sliver, not a piece.
 *
 * `enzo COOKIES.pdf` page 3 renders 1650×177: a trim strip. Hanging it would
 * give a panel a 9:1 letterbox the room's geometry has no slot for.
 */
const SLIVER_RATIO = 6;

/** `PRANG_shirt final v2.png` → `prang-shirt-final-v2`. */
function slug(name) {
  return basename(name, extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `prang-shirt-final-v2` → `PRANG SHIRT FINAL V2`, as a starting point. */
function label(id) {
  return id.replace(/-/g, ' ').toUpperCase();
}

function kb(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;
}

/** Whether poppler is on PATH. Without it, PDFs are reported, not guessed at. */
function havePoppler() {
  const probe = spawnSync('pdftoppm', ['-v'], { encoding: 'utf8' });
  return !probe.error;
}

/**
 * Render a PDF's pages to PNG buffers at roughly the master's resolution.
 *
 * The DPI is computed rather than fixed: a page is measured in points, 72 to
 * the inch, so the dots per inch that land a page on MASTER_EDGE is
 * `MASTER_EDGE * 72 / longest side in points`. A business card and a banner
 * both come out about 2560 across instead of one being a postage stamp and the
 * other a gigabyte.
 */
function renderPdf(file, tmpDir) {
  const info = spawnSync('pdfinfo', [file], { encoding: 'utf8' });
  if (info.status !== 0) return { pages: [], error: 'unreadable' };

  const pages = Number(/^Pages:\s+(\d+)/m.exec(info.stdout)?.[1] ?? 0);
  const size = /^Page size:\s+([\d.]+) x ([\d.]+)/m.exec(info.stdout);
  if (!pages || !size) return { pages: [], error: 'no page geometry' };

  const longestPt = Math.max(Number(size[1]), Number(size[2]));
  const dpi = Math.min(600, Math.max(72, Math.round((MASTER_EDGE * 72) / longestPt)));
  const take = Math.min(pages, MAX_PAGES);
  const stem = join(tmpDir, 'page');

  const run = spawnSync(
    'pdftoppm',
    ['-png', '-r', String(dpi), '-f', '1', '-l', String(take), file, stem],
    { encoding: 'utf8' },
  );
  if (run.status !== 0)
    return { pages: [], error: run.stderr?.trim() || 'render failed' };

  return { pages: take, total: pages, dpi, stem };
}

async function main() {
  const src = process.env['SRC'];
  if (!src) {
    console.error('Set SRC to the folder holding the supplied work.');
    console.error('  SRC=work-source node scripts/work.mjs');
    process.exit(2);
  }

  const srcDir = resolve(src.replace(/^~/, process.env['HOME'] ?? '~'));
  const root = resolve(import.meta.dirname, '..');
  const roomDir = join(root, 'public/work');
  const hdDir = join(roomDir, 'hd');
  const manifestPath = join(root, 'src/lib/file47-work.generated.json');

  /**
   * Every supplied file, with the discipline its folder puts it under.
   *
   * One level deep and no further. A studio's handover has folders inside
   * folders — working files, exports, a `_old` — and recursing would sweep all
   * of it onto a public site. What is directly inside `logos/` is the logos.
   */
  async function gather() {
    let entries;
    try {
      entries = await readdir(srcDir, { withFileTypes: true });
    } catch {
      console.error(`Cannot read ${srcDir}`);
      process.exit(2);
    }

    const found = [];
    const strayFolders = [];

    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith('.')) continue;
      if (e.isFile()) {
        if (e.name.toLowerCase() === 'readme.md') continue;
        found.push({ name: e.name, path: join(srcDir, e.name), section: null });
        continue;
      }
      if (!e.isDirectory()) continue;
      if (!SECTIONS.includes(e.name)) {
        strayFolders.push(e.name);
        continue;
      }
      const inner = await readdir(join(srcDir, e.name), { withFileTypes: true });
      for (const f of inner.sort((a, b) => a.name.localeCompare(b.name))) {
        if (!f.isFile() || f.name.startsWith('.')) continue;
        // Each folder carries its own instructions, which are not work.
        if (f.name.toLowerCase() === 'readme.md') continue;
        found.push({
          name: f.name,
          path: join(srcDir, e.name, f.name),
          section: e.name,
        });
      }
    }

    return { found, strayFolders };
  }

  const { found, strayFolders } = await gather();

  const poppler = havePoppler();
  const ext = (f) => extname(f.name).toLowerCase();

  const rasters = found.filter((f) => RASTER.has(ext(f)));
  const pdfs = poppler ? found.filter((f) => PAGE.has(ext(f))) : [];
  const vector = found
    .filter((f) => VECTOR.has(ext(f)) || (!poppler && PAGE.has(ext(f))))
    .map((f) => f.name);
  const ignored = found
    .filter((f) => !RASTER.has(ext(f)) && !PAGE.has(ext(f)) && !VECTOR.has(ext(f)))
    .map((f) => f.name);
  const usable = [...rasters, ...pdfs];

  if (usable.length === 0) {
    console.error(`Nothing usable in ${srcDir}.`);
    if (vector.length) {
      console.error(`Found ${vector.length} vector/page file(s): ${vector.join(', ')}`);
      if (!poppler && found.some((f) => PAGE.has(ext(f)))) {
        console.error(
          'Install poppler-utils to render the PDFs (apt install poppler-utils),',
        );
        console.error('or export them to PNG at full size and drop the PNGs in instead.');
      } else {
        console.error('Export those to PNG at full size and drop the PNGs in instead.');
      }
    }
    process.exit(1);
  }

  await mkdir(roomDir, { recursive: true });
  await mkdir(hdDir, { recursive: true });

  const pieces = [];
  const rows = [];
  const skipped = [];

  /**
   * One source file becomes one or more pieces.
   *
   * A raster is one. A PDF is one per page up to MAX_PAGES, because a
   * packaging file is usually a front and a back and those are two things to
   * look at — the DAT-STUFF pages on the wall today came from pages 1 and 4 of
   * one file. Single-page PDFs keep the plain id; multi-page get `-p2`, `-p3`
   * and so on, with page 1 unsuffixed so the common case reads cleanly.
   */
  const jobs = [];
  const tmp = mkdtempSync(join(tmpdir(), 'file47-work-'));
  /** id → the file that claimed it, so a collision is reported, not silent. */
  const claimed = new Map();
  /**
   * Source digest → the id already made from it.
   *
   * A handover carries the same artwork twice under two names — the two
   * HOUDINI'S back plates in `clothing/` are byte-identical — and the same
   * flyer can sit in two discipline folders. Both would become two panels of
   * one picture, which reads as a studio padding its portfolio. Compared on
   * content rather than on filename, because the names are exactly what differ.
   */
  const seen = new Map();

  const take = (job) => {
    const already = claimed.get(job.id);
    if (already) {
      rows.push({
        id: job.id,
        wall: '—',
        opened: `SKIPPED — id already taken by ${already}. ${job.file}`,
      });
      return;
    }
    const digest = createHash('sha256').update(job.buf).digest('hex');
    const twin = seen.get(digest);
    if (twin) {
      rows.push({
        id: job.id,
        wall: '—',
        opened: `SKIPPED — identical to ${twin}. ${job.file}`,
      });
      return;
    }
    seen.set(digest, job.id);
    claimed.set(job.id, job.file);
    jobs.push(job);
  };

  for (const entry of usable) {
    const base = slug(entry.name);
    const { section } = entry;

    if (!PAGE.has(ext(entry))) {
      take({ id: base, section, file: entry.name, buf: await readFile(entry.path) });
      continue;
    }

    const rendered = renderPdf(entry.path, tmp);
    if (rendered.error) {
      rows.push({ id: base, wall: '—', opened: `SKIPPED — ${rendered.error}` });
      continue;
    }

    const produced = readdirSync(tmp)
      .filter((f) => f.startsWith('page') && f.endsWith('.png'))
      .sort();

    for (const [i, page] of produced.entries()) {
      take({
        id: produced.length > 1 && i > 0 ? `${base}-p${i + 1}` : base,
        section,
        file: `${entry.name} (page ${i + 1} of ${rendered.total} at ${rendered.dpi} dpi)`,
        buf: await readFile(join(tmp, page)),
      });
      rmSync(join(tmp, page));
    }
  }

  for (const { id, section, file, buf } of jobs) {
    const meta = await sharp(buf).metadata();
    const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
    const shortEdge = Math.min(meta.width ?? 1, meta.height ?? 1);

    // Is there anything on it? Measured small — the question is how much of the
    // page carries ink, and a thumbnail answers that as well as the full render
    // for a hundredth of the work.
    const { data } = await sharp(buf)
      .resize({ width: 200, height: 200, fit: 'inside' })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let inked = 0;
    for (const px of data) if (px < 250) inked++;
    const ink = inked / data.length;

    if (ink < BLANK_INK) {
      rows.push({
        id,
        wall: '—',
        opened: `SKIPPED — blank (${(ink * 100).toFixed(1)}% ink). ${file}`,
      });
      skipped.push(id);
      continue;
    }

    if (longEdge / shortEdge > SLIVER_RATIO) {
      rows.push({
        id,
        wall: '—',
        opened: `SKIPPED — sliver ${meta.width}×${meta.height}. ${file}`,
      });
      skipped.push(id);
      continue;
    }

    // The wall copy. `fit: inside` with `withoutEnlargement` means a source
    // already smaller than 512 is passed through at its own size rather than
    // blown up — the dither is kinder to a small true image than to a soft
    // large one.
    const roomBuf = await sharp(buf)
      .resize({
        width: ROOM_EDGE,
        height: ROOM_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    await writeFile(join(roomDir, `${id}.webp`), roomBuf);
    const roomMeta = await sharp(roomBuf).metadata();

    let master;
    let note;

    if (longEdge >= MASTER_WORTH_IT) {
      const hdBuf = await sharp(buf)
        .resize({
          width: MASTER_EDGE,
          height: MASTER_EDGE,
          fit: 'inside',
          withoutEnlargement: true, // the rule: never past the source's pixels
        })
        .webp({ quality: MASTER_QUALITY })
        .toBuffer();
      await writeFile(join(hdDir, `${id}.webp`), hdBuf);
      const hdMeta = await sharp(hdBuf).metadata();
      master = { src: `/work/hd/${id}.webp`, w: hdMeta.width, h: hdMeta.height };
      note = `${hdMeta.width}×${hdMeta.height} · ${kb(hdBuf.length)}`;
    } else {
      // No second file. The plate opens the room texture and reports FULL SIZE.
      master = { src: `/work/${id}.webp`, w: roomMeta.width, h: roomMeta.height };
      note = `FULL SIZE — source is only ${longEdge}px, no master worth fetching`;
    }

    pieces.push({
      id,
      section,
      label: label(id),
      src: `/work/${id}.webp`,
      master,
      source: {
        file,
        w: meta.width,
        h: meta.height,
        sha256: createHash('sha256').update(buf).digest('hex').slice(0, 16),
      },
    });

    rows.push({
      id,
      wall: `${roomMeta.width}×${roomMeta.height} · ${kb(roomBuf.length)}`,
      opened: note,
    });
  }

  rmSync(tmp, { recursive: true, force: true });

  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        $comment:
          'Generated by scripts/work.mjs — do not hand-edit. Labels and ' +
          'placement are authored in file47-room.ts; this file is the image facts.',
        generated: new Date().toISOString().slice(0, 10),
        pieces,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`\n${pieces.length} piece(s) from ${srcDir}\n`);
  for (const r of rows) {
    console.log(`  ${r.id}`);
    console.log(`    wall    ${r.wall}`);
    console.log(`    opened  ${r.opened}`);
  }

  const byShelf = SECTIONS.map(
    (id) => `${id} ${pieces.filter((p) => p.section === id).length}`,
  ).join(' · ');
  console.log(`\nFiled: ${byShelf}`);

  const unfiled = pieces.filter((p) => !p.section).map((p) => p.id);
  if (unfiled.length) {
    console.log(`\n${unfiled.length} piece(s) with no discipline: ${unfiled.join(', ')}`);
    console.log('  These were loose at the top of SRC. They convert, but nothing');
    console.log(`  files them — move each into one of: ${SECTIONS.join(', ')}.`);
  }
  if (strayFolders.length) {
    console.log(`\nIgnored folder(s): ${strayFolders.join(', ')}`);
    console.log(`  Only ${SECTIONS.join(', ')} are read. Rename or move the files.`);
  }

  if (skipped.length) {
    console.log(
      `\nLeft out ${skipped.length} blank or sliver page(s): ${skipped.join(', ')}`,
    );
    console.log('  Rendered, measured, and judged to carry no artwork. If one of');
    console.log(
      '  those is a piece, say so — the thresholds are at the top of this file.',
    );
  }
  if (vector.length) {
    console.log(`\nSkipped ${vector.length} vector/page file(s): ${vector.join(', ')}`);
    console.log('  No PDF/PostScript rasteriser here. Export to PNG at full size');
    console.log('  and re-run — see docs/WORK.md.');
  }
  if (ignored.length) {
    console.log(`\nIgnored: ${ignored.join(', ')}`);
  }

  console.log(`\nManifest → ${manifestPath}`);
  console.log('Next: give each piece its label and its place on the wall in');
  console.log('src/lib/file47-room.ts, then record clearance in');
  console.log('docs/WORK.md.\n');
}

await main();
