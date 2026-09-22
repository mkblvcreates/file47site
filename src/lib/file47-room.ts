/**
 * FILE47 — the room, as arithmetic.
 *
 * The room is a surveillance suite: a curved bank of CRTs, racks, a chair.
 * See `docs/ROOM.md` for where it came from and what was done
 * to it. FILE47 carries its own screen at the focal point of the monitor arc,
 * because nothing in that mesh is a named monitor and hanging a booking form
 * off a reverse-engineered weld is a foundation one re-export would break.
 *
 * There are exactly two places the camera goes: back, where you see the room,
 * and in, where the screen fills the frame. No orbiting, no free flight — a
 * client looking to hire a studio should never have to learn to fly.
 *
 * Pure numbers, no three.js and no React, so the framing and the fallback
 * decision are testable without a GPU.
 */

import generated from './file47-work.generated.json';

export type Vec3 = readonly [number, number, number];

/** Where the asset lives, and what a loader needs to know about it. */
export const ROOM_URL = '/surveillance-room.glb';

/**
 * The scene is authored unlit with baked textures. The bake *is* the lighting,
 * so the route adds none — a light here only washes the bake out.
 */
export const ROOM_IS_UNLIT = true;

/**
 * FILE47's own screen, in world units, at the focal point the monitor arc
 * curves around. 4:3 to match the tube it sits among.
 */
export const SCREEN = {
  centre: [2.42, -0.92, 1.28] as Vec3,
  /** Faces the operator's seat, so the panel is square-on from CONSOLE. */
  rotationY: 0,
  width: 1.6,
  height: 1.2,
} as const;

/** The site is authored at a fixed pixel size and mapped onto the screen. */
export const GLASS_PX = { w: 720, h: 540 } as const;

/**
 * drei builds `<Html transform>` through a CSS matrix at 400/10 — one world
 * unit is forty CSS pixels before the object's own scale is applied. Named
 * rather than folded into the number below, because a bare constant here is
 * indistinguishable from a fudge factor.
 */
export const HTML_PX_PER_UNIT = 40;

/**
 * The scale that lands the authored screen exactly on the panel. Derived, not
 * dialled in: a guessed scale is how a screen ends up cropped, letterboxed, or
 * a postage stamp in the middle of the room.
 */
export const GLASS_SCALE = (SCREEN.width / GLASS_PX.w) * HTML_PX_PER_UNIT;

/** World width the panel actually occupies, for the test to check against. */
export function glassWorldWidth(): number {
  return (GLASS_PX.w * GLASS_SCALE) / HTML_PX_PER_UNIT;
}

export function glassWorldHeight(): number {
  return (GLASS_PX.h * GLASS_SCALE) / HTML_PX_PER_UNIT;
}

/**
 * A hair of breathing room around the screen when docked. Framed to exactly
 * fill the viewport, it loses a few pixels off the top and bottom to rounding
 * — and the first thing to go is the navigation.
 */
export const DOCK_MARGIN = 1.08;

export type Pose = 'room' | 'screen';

export interface Shot {
  position: Vec3;
  target: Vec3;
  /** Narrower when docked, so the screen fills the frame without distortion. */
  fov: number;
}

/** Distance at which the panel fills the vertical field of view, less margin. */
function screenDistance(fov = 34): number {
  return (SCREEN.height / 2 / Math.tan((fov * Math.PI) / 360)) * DOCK_MARGIN;
}

export { screenDistance };

/**
 * The two shots.
 *
 * Both are seeds rather than answers. `room` is the operator's standing point
 * and the lens the room was composed in; `screen` is the 16:9 case of the
 * docked shot. What the camera actually uses is fitted to the viewport by
 * `roomShot` and `shotForPanel` below, because a shot that is right on the
 * machine it was authored on and wrong on a phone is not a shot.
 */
export const SHOTS: Record<Pose, Shot> = {
  room: { position: [2.46, -0.34, 5.15], target: [2.44, -0.72, 0.35], fov: 52 },
  screen: {
    position: [SCREEN.centre[0], SCREEN.centre[1], SCREEN.centre[2] + screenDistance()],
    target: SCREEN.centre,
    fov: 34,
  },
};

/**
 * Near and far planes. The floor plane runs to ~15 units and the camera never
 * leaves the room, so `far` is set to cover the scene's diagonal and no more —
 * a far plane in the hundreds throws away depth precision and the monitor
 * bezels z-fight.
 */
export const CLIP = { near: 0.05, far: 40 } as const;

/* ------------------------------------------------------------------ *
 * The tube
 * ------------------------------------------------------------------ */

