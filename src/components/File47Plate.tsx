'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Work } from '@/lib/file47-room';
import {
  AT_REST,
  DOUBLE_TAP_SCALE,
  FIT,
  type Offset,
  canZoom,
  clampPan,
  clampScale,
  fitted,
  maxScale,
  zoomAbout,
  zoomLabel,
} from '@/lib/file47-zoom';

/**
 * FILE47 — a piece of work, close up.
 *
 * The room hangs the work on CRT faces at 512px and dithers it, which is the
 * right treatment for a wall of monitors and the wrong one for someone deciding
 * whether to hire the studio. Selecting a piece opens it here instead: the
 * master, at up to 2560px, in real DOM at the device's own resolution, with
 * pinch, wheel and drag.
 *
 * Off the canvas on purpose, for the same reason the booking screen comes off
 * the glass on a narrow frame. The canvas runs at `dpr={1}` because the room's
 * picture *is* the small dither buffer — so the one thing it can never do is
 * show fine detail. A plate in the DOM is not subject to that ceiling.
 *
 * Inset rather than full-bleed: the dithered room stays visible around the
 * edges, so the work is being looked at *in* the room rather than in a lightbox
 * that replaced it.
 *
 * The arithmetic — fit, ceiling, pan limits, zoom-about-a-point — is all in
 * `file47-zoom.ts` and unit-tested. This file is the gestures and the pixels.
 */

/** How fast a wheel notch moves the scale. */
const WHEEL_SENSITIVITY = 0.0022;

