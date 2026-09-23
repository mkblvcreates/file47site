/**
 * Build the site's icons from the supplied mark.
 *
 * `brand/file47-mark.png` is the artwork FILE47 supplied — the floppy, with the
 * pixel 47 on its top plate. Both icons are derived from it here rather than
 * drawn by hand, so a new mark is one file and one command:
 *
 *   pnpm icons
 *
 *   app/icon.png        64px   the browser tab
 *   app/apple-icon.png  180px  the iOS home screen
 *
 * **The ground is not decoration.** The artwork is a black body on
 * transparency, and a transparent favicon on dark browser chrome loses that
 * body entirely — what is left is the white label squares floating with
 * nothing holding them together, which reads as a broken image rather than as
 * a mark. So both sit on the studio's yellow, which keeps the whole floppy
 * legible on light chrome, dark chrome and yellow alike. iOS does the same
 * thing to a transparent home-screen icon, for the same reason.
 *
 * The floppy carries real detail — `ID-0047`, `HIGH DENSITY` — and none of it
 * survives 16px. That is the accepted cost of keeping the whole mark: at 16 it
 * is a yellow tile with a dark floppy on it, and at 32 and up it is the mark.
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(
  process.env['SHARP_PATH']
    ? join(process.env['SHARP_PATH'], 'noop.cjs')
    : import.meta.url,
);
const sharp = require('sharp');

const root = join(import.meta.dirname, '..');
const SRC = join(root, 'brand/file47-mark.png');

/** The studio's yellow, as the artwork uses it. */
const YELLOW = { r: 0xf2, g: 0xf0, b: 0x4a, alpha: 1 };

/**
 * Square a piece of artwork on a ground, then size it.
 *
 * Two passes deliberately. Chaining `.resize()` after `.composite()` resizes
 * the *base* first, so the canvas is already 64px when the full-size artwork
 * tries to land on it, and sharp refuses it outright.
 */
async function square(art, { pad, background, size }) {
  const m = await sharp(art).metadata();
  const side = Math.round(Math.max(m.width, m.height) * pad);
  const laid = await sharp({
    create: { width: side, height: side, channels: 4, background },
  })
    .composite([{ input: art, gravity: 'centre' }])
    .png()
    .toBuffer();
  return sharp(laid).resize(size, size).png();
}

// Trimmed first: the supplied file carries transparent margin, and squaring it
// untrimmed would centre the artwork inside that margin instead of the frame.
const whole = await sharp(SRC).trim({ threshold: 1 }).toBuffer();
const m = await sharp(whole).metadata();

for (const [file, size] of [
  ['app/icon.png', 64],
  ['app/apple-icon.png', 180],
]) {
  await (
    await square(whole, { pad: 1.1, background: YELLOW, size })
  ).toFile(join(root, file));
  console.log(`${file.padEnd(20)} ${size}x${size}`);
}
console.log(`from ${m.width}x${m.height} of brand/file47-mark.png`);
