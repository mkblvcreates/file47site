/**
 * Build the site's icons from the supplied mark.
 *
 * `brand/file47-mark.png` is the artwork FILE47 supplied: the floppy, with the
 * pixel 47 on its top plate. Everything a browser asks for is derived from it
 * here rather than drawn by hand, so a new mark is one file and one command.
 *
 *   node scripts/icons.mjs
 *
 * Two icons, because one artwork cannot do both jobs:
 *
 *   app/icon.png        64px — the browser tab. The whole floppy at 16 or 32
 *                       pixels is mush, and on dark browser chrome its black
 *                       body disappears and leaves the label squares floating.
 *                       So the tab gets the 47 alone, yellow on black, which
 *                       holds its shape down to 24px and reads on light, dark
 *                       and yellow chrome alike.
 *
 *   app/apple-icon.png  180px — the iOS home screen, where there is room for
 *                       the whole floppy. On the studio's yellow, because the
 *                       body is black and iOS gives a transparent icon a dark
 *                       ground to sit on.
 *
 * The crop is measured off the artwork, not typed in: the 47 is found by its
 * own colour, so a redraw that moves it still crops correctly.
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

/** The studio's yellow and its black, as the artwork uses them. */
const YELLOW = { r: 0xf2, g: 0xf0, b: 0x4a, alpha: 1 };
const BLACK = { r: 0x0b, g: 0x0b, b: 0x0b, alpha: 1 };

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const isYellow = (i) => {
  const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
  return a > 200 && r > 190 && g > 170 && b < 120;
};

// Columns carrying yellow in the top half — the 47 and the small marks beside it.
const top = Math.floor(info.height * 0.45);
const col = new Array(info.width).fill(0);
for (let y = 0; y < top; y++)
  for (let x = 0; x < info.width; x++) if (isYellow((y * info.width + x) * 4)) col[x]++;

const runs = [];
let open = -1;
for (let x = 0; x < info.width; x++) {
  if (col[x] > 0 && open < 0) open = x;
  else if (col[x] === 0 && open >= 0) {
    runs.push([open, x - 1]);
    open = -1;
  }
}
if (open >= 0) runs.push([open, info.width - 1]);
if (runs.length === 0)
  throw new Error('icons: no yellow found in the mark — has the artwork changed?');

// The 4 and the 7 are separate columns of yellow and the pixel marks beside
// them are about half as wide, so the digits are the runs near the widest.
// "The widest run" would take the 4 on its own.
const widest = Math.max(...runs.map(([a, b]) => b - a + 1));
const digits = runs.filter(([a, b]) => b - a + 1 >= widest * 0.6);
const dx0 = Math.min(...digits.map((r) => r[0]));
const dx1 = Math.max(...digits.map((r) => r[1]));
let dy0 = Infinity,
  dy1 = -1;
for (let y = 0; y < top; y++)
  for (let x = dx0; x <= dx1; x++)
    if (isYellow((y * info.width + x) * 4)) {
      if (y < dy0) dy0 = y;
      if (y > dy1) dy1 = y;
    }

const w = dx1 - dx0 + 1,
  h = dy1 - dy0 + 1;
const crop = await sharp(SRC)
  .extract({ left: dx0, top: dy0, width: w, height: h })
  .toBuffer();
/**
 * Square a piece of artwork on a ground, then size it.
 *
 * Two passes deliberately. Chaining `.resize()` after `.composite()` resizes
 * the *base* first, so the canvas is already 64px when the 253px crop tries to
 * land on it and sharp refuses it outright.
 */
async function square(art, { pad, background, size, kernel }) {
  const m = await sharp(art).metadata();
  const side = Math.round(Math.max(m.width, m.height) * pad);
  const laid = await sharp({
    create: { width: side, height: side, channels: 4, background },
  })
    .composite([{ input: art, gravity: 'centre' }])
    .png()
    .toBuffer();
  return sharp(laid)
    .resize(size, size, kernel ? { kernel } : undefined)
    .png();
}

// Nearest, not lanczos: the 47 is pixel type, and smoothing it is the one thing
// that would make it look like a photograph of a logo.
await (
  await square(crop, { pad: 1.34, background: BLACK, size: 64, kernel: 'nearest' })
).toFile(join(root, 'app/icon.png'));

const whole = await sharp(SRC).trim({ threshold: 1 }).toBuffer();
await (
  await square(whole, { pad: 1.1, background: YELLOW, size: 180 })
).toFile(join(root, 'app/apple-icon.png'));

console.log(`47 found at ${dx0},${dy0} ${w}x${h}`);
console.log('app/icon.png        64x64   tab');
console.log('app/apple-icon.png  180x180 home screen');