/**
 * The room is rendered into a buffer this tall and blown back up with no
 * smoothing. It is the resolution the dither pattern reads at, and it is cheap
 * enough to hold a frame rate on a phone. Rendering at device resolution and
 * dithering that is a contradiction — the pattern disappears into the pixel
 * grid.
 *
 * It was 448, a sixth-generation console's interlaced field height, which is
 * the more faithful number and was eating the work: at that size a client's
 * packaging on a panel across the room is more dither than design. 540 keeps
 * the pattern plainly visible and gives the artwork back about a fifth more
 * lines to be legible in. The era is the register here, not the spec.
 */
export const DITHER_HEIGHT = 540;

/**
 * Colour steps per channel after dithering.
 *
 * Six was the era. Eight still bands visibly — which is the point — but stops
 * flattening the mid-tones in artwork that was drawn with them, like the gold
 * on the LUCILIGHT mark or the navy on the Crystal Clear Water tees.
 */
export const DITHER_LEVELS = 8;

/**
 * How dark every other row of the small buffer goes.
 *
 * Eased from 0.12: the scanline is atmosphere, and at the old depth it was
 * competing with the work for contrast rather than sitting behind it.
 */
export const DITHER_SCANLINE = 0.08;

/**
 * The buffer to render into, for a given viewport.
 *
 * Width follows the viewport's aspect so nothing is stretched — and when the
 * width would run past its own ceiling on a very wide display, the height
 * comes down to keep the shape rather than the width being clipped, which is
 * how an ultrawide used to get a subtly squashed room.
 *
 * `ceiling` is the tallest buffer allowed. It is a parameter and not a
 * constant because the room and a piece of work want different answers: see
 * `ditherFor`.
 */
export function ditherTarget(
  width: number,
  height: number,
  ceiling: number = DITHER_HEIGHT,
): { w: number; h: number } {
  const cap = Math.max(1, Math.round(ceiling));
  const aspect = Math.max(0.05, width / Math.max(1, height));
  const maxW = cap * 2;

  let h = Math.max(1, Math.min(cap, Math.round(height) || cap));
  let w = Math.max(1, Math.round(h * aspect));

  if (w > maxW) {
    w = maxW;
    h = Math.max(1, Math.round(w / aspect));
  }

  return { w, h };
}

/**
 * The tube, turned down.
 *
 * The dither is the room's material — it is what makes a baked mesh read as a
 * sixth-generation console rather than as a low-poly model. It is not the
 * work's material. A client's packaging, shot and cropped and hung on a
 * screen, was made at a colour depth this pass throws away, and quantising it
 * to six levels per channel is not a treatment of the design, it is damage to
 * it. So when a piece fills the frame the tube resolves: a buffer more than
 * twice as tall, the quantisation almost all the way out, and a scanline left
 * at a whisper so the picture still belongs to the room it hangs in.
 *
 * Nothing about this is a fade to a different site. It is the same screen, in
 * focus.
 */
export const DITHER_FOCUS_HEIGHT = 1080;

/** How much of the quantisation survives on a focused piece. */
export const DITHER_FOCUS_AMOUNT = 0.12;

/** And how much of the scanline. */
export const DITHER_FOCUS_SCANLINE = 0.04;

export interface DitherSetting {
  /** Tallest buffer to render into. */
  height: number;
  /** 0 leaves the frame as rendered, 1 is the full PS2-era treatment. */
  amount: number;
  scanline: number;
}

export function ditherFor(view: View): DitherSetting {
  if (view.kind === 'piece') {
    return {
      height: DITHER_FOCUS_HEIGHT,
      amount: DITHER_FOCUS_AMOUNT,
      scanline: DITHER_FOCUS_SCANLINE,
    };
  }
  return { height: DITHER_HEIGHT, amount: 1, scanline: DITHER_SCANLINE };
}

/* ------------------------------------------------------------------ *
 * The work, on the wall
 * ------------------------------------------------------------------ */

/**
 * The version of a piece worth looking closely at, and its true pixel size.
 *
 * The room's texture is 512px on the long edge because that is all a dithered
 * CRT face a few hundred pixels across can resolve. Opening a piece is a
 * different job — it fills a retina display and a visitor wants to see the
 * stitching — so most pieces carry a master under `/work/hd/` that is loaded
 * only when one is opened.
 *
 * `w` and `h` are the file's real dimensions, and they are what caps the zoom.
 * A piece whose source is too small to be worth a second copy names the room
 * texture here instead (see docs/WORK.md), which is the honest
 * answer — it opens, it simply does not zoom, rather than magnifying into a
 * guess about a client's work. Every piece on the wall today has a real
 * master; the path exists because the next supplied file might not.
 */
export interface Master {
  src: string;
  w: number;
  h: number;
}

/**
 * The four disciplines the work is filed under.
 *
 * These are the folders the studio handed the work over in, not categories
 * invented here — a visitor looking for packaging and a studio looking for its
 * own files should be looking at the same shelf. `production` is the cannabis
 * and packaging folder under the name the studio uses for it.
 *
 * Order is the order they are shown in, so it is a judgement about what a
 * prospective client wants to see first, not alphabetical.
 */