/** A second tap within this many ms, and this close, is a double tap. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 24;

export function File47Plate({
  piece,
  onClose,
  variant = 'room',
}: {
  piece: Work;
  onClose: () => void;
  /**
   * Where it is opening. In the room it is inset into the frame the HUD and
   * the sheet leave; on the flat page there is no room behind it, so it fills
   * the screen. Only the positioning differs — the picture, the gestures and
   * the ceiling are the same.
   */
  variant?: 'room' | 'flat';
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(FIT);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);

  const natural = { width: piece.master.w, height: piece.master.h };
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const zoomable = frame.width > 0 && canZoom(natural, frame, dpr);
  const moved = scale >= AT_REST;

  // A different piece is a different picture: start it fitted rather than
  // inheriting wherever the last one was left.
  useEffect(() => {
    setScale(FIT);
    setOffset({ x: 0, y: 0 });
    setLoaded(false);
  }, [piece.id]);

  /** The frame is measured, never assumed — it changes with the sheet. */
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const sync = () => setFrame({ width: el.clientWidth, height: el.clientHeight });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-fit when the frame changes shape: a scale that was legal in portrait
  // can be past the ceiling in landscape, and an offset can be out of bounds.
  useEffect(() => {
    if (frame.width === 0) return;
    setScale((s) => clampScale(s, natural, frame, dpr));
    setOffset((o) => clampPan(o, natural, frame, clampScale(scale, natural, frame, dpr)));
    // `scale` is read but deliberately not a dependency: this is a correction
    // applied when the frame moves, not a loop that runs on every zoom.
  }, [frame.width, frame.height, natural.width, natural.height, dpr]);

  /** Frame-centre-relative coordinates for a client point. */
  const toCentre = useCallback((clientX: number, clientY: number): Offset => {
    const el = frameRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) };
  }, []);

  const zoomTo = useCallback(
    (next: number, at: Offset) => {
      setScale((from) => {
        const to = clampScale(next, natural, frame, dpr);
        setOffset((o) => zoomAbout(at, from, to, o, natural, frame));
        return to;
      });
    },
    [natural.width, natural.height, frame, dpr],
  );

  /**
   * Wheel and trackpad.
   *
   * Registered by hand as a non-passive listener: React's onWheel is passive,
   * so it cannot call preventDefault, and without that the browser zooms the
   * whole page out from under the plate.
   */
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !zoomable) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const at = toCentre(e.clientX, e.clientY);
      setScale((from) => {
        const to = clampScale(
          from * Math.exp(-e.deltaY * WHEEL_SENSITIVITY),
          natural,
          frame,
          dpr,
        );
        setOffset((o) => zoomAbout(at, from, to, o, natural, frame));
        return to;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomable, toCentre, natural.width, natural.height, frame, dpr]);

  /* ---------------------------------------------------------------- *
   * Pointers: one drags, two pinch
   * ---------------------------------------------------------------- */

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number; at: Offset } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  const positions = () => [...pointers.current.values()];

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = positions() as [{ x: number; y: number }, { x: number; y: number }];
      gesture.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale,
        at: toCentre((a.x + b.x) / 2, (a.y + b.y) / 2),
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && gesture.current) {
      const [a, b] = positions() as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.dist > 0) {
        zoomTo((gesture.current.scale * dist) / gesture.current.dist, gesture.current.at);
      }
      return;
    }

    // One pointer pans, and only once there is somewhere to pan to. Below that
    // a drag is just a drag on a picture that already fits.
    if (scale > FIT) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setOffset((o) => clampPan({ x: o.x + dx, y: o.y + dy }, natural, frame, scale));
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  };

  /** Double tap / double click toggles between fitted and a readable step in. */
  const onPointerUp = (e: React.PointerEvent) => {
    endPointer(e);
    if (!zoomable) return;

    const now = Date.now();
    const prev = lastTap.current;
    const near =
      prev &&
      now - prev.t < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < DOUBLE_TAP_SLOP;

    if (near) {
      lastTap.current = null;
      const at = toCentre(e.clientX, e.clientY);
      if (moved) {
        setScale(FIT);
        setOffset({ x: 0, y: 0 });
      } else {
        zoomTo(DOUBLE_TAP_SCALE, at);
      }
      return;
    }
    lastTap.current = { t: now, x: e.clientX, y: e.clientY };
  };

  const reset = () => {
    setScale(FIT);
    setOffset({ x: 0, y: 0 });
  };

  const shown = fitted(natural, frame);
  const ceiling = frame.width > 0 ? maxScale(natural, frame, dpr) : FIT;

  return (
    <div className={variant === 'flat' ? 'pl pl--flat' : 'pl'}>
      <div
        ref={frameRef}
        className="pl-frame"
        data-moved={moved}
        data-zoomable={zoomable}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={endPointer}
      >
        {/*
          The room's own 512px texture underneath, already decoded, so the plate
          is never empty while the master is on its way. It is the same picture
          at less resolution, which is a far better first frame than a spinner.
        */}
        <img
          className="pl-img pl-img--placeholder"
          src={piece.src}
          alt=""
          aria-hidden="true"
          style={{
            width: shown.width,
            height: shown.height,
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          }}
        />
        <img
          ref={imgRef}
          className="pl-img"
          src={piece.master.src}
          alt={piece.label}
          width={natural.width}
          height={natural.height}
          data-loaded={loaded}
          draggable={false}
          onLoad={() => setLoaded(true)}
          style={{
            width: shown.width,
            height: shown.height,
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          }}
        />
      </div>

      <div className="pl-bar">
        <span className="pl-label">{piece.label}</span>

        {/*
          Said plainly, because the alternative is a visitor pinching at a
          picture that will not move and concluding the site is broken. Every
          piece on the wall has a real master today, but a supplied file can
          always be too small for one, and a viewer that pretends otherwise is
          inventing detail about somebody's work.
        */}
        <span className="pl-zoom" role="status">
          {zoomable ? zoomLabel(scale) : 'FULL SIZE'}
        </span>

        {moved ? (
          <button type="button" className="pl-btn" onClick={reset}>
            FIT
          </button>
        ) : (
          <button type="button" className="pl-btn" onClick={onClose}>
            CLOSE
          </button>
        )}

        {/*
          Below the picture, never over it. Printed across the work it is the
          same objection as the dither was: something of ours on top of
          something of theirs. It says how far there is to go, so the number is
          the work's own, and it goes away the moment it has been acted on.
        */}
        {zoomable && !moved && (
          <span className="pl-tip" aria-hidden="true">
            PINCH, SCROLL OR DOUBLE-TAP · UP TO {ceiling.toFixed(1)}×
          </span>
        )}
      </div>
    </div>
  );
}
