import { describe, expect, it } from 'vitest';
import {
  CLIP,
  DITHER_FOCUS_HEIGHT,
  DITHER_HEIGHT,
  DITHER_LEVELS,
  GLASS_PX,
  PIECES,
  SECTIONS,
  ROOM_IS_UNLIT,
  ROOM_URL,
  SCREEN,
  SHOTS,
  PORTRAIT_PULLBACK,
  decideMode,
  ditherFor,
  dprRange,
  FLAT_MARGIN,
  flatFitsPanel,
  flatScale,
  glassFitsViewport,
  glassWorldHeight,
  glassWorldWidth,
  piecesInSection,
  WORK,
  workById,
  workInSection,
  BANK,
  ROOM_MARGIN,
  SHEET_FRACTION,
  SHEET_SIDE_FRACTION,
  ditherTarget,
  pieceById,
  screenDistance,
  shotFor,
  shotForPanel,
} from './file47-room';

/** Everything hanging in the room, as plain boxes. */
function panels() {
  return [
    ...PIECES.map((p) => ({ c: p.position, w: p.width, h: p.height })),
    { c: SCREEN.centre, w: SCREEN.width, h: SCREEN.height },
  ];
}

/** PIECES carry their transform inline; shotForPanel takes it as a panel. */
function panel(p: (typeof PIECES)[number]) {
  return {
    centre: p.position,
    rotationY: p.rotationY,
    width: p.width,
    height: p.height,
  };
}

describe('the two shots', () => {
  it('has exactly two: the room, and the screen', () => {
    expect(Object.keys(SHOTS).sort()).toEqual(['room', 'screen']);
  });

  it('docks head-on to the glass, centred and square', () => {
    const s = SHOTS.screen;
    expect(s.target).toEqual(SCREEN.centre);
    // Same x and y as the screen's centre — no skew, no off-axis crop.
    expect(s.position[0]).toBe(SCREEN.centre[0]);
    expect(s.position[1]).toBe(SCREEN.centre[1]);
    expect(s.position[2]).toBeGreaterThan(SCREEN.centre[2]);
  });

  it('frames the glass to fill the height, with a margin so nothing crops', () => {
    const d = SHOTS.screen.position[2] - SCREEN.centre[2];
    const visible = 2 * d * Math.tan((SHOTS.screen.fov * Math.PI) / 360);
    // The glass fills most of the frame but never all of it: framed exact, the
    // navigation loses its top edge to rounding.
    expect(SCREEN.height / visible).toBeGreaterThan(0.88);
    expect(SCREEN.height / visible).toBeLessThan(0.97);
    expect(screenDistance(SHOTS.screen.fov)).toBeCloseTo(d, 6);
  });

  it('stands back far enough in the room to see the monitor bank', () => {
    expect(SHOTS.room.position[2]).toBeGreaterThan(SHOTS.screen.position[2]);
    expect(SHOTS.room.fov).toBeGreaterThan(SHOTS.screen.fov);
  });

  it('looks at the panel from the seat, so the screen is never off frame', () => {
    // Within half a metre of the panel's centre in x — the operator's seat
    // faces the arc, it does not look past it.
    expect(Math.abs(SHOTS.room.target[0] - SCREEN.centre[0])).toBeLessThan(0.5);
  });
});

describe('the glass', () => {
  it('maps the authored screen exactly onto the tube, with no crop', () => {
    expect(glassWorldWidth()).toBeCloseTo(SCREEN.width, 6);
    expect(glassWorldHeight()).toBeCloseTo(SCREEN.height, 6);
  });

  it('authors it at the tube aspect, so nothing is letterboxed', () => {
    expect(GLASS_PX.w / GLASS_PX.h).toBeCloseTo(SCREEN.width / SCREEN.height, 6);
  });
});