export const SECTIONS = [
  { id: 'logos', label: 'LOGOS' },
  { id: 'production', label: 'PRODUCTION' },
  { id: 'clothing', label: 'CLOTHING' },
  { id: 'marketing', label: 'MARKETING' },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];

/**
 * One piece of the studio's work, as the site holds it.
 *
 * Everything the studio handed over is a `Work` and lives in a drawer. A
 * `Piece` is the smaller thing: a `Work` that also has a screen of its own in
 * the room. The wall has fourteen slots and the archive has sixty-odd files,
 * so the two had to stop being the same list — a drawer that only showed what
 * happened to fit on the wall was hiding most of the portfolio behind the
 * furniture.
 */
export interface Work {
  id: string;
  /** What it is, in as few words as the work allows. */
  label: string;
  /** Which shelf it is filed on. */
  section: SectionId;
  /** Texture under /work/. */
  src: string;
  master: Master;
}

/** A `Work` with a screen of its own: where it hangs, and how big it reads. */
export interface Piece extends Work {
  /** Where its screen hangs, and how it is turned into the arc. */
  position: Vec3;
  rotationY: number;
  width: number;
  height: number;
}

/**
 * A slot's size budget on the wall: the most room that place can give.
 *
 * A budget rather than a size, because the face is a plane with the texture
 * mapped straight onto it — the plane's aspect *is* the picture's aspect. Give
 * a panel dimensions of its own and a client's work is stretched to fit them,
 * which is the one thing a portfolio must never do to the work it shows. So
 * the wall says how much room there is and the picture keeps its proportions
 * inside it.
 */
type Fit = readonly [maxWidth: number, maxHeight: number];

/** The picture at its own proportions, as large as the slot allows. */
function fitPanel(master: Master, [maxWidth, maxHeight]: Fit) {
  const k = Math.min(maxWidth / master.w, maxHeight / master.h);
  return { width: master.w * k, height: master.h * k };
}

/**
 * What each piece is, read off the artwork.
 *
 * The generator can only derive a label from a filename, and a filename is the
 * studio's working name for a file — `kc plumbing final.pdf` is a heating and
 * cooling company, `Untitled-1.jpg` is a tee set, `sick.png` is a wordmark
 * that reads LOVSICK. Putting a working filename on a public portfolio would
 * be attributing a name to a client that the client never used, so every piece
 * shown here was opened and named from what is on it.
 *
 * An id with no entry falls back to its filename in caps. That is deliberately
 * plain: it reads as a file that has not been named yet rather than as a claim
 * about whose work it is.
 */
