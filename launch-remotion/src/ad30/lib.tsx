import React from "react";
import { AbsoluteFill, Easing, interpolate, spring } from "remotion";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { measureText } from "@remotion/layout-utils";
import { FPS, PAL } from "./config";

export const SANS = loadJakarta("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] }).fontFamily;
export const SERIF = loadSerif("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const DISPLAY = loadAnton("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

// ── Easing: AE-style speed ramps ────────────────────────────────────────────
type Ease = (t: number) => number;
export const E = {
  ramp: Easing.bezier(0.86, 0, 0.07, 1), // slow · whip · slow
  hard: Easing.bezier(0.95, 0, 0.05, 1), // camera ramps
  out: Easing.bezier(0.16, 1, 0.3, 1), // land and glide
  outBack: Easing.bezier(0.34, 1.45, 0.64, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0), // accelerate into a cut
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
} satisfies Record<string, Ease>;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const tw = (f: number, a: number, b: number, from: number, to: number, ease: Ease = E.ramp) =>
  interpolate(f, [a, b], [from, to], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
export const pr = (f: number, a: number, b: number, ease: Ease = E.out) => tw(f, a, b, 0, 1, ease);

/** Keyframes [frame, value, easeIntoThisKey?]. */
export type Key = [number, number, Ease?];
export const kf = (f: number, keys: Key[]) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i];
    const [b2, vb, ease] = keys[i + 1];
    if (f <= b2) return tw(f, a, b2, va, vb, ease ?? E.ramp);
  }
  return keys[keys.length - 1][1];
};
/** Scale keyframes interpolated in log space (big zooms feel even). */
export const kfLog = (f: number, keys: Key[]) => Math.exp(kf(f, keys.map(([a, v, e]) => [a, Math.log(v), e] as Key)));

// Springs: ELASTIC is the signature (visible overshoot + a second wobble).
export const SPR = {
  elastic: { damping: 9, stiffness: 170, mass: 0.75 },
  pop: { damping: 12, stiffness: 210, mass: 0.8 },
  firm: { damping: 20, stiffness: 220, mass: 1 },
  soft: { damping: 26, stiffness: 110, mass: 1 },
};
export const sp = (f: number, at: number, cfg = SPR.elastic) => (f < at ? 0 : spring({ frame: f - at, fps: FPS, config: cfg }));

