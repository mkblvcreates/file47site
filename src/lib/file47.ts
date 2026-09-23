/**
 * FILE47 — content.
 *
 * FILE47 is a client's design and brand services site. MKBLV built it; MKBLV is
 * not in it, beyond one build credit.
 *
 * The whole site is a couple of hundred words on purpose. A design studio is
 * judged on what it shows, not what it claims, so the specimens carry the
 * argument and the copy stays out of their way. If a line here is not doing
 * work, delete it.
 */

/* ------------------------------------------------------------------ *
 * Services — five, one line each
 * ------------------------------------------------------------------ */

export interface Service {
  /** SECT. number, and the order they are shown in. */
  n: number;
  title: string;
  /** One line. Not a paragraph. */
  line: string;
  /** Indicative band. A real number is quoted after a conversation. */
  band: string;
}

export const SERVICES: readonly Service[] = [
  { n: 1, title: 'IDENTITY', line: 'Marks, type, colour. The whole system.', band: 'A' },
  { n: 2, title: 'ART DIRECTION', line: 'Campaigns, lookbooks, product.', band: 'B' },
  { n: 3, title: 'INTERFACE', line: 'Product UI, designed and built.', band: 'A' },
  {
    n: 4,
    title: 'PRINT + GARMENT',
    line: 'Separations, packaging, graphics.',
    band: 'C',
  },
  { n: 5, title: 'RETAINER', line: 'A standing seat. Monthly.', band: 'R' },
];

export function serviceByN(n: number): Service | undefined {
  return SERVICES.find((s) => s.n === n);
}

/* ------------------------------------------------------------------ *
 * Studio — two lines
 * ------------------------------------------------------------------ */

export const STUDIO = {
  lines: [
    'A design and brand services practice.',
    'Fixed scope, source files, no lock-in.',
  ],
  /** Shown once, small. The client owns the site; MKBLV built it. */
  credit: 'BUILT BY MKBLV',
} as const;

/* ------------------------------------------------------------------ *
 * How to reach them
 * ------------------------------------------------------------------ */

/**
 * FILE47's own contact details, from the studio card MKBLV was given.
 *
 * The email is the studio's, not a relay we operate, and it is the one channel
 * that works whatever this server is or is not configured with. Everything
 * else about intake — the reference, the ledger, the mail relay — is an
 * improvement on top of a visitor being able to write to a human.
 */
export const CONTACT = {
  email: 'file47studios@pm.me',
  instagram: '@file.47_',
  instagramUrl: 'https://instagram.com/file.47_',
  /** Stored cased for prose; the STUDIO block sets it in caps itself. */
  city: 'Denver, Colorado',
} as const;

/**
 * The brief, as a link that opens the visitor's own mail client with
 * everything already typed.
 *
 * This is the whole booking flow, not a fallback for one. The form used to
 * post to a route that relayed the brief through a third-party mail service,
 * which meant an API key to hold, a verified sending domain to keep, a
 * deliverability problem to own, and a reference number for a record nobody
 * was keeping — all so a message could arrive at the studio *from* the studio,
 * with the client's own address buried in the body.
 *
 * A mailto costs none of that and is better mail. It arrives from the client's
 * real address, so replying to it works; it lands in their own Sent folder, so
 * they have a copy; and nothing about hiring this studio depends on a key
 * being present in an environment somewhere.
 *
 * What the site gives up is knowing whether it was sent — the visitor presses
 * send, in their own client, and the page never hears about it. So the page
 * does not claim it. See the confirmation copy in `File47Screen`.
 *
 * Pure, and no server import, so it works client-side and is unit-testable.
 */
export function mailtoBrief(brief: {
  /** The kind of enquiry: a service title, as the rail names it. */
  service: string;
  name: string;
  contact: string;
  organization?: string;
  brief: string;
  budgetBand?: string;
}): string {
  const subject = `FILE47 — ${brief.service} — ${brief.name}`;
  const body = [
    `SERVICE     ${brief.service}`,
    `NAME        ${brief.name}`,
    brief.organization ? `ORG         ${brief.organization}` : null,
    `CONTACT     ${brief.contact}`,
    brief.budgetBand ? `BUDGET      ${brief.budgetBand}` : null,
    '',
    brief.brief,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

/* ------------------------------------------------------------------ *
 * Privacy
 * ------------------------------------------------------------------ */

/**
 * The facts in the privacy notice that only FILE47 can supply.
 *
 * Everything else on that page is a statement about what the code actually
 * does, and is true as written. These are FILE47's to give, and inventing one
 * would be exactly the fabrication this site refuses everywhere, on the one
 * page where a reader is entitled to take every word literally.
 *
 * Left null, the page renders a value as TO CONFIRM rather than as a bracketed
 * template placeholder, so the document reads as one awaiting a signature
 * rather than one nobody finished. Filling one in is a content change: set the
 * value here and the page follows.
 *
 * `entity` and `address` are separate fields because they arrived separately.
 * One field covering "registered name and address" meant that supplying the
 * name would quietly have made the page assert an address nobody had given.
 * Both are filled now, so nothing on that page is outstanding.
 *
 * `updated` is the date printed on the notice, and it moves when the notice
 * changes — the page promises exactly that, so it is not decoration. It had
 * gone stale: the booking flow became a mailto and the notice was rewritten
 * around it without this being touched.
 */
export const PRIVACY = {
  /** Changed whenever the notice itself changes, not on every deploy. */
  updated: '23 SEPTEMBER 2026',
  /** Registered legal name of the practice. */
  entity: 'FILE.47' as string | null,
  /** Registered address, as FILE47 gave it. */
  address: 'Denver, Colorado' as string | null,
} as const;

/* ------------------------------------------------------------------ *
 * Screens
 * ------------------------------------------------------------------ */

export type ScreenId = 'work' | 'services' | 'studio' | 'book';

export interface Screen {
  id: ScreenId;
  label: string;
}

export const SCREENS: readonly Screen[] = [
  { id: 'work', label: 'WORK' },
  { id: 'services', label: 'SERVICES' },
  { id: 'studio', label: 'STUDIO' },
  { id: 'book', label: 'BOOK' },
];

export const HOME_SCREEN: ScreenId = 'work';

export function isScreenId(value: string): value is ScreenId {
  return SCREENS.some((s) => s.id === value);
}

/* ------------------------------------------------------------------ *
 * Boot — three lines, then the screen
 * ------------------------------------------------------------------ */

export const BOOT_LINES: readonly string[] = ['FILE47', 'PORT 47 — CARRIER', 'READY'];

/** Milliseconds between boot lines, and how long the last one holds. */
export const BOOT_STEP = 420;
export const BOOT_TOTAL = BOOT_LINES.length * BOOT_STEP + 320;

export function bootLinesAt(elapsed: number): string[] {
  return BOOT_LINES.filter((_, i) => elapsed >= (i + 1) * BOOT_STEP);
}

/* ------------------------------------------------------------------ *
 * Booking
 * ------------------------------------------------------------------ */

export const BUDGET_BANDS = [
  'UNDER 5K',
  '5–15K',
  '15–40K',
  '40–100K',
  '100K+',
  'UNDECIDED',
] as const;