describe('the room asset', () => {
  it('is served from the app, not from a third-party host', () => {
    // A CDN for this file would put a licensed model on someone else's origin
    // and add a domain to the CSP. See docs/ROOM.md.
    expect(ROOM_URL.startsWith('/')).toBe(true);
    expect(ROOM_URL.endsWith('.glb')).toBe(true);
  });

  it('is unlit, which is why the scene adds no lights', () => {
    expect(ROOM_IS_UNLIT).toBe(true);
  });

  it('clips tight enough to keep depth precision on the bezels', () => {
    // The room's diagonal is ~22 units; a far plane in the hundreds spends
    // depth buffer on nothing and the monitor bezels start to z-fight.
    expect(CLIP.far).toBeLessThan(100);
    expect(CLIP.far / CLIP.near).toBeLessThan(2000);
  });

  it('keeps the panel inside the room rather than floating behind a wall', () => {
    const [x, y, z] = SCREEN.centre;
    expect(x).toBeGreaterThan(-0.3);
    expect(x).toBeLessThan(5.8);
    expect(y).toBeGreaterThan(-2.9);
    expect(y).toBeLessThan(2.95);
    expect(z).toBeGreaterThan(-1.8);
    expect(z).toBeLessThan(4.7);
  });
});

describe('the tube', () => {
  it('renders small enough that the dither pattern is visible at all', () => {
    // Dithering a full-resolution frame is a contradiction: the pattern
    // disappears into the pixel grid and all that is left is the cost.
    const { w, h } = ditherTarget(1440, 900);
    expect(h).toBeLessThanOrEqual(DITHER_HEIGHT);
    expect(w).toBeLessThan(1440);
  });

  it('keeps the buffer at the viewport aspect, so nothing stretches', () => {
    for (const [vw, vh] of [
      [390, 844],
      [1440, 900],
      [2560, 1080],
    ] as const) {
      const { w, h } = ditherTarget(vw, vh);
      // Clamping can bite at the extremes; within the clamp the aspect holds.
      if (w > 240 && w < 896) expect(w / h).toBeCloseTo(vw / vh, 1);
    }
  });

  it('never returns a zero or negative buffer, whatever it is handed', () => {
    for (const [vw, vh] of [
      [0, 0],
      [1, 1],
      [10000, 3],
    ] as const) {
      const { w, h } = ditherTarget(vw, vh);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
    }
  });

  it('quantises to few enough levels that dithering has work to do', () => {
    expect(DITHER_LEVELS).toBeGreaterThan(1);
    expect(DITHER_LEVELS).toBeLessThan(32);
  });
});