export const rand = (seed: number) => {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const jit = (i: number, amp: number, seed = 0) => (rand(i * 97 + seed) - 0.5) * 2 * amp;

export const vel = (fn: (f: number) => number, f: number) => fn(f + 0.5) - fn(f - 0.5);
export const shutter = (v: number, cap = 36) => Math.min(cap, Math.abs(v) * 0.32);

export const textW = (text: string, fontFamily: string, fontSize: number, fontWeight: number | string = 700, letterSpacing?: string) =>
  measureText({ text, fontFamily, fontSize, fontWeight: String(fontWeight), letterSpacing }).width;

// ── Directional motion blur (SVG gaussian, separate x / y) ──────────────────
export const MBlur: React.FC<{ id: string; x?: number; y?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ id, x = 0, y = 0, style, children }) => {
  const on = x > 0.3 || y > 0.3;
  return (
    <div style={{ position: "absolute", inset: 0, filter: on ? `url(#${id})` : undefined, ...style }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id={id} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${x.toFixed(2)} ${y.toFixed(2)}`} />
          </filter>
        </defs>
      </svg>
      {children}
    </div>
  );
};

/** A camera: every channel is a function of the frame; blur comes from its own velocity. */
export const Cam: React.FC<{
  f: number;
  id: string;
  s?: (f: number) => number;
  x?: (f: number) => number;
  y?: (f: number) => number;
  r?: (f: number) => number;
  origin?: string;
  blur?: boolean;
  children: React.ReactNode;
}> = ({ f, id, s = () => 1, x = () => 0, y = () => 0, r = () => 0, origin = "50% 50%", blur = true, children }) => {
  const vx = vel(x, f) + vel((g) => (s(g) - 1) * 600, f);
  const vy = vel(y, f) + vel((g) => (s(g) - 1) * 340, f);
  return (
    <MBlur id={id} x={blur ? shutter(vx) : 0} y={blur ? shutter(vy) : 0}>
      <AbsoluteFill style={{ transform: `translate(${x(f)}px, ${y(f)}px) scale(${s(f)}) rotate(${r(f)}deg)`, transformOrigin: origin }}>{children}</AbsoluteFill>
    </MBlur>
  );
};

// ── Elastic letters ─────────────────────────────────────────────────────────
type Seg = { t: string; accent: boolean };
const parse = (text: string): Seg[] => text.split(/(\*[^*]+\*)/g).filter(Boolean).map((t) => (t.startsWith("*") ? { t: t.slice(1, -1), accent: true } : { t, accent: false }));

export type ElasticProps = {
  f: number;
  at: number; // frame the first letter starts
  text: string; // *accent* supported
  size: number;
  color?: string;
  accentColor?: string;
  weight?: number;
  font?: string;
  accentFont?: string;
  accentScale?: number;
  stagger?: number; // frames per letter
  from?: "below" | "above" | "slam";
  outAt?: number; // frame letters start leaving
  outStagger?: number;
  glow?: string; // accent glow colour
  shadow?: string;
  align?: "left" | "center" | "right";
  tracking?: string;
  style?: React.CSSProperties;
  seed?: number;
  dim?: number; // 0..1, fades toward `dimColor` (used when a line steps back)
  dimColor?: string;
};

/** Every letter is its own spring: it rises, unblurs, over-shoots and wobbles back. Words never break. */
export const Elastic: React.FC<ElasticProps> = ({
  f, at, text, size, color = PAL.white, accentColor = PAL.indigo, weight = 700, font = SANS, accentFont = SERIF, accentScale = 1.12,
  stagger = 1.6, from = "below", outAt, outStagger = 0.7, glow, shadow, align = "center", tracking = "-0.025em", style, seed = 1, dim = 0, dimColor = PAL.greyLight,
}) => {
  const segs = parse(text);
  let k = 0;
  const words: { chars: { ch: string; i: number }[]; accent: boolean }[] = [];
  for (const s of segs) {
    for (const w of s.t.split(/(\s+)/)) {
      if (!w) continue;
      if (/^\s+$/.test(w)) { words.push({ chars: [{ ch: " ", i: k++ }], accent: s.accent }); continue; }
      words.push({ chars: [...w].map((ch) => ({ ch, i: k++ })), accent: s.accent });
    }
  }
  const total = k;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start", alignItems: "baseline", ...style }}>
      {words.map((w, wi) => (
        <span key={wi} style={{ display: "inline-flex", whiteSpace: "pre" }}>
          {w.chars.map(({ ch, i }) => {
            const start = at + i * stagger + jit(i, stagger * 0.45, seed);
            const s = sp(f, start, from === "slam" ? SPR.pop : SPR.elastic);
            const lin = clamp01(s);
            const r0 = jit(i, from === "slam" ? 10 : 14, seed + 7);
            let y = from === "above" ? -(1 - s) * 0.75 : (1 - s) * 0.75; // em
            let sc = from === "slam" ? 2.4 - 1.4 * s : 0.35 + 0.65 * s;
            let rot = (1 - s) * r0;
            let blur = (1 - lin) * (from === "slam" ? 16 : 9);
            let op = clamp01(lin * 2.2);
            if (outAt !== undefined) {
              const o = pr(f, outAt + (total - i) * outStagger * 0.3 + i * outStagger * 0.7, outAt + i * outStagger + 14, E.in);
              y -= o * 0.9;
              sc *= 1 + o * 0.25;
              rot += o * jit(i, 18, seed + 3);
              blur += o * 14;
              op *= 1 - o;
            }
            const isAccent = w.accent;
            const fs = isAccent ? size * accentScale : size;
            const col = isAccent ? accentColor : color;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontFamily: isAccent ? accentFont : font,
                  fontStyle: isAccent && accentFont === SERIF ? "italic" : "normal",
                  fontWeight: isAccent && accentFont === SERIF ? 400 : weight,
                  fontSize: fs,
                  lineHeight: 1.08,
                  letterSpacing: isAccent ? "-0.005em" : tracking,
                  color: dim > 0 ? mix(col, dimColor, dim) : col,
                  opacity: op,
                  transform: `translateY(${y}em) scale(${sc}) rotate(${rot}deg)`,
                  transformOrigin: "50% 80%",
                  filter: blur > 0.25 ? `blur(${blur.toFixed(2)}px)` : undefined,
                  textShadow: isAccent && glow ? `0 0 ${size * 0.45}px ${glow}, 0 0 ${size * 0.12}px ${glow}` : shadow,
                }}
              >
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
};

export const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};
export const rgba = (hex: string, a: number) => {
  const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b2},${a})`;
};

// ── Worlds ──────────────────────────────────────────────────────────────────
export const DarkWorld: React.FC<{ f: number; grid?: number; glow?: number }> = ({ f, grid = 0, glow = 1 }) => {
  const br = 1 + Math.sin(f / 80) * 0.04;
  return (
    <AbsoluteFill style={{ background: PAL.ink }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 95% 62% at ${50 + Math.sin(f / 140) * 6}% 112%, ${rgba(PAL.navy2, 0.95 * glow)} 0%, ${rgba(PAL.navy, 0.55 * glow)} 38%, rgba(1,0,4,0) 72%)`,
          transform: `scale(${br})`,
        }}
      />
      {grid > 0 && <TileGrid f={f} opacity={grid} />}
    </AbsoluteFill>
  );
};

const TileGrid: React.FC<{ f: number; opacity: number }> = ({ f, opacity }) => {
  const cell = 132;
  const off = (f * 0.25) % cell;
  return (
    <AbsoluteFill style={{ opacity, transform: `translateX(${-off}px)` }}>
      <svg width={2200} height={1080}>
        {Array.from({ length: 17 * 9 }, (_, i) => {
          const cx = (i % 17) * cell;
          const cy = Math.floor(i / 17) * cell - 40;
          return <rect key={i} x={cx + 6} y={cy + 6} width={cell - 12} height={cell - 12} rx={26} fill="none" stroke="rgba(190,195,251,0.07)" strokeWidth={1.2} />;
        })}
      </svg>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 50% 45%, rgba(1,0,4,0) 0%, ${PAL.ink} 85%)` }} />
    </AbsoluteFill>
  );
};