const LABELS: Readonly<Record<string, string>> = {
  /* LOGOS */
  'bookie-green': 'BOOKIE & SONS — LETTERING',
  'colorado-concepts': 'COLORADO COLOR CONCEPTS — VARIANTS',
  'crystal-clear-water': 'CRYSTAL WATER — LABEL VARIANTS',
  'cu-brain': 'CU BRAIN IMAGING CENTER — IDENTITY',
  'genesy-final-art1': 'GENESY — MASCOT',
  'genesy-final-art1-p2': 'GENESY — MASCOT, LINE ART',
  'genesy-final-art1-p3': 'GENESY — MASCOT, COLOUR',
  'genesy-final-art1-p4': 'GENESY — WORDMARK VARIANTS',
  'her-lash-final': 'HER LASH STUDIOS — IDENTITY',
  'her-lash-final-p2': 'HER LASH STUDIOS — LOCKUPS',
  'indian-hot-springs': 'INDIAN HOT SPRINGS — COORDINATE GRID',
  'indian-hot-springs-p2': 'INDIAN HOT SPRINGS — RIDGELINE',
  'indian-hot-springs-p3': 'INDIAN HOT SPRINGS — ELEVATION 7,526 FT',
  'indian-hot-springs-p4': 'INDIAN HOT SPRINGS — ELEVATION PLOT',
  'indian-hot-springs-p5': 'INDIAN HOT SPRINGS — THE GREAT ESCAPE',
  'indian-hot-springs-p6': 'INDIAN HOT SPRINGS — SUNSET PLATE',
  'invoke-assets': 'INVOKED REALMS PUBLISHING — EMBLEM',
  'invoke-assets-p2': 'INVOKED REALMS PUBLISHING — WORDMARK',
  'invoke-assets-p3': 'INVOKED REALMS PUBLISHING — WORDMARK, STACKED',
  'invoke-assets-p4': 'INVOKED REALMS PUBLISHING — BANNER',
  'invoke-assets-p5': 'INVOKED REALMS PUBLISHING — SEAL VARIANTS',
  'invoke-assets-p6': 'INVOKED REALMS PUBLISHING — COLOURWAYS',
  'jose-logo': 'JDELRIO — TITLE CARD',
  'jose-logo-p2': 'JDELRIO — RAVENS',
  'jose-logo-p3': 'JDELRIO — RAVEN MARKS',
  'kc-plumbing-final': 'KC HEATING & COOLING — CREST',
  'kc-plumbing-final-p2': 'KC HEATING & COOLING — MONOGRAM',
  'kc-plumbing-final-p3': 'KC HEATING & COOLING — WORDMARK VARIANTS',
  'lous-logo-final': "LOU'S HEATING & COOLING — IDENTITY",
  'pokebaby-ball-final': 'POKÉ BABY — BALL MARK',
  'pokebaby-ball-final-p2': 'POKÉ BABY — WORDMARK',
  'pokebaby-ball-final-p3': 'POKÉ BABY — BALL MARK, WHITE',
  pokebabytransparent: 'POKÉ BABY — WORDMARK, FLAT',
  sick: 'LOVSICK — LETTERING',
  'underground-fix': 'COLORADO UNDERGROUND — MONOGRAM',
  wkfinal: 'WRAP KINGZ — BRAND SHEET',
  'wkfinal-p2': 'WRAP KINGZ — WORDMARK',

  /* PRODUCTION */
  'chinese-dat-shit-dragonex': 'DAT-STUFF — DRAGON PLATE',
  'chinese-dat-shit-dragonex-p2': 'DAT-STUFF — POUCH FRONT',
  'chinese-dat-shit-dragonex-p3': 'DAT-STUFF — POUCH FRONT, ALT',
  'chinese-dat-shit-dragonex-p4': 'DAT-STUFF — DRAGON PLATE, ALT',
  'dat-stuf': 'DAT-STUFF — PACKAGING',
  'dat-stuf-p2': 'DAT-STUFF — DIELINE, YELLOW',
  'enzo-cookies': 'IMANEEDIT — COOKIES + CREAM',
  'enzo-cookies-p2': 'IMANEEDIT — COOKIES + CREAM, BACK',
  'lucilightsmoke-box': 'LUCILIGHT — BOX, TOP',
  'lucilightsmoke-box-p2': 'LUCILIGHT — DEVICE',
  'lucilightsmoke-box-p3': 'LUCILIGHT — BOX, SPECIFICATION',
  'lucilightsmoke-box-p5': 'LUCILIGHT — IDENTITY',
  'lucilightsmoke-box-p6': 'LUCILIGHT — MARK',

  /* CLOTHING */
  'fred-shirt-variant': "HOUDINI'S — APPAREL",
  'houdini-fred-bronco-edition': "HOUDINI'S — BRONCO EDITION",
  'houdini-s-escape-the-ordinary-denver-federal-back': "HOUDINI'S — SPADE TEE, BACK",
  'new-jug': 'CRYSTAL CLEAR WATER — NAVY SET',
  'tan-back': "HOUDINI'S — MONOGRAM TEE, TAN",
  'tan-variant-back': "HOUDINI'S — SPADE TEE, TAN",
  'untitled-1': 'CRYSTAL CLEAR WATER — GREY SET',

  /* MARKETING */
  '420-dreamy-flyer': '420 DREAMY ILLUSIONS — MILE HIGH TOURS',
  'dia-de-los-muertos-2': 'DÍA DE LOS MUERTOS — CAMPAIGN',
  'dia-de-los-muertos-2-p2': 'NAPAWIKA — FIND US CARD',
  flyer: 'ABOVE — WELLNESS SESSION ONE',
  'messages-image-788733092': 'MO-DEM — LAUNCH',
  'promo-mondat': "HOUDINI'S — WE HATE MONDAYS TOO",
  'wrap-kings-card': 'WRAP KINGZ — CARDS',
  'wrap-kings-card-p2': 'WRAP KINGZ — BANNER',
};

/** Which shelf ids exist, for narrowing the manifest's plain strings. */
const SHELVES = new Set<string>(SECTIONS.map((s) => s.id));

/**
 * The generated manifest, narrowed to what the site can actually file.
 *
 * A piece the generator could not place under a discipline — a file left loose
 * at the top of the supplied folder — is left out rather than dropped into an
 * arbitrary drawer. `scripts/file47-work.mjs` names those in its report, so
 * nothing goes missing quietly; it simply does not appear until someone says
 * which shelf it belongs on.
 */
const ARCHIVE: readonly Work[] = generated.pieces
  .filter((w) => typeof w.section === 'string' && SHELVES.has(w.section))
  .map((w) => ({
    id: w.id,
    section: w.section as SectionId,
    label: LABELS[w.id] ?? w.label,
    src: w.src,
    master: w.master,
  }));

/** A slot on the wall: which piece goes there, and how it is turned. */
interface Hung {
  id: string;
  position: Vec3;
  rotationY: number;
  fit: Fit;
}

