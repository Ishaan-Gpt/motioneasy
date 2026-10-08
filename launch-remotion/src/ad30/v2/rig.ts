import * as THREE from "three";
import { T } from "./config";
import { E, clamp01, pr, tw } from "../lib";
import { lineWidth } from "./glyphs";
import type { PostParams } from "./post";

// ── World layout (one continuous take; distant "rooms" are reached through dives and a whip) ──────────────
type V3 = [number, number, number];
export const A = {
  hookZ: -1.45,
  hookSize: 0.72,
  bar: { x: 0, y: 0.13, z: 0.45, w: 4.8, h: 0.26, d: 0.72 },
  typeX: -1.92,
  typeSize: 0.36,
  // hanging result cards (centre when settled). The first three are the pain cards (rack-focused in turn).
  cards: [
    [-1.6, 1.85, -5.0], [0.25, 1.55, -5.75], [1.95, 1.95, -6.45],
    [-3.3, 2.5, -8.0], [-0.9, 2.8, -9.0], [1.4, 2.95, -8.7], [3.5, 2.25, -7.9],
  ] as V3[],
  turn: { y: 1.62, z: -4.35, size: 0.82 },
  logoZ: -4.4,
  lockShift: -0.95,
};
export const turnDot = () => {
  const w = lineWidth("No more", A.turn.size);
  return { x: w / 2 + 0.2, y: A.turn.y + 0.09, z: A.turn.z, r: 0.12 };
};
export const TOGGLE = { x: 1.72, y: 0.44, z: -4.4, w: 0.92, h: 0.44 };
export const knobX = (on: number) => TOGGLE.x - TOGGLE.w / 2 + TOGGLE.h / 2 + (TOGGLE.w - TOGGLE.h) * on;

export const PROOF = { x: 40, phone: [41.0, 1.45, -3.6] as V3, chipX: 42.08, chipYs: [2.1, 1.47, 0.84], exportY: 0.2, copyX: 38.08 };
export const HING = { x: 80, wallZ: -2, rows: 9, cols: 13, dx: 1.42, dy: 0.44, y0: 0.2 };
export const END = { x: 120, z: -4.6 };

