// Timing, easing, springs and seeded randomness. Everything here is a pure function of its inputs,
// so the same time + props always produce the same frame.

export type Ease = (t: number) => number;

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => (a === b ? 0 : clamp((v - a) / (b - a)));
export const remap = (v: number, a: number, b: number, c: number, d: number) => lerp(c, d, invLerp(a, b, v));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};
export const fract = (v: number) => v - Math.floor(v);
export const deg = (r: number) => (r * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;
export const TAU = Math.PI * 2;

// ── Cubic bezier (CSS timing function), solved with Newton + bisection ──────
export function bezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return t;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    while (lo < hi) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) return t;
      if (x > v) lo = t; else hi = t;
      t = (lo + hi) / 2;
      if (hi - lo < 1e-7) break;
    }
    return t;
  };
  return (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)));
}

// After Effects style curves. `ramp`/`hard` are speed ramps: slow, whip, slow.
export const E = {
  linear: ((t: number) => t) as Ease,
  out: bezier(0.16, 1, 0.3, 1), // expo out: lands and glides
  outSoft: bezier(0.22, 1, 0.36, 1),
  in: bezier(0.7, 0, 0.84, 0), // accelerate away
  inOut: bezier(0.65, 0, 0.35, 1),
  ramp: bezier(0.86, 0, 0.07, 1), // ~85% influence in/out
  hard: bezier(0.95, 0, 0.05, 1), // extreme ramp for camera moves
  cine: bezier(0.45, 0, 0.1, 1), // slow start, very long glide
  outBack: bezier(0.34, 1.32, 0.64, 1), // tiny overshoot
  outBackBig: bezier(0.3, 1.6, 0.5, 1),
  snap: bezier(0.2, 0.9, 0.1, 1),
  sine: ((t: number) => 0.5 - Math.cos(Math.PI * t) / 2) as Ease,
} satisfies Record<string, Ease>;
export type EaseName = keyof typeof E;

/** Tween: value at time t moving from `from` to `to` between times a and b. Clamped both sides. */
export const tw = (t: number, a: number, b: number, from: number, to: number, ease: Ease = E.ramp) => {
  if (t <= a) return from;
  if (t >= b) return to;
  return from + (to - from) * ease((t - a) / (b - a));
};

/** Inverse of an easing curve: the x at which ease(x) = y (bisection). */
export function invEase(ease: Ease, y: number) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (ease(m) < y) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/** Progress 0→1 between a and b with easing. */
export const pr = (t: number, a: number, b: number, ease: Ease = E.linear) => (t <= a ? 0 : t >= b ? 1 : ease((t - a) / (b - a)));

/** Keyframe track: [[time, value, easeIntoThisKey?], ...] */
export type Key = [number, number, Ease?];
export const kf = (t: number, keys: Key[]) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i];
    const [b, vb, ease] = keys[i + 1];
    if (t <= b) return tw(t, a, b, va, vb, ease ?? E.ramp);
  }
  return keys[keys.length - 1][1];
};

// ── Springs: closed-form damped oscillator, 0 → 1, time in seconds ─────────
export interface SpringCfg {
  stiffness: number;
  damping: number;
  mass: number;
}
export const SPRING = {
  pop: { damping: 13, stiffness: 190, mass: 0.9 }, // visible overshoot
  firm: { damping: 20, stiffness: 210, mass: 1 }, // tiny overshoot
  soft: { damping: 26, stiffness: 120, mass: 1 }, // no overshoot, slow settle
  punchy: { damping: 11, stiffness: 320, mass: 0.8 }, // fast, bouncy
  heavy: { damping: 30, stiffness: 160, mass: 1.6 }, // weighty
} satisfies Record<string, SpringCfg>;
export type SpringName = keyof typeof SPRING;

export function spring(t: number, cfg: SpringCfg = SPRING.firm): number {
  if (t <= 0) return 0;
  const { stiffness: k, damping: c, mass: m } = cfg;
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const s = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - s), r2 = -w0 * (zeta + s);
  return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
}
/** Spring that starts at time `at`. */
export const sp = (t: number, at: number, cfg: SpringCfg = SPRING.firm) => spring(t - at, cfg);

/** Velocity of any time → value function (units per second), for motion-driven effects. */
export const velocity = (fn: (t: number) => number, t: number, dt = 1 / 240) => (fn(t + dt) - fn(t - dt)) / (2 * dt);

/** Staggered start time for item i of n, spreading over `span` seconds with optional easing of the spread. */
export const stagger = (i: number, n: number, span: number, ease: Ease = E.linear) => (n <= 1 ? 0 : ease(i / (n - 1)) * span);

// ── Seeded randomness ──────────────────────────────────────────────────────
export function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
/** Stateless: same seed → same number in [0, 1). */
export function rand(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const randRange = (seed: number, a: number, b: number) => a + (b - a) * rand(seed);
/** Sequential generator (mulberry32). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = rand(i * 374761393 + seed * 668265263) * 2 - 1;
  const b = rand((i + 1) * 374761393 + seed * 668265263) * 2 - 1;
  return a + (b - a) * u;
}
/** Fractal noise for organic drift ("breathing"). */
export function fbm1(x: number, seed = 0, octaves = 3): number {
  let v = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    v += noise1(x * freq, seed + o * 17) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return v / norm;
}

/** Idle breathing: a small, slow, organic offset for anything that holds on screen. */
export const breathe = (t: number, seed = 0, amp = 1, speed = 0.35) => fbm1(t * speed, seed) * amp;

// ── Beat grid ─────────────────────────────────────────────────────────────
export const beatLen = (bpm: number) => 60 / bpm;
export const beatAt = (n: number, bpm: number, offset = 0) => offset + n * beatLen(bpm);