/**
 * Fourteen pieces on fourteen screens, in a ring around FILE47's own.
 *
 * Positions are authored here rather than read off the model: no CRT in that
 * mesh is a named node, so these are our screens, standing in the room on
 * transforms we control. They are composed against `SCREEN` — nothing hangs
 * across the glass in the middle — in four bands: a top row, two flanking
 * columns, and a bottom row under the screen.
 *
 * Shape decides which piece goes where. The two tall pieces take the flanking
 * slots, which are the only ones with the height for them; the wide flyer sits
 * in the wide slot under the screen; the squares fill the rest. A piece placed
 * against the shape of its slot fills it; placed against the wrong one it
 * floats in a letterbox of dead panel.
 *
 * Work from one client sits in symmetric pairs — the two Houdini's tees on the
 * lower flanks, the two Crystal Clear Water sets at the bottom corners — so
 * the wall reads as a studio's range rather than as a shuffled pile.
 *
 * Only the id is named here. What the piece *is* — its label, its files, its
 * shelf — comes from the archive below, so hanging a piece cannot quietly
 * disagree with the drawer it is filed in.
 */
const HUNG: readonly Hung[] = [
  /* Top row — LUCILIGHT's identity, with the DAT-STUFF dieline centred. */
  {
    id: 'lucilightsmoke-box-p5',
    position: [1.3, 0.36, 1.12],
    rotationY: 0.3,
    fit: [0.6, 0.6],
  },
  { id: 'dat-stuf', position: [2.42, 0.52, 1.06], rotationY: 0, fit: [0.6, 0.6] },
  {
    id: 'lucilightsmoke-box-p6',
    position: [3.56, 0.36, 1.12],
    rotationY: -0.3,
    fit: [0.6, 0.6],
  },

  /* Top row, outer — the two lettering pieces, turned hard into the arc. */
  { id: 'bookie-green', position: [0.62, 0.26, 1.18], rotationY: 0.42, fit: [0.5, 0.5] },
  { id: 'sick', position: [4.28, 0.26, 1.18], rotationY: -0.42, fit: [0.5, 0.5] },

  /* Flanks — the two tall pieces, which fit nowhere else. */
  {
    id: 'lucilightsmoke-box-p2',
    position: [0.72, -0.44, 1.06],
    rotationY: 0.42,
    fit: [0.64, 0.82],
  },
  {
    id: 'wrap-kings-card',
    position: [4.16, -0.44, 1.06],
    rotationY: -0.42,
    fit: [0.64, 0.82],
  },

  /* Lower flanks — HOUDINI'S, one tee each side. */
  {
    id: 'fred-shirt-variant',
    position: [0.63, -1.4, 1.14],
    rotationY: 0.42,
    fit: [0.64, 0.72],
  },
  {
    id: 'houdini-fred-bronco-edition',
    position: [4.25, -1.4, 1.14],
    rotationY: -0.42,
    fit: [0.64, 0.72],
  },

  /* Bottom row, under the glass — CRYSTAL CLEAR WATER either side of the
     Día de los Muertos flyer. The two sets are the same client in two
     colourways, measured off the artwork rather than guessed: the tee body is
     #06213e on one and a neutral #d2d2d2 on the other. */
  { id: 'new-jug', position: [1.6, -1.86, 1.3], rotationY: 0.2, fit: [0.52, 0.58] },
  {
    id: 'dia-de-los-muertos-2',
    position: [2.42, -1.86, 1.22],
    rotationY: 0,
    fit: [0.72, 0.46],
  },
  { id: 'untitled-1', position: [3.3, -1.86, 1.3], rotationY: -0.2, fit: [0.52, 0.58] },

  /* Above the glass — CU Brain's lockup pair, the one wide piece up there. */
  { id: 'cu-brain', position: [2.42, 1.12, 1.02], rotationY: 0, fit: [1.12, 0.54] },

  /* Far right, off the arc — LOU'S, turned back towards the seat. */
  {
    id: 'lous-logo-final',
    position: [4.95, -0.95, 1.0],
    rotationY: -0.5,
    fit: [0.52, 0.76],
  },
];

/**
 * The archive: every file the studio handed over, filed under its discipline.
 *
 * The image facts — id, section, the two file paths, their true pixel sizes —
 * are generated by `scripts/file47-work.mjs` from the supplied folders and are
 * not edited by hand. What the script cannot know is what a piece *is*: it
 * derives a label from a filename, and a filename is the studio's working
 * name, not a client's. `LABELS` below is that judgement, read off the artwork
 * itself; anything without an entry falls back to the filename, which is
 * plainly a placeholder rather than a claim about a client.
 */
const byId = new Map(ARCHIVE.map((w) => [w.id, w]));

export const WORK: readonly Work[] = ARCHIVE;

export function workById(id: string): Work | undefined {
  return byId.get(id);
}