describe('the work on the wall', () => {
  it('hangs every piece inside the room, with a unique id and a label', () => {
    expect(PIECES.length).toBeGreaterThan(0);
    const ids = PIECES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PIECES) {
      expect(p.label.trim()).not.toBe('');
      expect(p.src.startsWith('/work/')).toBe(true);
      expect(p.position[0]).toBeGreaterThan(-0.3);
      expect(p.position[0]).toBeLessThan(5.8);
      expect(p.position[2]).toBeGreaterThan(-1.8);
      expect(p.position[2]).toBeLessThan(4.7);
    }
  });

  it('frames a piece the same way it frames the booking screen', () => {
    const p = PIECES[0]!;
    const shot = shotForPanel(panel(p), 16 / 9, 30);
    const d = Math.hypot(
      shot.position[0] - p.position[0],
      shot.position[2] - p.position[2],
    );
    const visible = 2 * d * Math.tan((30 * Math.PI) / 360);
    expect(p.height / visible).toBeGreaterThan(0.88);
    expect(p.height / visible).toBeLessThan(0.97);
  });

  it('stands off along the panel normal, so nothing is viewed edge-on', () => {
    for (const p of PIECES) {
      const shot = shotForPanel(panel(p), 16 / 9, 30);
      // The camera sits in front of the panel in z, never behind the wall.
      expect(shot.position[2]).toBeGreaterThan(p.position[2]);
    }
  });

  it('keeps every piece whole on a phone held upright, not cropped to fit', () => {
    // The regression this exists for: fitting the height alone is a desktop
    // assumption, and on a portrait frame it runs the sides of the work — and
    // of the booking screen's navigation — straight off the viewport.
    for (const aspect of [390 / 844, 3 / 4, 16 / 9, 21 / 9]) {
      for (const p of PIECES) {
        const shot = shotFor({ kind: 'piece', id: p.id }, aspect);
        const d = Math.hypot(
          shot.position[0] - p.position[0],
          shot.position[2] - p.position[2],
        );
        const half = Math.tan((shot.fov * Math.PI) / 360);
        const visibleH = 2 * d * half;
        const visibleW = visibleH * aspect;
        expect(p.width).toBeLessThanOrEqual(visibleW + 1e-6);
        expect(p.height).toBeLessThanOrEqual(visibleH + 1e-6);
      }
    }
  });

  it('fits the booking screen whole at every viewport shape, navigation and all', () => {
    for (const aspect of [390 / 844, 3 / 4, 1, 16 / 9, 21 / 9]) {
      const shot = shotFor({ kind: 'screen' }, aspect);
      const d = shot.position[2] - SCREEN.centre[2];
      const half = Math.tan((shot.fov * Math.PI) / 360);
      const visibleH = 2 * d * half;
      expect(SCREEN.width).toBeLessThanOrEqual(visibleH * aspect + 1e-6);
      expect(SCREEN.height).toBeLessThanOrEqual(visibleH + 1e-6);
    }
  });

  it('aims a focused piece clear of the sheet, which is still on screen', () => {
    // Not just aimed clear — fitted clear. Framing the piece to the whole
    // canvas and then nudging the aim is what rode the top of the work
    // straight off the frame on a laptop.
    for (const aspect of [390 / 844, 3 / 4, 16 / 9, 21 / 9]) {
      const portrait = aspect < 1;
      const g = portrait ? SHEET_FRACTION : SHEET_FRACTION * 0.35;
      const f = portrait ? 0 : SHEET_SIDE_FRACTION;

      for (const p of PIECES) {
        const shot = shotFor({ kind: 'piece', id: p.id }, aspect);
        const d = Math.hypot(
          shot.position[0] - p.position[0],
          shot.position[2] - p.position[2],
        );
        const half = Math.tan((shot.fov * Math.PI) / 360);
        const vh = 2 * d * half;
        const vw = vh * aspect;

        // The sheet is a bottom bar on a narrow frame and a left column on a
        // wide one, so it eats one edge of the canvas and not the other.
        expect(p.position[1] + p.height / 2).toBeLessThanOrEqual(
          shot.target[1] + vh / 2 + 1e-6,
        );
        expect(p.position[1] - p.height / 2).toBeGreaterThanOrEqual(
          shot.target[1] - vh / 2 + vh * g - 1e-6,
        );
        expect(p.position[0] + p.width / 2).toBeLessThanOrEqual(
          shot.target[0] + vw / 2 + 1e-6,
        );
        expect(p.position[0] - p.width / 2).toBeGreaterThanOrEqual(
          shot.target[0] - vw / 2 + vw * f - 1e-6,
        );
      }
    }
  });

  it('does not aim the booking screen clear of a sheet that is taken away', () => {
    const shot = shotFor({ kind: 'screen' }, 16 / 9);
    expect(shot.target[1]).toBeCloseTo(SCREEN.centre[1], 6);
    expect(shot.target[0]).toBeCloseTo(SCREEN.centre[0], 6);
  });

  it('sends an unknown piece back to the room instead of nowhere', () => {
    expect(pieceById('no-such-piece')).toBeUndefined();
    expect(shotFor({ kind: 'piece', id: 'no-such-piece' })).toEqual(
      shotFor({ kind: 'room' }),
    );
  });

  it('resolves the docked view to the docked shot, exactly', () => {
    expect(shotFor({ kind: 'screen' })).toEqual(SHOTS.screen);
  });

  it('fits the wide shot to the viewport instead of using one fixed distance', () => {
    const wide = shotFor({ kind: 'room' }, 16 / 9);
    const tall = shotFor({ kind: 'room' }, 390 / 844);

    // The contract is that the bank fits. The authored position is only the
    // camera's starting point, and a fitted shot is free to come closer than
    // it when the viewport allows.
    for (const shot of [wide, tall]) {
      const d = shot.position[2] - shot.target[2];
      const visible = 2 * d * Math.tan((shot.fov * Math.PI) / 360);
      expect(visible).toBeGreaterThanOrEqual(BANK.height - 1e-6);
    }

    // Landscape keeps the lens the room was composed in.
    expect(wide.fov).toBe(SHOTS.room.fov);
  });

  it('widens the lens on a narrow frame rather than walking backwards', () => {
    const wide = shotFor({ kind: 'room' }, 16 / 9);
    const tall = shotFor({ kind: 'room' }, 390 / 844);

    // Retreating buys nothing on a portrait frame: the pullback cap is in
    // wall-heights, so a longer standoff only adds empty floor and ceiling.
    // Width has to come from the lens.
    expect(tall.fov).toBeGreaterThan(wide.fov);
  });

  it('never leaves the bank as a strip floating in a dark field', () => {
    // The bug this replaces: at the old cap a phone stood far enough back that
    // the room filled barely a third of the frame's height, which is a
    // photograph of a room rather than being in one.
    for (const aspect of [9 / 19.5, 390 / 844, 3 / 4]) {
      const shot = shotFor({ kind: 'room' }, aspect);
      const d = shot.position[2] - shot.target[2];
      const visible = 2 * d * Math.tan((shot.fov * Math.PI) / 360);
      expect(visible).toBeLessThanOrEqual(
        BANK.height * PORTRAIT_PULLBACK * ROOM_MARGIN + 1e-6,
      );
      // And the wall still fills most of what is left after the sheet.
      expect(BANK.height / visible).toBeGreaterThan(0.55);
    }
  });

  it('offsets the framing for whichever edge the sheet is on', () => {
    const wide = shotFor({ kind: 'room' }, 16 / 9);
    const tall = shotFor({ kind: 'room' }, 390 / 844);

    // Landscape: the sheet is a left column, so the camera steps left and the
    // room slides right, out from behind it.
    expect(wide.target[0]).toBeLessThan(BANK.centre[0]);
    // Portrait: the sheet is a bottom bar, so the camera aims low and the
    // subject lifts clear of it. No sideways shift — there is nothing beside.
    expect(tall.target[0]).toBeCloseTo(BANK.centre[0], 6);
    expect(tall.target[1]).toBeLessThan(BANK.centre[1]);

    // Square-on in both: the offset moves the camera and its aim together, so
    // the bank slides across the frame rather than going into keystone.
    for (const shot of [wide, tall]) {
      expect(shot.position[0]).toBeCloseTo(shot.target[0], 6);
      expect(shot.position[1]).toBeCloseTo(shot.target[1], 6);
    }
  });
});

