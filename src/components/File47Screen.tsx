'use client';

import { useEffect, useState } from 'react';
import { File47Plate } from '@/components/File47Plate';
import {
  BUDGET_BANDS,
  CONTACT,
  SCREENS,
  SERVICES,
  STUDIO,
  type ScreenId,
  mailtoBrief,
  serviceByN,
} from '@/lib/file47';
import { SECTIONS, type SectionId, workById, workInSection } from '@/lib/file47-room';
import './file47.css';

/**
 * FILE47 — what is on the screen.
 *
 * One component, rendered either onto the CRT's glass in the 3D room or on a
 * page for anyone who cannot have the room. It is deliberately small: four
 * words of navigation, the work, five one-line services, two lines about the
 * studio, and three fields to book.
 *
 * The work is the point. Everything else gets out of its way.
 *
 * WORK used to be a reel of drawn marks — a placeholder from before there was
 * any real work to show, which meant anyone who took the flat route saw a
 * portfolio site with no portfolio in it. It is the fourteen real pieces now, and
 * tapping one opens it at full resolution: in the room the camera goes to it
 * and the room's own plate opens; flat, the plate opens here. Either way the
 * zoom is the same, because it is the same component.
 */

export function File47Screen({
  screen,
  onScreen,
  bookFor,
  onBook,
  onPiece,
}: {
  screen: ScreenId;
  onScreen: (id: ScreenId) => void;
  bookFor: number | null;
  onBook: (n: number) => void;
  /**
   * Where a tapped piece should open. The room passes this so the camera flies
   * to it and the room's plate opens over the scene; the flat page passes
   * nothing and opens the plate here instead. Same plate, same zoom.
   */
  onPiece?: (id: string) => void;
}) {
  return (
    <div className="f47">
      <nav className="f47-nav" aria-label="Sections">
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-current={s.id === screen}
            onClick={() => onScreen(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="f47-body">
        {screen === 'work' && <Work onPiece={onPiece} />}
        {screen === 'services' && <Services onBook={onBook} />}
        {screen === 'studio' && <Studio />}
        {screen === 'book' && <Book bookFor={bookFor} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * WORK — four drawers, fourteen pieces
 *
 * Thumbnails are the room's own 512px textures — already the right size for a
 * grid, and on the room route already decoded, so the index costs nothing. The
 * master is only fetched when a piece is opened.
 * ------------------------------------------------------------------ */

/**
 * A drawer, drawn rather than imported.
 *
 * Hard strokes and no fill, because everything else on this screen is printed
 * matter and an icon set from a library would be the one thing on the page
 * that came from somewhere else. `currentColor` so it takes the marker
 * highlight with the rest of the tile when the tile is hovered.
 */
function FolderMark() {
  return (
    <svg
      className="f47-folder-i"
      viewBox="0 0 32 26"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 24V4a2 2 0 0 1 2-2h8l3 4h13a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M2 10h28" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * WORK — four drawers, then what is in one.
 *
 * It listed all fourteen pieces at once, which asked a visitor to read a
 * shuffled pile of other people's clients and work out for themselves that
 * three of them were packaging. Filed by discipline, the first screen answers
 * the question someone actually arrives with — *do you do what I need* — and
 * the client names sit one level down where they are evidence rather than
 * noise.
 *
 * The drawers are the studio's own folders. Nothing is invented here to make
 * a tidier set, and nothing is filed in two places.
 */
function Work({ onPiece }: { onPiece?: (id: string) => void }) {
  const [shelf, setShelf] = useState<SectionId | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const piece = open ? workById(open) : undefined;

  if (!shelf) {
    return (
      <section className="f47-work" aria-label="Work">
        <ul className="f47-folders">
          {SECTIONS.map((sec) => {
            const held = workInSection(sec.id);
            return (
              <li key={sec.id}>
                <button
                  type="button"
                  className="f47-folder"
                  onClick={() => setShelf(sec.id)}
                  aria-label={`Open ${sec.label}, ${held.length} pieces`}
                >
                  <FolderMark />
                  <span className="f47-folder-name">{sec.label}</span>
                  <span className="f47-folder-n">
                    {String(held.length).padStart(2, '0')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  const held = workInSection(shelf);
  const name = SECTIONS.find((sec) => sec.id === shelf)?.label ?? '';

  return (
    <section className="f47-work" aria-label={`Work — ${name}`}>
      {/* Named, not a bare arrow. Where back goes is the whole question when a
          screen has two levels and no address bar of its own. */}
      <button type="button" className="f47-up" onClick={() => setShelf(null)}>
        ← ALL WORK
      </button>
      <p className="f47-shelf">
        {name} <span>{String(held.length).padStart(2, '0')}</span>
      </p>

      <ul className="f47-grid">
        {held.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => (onPiece ? onPiece(p.id) : setOpen(p.id))}
              aria-label={`Open ${p.label}`}
            >
              <span className="f47-grid-art">
                <img src={p.src} alt="" width={160} height={160} loading="lazy" />
              </span>
              <span className="f47-grid-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="f47-grid-label">{p.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Flat has no room behind it, so the plate fills the screen instead of
          being inset into one. The component, and the zoom, are identical. */}
      {piece && (
        <File47Plate piece={piece} variant="flat" onClose={() => setOpen(null)} />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * SERVICES — five lines
 * ------------------------------------------------------------------ */

function Services({ onBook }: { onBook: (n: number) => void }) {
  return (
    <section className="f47-list" aria-label="Services">
      {SERVICES.map((s) => (
        <button key={s.n} type="button" className="f47-row" onClick={() => onBook(s.n)}>
          <span className="f47-row-n">{String(s.n).padStart(2, '0')}</span>
          <span className="f47-row-main">
            <strong>{s.title}</strong>
            <span>{s.line}</span>
          </span>
          <span className="f47-row-band">{s.band}</span>
        </button>
      ))}
      <p className="f47-fine">Bands are indicative. Booking costs nothing.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * STUDIO — two lines
 * ------------------------------------------------------------------ */

function Studio() {
  return (
    <section className="f47-studio">
      {STUDIO.lines.map((l) => (
        <p key={l}>{l}</p>
      ))}

      {/* The direct line. A booking form is a convenience; an address a client
          can write to from their own mail client is the thing that works
          whatever this server is or is not configured with. */}
      <dl className="f47-contact">
        <dt>EMAIL</dt>
        <dd>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </dd>
        <dt>INSTAGRAM</dt>
        <dd>
          <a href={CONTACT.instagramUrl} target="_blank" rel="noreferrer">
            {CONTACT.instagram}
          </a>
        </dd>
        <dt>BASED</dt>
        <dd>{CONTACT.city.toUpperCase()}</dd>
      </dl>

      <span className="f47-fine">{STUDIO.credit}</span>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * BOOK — three fields
 * ------------------------------------------------------------------ */

/**
 * BOOK — the same three fields, handed to the visitor's own mail client.
 *
 * There is no request. Pressing SEND builds the brief into a `mailto:` and
 * opens it; the visitor presses send in their own mail app, from their own
 * address. Nothing is posted, nothing is stored, and no key needs to be
 * present anywhere for a client to be able to hire this studio.
 *
 * Which means the page cannot know whether the mail was sent, so it never says
 * it was. The confirmation says exactly what happened — the message was
 * written and handed over — and repeats the link, because a browser with no
 * mail client registered swallows a `mailto:` silently and a visitor who saw
 * nothing happen needs somewhere to go.
 */
function Book({ bookFor }: { bookFor: number | null }) {
  const [n, setN] = useState<number>(bookFor ?? 1);
  const [handed, setHanded] = useState<{ href: string; service: string } | null>(null);

  useEffect(() => {
    if (bookFor) setN(bookFor);
  }, [bookFor]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const service = serviceByN(n)?.title ?? `SECT.${String(n).padStart(2, '0')}`;
    const href = mailtoBrief({
      service,
      name: String(form.get('name') ?? ''),
      contact: String(form.get('contact') ?? ''),
      brief: String(form.get('brief') ?? ''),
      budgetBand: String(form.get('band') ?? '') || undefined,
    });
    setHanded({ href, service });
    window.location.href = href;
  }

  if (handed) {
    return (
      <section className="f47-done" role="status">
        <p className="f47-ref">{handed.service}</p>
        {/* Stated as what it is. The studio has not received anything yet and
            this page has no way to find out that it has — so it says so, and
            tells the visitor where the last step is. */}
        <p>
          Your brief is written and waiting in your mail app. Press send there and it
          reaches the studio from your own address.
        </p>

        <a className="f47-btn f47-send" href={handed.href}>
          OPEN IT AGAIN →
        </a>

        <p className="f47-fine">
          Nothing was sent from this page and nothing was stored on it. If no mail app
          opened, write to <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> ·{' '}
          <a href="/privacy">Privacy</a>
        </p>
      </section>
    );
  }

  return (
    <section className="f47-book">
      <form onSubmit={submit}>
        <div className="f47-field">
          <label htmlFor="f47-service">Service</label>
          <select
            id="f47-service"
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          >
            {SERVICES.map((s) => (
              <option key={s.n} value={s.n}>
                {String(s.n).padStart(2, '0')} {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="f47-field">
          <label htmlFor="f47-name">Name</label>
          <input id="f47-name" name="name" required maxLength={120} />
        </div>

        <div className="f47-field">
          <label htmlFor="f47-contact">Contact</label>
          <input id="f47-contact" name="contact" required maxLength={200} />
        </div>

        <div className="f47-field f47-field--wide">
          <label htmlFor="f47-brief">What do you need?</label>
          <textarea
            id="f47-brief"
            name="brief"
            required
            minLength={20}
            maxLength={4000}
          />
        </div>

        <div className="f47-field">
          <label htmlFor="f47-band">Budget</label>
          <select id="f47-band" name="band" defaultValue="UNDECIDED">
            {BUDGET_BANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="f47-submit">
          <button type="submit" className="f47-btn">
            WRITE IT
          </button>
        </div>

        {/* Offered before the form is filled in, not only after it fails. Some
            clients would rather just write an email, and making them fill in a
            form first to be told the address is a toll. The notice is beside
            it for the same reason: what happens to a brief belongs next to the
            button that sends it, not in a footer. */}
        <p className="f47-field--wide f47-fine">
          This opens your own mail app with the brief written, addressed to{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. You press send. Or
          write there directly. <a href="/privacy">What happens to it →</a>
        </p>
      </form>
    </section>
  );
}