/** The wall, with every panel sized to the picture it carries. */
export const PIECES: readonly Piece[] = HUNG.map(({ id, position, rotationY, fit }) => {
  const work = byId.get(id);
  // Loud, at module load, rather than a hole in the wall at runtime: a slot
  // naming a piece the archive does not have means the manifest was rebuilt
  // without that file, and the room should not quietly hang nothing.
  if (!work)
    throw new Error(`file47: "${id}" is hung on the wall but is not in the archive`);
  return { ...work, position, rotationY, ...fitPanel(work.master, fit) };
});

export function pieceById(id: string): Piece | undefined {
  return PIECES.find((p) => p.id === id);
}

/** The pieces of one discipline that have a screen in the room, in wall order. */
export function piecesInSection(section: SectionId): readonly Piece[] {
  return PIECES.filter((p) => p.section === section);
}

/**
 * Everything filed under one discipline — the drawer.
 *
 * What is on the wall comes first, in wall order, then the rest of the shelf.
 * A drawer is the whole archive, so the pieces the studio chose to hang should
 * still be the first thing in it rather than sorted in among sixty others.
 */
export function workInSection(section: SectionId): readonly Work[] {
  const hung = piecesInSection(section);
  const onWall = new Set(hung.map((p) => p.id));
  return [...hung, ...WORK.filter((w) => w.section === section && !onWall.has(w.id))];
}

/* ------------------------------------------------------------------ *
 * The wide shot
 * ------------------------------------------------------------------ */

/**
 * What the wide shot has to hold: every panel in the room, measured rather
 * than authored.
 *
 * This used to be a hand-written width and height at the depth of the back
 * wall, and that is what made the top row of work clip off the frame. The
 * panels hang the better part of a metre nearer the camera than the wall does,
 * and the frustum is narrower where they are — so a shot fitted to the wall
 * fits nothing that is actually hanging on it. Derived from `PIECES` and
 * `SCREEN`, the framing cannot drift from what is in the room: hang a tenth
 * piece higher than the rest and the camera steps back on its own.
 */
