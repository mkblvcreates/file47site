'use client';

import dynamic from 'next/dynamic';
import {
  Component,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { File47Plate } from '@/components/File47Plate';
import { File47Screen } from '@/components/File47Screen';
import { HOME_SCREEN, SERVICES, type ScreenId } from '@/lib/file47';
import {
  type Mode,
  SECTIONS,
  type SectionId,
  type View,
  decideMode,
  flatFitsPanel,
  flatScale,
  glassFitsViewport,
  hasWebGL,
  workById,
  workInSection,
  prefersLessData,
} from '@/lib/file47-room';
import './file47-room.css';

/**
 * FILE47 — the way in.
 *
 * Built for a thumb. The room fills the screen and one sheet sits in the
 * bottom third, where a hand already is: the fourteen pieces of work, the five
 * services, and one button that books. Everything reachable without reaching.
 *
 * There are three places to be and no fourth — the room, a piece of work, or
 * the booking screen — and every one of them is one tap from the sheet. No
 * menu opens another menu.
 */

const Room = dynamic(() => import('@/components/File47Room').then((m) => m.File47Room), {
  ssr: false,
  loading: () => <Booting />,
});

const MODE_KEY = 'file47.mode';

/**
 * The chosen mode, for this visit only.
 *
 * Deliberately `sessionStorage`. Arriving at FILE47 means arriving in the
 * room — that is the site, and a visitor who dropped to the flat list once to
 * read something should not have the room taken away from them for good. The
 * choice holds while the tab is open and is gone the next time they come.
 *
 * The old key was `localStorage`, which did exactly that, so it is cleared on
 * read rather than left to strand returning visitors on the flat screen.
 */
function storedMode(): Mode | undefined {
  try {
    window.localStorage.removeItem(MODE_KEY);
    const v = window.sessionStorage.getItem(MODE_KEY);
    return v === 'room' || v === 'flat' ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Falls back to the flat screen if the scene throws or loses its context. */
class RoomBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Booting() {
  return (
    <div className="rm-booting" role="status">
      <span>FILE47</span>
    </div>
  );
}

/**
 * The OSD readout: channel, a timecode that counts, and the lamp.
 *
 * Written straight to the node on an interval. A timecode held in state would
 * re-render the tree once a second for the rest of the visit, which is a real
 * tax to pay for a decoration. Hidden from assistive tech for the same reason
 * it exists: it is atmosphere, and it says nothing a reader needs.
 */
function Readout() {
  const tc = useRef<HTMLSpanElement>(null);
  const from = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      const node = tc.current;
      if (!node) return;
      const t = Math.floor((Date.now() - from.current) / 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      node.textContent = `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="hud-osd" aria-hidden="true">
      <span>CH47</span>
      <span className="hud-tc" ref={tc}>
        00:00:00
      </span>
      <span className="hud-rec">
        <i />
        REC
      </span>
    </span>
  );
}

type Tab = 'work' | 'services';

export function File47Entry() {
  // Server and first paint agree on flat; the room is decided after mount,
  // when the device can actually be asked about itself.
  const [mode, setMode] = useState<Mode>('flat');
  const [reason, setReason] = useState<string>();
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const [still, setStill] = useState(false);
  // Whether the site can live on the CRT's glass at this viewport shape, or
  // has to come off it. Server-side this is true, which is the desktop case
  // and the one that renders identically either way.
  const [glass, setGlass] = useState(true);
  /**
   * How far the authored screen is scaled in flat mode.
   *
   * 1 until the viewport has been measured, which is the authored size — the
   * screen is never wrong at that scale, only small, so first paint is safe.
   */
  const [zoom, setZoom] = useState(1);
  /** Whether flat mode shows the panel pulled closer, or fills the frame. */
  const [panel, setPanel] = useState(false);

  const sheet = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLElement>(null);

  const [view, setView] = useState<View>({ kind: 'room' });
  const [tab, setTab] = useState<Tab>('work');
  /**
   * Which drawer the sheet is showing, or none for the four of them.
   *
   * The sheet is a thumb's width of screen. Fourteen pieces in one scroll made
   * it a long swipe through other people's clients to find out whether the
   * studio does packaging; four drawers answer that in one look.
   */
  const [shelf, setShelf] = useState<SectionId | null>(null);
  const [screen, setScreen] = useState<ScreenId>(HOME_SCREEN);
  const [bookFor, setBookFor] = useState<number | null>(null);

  useEffect(() => {
    const gl = hasWebGL();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setWebgl(gl);
    setStill(reduced);
    const decision = decideMode({
      webgl: gl,
      reducedMotion: reduced,
      width: window.innerWidth,
      saveData: prefersLessData(),
      preference: storedMode(),
    });
    setMode(decision.mode);
    setReason(decision.reason);
    setReady(true);
  }, []);

  /**
   * The viewport's shape, watched rather than sampled once.
   *
   * A phone rotated into landscape is wide enough for the glass and a tablet
   * rotated upright is not, and both happen while the page is open. Reading it
   * at mount only is how a site ends up correct on the shape it was loaded in
   * and wrong for the rest of the visit.
   */
  useEffect(() => {
    const sync = () => {
      const { innerWidth: w, innerHeight: h } = window;
      setGlass(glassFitsViewport(w / Math.max(1, h)));
      setZoom(flatScale(w, h));
      setPanel(flatFitsPanel(w, h));
    };
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);

  const switchTo = useCallback((next: Mode) => {
    setMode(next);
    setReason(undefined);
    try {
      window.sessionStorage.setItem(MODE_KEY, next);
    } catch {
      /* the choice still holds until this component unmounts */
    }
  }, []);

  const book = useCallback((n: number) => {
    setBookFor(n);
    setScreen('book');
  }, []);

  /** A service from the sheet books it and brings the screen up. */
  const pick = useCallback(
    (n: number) => {
      book(n);
      setView({ kind: 'screen' });
    },
    [book],
  );

  const openPiece = useCallback((id: string) => {
    setTab('work');
    setView({ kind: 'piece', id });
  }, []);

  /**
   * Publish the top bar's real height as `--top`.
   *
   * The site, when it comes off the glass, has to start below it. Guessed, the
   * guess is wrong at one text size or one notch depth and the screen's own
   * navigation ends up underneath the OSD readout.
   */
  useEffect(() => {
    const el = top.current;
    const host = shell.current;
    if (!el || !host) return;
    const sync = () => host.style.setProperty('--top', `${el.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  /**
   * Publish the sheet's real height as `--sheet`.
   *
   * Everything that has to sit clear of it — the caption, the lower corner
   * brackets — was offset by a hard-coded guess, which is wrong the moment the
   * tab changes or the text wraps to a second line. Measure it instead.
   */
  useEffect(() => {
    const host = shell.current;
    if (!host) return;
    const el = sheet.current;
    // No sheet is a real measurement, not a missing one. Left at its last
    // value, the caption and the lower brackets stay parked above a bar that
    // is no longer on screen.
    if (!el) {
      host.style.setProperty('--sheet-h', '0px');
      host.style.setProperty('--sheet-w', '0px');
      return;
    }
    // Both dimensions, because the sheet is a bar along the bottom on a phone
    // and a column down the left from tablet up — and an inline style beats a
    // media query, so publishing one number as "--sheet" silently overrode the
    // stylesheet's own landscape answer. The CSS derives what it needs from
    // these; see the `--sheet` / `--rail` pair in file47-room.css.
    const sync = () => {
      host.style.setProperty('--sheet-h', `${el.offsetHeight}px`);
      host.style.setProperty('--sheet-w', `${el.offsetWidth}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, tab, view, glass]);

  // Escape always goes back a step. On a phone it costs nothing; on a desktop
  // it is the key a hand reaches for.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setView({ kind: 'room' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /**
   * Flat: the same panel, pulled closer.
   *
   * Where the frame can hold a 4:3 screen, the flat page is the authored
   * 720x540 scaled up and centred, with dark around it — so leaving the room
   * reads as sitting down at the monitor rather than as landing on a different
   * site. It used to be a fixed 820x620 box, which was neither the panel's
   * shape nor big enough to be worth the trip, and full-bleed below that.
   *
   * Where there is no room to magnify it is still full-bleed — a portrait
   * phone, or one held sideways, where a 4:3 panel would be a postage stamp
   * and leaving the room would make the screen smaller than it was on the
   * wall. There, the screen *is* the site. Either way the whole of it is in
   * the window and nothing scrolls.
   */
  const flat = (
    <div
      className={panel ? 'rm-flat rm-flat--panel' : 'rm-flat'}
      style={panel ? ({ '--f47-zoom': zoom } as CSSProperties) : undefined}
    >
      <File47Screen
        screen={screen}
        onScreen={setScreen}
        bookFor={bookFor}
        onBook={book}
      />
    </div>
  );

  if (mode === 'flat') {
    return (
      <>
        {flat}
        {/*
          The way back into the room, and it has to be findable.
          This was a 10px ghost label in a corner, which on a phone — where the
          flat screen fills the viewport — is a control nobody finds. It is now
          the same toggle as the FLAT control in the room's top bar, in the same
          register, at a fingertip's size, sitting above the screen rather than
          in its margin.

          Still gated on WebGL: offering a door into a room the device cannot
          render would be offering a broken thing. The reason sits beside it
          when the room was withheld rather than chosen, so a visitor is told
          why instead of being left to wonder.
        */}
        {ready && webgl && (
          <div className="rm-return">
            {reason && <span className="rm-return-why">{reason}</span>}
            <button type="button" className="rm-ghost" onClick={() => switchTo('room')}>
              ENTER THE ROOM →
            </button>
          </div>
        )}
      </>
    );
  }

  const shown = view.kind === 'piece' ? workById(view.id) : undefined;

  /**
   * The site is up — on the glass on a wide frame, over the room on a narrow
   * one. Either way the sheet goes away while it is: the screen carries its
   * own four words of navigation, and a second menu laid across the bottom of
   * it was the thing making the docked view feel like two sites at once.
   */
  const screenUp = view.kind === 'screen';
  const overlaid = screenUp && !glass;

  // With the site overlaid there is nothing to see of the screen behind it, so
  // the camera stays where it was rather than flying to a shot no one sees.
  const sceneView: View = overlaid ? { kind: 'room' } : view;

  return (
    <div className="rm" ref={shell}>
      <RoomBoundary fallback={flat}>
        <Room
          view={sceneView}
          glass={glass}
          screen={screen}
          bookFor={bookFor}
          still={still}
          onScreen={setScreen}
          onBook={book}
          onPiece={openPiece}
          onDock={() => setView({ kind: 'screen' })}
        />
      </RoomBoundary>

      {/* The frame. Pure decoration, so it is inert and hidden — every
          control it draws attention to is a real element elsewhere. */}
      <div className="hud" aria-hidden="true">
        <span className="hud-c hud-c--tl" />
        <span className="hud-c hud-c--tr" />
        <span className="hud-c hud-c--bl" />
        <span className="hud-c hud-c--br" />
      </div>

      <header className="rm-top" ref={top}>
        <span className="rm-mark">FILE47</span>
        {/* The OSD belongs to the room. Over a client's work it is one more
            thing printed across the picture, which is the same objection as
            the dither — so it goes off while the work is being looked at. */}
        {view.kind === 'room' && <Readout />}
        {view.kind === 'room' ? (
          <button type="button" className="rm-ghost" onClick={() => switchTo('flat')}>
            FLAT
          </button>
        ) : (
          <button
            type="button"
            className="rm-ghost"
            onClick={() => setView({ kind: 'room' })}
          >
            ← BACK
          </button>
        )}
      </header>

      {/* The site, brought off the glass because the frame is too narrow to
          read it there. Same component, same flow — it is the CRT filling the
          screen, not a different site. */}
      {overlaid && (
        <div className="rm-console">
          <File47Screen
            screen={screen}
            onScreen={setScreen}
            bookFor={bookFor}
            onBook={book}
            onPiece={openPiece}
          />
        </div>
      )}

      {/*
        A piece of work, opened.

        The camera still flies to it in the room behind — that move is the
        transition — but the picture you actually read is this plate: the
        master in DOM at the device's own resolution, pinch and drag, capped at
        the pixels that exist. The canvas runs at dpr 1 because the room's
        picture *is* the small dither buffer, so fine detail is the one thing
        it can never show.
      */}
      {shown && <File47Plate piece={shown} onClose={() => setView({ kind: 'room' })} />}

      {/* The sheet. Everything this site does, in the bottom third. */}
      {!screenUp && (
        <div className="rm-sheet" ref={sheet}>
          <div className="rm-tabs" role="tablist" aria-label="FILE47">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'work'}
              onClick={() => setTab('work')}
            >
              WORK
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'services'}
              onClick={() => setTab('services')}
            >
              SERVICES
            </button>
          </div>

          {tab === 'work' ? (
            <ul className="rm-strip" aria-label="Work">
              {shelf === null ? (
                SECTIONS.map((sec) => (
                  <li key={sec.id}>
                    <button
                      type="button"
                      className="rm-drawer"
                      onClick={() => setShelf(sec.id)}
                      aria-label={`Open ${sec.label}, ${workInSection(sec.id).length} pieces`}
                    >
                      <span className="rm-drawer-i" aria-hidden="true" />
                      <span className="rm-slot">
                        {String(workInSection(sec.id).length).padStart(2, '0')}
                      </span>
                      <span>{sec.label}</span>
                    </button>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <button
                      type="button"
                      className="rm-drawer rm-drawer--up"
                      onClick={() => setShelf(null)}
                    >
                      <span className="rm-drawer-i rm-drawer-i--up" aria-hidden="true" />
                      <span className="rm-slot">←</span>
                      <span>ALL WORK</span>
                    </button>
                  </li>
                  {workInSection(shelf).map((p, i) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        aria-current={view.kind === 'piece' && view.id === p.id}
                        onClick={() => openPiece(p.id)}
                      >
                        {/* The texture itself, so the strip is the work rather
                          than a list of names for it. */}
                        <img src={p.src} alt="" width={64} height={64} loading="lazy" />
                        <span className="rm-slot">{String(i + 1).padStart(2, '0')}</span>
                        <span>{p.label}</span>
                      </button>
                    </li>
                  ))}
                </>
              )}
            </ul>
          ) : (
            <ul className="rm-list" aria-label="Services">
              {SERVICES.map((s) => (
                <li key={s.n}>
                  <button type="button" onClick={() => pick(s.n)}>
                    <span className="rm-list-n">{String(s.n).padStart(2, '0')}</span>
                    <span className="rm-list-main">
                      <strong>{s.title}</strong>
                      <span>{s.line}</span>
                    </span>
                    <span className="rm-list-band">{s.band}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="rm-book"
            onClick={() => {
              setScreen('book');
              setView({ kind: 'screen' });
            }}
          >
            BOOK A PROJECT
          </button>
        </div>
      )}
    </div>
  );
}
