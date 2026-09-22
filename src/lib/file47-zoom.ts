/**
 * FILE47 — looking closely at a piece of work.
 *
 * The arithmetic behind the plate that opens when you select a piece: how big
 * it sits to start with, how far in you are allowed to go, and where it may be
 * dragged to. Pure numbers, no DOM and no React, so every edge of it is
 * testable without a browser — the same reason the camera framing lives in
 * `file47-room.ts`.
 *
 * One rule shapes all of it: **you can never zoom past the pixels that exist.**
 * A viewer that keeps magnifying past the master's own resolution is showing
 * you a guess about a client's work, which is worse than showing you less of
 * it. `maxScale` is the master's true pixel size. When a supplied file is too
 * small to be worth a second copy, `master` names the room texture itself and
 * the ceiling is genuinely low and says so.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Offset {
  x: number;
  y: number;
}

/** Scale 1 is "fits the frame". Everything here is expressed against that. */
export const FIT = 1;

/**
 * How much further in a double-tap goes. Chosen rather than "maximum" because
 * a jump straight to 1:1 on a 2560px master is a jump to a corner of a stamp —
 * a readable step in is what a second tap is for.
 */
export const DOUBLE_TAP_SCALE = 2.4;

/** Below this the plate is treated as at rest: no pan, no grab cursor. */
export const AT_REST = 1.01;

/**
 * How much headroom makes zoom worth offering at all.
 *
 * Any master smaller than its frame is upscaled to fit, so on a retina screen
 * even a 251px page technically has "room" to go back toward its own pixels —
 * about 1.4x. Offering a zoom control for that is offering nothing: the reader
 * pinches, almost nothing happens, and the site looks broken. Below this the
 * plate says FULL SIZE and means it.
 */
export const WORTH_ZOOMING = 1.6;

/**
 * The displayed size of an image at scale 1 — the largest it goes while still
 * fitting entirely inside the frame.
 */
export function fitted(natural: Size, frame: Size): Size {
  const safeW = Math.max(1, frame.width);
  const safeH = Math.max(1, frame.height);
  const k = Math.min(
    safeW / Math.max(1, natural.width),
    safeH / Math.max(1, natural.height),
  );
  return { width: natural.width * k, height: natural.height * k };
}

/**
 * The furthest in this master can be pushed before it is being invented.
 *
 * One device pixel of the master per device pixel of the screen is the end of
 * the road. `dpr` matters: a 3x phone showing a 2560px master inside a 390px
 * frame has three times as many real pixels to spend as the CSS numbers
 * suggest, and refusing to use them is the difference between "zoomed in" and
 * "seeing the stitching".
 *
 * Never below 1 — a master smaller than its own frame still opens, it just
 * does not zoom.
 */
export function maxScale(natural: Size, frame: Size, dpr = 1): number {
  const shown = fitted(natural, frame);
  if (shown.width <= 0) return FIT;
  const oneToOne = (natural.width / shown.width) * Math.max(1, dpr);
  return Math.max(FIT, oneToOne);
}

/** Keeps a requested scale inside [fit, the master's own resolution]. */
export function clampScale(scale: number, natural: Size, frame: Size, dpr = 1): number {
  return Math.min(Math.max(scale, FIT), maxScale(natural, frame, dpr));
}

/**
 * How far the image may be dragged, in each axis.
 *
 * Half the overflow: at the limit the image's edge meets the frame's edge, and
 * never further. An axis with no overflow — a portrait master in a landscape
 * frame, at rest — has a limit of zero, so it stays centred instead of
 * sliding around in the gap.
 */
export function panLimit(natural: Size, frame: Size, scale: number): Offset {
  const shown = fitted(natural, frame);
  return {
    x: Math.max(0, (shown.width * scale - frame.width) / 2),
    y: Math.max(0, (shown.height * scale - frame.height) / 2),
  };
}

/** Pulls an offset back inside the limits above. */
export function clampPan(
  offset: Offset,
  natural: Size,
  frame: Size,
  scale: number,
): Offset {
  const limit = panLimit(natural, frame, scale);
  return {
    x: Math.min(Math.max(offset.x, -limit.x), limit.x),
    y: Math.min(Math.max(offset.y, -limit.y), limit.y),
  };
}

/**
 * Zoom about a point rather than about the middle.
 *
 * Pinching, or rolling a wheel over a detail, should keep *that* detail under
 * the fingers. Zooming about the centre instead makes the thing you were
 * looking at slide away, which is the single most common way an image viewer
 * feels broken.
 *
 * `point` is relative to the centre of the frame, in CSS pixels.
 */
export function zoomAbout(
  point: Offset,
  from: number,
  to: number,
  offset: Offset,
  natural: Size,
  frame: Size,
): Offset {
  if (from <= 0) return offset;
  const k = to / from;
  return clampPan(
    { x: point.x - (point.x - offset.x) * k, y: point.y - (point.y - offset.y) * k },
    natural,
    frame,
    to,
  );
}

/**
 * How the zoom level reads to a person: `FIT` at rest, then a multiplier.
 *
 * Deliberately not a percentage of the master's native size. "48%" is a fact
 * about our file; "2.4×" is a fact about what the reader just did.
 */
export function zoomLabel(scale: number): string {
  return scale < AT_REST ? 'FIT' : `${scale.toFixed(1)}×`;
}

/**
 * Whether zoom is worth offering for this master, at this frame and screen.
 *
 * Not "is there any headroom" but "is there enough to be worth a control" —
 * see `WORTH_ZOOMING`.
 */
export function canZoom(natural: Size, frame: Size, dpr = 1): boolean {
  return maxScale(natural, frame, dpr) >= WORTH_ZOOMING;
}
