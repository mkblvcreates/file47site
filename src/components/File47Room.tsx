'use client';

import { Html, useGLTF, useProgress, useTexture } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  type Mesh,
  MathUtils,
  type PerspectiveCamera,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { File47Dither } from '@/components/File47Dither';
import { File47Screen } from '@/components/File47Screen';
import type { ScreenId } from '@/lib/file47';
import {
  CLIP,
  DITHER_LEVELS,
  GLASS_SCALE,
  PIECES,
  type Piece,
  ROOM_URL,
  SCREEN,
  SHOTS,
  type Shot,
  type View,
  ditherFor,
  shotFor,
} from '@/lib/file47-room';

/**
 * FILE47 — the room.
 *
 * A surveillance suite: a curved bank of CRTs, racks, a chair, cable runs.
 * The scene is unlit with baked textures, so this file adds no lights — the
 * bake is the lighting and anything added only washes it out.
 *
 * FILE47 has its own screen at the focal point the monitor arc curves around.
 * Click it and the camera moves in until it fills the frame; click back and
 * you are at the operator's seat. Two positions, nothing else.
 */

/* ------------------------------------------------------------------ *
 * Camera
 * ------------------------------------------------------------------ */

function Rig({
  shot,
  sway,
  onArrive,
}: {
  shot: Shot;
  sway: number;
  onArrive: () => void;
}) {
  const { camera, pointer } = useThree();
  const look = useRef(new Vector3(...shot.target));
  const arrived = useRef(false);
  const want = useRef(new Vector3());

  useEffect(() => {
    arrived.current = false;
  }, [shot]);

  useFrame((_, delta) => {
    const cam = camera as PerspectiveCamera;

    // A hand's width of parallax in the room, none once a screen fills the
    // frame: something you are reading should not drift under the pointer.
    want.current.set(
      shot.position[0] + pointer.x * sway,
      shot.position[1] + pointer.y * sway * 0.5,
      shot.position[2],
    );

    const k = 1 - Math.pow(0.0018, Math.min(delta, 0.1));
    cam.position.lerp(want.current, k);
    look.current.lerp(new Vector3(...shot.target), k);
    cam.lookAt(look.current);

    const nextFov = MathUtils.damp(cam.fov, shot.fov, 5, delta);
    if (Math.abs(nextFov - cam.fov) > 0.01) {
      cam.fov = nextFov;
      cam.updateProjectionMatrix();
    }

    if (!arrived.current && cam.position.distanceTo(want.current) < 0.06) {
      arrived.current = true;
      onArrive();
    }
  });

  return null;
}

/* ------------------------------------------------------------------ *
 * The room
 * ------------------------------------------------------------------ */

function Room() {
  // Draco off — this asset is meshopt, and asking for Draco makes the loader
  // hold a decoder it will never use. Meshopt ships inside three.
  const { scene } = useGLTF(ROOM_URL, false);
  return <primitive object={scene} />;
}

useGLTF.preload(ROOM_URL, false);
useTexture.preload(PIECES.map((p) => p.src));

/**
 * A piece of work, on a screen in the bank.
 *
 * Unlit and unfiltered on purpose. The dither pass downstream is doing the
 * shading, and any smoothing here would be softness the pass then has to
 * quantise back out.
 */
