import { describe, expect, it } from 'vitest';
import {
  AT_REST,
  FIT,
  canZoom,
  clampPan,
  clampScale,
  fitted,
  WORTH_ZOOMING,
  maxScale,
  panLimit,
  zoomAbout,
  zoomLabel,
} from './file47-zoom';

/** A phone-shaped frame and a large landscape master, unless stated. */
const FRAME = { width: 390, height: 600 };
const BIG = { width: 2560, height: 1731 };

describe('fitting a master into the frame', () => {
  it('fills the width when the master is wider than the frame is tall', () => {
    const shown = fitted(BIG, FRAME);
    expect(shown.width).toBeCloseTo(390, 6);
    expect(shown.height).toBeCloseTo((390 * 1731) / 2560, 6);
    // Whole, both ways. A "fit" that crops is not a fit.
    expect(shown.width).toBeLessThanOrEqual(FRAME.width + 1e-6);
    expect(shown.height).toBeLessThanOrEqual(FRAME.height + 1e-6);
  });

  it('keeps the aspect ratio at every frame shape', () => {
    for (const frame of [
      { width: 390, height: 600 },
      { width: 1440, height: 400 },
      { width: 800, height: 800 },
    ]) {
      const shown = fitted(BIG, frame);
      expect(shown.width / shown.height).toBeCloseTo(BIG.width / BIG.height, 6);
    }
  });

  it('survives a frame that has not been measured yet', () => {
    // A ResizeObserver has not fired on the first paint, so this is 0x0 and
    // must not produce NaN geometry downstream.
    const shown = fitted(BIG, { width: 0, height: 0 });
    expect(Number.isFinite(shown.width)).toBe(true);
    expect(Number.isFinite(shown.height)).toBe(true);
  });
});

describe('how far in you may go', () => {
  it('stops at the pixels that actually exist', () => {
    // 2560px of master shown across 390 CSS px on a 1x screen is 6.56:1
    // already, so that is the ceiling — past it we would be inventing detail
    // about a client's work.
    expect(maxScale(BIG, FRAME, 1)).toBeCloseTo(2560 / 390, 4);
  });

  it('spends the extra pixels a retina screen has', () => {
    expect(maxScale(BIG, FRAME, 3)).toBeCloseTo(3 * maxScale(BIG, FRAME, 1), 4);
  });

  it('never goes below fit, so a small master still opens', () => {
    const small = { width: 251, height: 278 };
    expect(maxScale(small, { width: 1440, height: 900 }, 1)).toBe(FIT);
  });

  it('does not offer zoom that would do nothing', () => {
    // The two dragon pages are vector this environment could only rasterise at
    // the room's own size. Fitted to a phone they are upscaled, so on a 2x
    // screen there is technically ~1.4x of headroom back to their own pixels —
    // and a pinch that moves almost nothing reads as a broken site, so the
    // plate says FULL SIZE instead.
    const small = { width: 251, height: 278 };
    expect(maxScale(small, FRAME, 2)).toBeLessThan(WORTH_ZOOMING);
    expect(canZoom(small, FRAME, 2)).toBe(false);
    expect(canZoom(small, { width: 1440, height: 900 }, 1)).toBe(false);

    // A real master has plenty, on a phone and on a laptop alike.
    expect(canZoom(BIG, FRAME, 1)).toBe(true);
    expect(canZoom(BIG, { width: 1440, height: 900 }, 1)).toBe(true);
  });

  it('clamps a requested scale to both ends', () => {
    expect(clampScale(0.2, BIG, FRAME, 1)).toBe(FIT);
    expect(clampScale(999, BIG, FRAME, 1)).toBeCloseTo(maxScale(BIG, FRAME, 1), 6);
    expect(clampScale(2, BIG, FRAME, 1)).toBe(2);
  });
});

describe('where it may be dragged to', () => {
  it('does not move at all while it fits', () => {
    expect(panLimit(BIG, FRAME, FIT)).toEqual({ x: 0, y: 0 });
    expect(clampPan({ x: 200, y: 200 }, BIG, FRAME, FIT)).toEqual({ x: 0, y: 0 });
  });

  it('lets an edge reach the frame edge and no further', () => {
    const scale = 3;
    const shown = fitted(BIG, FRAME);
    const limit = panLimit(BIG, FRAME, scale);
    expect(limit.x).toBeCloseTo((shown.width * scale - FRAME.width) / 2, 6);

    const pulled = clampPan({ x: 99999, y: 99999 }, BIG, FRAME, scale);
    expect(pulled.x).toBeCloseTo(limit.x, 6);
    expect(pulled.y).toBeCloseTo(limit.y, 6);
  });

  it('holds an axis with no overflow at centre', () => {
    // A landscape master in a tall frame, zoomed just enough to overflow
    // across but not down, must not slide up and down in the letterbox.
    const scale = 1.2;
    const limit = panLimit(BIG, FRAME, scale);
    expect(limit.x).toBeGreaterThan(0);
    expect(limit.y).toBe(0);
  });
});

describe('zooming about a point', () => {
  it('keeps the point under the fingers where it was', () => {
    // The property that makes a viewer feel right: pinch on a detail and that
    // detail stays put. Zooming about the centre instead slides it away.
    const frame = { width: 1000, height: 1000 };
    const natural = { width: 4000, height: 4000 };
    const point = { x: 200, y: -150 };

    const from = 2;
    const to = 3;
    const offset = { x: 10, y: -20 };
    const next = zoomAbout(point, from, to, offset, natural, frame);

    // Where the point sat on the image before and after, in image space.
    const before = { x: (point.x - offset.x) / from, y: (point.y - offset.y) / from };
    const after = { x: (point.x - next.x) / to, y: (point.y - next.y) / to };
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it('still obeys the pan limits after zooming out', () => {
    const next = zoomAbout({ x: 400, y: 400 }, 4, FIT, { x: 300, y: 300 }, BIG, FRAME);
    expect(next).toEqual({ x: 0, y: 0 });
  });

  it('does nothing rather than dividing by zero', () => {
    expect(zoomAbout({ x: 1, y: 1 }, 0, 2, { x: 5, y: 5 }, BIG, FRAME)).toEqual({
      x: 5,
      y: 5,
    });
  });
});

describe('what the reader is told', () => {
  it('says FIT at rest and a multiplier once moved', () => {
    expect(zoomLabel(1)).toBe('FIT');
    expect(zoomLabel(AT_REST - 0.001)).toBe('FIT');
    expect(zoomLabel(2.4)).toBe('2.4×');
    // A multiplier of what they did, not a percentage of our file — "48%" is
    // a fact about us, "2.4×" is a fact about them.
    expect(zoomLabel(6.5)).not.toContain('%');
  });
});