describe('choosing a mode', () => {
  const base = { webgl: true, reducedMotion: false, width: 1440 };

  it('gives the room to a capable desktop', () => {
    expect(decideMode(base).mode).toBe('room');
  });

  it('falls back to flat, with a reason, where the room is a liability', () => {
    for (const hints of [
      { ...base, webgl: false },
      { ...base, reducedMotion: true },
      { ...base, saveData: true },
    ]) {
      const d = decideMode(hints);
      expect(d.mode).toBe('flat');
      expect(d.reason).toBeTruthy();
    }
  });

  it("lets the reader's own choice beat every heuristic", () => {
    expect(decideMode({ ...base, width: 390, preference: 'room' }).mode).toBe('room');
    expect(decideMode({ ...base, preference: 'flat' }).mode).toBe('flat');
  });

  it('gives a phone the room, because the room was built for a phone', () => {
    // The scene renders into a 540-line buffer with no lights and the
    // navigation is a thumb sheet. Withholding it by width would withhold it
    // from most of the people who ever open this.
    for (const w of [360, 390, 430, 744]) {
      expect(decideMode({ ...base, width: w }).mode).toBe('room');
    }
  });

  it('never offers the room without WebGL, even if asked', () => {
    expect(decideMode({ ...base, webgl: false, preference: 'room' }).mode).toBe('flat');
  });

  it('does not pull 2.8 MB onto a metered connection uninvited', () => {
    expect(decideMode({ ...base, saveData: true }).mode).toBe('flat');
    // Asked for anyway, it is still theirs to have.
    expect(decideMode({ ...base, saveData: true, preference: 'room' }).mode).toBe('room');
  });

  it('caps the pixel ratio so a dense display cannot melt the GPU', () => {
    for (const w of [390, 1440, 2560]) {
      const [min, max] = dprRange(w);
      expect(min).toBe(1);
      expect(max).toBeLessThanOrEqual(1.75);
    }
  });
});