// ── Camera path ──────────────────────────────────────────────────────────────
type Ease = (t: number) => number;
type Key = { t: number; pos: V3; tgt: V3; up?: V3; fov?: number; ease?: Ease; cut?: boolean };
const UP: V3 = [0, 1, 0];
const keys = (): Key[] => {
  const dot = turnDot();
  const kx = knobX(1);
  const P = PROOF.phone;
  const hingStart: V3 = [HING.x - 3 * HING.dx, HING.y0 + 4 * HING.dy, HING.wallZ];
  return [
    { t: 0, pos: [0, 7.1, -0.62], tgt: [0, 0, -0.66], up: [0, 0, -1], fov: 34 },
    { t: T.swoop[0], pos: [0, 6.2, -0.6], tgt: [0, 0, -0.64], up: [0, 0, -1], fov: 34, ease: E.out },
    { t: T.swoop[1], pos: [-2.6, 0.95, 3.05], tgt: [-0.9, 0.36, 0.42], up: UP, fov: 38, ease: E.hard },
    { t: T.type[1], pos: [1.6, 1.0, 3.1], tgt: [1.0, 0.36, 0.42], fov: 38, ease: (x) => x },
    { t: T.enter + 0.05, pos: [1.45, 0.92, 2.8], tgt: [0.9, 0.3, 0.42], ease: E.out },
    { t: T.crane[1], pos: [0, 1.75, -1.6], tgt: [0, 1.75, -7], fov: 38, ease: E.hard },
    { t: 4.0, pos: [-0.2, 1.74, -2.0], tgt: [-0.4, 1.75, -7], ease: E.out },
    { t: T.pains[0], pos: [-0.85, 1.82, -2.45], tgt: A.cards[0], ease: E.inOut },
    { t: T.pains[1], pos: [-0.15, 1.66, -2.85], tgt: A.cards[1], ease: E.inOut },
    { t: T.pains[2], pos: [0.85, 1.86, -3.2], tgt: A.cards[2], ease: E.inOut },
    { t: 6.5, pos: [0.6, 1.8, -2.6], tgt: [0.4, 1.8, -5.6], ease: E.inOut },
    { t: T.drop + 0.04, pos: [0.1, 1.72, -0.55], tgt: [0.1, 1.66, -4.35], fov: 37, ease: E.out },
    { t: T.marbleFall[0], pos: [0.3, 1.76, -0.7], tgt: [0.3, 1.62, -4.35], ease: E.inOut },
    { t: T.marbleFall[1], pos: [dot.x * 0.75, 1.0, -1.75], tgt: [dot.x, 0.1, -4.4], ease: E.inOut },
    { t: 8.6, pos: [-0.5, 0.78, -0.95], tgt: [0.05, 0.45, -4.4], fov: 36, ease: E.inOut },
    { t: 9.2, pos: [0.25, 0.85, -0.7], tgt: [0.1, 0.48, -4.4], ease: E.inOut },
    { t: 10.0, pos: [0.25, 1.55, 0.9], tgt: [0.2, 1.15, -4.9], fov: 42, ease: E.inOut },
    { t: T.knobDive[0], pos: [0.55, 1.45, 0.5], tgt: [0.55, 1.05, -4.9], ease: E.inOut },
    { t: T.knobDive[1] - 0.01, pos: [kx, 0.46, -3.86], tgt: [kx, 0.44, -4.4], fov: 30, ease: E.in },
    // proof room
    { t: T.proof[0], pos: [P[0] - 1.7, 0.35, 0.9], tgt: [P[0] - 0.6, 1.0, P[2]], fov: 40, cut: true },
    { t: 12.9, pos: [P[0] - 1.3, 1.5, 0.6], tgt: [P[0] - 0.85, 1.45, P[2]], fov: 40, ease: E.out },
    { t: 20.5, pos: [P[0] - 0.95, 1.55, 0.42], tgt: [P[0] - 0.8, 1.45, P[2]], ease: E.inOut },
    { t: T.screenDive[1] - 0.01, pos: [P[0], 1.45, P[2] + 0.62], tgt: [P[0], 1.45, P[2]], fov: 32, ease: E.in },
    // hinglish room: start nose-to-nose with the first pill, pull out to the whole wall
    { t: T.hinglish[0], pos: [hingStart[0], hingStart[1], hingStart[2] + 1.35], tgt: hingStart, fov: 26, cut: true },
    { t: 22.45, pos: [HING.x, 1.95, 7.6], tgt: [HING.x, 1.85, HING.wallZ], fov: 42, ease: E.inOut },
    { t: T.whip[0], pos: [HING.x + 0.25, 1.88, 7.0], tgt: [HING.x, 1.85, HING.wallZ], ease: E.inOut },
    { t: 23.44, pos: [HING.x + 0.25, 1.88, 7.0], tgt: [HING.x + 7, 1.85, 3.5], ease: E.in },
    // close + end room (whip lands here)
    { t: 23.45, pos: [END.x, 1.85, 0.2], tgt: [END.x - 7, 1.85, -2.0], fov: 40, cut: true },
    { t: T.whip[1] + 0.08, pos: [END.x, 1.85, 0.15], tgt: [END.x, 1.9, END.z], ease: E.out },
    { t: T.end, pos: [END.x, 1.82, -0.25], tgt: [END.x, 1.88, END.z], ease: E.inOut },
    { t: 26.4, pos: [END.x, 1.55, 0.05], tgt: [END.x, 1.4, END.z], fov: 40, ease: E.out },
    { t: 30, pos: [END.x, 1.5, -0.5], tgt: [END.x, 1.36, END.z], ease: E.inOut },
  ];
};

let KEYS: Key[] | null = null;
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export type CamState = { pos: V3; tgt: V3; up: V3; fov: number };
export const camAt = (t: number): CamState => {
  KEYS = KEYS ?? keys();
  const K = KEYS;
  let i = 0;
  while (i < K.length - 2 && t >= K[i + 1].t) i++;
  const a = K[i];
  const b2 = K[i + 1];
  const fovA = a.fov ?? findFov(K, i);
  const fovB = b2.fov ?? fovA;
  const upA = a.up ?? findUp(K, i);
  const upB = b2.up ?? upA;
  if (b2.cut) return { pos: a.pos, tgt: a.tgt, up: upA, fov: fovA };
  if (t >= b2.t) return { pos: b2.pos, tgt: b2.tgt, up: upB, fov: fovB };
  const k = (b2.ease ?? E.inOut)(clamp01((t - a.t) / (b2.t - a.t)));
  return { pos: lerp3(a.pos, b2.pos, k), tgt: lerp3(a.tgt, b2.tgt, k), up: lerp3(upA, upB, k), fov: fovA + (fovB - fovA) * k };
};
const findFov = (K: Key[], i: number) => {
  for (let j = i; j >= 0; j--) if (K[j].fov !== undefined) return K[j].fov!;
  return 38;
};
const findUp = (K: Key[], i: number): V3 => {
  for (let j = i; j >= 0; j--) if (K[j].up) return K[j].up!;
  return UP;
};