function Work({
  piece,
  selected,
  onSelect,
}: {
  piece: Piece;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const tex = useTexture(piece.src);
  const face = useRef<Mesh>(null);
  const [hot, setHot] = useState(false);
  const { gl } = useThree();

  useEffect(() => {
    tex.colorSpace = SRGBColorSpace;
    tex.generateMipmaps = true;
    // Every piece hangs at an angle into the arc, so its texture is always
    // being sampled obliquely. At 1 that turns a client's artwork to mush
    // along the far edge; 4 is where the return stops and is free on anything
    // made this decade.
    tex.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    tex.needsUpdate = true;
  }, [tex, gl]);

  const lit = hot || selected;

  return (
    <group position={[...piece.position]} rotation={[0, piece.rotationY, 0]}>
      {/* A hairline, not a border. At the docked framing the panel fills the
          height, so anything thicker than this reads as a yellow band across
          the top of the work rather than as a frame around it.

          At rest it is dim but not black. Black is what it used to be, and it
          worked only for as long as every piece on the wall had a light
          ground: Lou's is drawn on its own black, so panel and artwork and
          room wall were all the same colour and the piece stopped reading as
          something hung on a wall at all. A hairline a few values up gives
          dark work an edge to sit against and is still far too dim to glow. */}
      <mesh position={[0, 0, -0.022]}>
        <boxGeometry args={[piece.width + 0.03, piece.height + 0.03, 0.04]} />
        <meshBasicMaterial color={lit ? '#f2f04a' : '#4a463a'} />
      </mesh>
      <mesh
        ref={face}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(piece.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHot(true);
        }}
        onPointerOut={() => setHot(false)}
      >
        <planeGeometry args={[piece.width, piece.height]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

function WorkWall({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {PIECES.map((p) => (
        <Work key={p.id} piece={p} selected={p.id === selected} onSelect={onSelect} />
      ))}
    </>
  );
}

/**
 * FILE47's own screen, standing among the monitors.
 *
 * The site is mounted on it as real DOM in CSS3D — sharp type, and a booking
 * form that is a form rather than a picture of one. It is mounted only once
 * the camera has arrived: a full DOM screen rendered at a distance no one can
 * read is wasted.
 */
function Panel({
  docked,
  glass,
  screen,
  bookFor,
  onScreen,
  onBook,
  onPiece,
  onDock,
}: {
  docked: boolean;
  /** False on a frame too narrow to read 720x540 type. See `glassFitsViewport`. */
  glass: boolean;
  screen: ScreenId;
  bookFor: number | null;
  onScreen: (id: ScreenId) => void;
  onBook: (n: number) => void;
  /** Tapping work on the glass flies the camera rather than opening a plate
      inside a CSS3D-transformed element, where fixed positioning is relative
      to the transform and nothing lands where it should. */
  onPiece: (id: string) => void;
  onDock: () => void;
}) {
  const [hot, setHot] = useState(false);

  return (
    <group position={[...SCREEN.centre]} rotation={[0, SCREEN.rotationY, 0]}>
      {/* The casing, a shade under the glass so the two never z-fight. */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[SCREEN.width + 0.14, SCREEN.height + 0.14, 0.06]} />
        <meshBasicMaterial color="#171308" />
      </mesh>

      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onDock();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHot(true);
        }}
        onPointerOut={() => setHot(false)}
      >
        <planeGeometry args={[SCREEN.width, SCREEN.height]} />
        {/* Matched to the baked CRT faces, so it reads as one of the bank. */}
        <meshBasicMaterial color={docked ? '#0a0d10' : hot ? '#ffffff' : '#fbf6c6'} />
      </mesh>

      {docked && glass && (
        <Html
          transform
          position={[0, 0, 0.006]}
          scale={GLASS_SCALE}
          zIndexRange={[30, 0]}
        >
          <div className="rm-glass">
            <File47Screen
              screen={screen}
              onScreen={onScreen}
              bookFor={bookFor}
              onBook={onBook}
              onPiece={onPiece}
            />
          </div>
        </Html>
      )}

      {/* At rest the screen is not blank — a blank monitor in a room full of
          blank monitors is furniture, and this one is the way in. The label is
          on the glass rather than floating below it: hung underneath, it
          landed exactly where the bottom row of work hangs and read as a
          caption for someone else's packaging. */}
      {(!docked || !glass) && (
        <Html
          transform
          position={[0, 0, 0.006]}
          scale={GLASS_SCALE}
          zIndexRange={[20, 0]}
        >
          <button
            type="button"
            className="rm-idle"
            onClick={onDock}
            aria-label="Open FILE47 — design and brand services"
          >
            <span className="rm-idle-mark">FILE47</span>
            <span className="rm-idle-line">DESIGN + BRAND SERVICES</span>
            <span className="rm-idle-open">OPEN</span>
          </button>
        </Html>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Loading
 * ------------------------------------------------------------------ */

/**
 * Names the stage and the number, because "frozen at 1%" is a bug report and a
 * spinning circle is not.
 *
 * Written straight to the node rather than through state. drei's progress
 * store updates while a sibling is still suspending, and reading it during
 * render makes React rightly complain that one component is updating another
 * mid-render. A ref and a frame tick say the same thing and say it honestly.
 */
function Loading() {
  const el = useRef<HTMLParagraphElement>(null);

  useFrame(() => {
    const n = Math.round(useProgress.getState().progress);
    const node = el.current;
    if (node) node.textContent = `LOADING THE ROOM — ${n}%`;
  });

  return (
    <Html center>
      <p ref={el} className="rm-loading" role="status">
        LOADING THE ROOM — 0%
      </p>
    </Html>
  );
}

/* ------------------------------------------------------------------ *
 * Scene
 * ------------------------------------------------------------------ */

function Scene({
  view,
  glass,
  screen,
  bookFor,
  still,
  onScreen,
  onBook,
  onPiece,
  onDock,
}: {
  view: View;
  glass: boolean;
  screen: ScreenId;
  bookFor: number | null;
  still: boolean;
  onScreen: (id: ScreenId) => void;
  onBook: (n: number) => void;
  onPiece: (id: string) => void;
  onDock: () => void;
}) {
  const [arrived, setArrived] = useState(false);
  const { size } = useThree();

  // Memoised, and not merely tidiness: a fresh Shot object every render
  // re-fires the rig's effect, which resets arrival every frame, which means
  // the booking screen never mounts and the render loop never settles.
  const shot = useMemo(
    () => shotFor(view, size.width / Math.max(1, size.height)),
    [view, size.width, size.height],
  );

  useEffect(() => {
    setArrived(false);
  }, [view]);

  return (
    <>
      <color attach="background" args={['#07060a']} />

      <Rig
        shot={shot}
        sway={view.kind === 'room' && !still ? 0.16 : 0}
        onArrive={() => setArrived(true)}
      />

      <Suspense fallback={<Loading />}>
        <Room />
        <WorkWall selected={view.kind === 'piece' ? view.id : null} onSelect={onPiece} />
      </Suspense>

      <Panel
        docked={view.kind === 'screen' && arrived}
        glass={glass}
        screen={screen}
        bookFor={bookFor}
        onScreen={onScreen}
        onBook={onBook}
        onPiece={onPiece}
        onDock={onDock}
      />

      {/* Last, and at a higher frame priority: it takes over the render loop,
          so everything above must already have drawn itself into the scene. */}
      <File47Dither levels={DITHER_LEVELS} {...ditherFor(view)} />
    </>
  );
}

export function File47Room(props: {
  view: View;
  glass: boolean;
  screen: ScreenId;
  bookFor: number | null;
  still: boolean;
  onScreen: (id: ScreenId) => void;
  onBook: (n: number) => void;
  onPiece: (id: string) => void;
  onDock: () => void;
}) {
  return (
    <Canvas
      // The picture's resolution is the dither buffer, not the display. Asking
      // a 3x phone for 3x here would render nine times the pixels and then
      // throw them away in the downsample.
      dpr={1}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{
        position: [...SHOTS.room.position],
        fov: SHOTS.room.fov,
        near: CLIP.near,
        far: CLIP.far,
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