describe('the tube, turned down', () => {
  it('all but lifts the dither off a piece of work', () => {
    const room = ditherFor({ kind: 'room' });
    const piece = ditherFor({ kind: 'piece', id: PIECES[0]!.id });

    // The room is the full sixth-generation treatment.
    expect(room.amount).toBe(1);
    expect(room.height).toBe(DITHER_HEIGHT);

    // A client's design is not. Quantising artwork to a handful of levels per
    // channel is not a treatment of the design, it is damage to it.
    expect(piece.amount).toBeLessThan(0.25);
    expect(piece.scanline).toBeLessThan(room.scanline);
    expect(piece.height).toBe(DITHER_FOCUS_HEIGHT);

    // At least double the room's buffer. It was a strict `greaterThan` while
    // the room rendered at 448; easing the dither raised that to 540 and made
    // the two exactly 2:1, which satisfies what this is actually checking —
    // that focusing a piece is a step change in resolution, not a nudge.
    expect(piece.height).toBeGreaterThanOrEqual(room.height * 2);
  });

  it('leaves the booking screen in the room, where it belongs', () => {
    expect(ditherFor({ kind: 'screen' })).toEqual(ditherFor({ kind: 'room' }));
  });

  it('holds the buffer aspect at the ceiling instead of squashing the room', () => {
    // An ultrawide used to hit the width clamp and get a subtly squashed room.
    for (const [vw, vh] of [
      [5120, 1440],
      [3840, 1080],
      [1440, 900],
      [390, 844],
    ] as const) {
      for (const ceiling of [DITHER_HEIGHT, DITHER_FOCUS_HEIGHT]) {
        const { w, h } = ditherTarget(vw, vh, ceiling);
        expect(w / h).toBeCloseTo(vw / vh, 1);
        expect(h).toBeLessThanOrEqual(ceiling);
      }
    }
  });
});

describe('whether the site can live on the glass', () => {
  it('keeps it on the CRT on anything square or wider', () => {
    for (const aspect of [1, 4 / 3, 16 / 9, 21 / 9]) {
      expect(glassFitsViewport(aspect)).toBe(true);
    }
  });

  it('takes it off the CRT on a phone held upright', () => {
    // 720x540 of authored type, squeezed into a 390px-wide frame, is half
    // size. No camera move fixes that; the screen has to come off the glass.
    for (const aspect of [390 / 844, 9 / 19.5, 3 / 4]) {
      expect(glassFitsViewport(aspect)).toBe(false);
    }
  });
});