export const applyCam = (cam: THREE.PerspectiveCamera, c: CamState) => {
  cam.position.set(...c.pos);
  cam.up.set(...c.up).normalize();
  cam.lookAt(...c.tgt);
  if (cam.fov !== c.fov) {
    cam.fov = c.fov;
    cam.updateProjectionMatrix();
  }
  cam.updateMatrixWorld();
};

const isCut = (t0: number, t1: number) => (KEYS ?? keys()).some((k) => k.cut && k.t > t0 && k.t <= t1);
const tmpCam = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 200);
const v = new THREE.Vector3();

/** Post settings at time t: focus on the rig target, DOF per moment, camera motion blur from the rig itself. */
export const postAt = (t: number): PostParams => {
  const c = camAt(t);
  const dist = Math.hypot(c.tgt[0] - c.pos[0], c.tgt[1] - c.pos[1], c.tgt[2] - c.pos[2]);
  // motion blur: where does the focus point of this frame sit in the previous frame's view?
  let blurDir: [number, number] = [0, 0];
  let zoomBlur = 0;
  const dt = 1 / 60;
  if (!isCut(t - dt, t)) {
    const prev = camAt(t - dt);
    applyCam(tmpCam, prev);
    v.set(...c.tgt).project(tmpCam);
    const sh = 0.5; // 180° shutter
    blurDir = [(-v.x * 0.5) * sh, (-v.y * 0.5) * sh];
    const prevDist = Math.hypot(prev.tgt[0] - prev.pos[0], prev.tgt[1] - prev.pos[1], prev.tgt[2] - prev.pos[2]);
    zoomBlur = Math.abs(Math.log((prevDist * Math.tan((prev.fov * Math.PI) / 360)) / (dist * Math.tan((c.fov * Math.PI) / 360)))) * sh * 1.6;
    const len = Math.hypot(...blurDir);
    if (len > 0.05) blurDir = [(blurDir[0] / len) * 0.05, (blurDir[1] / len) * 0.05];
    zoomBlur = Math.min(zoomBlur, 0.12);
  }
  let aperture = 0.16;
  if (t < T.swoop[0]) aperture = 0.03;
  else if (t < T.crane[1]) aperture = 0.1;
  else if (t < T.drop) aperture = 0.42; // rack focus through the hanging cards
  else if (t < T.proof[0]) aperture = 0.16;
  else if (t < T.hinglish[0]) aperture = 0.22;
  else if (t < T.whip[0]) aperture = tw(t, T.hinglish[0], 22.3, 0.5, 0.2);
  else if (t >= T.whip[1] && t < T.end) aperture = 0.3; // side cards sit deeper and soften
  else aperture = 0.18;
  const flash = Math.max(
    tw(t, T.knobDive[1] - 0.12, T.knobDive[1], 0, 1, E.in) * (t < T.proof[0] ? 1 : 0),
    t >= T.proof[0] ? 1 - pr(t * 60, T.proof[0] * 60, (T.proof[0] + 0.3) * 60, E.out) : 0,
    t >= T.drop && t < T.drop + 0.2 ? 0.22 * (1 - pr(t * 60, T.drop * 60, (T.drop + 0.2) * 60)) : 0,
    t >= T.hinglish[0] - 0.08 && t < T.hinglish[0] + 0.25 ? 0.5 * (1 - Math.abs(t - T.hinglish[0]) / 0.25) : 0,
  );
  const night = t >= T.hinglish[0] && t < T.whip[1];
  return {
    focus: dist,
    aperture,
    bloom: night ? 0.85 : t >= T.flip && t < T.proof[0] ? 0.85 : 0.6,
    threshold: night ? 0.85 : 1.02, // light scenes: only HDR emissive light blooms
    blurDir,
    zoomBlur,
    vignette: night ? 0.45 : 0.22,
    grain: 0.035,
    flash: clamp01(flash),
    exposure: 1,
  };
};
