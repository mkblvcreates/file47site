'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  LinearFilter,
  MathUtils,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import { DITHER_HEIGHT, ditherTarget } from '@/lib/file47-room';

/**
 * FILE47 — the tube.
 *
 * The room is rendered into a small buffer, ordered-dithered, quantised to a
 * handful of levels per channel, and blown back up with no smoothing. That is
 * the whole trick, and it is the same one a sixth-generation console used for
 * the same reason: the buffer is small, so the dither does the shading the
 * colour depth cannot.
 *
 * Written by hand rather than composed from an effects library. The pass is
 * twenty lines of shader and the library's own version quirks are a worse
 * problem than the twenty lines.
 *
 * The treatment is not constant. It is the room's material, not the work's:
 * when a piece of work fills the frame the buffer more than doubles in height
 * and the quantisation eases almost all the way out, so a client's design is
 * seen as it was made rather than reduced to six levels per channel. The two
 * settings are one damped number, so the tube resolves rather than cuts. See
 * `ditherFor` in file47-room.ts.
 *
 * **This dithers the WebGL frame only.** The booking screen is real DOM on the
 * glass — a form, not a picture of one — and the browser composites it above
 * the canvas, out of this shader's reach. It gets a matched treatment in CSS
 * that stops short of costing legibility, because an illegible form takes no
 * bookings. See `.rm-glass` in file47-room.css.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Bayer 8×8 by recursion rather than a lookup array — a const array indexed
 * dynamically is the kind of thing a driver refuses on one platform in ten.
 */
const FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uRes;
  uniform float uLevels;
  uniform float uScanline;
  uniform float uAmount;
  varying vec2 vUv;

  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    vec2 px = vUv * uRes;

    // Spread the quantisation error across the threshold map, then quantise.
    // Doing it in this order is what makes a gradient read as a gradient
    // instead of as banding.
    float t = bayer8(px) - 0.5;
    vec3 q = c + t / uLevels;
    q = floor(q * uLevels + 0.5) / uLevels;

    // Mixed rather than branched. A branch here would pop between two looks on
    // the frame the view changes; a mix lets the pass be damped, which is what
    // a tube pulling focus actually looks like.
    c = mix(c, q, clamp(uAmount, 0.0, 1.0));

    // One dark line every other row of the small buffer, not of the screen —
    // so the scanline scales with the picture instead of moiréing against it.
    float line = mix(1.0, 1.0 - uScanline, step(0.5, fract(px.y * 0.5)));
    gl_FragColor = vec4(c * line, 1.0);
  }
`;

export function File47Dither({
  levels,
  scanline,
  amount,
  height = DITHER_HEIGHT,
}: {
  levels: number;
  /** Target strength of the scanline; damped, not applied on the frame. */
  scanline: number;
  /** Target strength of the dither, 0..1; damped the same way. */
  amount: number;
  /** Tallest buffer to render into. */
  height?: number;
}) {
  const { gl, scene, camera, size } = useThree();

  const { w, h } = ditherTarget(size.width, size.height, height);

  const target = useMemo(() => {
    const t = new WebGLRenderTarget(w, h, {
      format: RGBAFormat,
      // Nearest on both: the small buffer is the picture, and smoothing it on
      // the way back up is exactly the softness this is trying to avoid.
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    return t;
    // Created once and resized by the effect below. Rebuilding a render
    // target on every resize leaks GPU memory on a phone that is only
    // rotating.
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tDiffuse: { value: null },
          uRes: { value: new Vector2(w, h) },
          uLevels: { value: levels },
          uScanline: { value: scanline },
          uAmount: { value: amount },
        },
      }),
    // Created once; the uniforms are pushed by the effects below rather than
    // by rebuilding the program, which would recompile the shader.
    [],
  );

  const quad = useMemo(() => {
    const s = new Scene();
    s.add(new Mesh(new PlaneGeometry(2, 2), material));
    return s;
  }, [material]);

  const ortho = useMemo(() => new OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  useEffect(() => {
    target.setSize(w, h);
    material.uniforms['uRes']!.value.set(w, h);

    // Nearest keeps the room's pixels hard, which is the whole point of it.
    // On a focused piece the buffer is nearly the display's own size and the
    // upscale is a hair, so linear there costs no crispness and removes the
    // last of the stair-stepping from a client's artwork.
    const filter = h > DITHER_HEIGHT ? LinearFilter : NearestFilter;
    target.texture.minFilter = filter;
    target.texture.magFilter = filter;
    target.texture.needsUpdate = true;
  }, [target, material, w, h]);

  useEffect(() => {
    material.uniforms['uLevels']!.value = levels;
  }, [material, levels]);

  // Targets, not values. The frame loop walks the uniforms towards them so the
  // change between the room's treatment and a focused piece's reads as the
  // tube settling instead of as two different renderers swapping over.
  const want = useRef({ amount, scanline });
  want.current = { amount, scanline };

  useEffect(() => {
    return () => {
      target.dispose();
      material.dispose();
    };
  }, [target, material]);

  // Priority 1 takes the render loop off the default renderer, so this is the
  // only thing drawing. Anything that renders itself must run before us.
  useFrame((_, delta) => {
    const u = material.uniforms;
    u['uAmount']!.value = MathUtils.damp(
      u['uAmount']!.value as number,
      want.current.amount,
      6,
      Math.min(delta, 0.1),
    );
    u['uScanline']!.value = MathUtils.damp(
      u['uScanline']!.value as number,
      want.current.scanline,
      6,
      Math.min(delta, 0.1),
    );

    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    material.uniforms['tDiffuse']!.value = target.texture;
    gl.render(quad, ortho);
  }, 1);

  return null;
}