describe('the bank the wide shot is fitted to', () => {
  it('is measured from what is actually hanging, not authored beside it', () => {
    for (const p of PIECES) {
      expect(p.position[0] - p.width / 2).toBeGreaterThanOrEqual(
        BANK.centre[0] - BANK.width / 2 - 1e-6,
      );
      expect(p.position[0] + p.width / 2).toBeLessThanOrEqual(
        BANK.centre[0] + BANK.width / 2 + 1e-6,
      );
      expect(p.position[1] - p.height / 2).toBeGreaterThanOrEqual(
        BANK.centre[1] - BANK.height / 2 - 1e-6,
      );
      expect(p.position[1] + p.height / 2).toBeLessThanOrEqual(
        BANK.centre[1] + BANK.height / 2 + 1e-6,
      );
    }
  });

  it('sits at the depth of the nearest panel, not the wall behind them', () => {
    // The bug this exists for: the panels hang the better part of a metre in
    // front of the back wall, and the frustum is narrower where they are. A
    // shot fitted to the wall clipped the top row of work straight off frame.
    const nearest = Math.max(...PIECES.map((p) => p.position[2]), SCREEN.centre[2]);
    expect(BANK.centre[2]).toBeCloseTo(nearest, 6);
  });

  it('keeps every panel clear of the sheet vertically, at any viewport shape', () => {
    // The regression: the panels hang the better part of a metre in front of
    // the wall the shot used to be fitted to, and the frustum is narrower
    // where they are, so the top row clipped off frame on every viewport.
    for (const aspect of [9 / 19.5, 390 / 844, 3 / 4, 1, 4 / 3, 16 / 9, 21 / 9]) {
      const shot = shotFor({ kind: 'room' }, aspect);
      const half = Math.tan((shot.fov * Math.PI) / 360);
      // The sheet is a bottom bar on a narrow frame and a left column on a
      // wide one, so it eats one edge of the canvas and not the other.
      const g = aspect < 1 ? SHEET_FRACTION : SHEET_FRACTION * 0.35;
      for (const { c, h } of panels()) {
        // Measured at the panel's own depth, not at the camera's target's —
        // that difference is the entire bug.
        const vh = 2 * (shot.position[2] - c[2]) * half;
        expect(c[1] + h / 2).toBeLessThanOrEqual(shot.target[1] + vh / 2 + 1e-6);
        expect(c[1] - h / 2).toBeGreaterThanOrEqual(
          shot.target[1] - vh / 2 + vh * g - 1e-6,
        );
      }
    }
  });

  it('keeps every panel clear of the sheet across, once the frame is wide enough', () => {
    // Below roughly 4:3 the pullback cap bites and the bank is allowed to run
    // off the sides — that trade is deliberate and tested above. From there up,
    // everything in the room is on screen and out from behind the sheet.
    for (const aspect of [4 / 3, 16 / 9, 21 / 9]) {
      const shot = shotFor({ kind: 'room' }, aspect);
      const half = Math.tan((shot.fov * Math.PI) / 360);
      for (const { c, w } of panels()) {
        const vw = 2 * (shot.position[2] - c[2]) * half * aspect;
        expect(c[0] + w / 2).toBeLessThanOrEqual(shot.target[0] + vw / 2 + 1e-6);
        expect(c[0] - w / 2).toBeGreaterThanOrEqual(
          shot.target[0] - vw / 2 + vw * SHEET_SIDE_FRACTION - 1e-6,
        );
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * The wall
 * ------------------------------------------------------------------ */

/** A panel's extent on the wall, ignoring its turn into the arc. */
function box(c: readonly [number, number, number], w: number, h: number) {
  return { x0: c[0] - w / 2, x1: c[0] + w / 2, y0: c[1] - h / 2, y1: c[1] + h / 2 };
}

function overlaps(a: ReturnType<typeof box>, b: ReturnType<typeof box>) {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

describe('the pieces on the wall', () => {
  it('shows fourteen', () => {
    expect(PIECES).toHaveLength(14);
  });

  it('gives every panel the proportions of its own picture', () => {
    // The face is a plane with the texture mapped straight onto it, so the
    // plane's aspect is the picture's aspect. Any drift here is a client's
    // work stretched on a public site.
    for (const p of PIECES) {
      expect(p.width / p.height).toBeCloseTo(p.master.w / p.master.h, 5);
    }
  });

  it('hangs nothing across the glass in the middle', () => {
    const screen = box(SCREEN.centre, SCREEN.width, SCREEN.height);
    for (const p of PIECES) {
      expect(
        overlaps(box(p.position, p.width, p.height), screen),
        `${p.id} overlaps FILE47's own screen`,
      ).toBe(false);
    }
  });

  it('hangs no two pieces on top of each other', () => {
    for (let i = 0; i < PIECES.length; i++) {
      for (let j = i + 1; j < PIECES.length; j++) {
        const a = PIECES[i]!;
        const b = PIECES[j]!;
        expect(
          overlaps(
            box(a.position, a.width, a.height),
            box(b.position, b.width, b.height),
          ),
          `${a.id} overlaps ${b.id}`,
        ).toBe(false);
      }
    }
  });

  it('gives every piece a texture and a master that exist as paths', () => {
    for (const p of PIECES) {
      expect(p.src).toBe(`/work/${p.id}.webp`);
      expect(p.master.src).toMatch(/^\/work\/(hd\/)?[a-z0-9-]+\.webp$/);
      expect(p.master.w).toBeGreaterThan(0);
      expect(p.master.h).toBeGreaterThan(0);
    }
  });

  it('carries a label that names the work, not the file', () => {
    for (const p of PIECES) {
      expect(p.label).toMatch(/[A-ZÁÉÍÓÚÑ]/);
      expect(p.label).not.toMatch(/untitled|\.webp|\.pdf|\bp\d\b/i);
    }
  });
});

describe('the work, filed by discipline', () => {
  it('files every piece under exactly one section that exists', () => {
    const ids = new Set(SECTIONS.map((s) => s.id));
    for (const p of PIECES) {
      expect(ids.has(p.section), `${p.id} has section ${p.section}`).toBe(true);
    }
  });

  it('leaves no drawer empty', () => {
    // A drawer with nothing in it is a promise the site cannot keep — someone
    // taps MARKETING and finds out the studio has nothing to show.
    for (const sec of SECTIONS) {
      expect(piecesInSection(sec.id).length, `${sec.id} is empty`).toBeGreaterThan(0);
    }
  });

  it('accounts for every piece across the drawers, once', () => {
    const filed = SECTIONS.flatMap((sec) => piecesInSection(sec.id).map((p) => p.id));
    expect(filed).toHaveLength(PIECES.length);
    expect(new Set(filed).size).toBe(PIECES.length);
  });

  it('keeps wall order inside a drawer', () => {
    for (const sec of SECTIONS) {
      const held = piecesInSection(sec.id).map((p) => PIECES.indexOf(p));
      expect(held).toEqual([...held].sort((a, b) => a - b));
    }
  });
});

describe('the drawers and the wall', () => {
  it('shows the whole archive in the drawers, not just the wall', () => {
    // The bug this exists to stop: the drawers used to list PIECES, so the
    // fourteen that happened to get a screen were the only work a visitor
    // could reach and everything else the studio supplied was invisible.
    const drawered = SECTIONS.flatMap((sec) => workInSection(sec.id).map((w) => w.id));
    expect(drawered).toHaveLength(WORK.length);
    expect(new Set(drawered).size).toBe(WORK.length);
    expect(WORK.length).toBeGreaterThan(PIECES.length);
  });

  it('hangs only work that is in the archive', () => {
    for (const p of PIECES) {
      expect(workById(p.id), `${p.id} hangs but is not filed`).toBeDefined();
      expect(workById(p.id)?.section).toBe(p.section);
      expect(workById(p.id)?.label).toBe(p.label);
    }
  });

  it('puts the wall first in its drawer', () => {
    for (const sec of SECTIONS) {
      const held = workInSection(sec.id);
      const hung = piecesInSection(sec.id);
      expect(held.slice(0, hung.length).map((w) => w.id)).toEqual(hung.map((p) => p.id));
    }
  });

  it('gives every piece a label that is not its filename', () => {
    // A filename fallback is legible but it is the studio's working name, not
    // the client's. It is allowed by the type; it should not be shipping.
    const bare = WORK.filter((w) => w.label === w.id.replace(/-/g, ' ').toUpperCase());
    expect(bare.map((w) => w.id)).toEqual([]);
  });

  it('gives every piece its own id and its own files', () => {
    expect(new Set(WORK.map((w) => w.id)).size).toBe(WORK.length);
    expect(new Set(WORK.map((w) => w.src)).size).toBe(WORK.length);
  });

  it('points every master at real pixels', () => {
    for (const w of WORK) {
      expect(w.master.w, w.id).toBeGreaterThan(0);
      expect(w.master.h, w.id).toBeGreaterThan(0);
    }
  });
});

describe('the flat page, as the panel pulled closer', () => {
  const shapes = [
    { w: 1920, h: 1080 },
    { w: 1440, h: 810 },
    { w: 1280, h: 800 },
    { w: 1180, h: 820 },
    { w: 1024, h: 768 },
    { w: 844, h: 390 },
  ];

  it('fits the whole panel in the window at every shape that gets one', () => {
    // Nothing scrolls and nothing is cropped: the point of the flat page is
    // that the screen is all there, closer.
    for (const { w, h } of shapes) {
      const k = flatScale(w, h);
      expect(GLASS_PX.w * k, `${w}x${h} width`).toBeLessThanOrEqual(w);
      expect(GLASS_PX.h * k, `${w}x${h} height`).toBeLessThanOrEqual(h);
    }
  });

  it('keeps the panel off the edges of the frame', () => {
    // Dark around it is what makes it a screen you are sitting at rather than
    // a document filling a window.
    for (const { w, h } of shapes) {
      const k = flatScale(w, h);
      const short = Math.min(w, h);
      const spare = Math.min(w - GLASS_PX.w * k, h - GLASS_PX.h * k);
      expect(spare, `${w}x${h}`).toBeGreaterThanOrEqual(short * FLAT_MARGIN * 2 - 1);
    }
  });

  it('is a magnification, never a reduction, wherever it shows the panel', () => {
    // The old flat page capped at 820x620 — barely the authored size, so
    // leaving the room bought almost nothing. Every shape that gets the panel
    // now gets it larger than it is on the wall.
    for (const { w, h } of shapes) {
      if (!flatFitsPanel(w, h)) continue;
      expect(flatScale(w, h), `${w}x${h}`).toBeGreaterThan(1);
    }
  });

  it('fills the frame on a phone, whichever way it is held', () => {
    // A phone held sideways is wide enough to pass the glass aspect test and
    // nowhere near tall enough to hold 540 rows: the panel would come out at
    // two thirds size and leaving the room would shrink the screen. The scale
    // answers this where the aspect cannot.
    expect(glassFitsViewport(844 / 390)).toBe(true);
    expect(flatFitsPanel(844, 390)).toBe(false);
    expect(flatFitsPanel(390, 844)).toBe(false);
  });

  it('gives the panel to every desktop and tablet frame', () => {
    for (const { w, h } of [
      { w: 1920, h: 1080 },
      { w: 1440, h: 810 },
      { w: 1280, h: 800 },
      { w: 1180, h: 820 },
      { w: 1024, h: 768 },
    ]) {
      expect(flatFitsPanel(w, h), `${w}x${h}`).toBe(true);
    }
  });

  it('never stretches the screen, because one scale drives both axes', () => {
    // A separate width and height fit is how a 4:3 screen quietly becomes 16:9
    // and every piece of work on it is distorted.
    const k = flatScale(1920, 1080);
    expect((GLASS_PX.w * k) / (GLASS_PX.h * k)).toBeCloseTo(GLASS_PX.w / GLASS_PX.h, 10);
  });

  it('survives a viewport of nothing without dividing by zero', () => {
    expect(Number.isFinite(flatScale(0, 0))).toBe(true);
    expect(flatScale(0, 0)).toBeGreaterThan(0);
  });
});