function bankBounds() {
  const panels = [
    ...PIECES.map((p) => ({ centre: p.position, width: p.width, height: p.height })),
    { centre: SCREEN.centre, width: SCREEN.width, height: SCREEN.height },
  ];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const { centre, width, height } of panels) {
    minX = Math.min(minX, centre[0] - width / 2);
    maxX = Math.max(maxX, centre[0] + width / 2);
    minY = Math.min(minY, centre[1] - height / 2);
    maxY = Math.max(maxY, centre[1] + height / 2);
    // The nearest panel to the camera is the one that sets the plane, because
    // it is the one whose corners leave the frame first.
    maxZ = Math.max(maxZ, centre[2]);
  }

  return {
    centre: [(minX + maxX) / 2, (minY + maxY) / 2, maxZ] as Vec3,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export const BANK = bankBounds();

/** A little air, so nothing in the room is flush against the frame's edge. */
export const ROOM_MARGIN = 1.06;

/**
 * How much room the wide shot is allowed to show, as a multiple of the bank's
 * own height, once the viewport is too narrow to hold its width.
 *
 * This number is the whole portrait framing. Fitting the full width by
 * distance alone wants a twelve-metre standoff on a phone, and a frame that
 * narrow then has an enormous height to fill with a bank that is a horizontal
 * spread — it ends up a strip floating in a dark field, which is what the
 * first version did. There is no distance that both shows the whole bank and
 * fills a portrait frame, so the trade is taken deliberately in the other
 * direction: stand close, let the bank run off the sides, and put the visitor
 * in the room rather than across the street from it. The sheet's strip is the
 * index of the work; the room is the place it lives.
 */
export const PORTRAIT_PULLBACK = 1.45;

/**
 * The lens, widened as the frame narrows.
 *
 * Walking backwards is the wrong instrument for a portrait phone — the cap
 * above is expressed in bank-heights, so retreating buys no extra width, only
 * empty floor and ceiling. A wider angle buys width at the same standoff, and
 * the divergence it introduces is the thing that reads as being inside a room
 * full of monitors rather than looking at a photograph of one.
 */
export const PORTRAIT_FOV = 70;

/** Aspect at and above which the authored lens is used unchanged. */
export const WIDE_ASPECT = 1;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * The lens for a given viewport. Unchanged from square up; ramped to
 * `PORTRAIT_FOV` at phone-portrait and no wider.
 */
export function roomFov(aspect: number): number {
  const narrowest = 9 / 19.5;
  const t = clamp01((WIDE_ASPECT - aspect) / (WIDE_ASPECT - narrowest));
  return SHOTS.room.fov + (PORTRAIT_FOV - SHOTS.room.fov) * t;
}

/**
 * How far the sheet rises up a portrait screen, as a fraction of it. The
 * camera aims below the bank by roughly this much so the monitors sit in the
 * part of the frame the sheet is not covering — framing to the canvas centre
 * puts the subject behind the controls.
 */
export const SHEET_FRACTION = 0.26;

/**
 * From tablet up the sheet is a column against the left edge instead of a bar
 * along the bottom, so the framing shifts the other way: the camera steps left
 * and the room slides right, out from behind it. Without this the two
 * left-hand pieces of work sit permanently behind the controls.
 */
export const SHEET_SIDE_FRACTION = 0.24;

export function roomShot(aspect: number): Shot {
  const a = Math.max(0.05, aspect);
  const fov = roomFov(a);
  const half = Math.tan((fov * Math.PI) / 360);
  const portrait = a < 1;

  // The share of the frame the sheet covers, on whichever edge it is on.
  const down = portrait ? SHEET_FRACTION : SHEET_FRACTION * 0.35;
  const across = portrait ? 0 : SHEET_SIDE_FRACTION;

  // Fit into what the sheet leaves, not into the whole canvas. Fitting the
  // canvas and then nudging the aim — which is what this did — frames the bank
  // perfectly and then slides part of it under the controls.
  const dV = BANK.height / (1 - down) / 2 / half;
  const dH = BANK.width / (1 - across) / 2 / (a * half);

  // The cap, in units of a plain height fit. Past this the room stops being a
  // room you are in and becomes a photograph of one across the street.
  const ceiling = (BANK.height / 2 / half) * PORTRAIT_PULLBACK;
  const d = Math.max(dV, Math.min(dH, ceiling)) * ROOM_MARGIN;

  // Applied to the camera and its aim equally, so the shot stays square-on and
  // the bank simply slides up or across the frame. Tilting instead would put
  // the whole bank into keystone.
  const drop = d * half * down;
  const shift = d * half * a * across;

  return {
    position: [BANK.centre[0] - shift, BANK.centre[1] - drop, BANK.centre[2] + d],
    target: [BANK.centre[0] - shift, BANK.centre[1] - drop, BANK.centre[2]],
    fov,
  };
}

/* ------------------------------------------------------------------ *
 * Where the camera is
 * ------------------------------------------------------------------ */

/**
 * Three kinds of place, and no fourth. The room, FILE47's screen, or one piece
 * of work filling the frame. Every one of them is a fixed shot the camera
 * travels to — there is no state in which a visitor is flying the camera
 * themselves, because a client hiring a studio should not have to.
 */
export type View = { kind: 'room' } | { kind: 'screen' } | { kind: 'piece'; id: string };

/**
 * The shot that fills the frame with a given panel — FILE47's own screen, or
 * one piece of work. It sits on the panel's normal, at the distance where the
 * panel fills the frame the sheet leaves, less a margin.
 */
export function shotForPanel(
  panel: { centre: Vec3; rotationY: number; width: number; height: number },
  aspect = 16 / 9,
  fov = 34,
  clearsSheet = false,
): Shot {
  const a = Math.max(0.05, aspect);
  const half = Math.tan((fov * Math.PI) / 360);
  const portrait = a < 1;

  // A piece of work is looked at with the sheet still on screen, so the fit has
  // to leave room for it. The booking screen is not — the sheet is taken away
  // while it is up, because a screen with its own navigation does not need a
  // second menu sitting on top of it.
  const down = clearsSheet ? (portrait ? SHEET_FRACTION : SHEET_FRACTION * 0.35) : 0;
  const across = clearsSheet && !portrait ? SHEET_SIDE_FRACTION : 0;

  // Fit *both* axes, into what the sheet leaves, and take whichever needs more
  // room. Fitting the height alone against the whole canvas is a desktop
  // assumption, and it was the bug twice over: a 4:3 screen framed to fill the
  // vertical field of view on a phone held upright is two-thirds wider than the
  // frame, so the row of navigation across the top of it runs off the sides;
  // and a piece framed to the whole canvas and then nudged clear of the sheet
  // rides straight off the top instead.
  const dV = panel.height / (1 - down) / 2 / half;
  const dH = panel.width / (1 - across) / 2 / (a * half);
  const d = Math.max(dV, dH) * DOCK_MARGIN;

  // Camera and aim move together, so the panel slides across the frame and
  // stays square-on. Tilting to it would put the work into keystone.
  const drop = d * half * down;
  const shift = d * half * a * across;

  return {
    position: [
      panel.centre[0] + Math.sin(panel.rotationY) * d - shift,
      panel.centre[1] - drop,
      panel.centre[2] + Math.cos(panel.rotationY) * d,
    ],
    target: [panel.centre[0] - shift, panel.centre[1] - drop, panel.centre[2]],
    fov,
  };
}

export function shotFor(view: View, aspect = 16 / 9): Shot {
  if (view.kind === 'room') return roomShot(aspect);
  if (view.kind === 'screen') return shotForPanel(SCREEN, aspect, SHOTS.screen.fov);
  const p = pieceById(view.id);
  // An unknown id is a bad link, not a reason to strand the camera nowhere.
  if (!p) return roomShot(aspect);
  return shotForPanel(
    { centre: p.position, rotationY: p.rotationY, width: p.width, height: p.height },
    aspect,
    30,
    true,
  );
}

/**
 * Whether the 4:3 glass can hold the site legibly at this viewport shape.
 *
 * Below this, it cannot, and no camera move fixes it: the screen is authored
 * at 720x540, and a portrait phone that fits all 720 of those pixels across
 * its width renders the type at barely half size. On a frame this narrow the
 * site comes off the glass and fills the screen as ordinary DOM, with the room
 * still behind it. The CRT is the setting, not the toll.
 */
export const GLASS_MIN_ASPECT = 0.92;

export function glassFitsViewport(aspect: number): boolean {
  return aspect >= GLASS_MIN_ASPECT;
}

/**
 * Margin kept around the panel in flat mode, as a fraction of the short edge.
 *
 * The flat page is the same screen, off the glass — so it should read as the
 * panel pulled closer, not as a web page that happens to have the same
 * contents. A little dark around it is what makes it a screen you are sitting
 * at rather than a document filling a window.
 */
export const FLAT_MARGIN = 0.035;

/**
 * How far to scale the authored 720x540 screen to fill the viewport in flat.
 *
 * A scale, not a layout. The screen is authored at one size and the room maps
 * it onto the glass at one scale, so scaling it here means the flat page is
 * pixel-for-pixel the same screen — every rule, every gap, every type size in
 * the same proportion to the panel. Fitting it by CSS instead would reflow it,
 * and the flat page would slowly drift into being a different design that
 * happens to share a stylesheet.
 *
 * Fitted on both axes, so the whole panel is always in the window and nothing
 * scrolls. Only used where `glassFitsViewport` says the shape can hold it; on
 * a portrait phone the site comes off the glass entirely and fills the screen,
 * because a 4:3 panel centred on a 9:19.5 frame is a postage stamp.
 */
export function flatScale(width: number, height: number): number {
  const inset = Math.min(width, height) * FLAT_MARGIN * 2;
  return Math.min(
    Math.max(1, width - inset) / GLASS_PX.w,
    Math.max(1, height - inset) / GLASS_PX.h,
  );
}

/**
 * Whether the flat page gets the panel treatment, or fills the frame.
 *
 * The scale answers this better than the aspect does. A phone held sideways is
 * 844x390: wide enough to pass `glassFitsViewport`, and nowhere near tall
 * enough to hold 540 rows — the panel would come out at 0.67 and leaving the
 * room would make the screen *smaller*. So the test is whether there is room
 * to magnify: at 1 or under, the screen fills the frame instead, which is the
 * same answer a portrait phone gets and for the same reason.
 */
export function flatFitsPanel(width: number, height: number): boolean {
  return flatScale(width, height) > 1;
}

/* ------------------------------------------------------------------ *
 * Whether to render the room at all
 * ------------------------------------------------------------------ */

export type Mode = 'room' | 'flat';

export interface ModeHints {
  webgl: boolean;
  reducedMotion: boolean;
  width: number;
  /** The reader asked for one explicitly; their choice always wins. */
  preference?: Mode;
  /** Metered or slow connection reported by the browser, when it says. */
  saveData?: boolean;
}

export interface ModeDecision {
  mode: Mode;
  /** Why, in plain words. Only set when the room was not offered. */
  reason?: string;
}

/**
 * Chooses between the room and the flat page.
 *
 * The flat page carries every screen and the whole booking flow, so falling
 * back to it is never a failure — nothing about hiring this studio is behind
 * the scene, and the room is a 2.8 MB download nobody is made to take.
 */
export function decideMode(hints: ModeHints): ModeDecision {
  if (!hints.webgl) {
    return { mode: 'flat', reason: 'No WebGL here, so the room is shown flat.' };
  }
  if (hints.preference) return { mode: hints.preference };
  if (hints.saveData) {
    return { mode: 'flat', reason: 'Data saver is on — the room is a 2.8 MB scene.' };
  }
  if (hints.reducedMotion) {
    return { mode: 'flat', reason: 'Reduced motion is on, so the room is shown flat.' };
  }
  // No width test. The room renders into a 540-line buffer with no lights, so
  // a phone runs it as comfortably as a desktop — and the navigation was built
  // for a thumb first. Withholding it from phones would withhold it from most
  // of the people who will ever see it.
  return { mode: 'room' };
}

/** Feature-detects WebGL without leaving a context behind. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    if (!gl) return false;
    // Release it immediately — browsers cap simultaneous contexts.
    (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Whether the browser is asking us not to pull megabytes. */
export function prefersLessData(): boolean {
  const c = (navigator as { connection?: { saveData?: boolean } }).connection;
  return Boolean(c?.saveData);
}

/** Device-pixel-ratio ceiling. A 3x phone display will not be asked for 3x. */
export function dprRange(width: number): [number, number] {
  return width < 1100 ? [1, 1.25] : [1, 1.75];
}