export const LightWorld: React.FC<{ f: number; bloom?: number; dimmer?: number }> = ({ f, bloom = 1, dimmer = 0 }) => (
  <AbsoluteFill style={{ background: PAL.paper }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 85% 55% at ${50 + Math.sin(f / 120) * 8}% 118%, ${rgba(PAL.peri, 0.95 * bloom)} 0%, ${rgba(PAL.peri, 0.45 * bloom)} 40%, rgba(253,251,255,0) 75%)`,
      }}
    />
    <AbsoluteFill
      style={{ background: `radial-gradient(ellipse 40% 35% at ${18 + Math.cos(f / 150) * 5}% -5%, ${rgba(PAL.periSoft, 0.9)} 0%, rgba(253,251,255,0) 70%)` }}
    />
    {dimmer > 0 && <AbsoluteFill style={{ background: `rgba(20,22,44,${dimmer})` }} />}
  </AbsoluteFill>
);

/** Liquid indigo swirl: big soft blobs orbiting under heavy blur. */
export const Swirl: React.FC<{ f: number; speed?: number }> = ({ f, speed = 1 }) => {
  const t = (f * speed) / 60;
  const blobs = [
    { c: PAL.peri, r: 620, ox: 0.32, oy: 0.4, a: 0.9, ph: 0 },
    { c: "#FFFFFF", r: 420, ox: 0.62, oy: 0.55, a: 0.75, ph: 2.1 },
    { c: PAL.indigoDeep, r: 760, ox: 0.72, oy: 0.3, a: 1, ph: 4.2 },
    { c: PAL.glow, r: 560, ox: 0.4, oy: 0.75, a: 0.85, ph: 1.3 },
    { c: PAL.navy2, r: 680, ox: 0.15, oy: 0.85, a: 0.9, ph: 3.3 },
  ];
  return (
    <AbsoluteFill style={{ background: PAL.indigo, overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: "blur(90px)" }}>
        {blobs.map((bl, i) => {
          const x = 1920 * bl.ox + Math.cos(t * 0.9 + bl.ph) * 260;
          const y = 1080 * bl.oy + Math.sin(t * 1.1 + bl.ph) * 180;
          const sx = 1 + Math.sin(t * 1.3 + bl.ph) * 0.25;
          return (
            <div key={i} style={{ position: "absolute", left: x - bl.r, top: y - bl.r, width: bl.r * 2, height: bl.r * 2, borderRadius: "50%", background: bl.c, opacity: bl.a, transform: `scale(${sx}, ${2 - sx}) rotate(${t * 20 + i * 40}deg)` }} />
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{ f: number; opacity?: number; dark?: boolean }> = ({ f, opacity = 0.05, dark = false }) => {
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)'/%3E%3C/svg%3E")`;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none", backgroundImage: noise, backgroundSize: "256px",
        backgroundPosition: `${Math.floor(rand(f) * 256)}px ${Math.floor(rand(f + 999) * 256)}px`,
        opacity, mixBlendMode: dark ? "screen" : "multiply",
      }}
    />
  );
};

export const Vignette: React.FC<{ amount?: number }> = ({ amount = 0.35 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,10,${amount}) 100%)` }} />
);

// ── Glass ───────────────────────────────────────────────────────────────────
export const glassDark: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
  border: "1px solid rgba(190,195,251,0.26)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.22), 0 0 60px rgba(81,99,255,0.18)",
  backdropFilter: "blur(18px)",
};
export const glassLight: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,247,255,0.9) 100%)",
  border: "1px solid rgba(43,59,217,0.12)",
  boxShadow: "0 24px 60px rgba(34,51,181,0.16), 0 4px 14px rgba(34,51,181,0.10), inset 0 1px 0 #fff",
};

/** A fixed-size absolutely positioned box centred on (x, y). */
export const At: React.FC<{ x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w = 0, h = 0, style, children }) => (
  <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w || undefined, height: h || undefined, ...style }}>{children}</div>
);

/** Text layer centred on (x, y), any width. */
export const Center: React.FC<{ x?: number; y: number; width?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x = 960, y, width = 1700, style, children }) => (
  <div style={{ position: "absolute", left: x - width / 2, width, top: y, transform: "translateY(-50%)", ...style }}>{children}</div>
);
