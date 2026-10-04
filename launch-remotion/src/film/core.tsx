import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from "remotion";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";

// ── Brand (from CaptionsEasy globals.css + logo) ─────────────────────────────
export const C = {
  cream: "#FFFFEB",
  paper: "#FFFFF4",
  ink: "#1A1A1A",
  lav: "#F0D7FF",
  green: "#034F46",
  orange: "#FFA946",
  emerald: "#34D399",
  sand: "#E4E4D0",
  sand2: "#F4F4E0",
  muted: "#6E6E67",
} as const;

const jakarta = loadJakarta("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });
const serif = loadSerif("italic", { weights: ["400"], subsets: ["latin"] });
export const SANS = jakarta.fontFamily;
export const SERIF = serif.fontFamily;

// ── Beat grid: "Inspired" (Kevin MacLeod) measured at 120.19 BPM ────────────
// The music edit starts exactly on a downbeat, so beat n lands at n * SPB frames.
export const FPS = 60;
export const SPB = FPS * 0.49920889971704707; // 29.95 frames per beat
export const B = (n: number) => Math.round(n * SPB);
export const FILM_FRAMES = 2400;

// ── Easing: After Effects style speed ramps ─────────────────────────────────
type EaseFn = (t: number) => number;
export const E = {
  ramp: Easing.bezier(0.86, 0, 0.07, 1), // ~85% influence in-out: slow, whip, slow
  hard: Easing.bezier(0.95, 0, 0.05, 1), // extreme ramp for camera moves
  out: Easing.bezier(0.16, 1, 0.3, 1), // expo out: lands and glides
  outBack: Easing.bezier(0.34, 1.32, 0.64, 1), // tiny overshoot
  in: Easing.bezier(0.7, 0, 0.84, 0), // accelerate away
} satisfies Record<string, EaseFn>;

export const tw = (f: number, a: number, b: number, from: number, to: number, ease: EaseFn = E.ramp) =>
  interpolate(f, [a, b], [from, to], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Keyframe track: [[frame, value, easeIntoThisKey?], ...]
export type Key = [number, number, EaseFn?];
export const kf = (f: number, keys: Key[]) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i];
    const [b, vb, ease] = keys[i + 1];
    if (f <= b) return tw(f, a, b, va, vb, ease ?? E.ramp);
  }
  return keys[keys.length - 1][1];
};

export const SPRING = {
  pop: { damping: 13, stiffness: 190, mass: 0.9 }, // visible overshoot
  firm: { damping: 20, stiffness: 210, mass: 1 }, // tiny overshoot
  soft: { damping: 26, stiffness: 120, mass: 1 },
};
export const sp = (f: number, at: number, cfg = SPRING.firm) => spring({ frame: f - at, fps: FPS, config: cfg });

// Velocity of any f -> value function, in px per frame (for motion blur).
export const vel = (fn: (f: number) => number, f: number) => fn(f + 0.5) - fn(f - 0.5);
// 180° shutter: blur length is half the per-frame travel.
export const shutter = (v: number, cap = 40) => Math.min(cap, Math.abs(v) * 0.28);

// Deterministic PRNG
export const rand = (seed: number) => {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── Directional motion blur (SVG gaussian, separate x/y) ────────────────────
export const MBlur: React.FC<{ id: string; x?: number; y?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  id,
  x = 0,
  y = 0,
  style,
  children,
}) => {
  const on = x > 0.3 || y > 0.3;
  return (
    <div style={{ position: "absolute", inset: 0, filter: on ? `url(#${id})` : undefined, ...style }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id={id} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${x.toFixed(2)} ${y.toFixed(2)}`} />
          </filter>
        </defs>
      </svg>
      {children}
    </div>
  );
};

// ── Masked line rise: text climbs out of an invisible slot ───────────────────
export const Rise: React.FC<{
  f: number;
  at: number;
  dur?: number;
  outAt?: number;
  outDur?: number;
  dir?: 1 | -1;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ f, at, dur = 22, outAt, outDur = 12, dir = 1, style, children }) => {
  const inY = tw(f, at, at + dur, 112 * dir, 0, E.out);
  const outY = outAt === undefined ? 0 : tw(f, outAt, outAt + outDur, 0, -112 * dir, E.in);
  const rot = tw(f, at, at + dur, 4 * dir, 0, E.out);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.14em", marginBottom: "-0.14em", ...style }}>
      <span style={{ display: "inline-block", transform: `translateY(${inY + outY}%) rotate(${rot}deg)`, transformOrigin: "0% 100%" }}>
        {children}
      </span>
    </span>
  );
};

// Word-by-word Rise. `serifFrom`: words at or after this index use the italic serif accent.
export const Words: React.FC<{
  f: number;
  at: number;
  text: string;
  stagger?: number;
  outAt?: number;
  gap?: number;
  serifFrom?: number;
  serifIdx?: number[];
  serifColor?: string;
  serifScale?: number;
  style?: React.CSSProperties;
}> = ({ f, at, text, stagger = 4, outAt, gap = 0.26, serifFrom, serifIdx, serifColor, serifScale = 1.12, style }) => {
  const words = text.split(" ");
  const size = typeof style?.fontSize === "number" ? style.fontSize : 64;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: size * gap, alignItems: "baseline", ...style }}>
      {words.map((w, i) => {
        const isSerif = (serifFrom !== undefined && i >= serifFrom) || (serifIdx?.includes(i) ?? false);
        return (
          <Rise key={i} f={f} at={at + i * stagger} outAt={outAt === undefined ? undefined : outAt + i}>
            <span
              style={
                isSerif
                  ? { fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: size * serifScale, letterSpacing: "-0.01em", color: serifColor ?? style?.color }
                  : undefined
              }
            >
              {w}
            </span>
          </Rise>
        );
      })}
    </div>
  );
};

// ── Atmosphere: the website's soft lavender/peach light, film grain ─────────
export const SiteLight: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const f = useCurrentFrame();
  const d1 = Math.sin(f / 70) * 40;
  const d2 = Math.cos(f / 90) * 50;
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute", width: 1100, height: 1100, left: -520 + d1, top: -180, borderRadius: "50%",
          background: `radial-gradient(circle, ${C.lav} 0%, rgba(240,215,255,0) 66%)`, opacity: 0.85,
        }}
      />
      <div
        style={{
          position: "absolute", width: 1000, height: 1000, right: -560 - d2, top: 60, borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255,169,70,0.42) 0%, rgba(255,169,70,0) 64%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.045 }) => {
  const f = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)'/%3E%3C/svg%3E")`;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none", backgroundImage: noise, backgroundSize: "256px",
        backgroundPosition: `${Math.floor(rand(f) * 256)}px ${Math.floor(rand(f + 999) * 256)}px`,
        opacity, mixBlendMode: "multiply",
      }}
    />
  );
};

// Real CaptionsEasy logo geometry (sources/brand/captionseasy-logo.svg), in SVG units.
export const LOGO = {
  vbW: 735.4,
  vbH: 125.8,
  baseX: 6,
  baseY: 95.33,
  barW: 15.63,
  bars: [
    { x: 0, h: 53.6 },
    { x: 25.68, h: 89.33 },
    { x: 51.36, h: 71.46 },
  ],
};
