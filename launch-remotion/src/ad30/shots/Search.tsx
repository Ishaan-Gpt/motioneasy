import React from "react";
import { AbsoluteFill } from "remotion";
import { b, COPY, PAL } from "../config";
import { At, Cam, DarkWorld, E, Elastic, SANS, SPR, clamp01, glassDark, jit, kf, kfLog, pr, rgba, sp } from "../lib";

// Beats 0–8 · "Still Googling…" → a glass search bar types the query → results rain in and melt into blobs.

const BAR = { x: 960, y: 610, w: 1040, h: 116 };
const TYPE_AT = b(2.05);
const PER_CHAR = 2.52; // frames: 22 letters over ~0.92 beats
const ENTER = b(3.8);

// Result cards: rest position, depth (1 = focus plane), tilt.
export const CARDS = [
  { x: 330, y: 330, z: 0.86, rz: -5 },
  { x: 760, y: 250, z: 1.0, rz: 3 },
  { x: 1190, y: 300, z: 0.92, rz: -2 },
  { x: 1600, y: 360, z: 0.82, rz: 6 },
  { x: 420, y: 760, z: 1.08, rz: 4 },
  { x: 860, y: 690, z: 0.95, rz: -4 },
  { x: 1290, y: 760, z: 1.12, rz: 2 },
  { x: 1650, y: 820, z: 0.88, rz: -6 },
];
export const MELT_AT = b(6.3);
export const meltOf = (f: number, i: number) => pr(f, MELT_AT + i * 3 + jit(i, 4, 21), MELT_AT + i * 3 + 40, E.inOut);
/** Where card i's blob sits at frame f (shared with the Pains scene so the blobs continue). */
export const blobPos = (f: number, i: number) => {
  const c = CARDS[i];
  const t = Math.max(0, f - MELT_AT) / 60;
  return { x: c.x + Math.sin(t * 0.8 + i) * 40 + t * jit(i, 30, 5), y: c.y + Math.cos(t * 0.7 + i * 2) * 30 - t * 12 };
};

export const Search: React.FC<{ f: number }> = ({ f }) => {
  // camera: slow push, a ramp on Enter, then hold while the results rain
  const s = (g: number) => kfLog(g, [[0, 1.0], [ENTER - 4, 1.07, E.inOut], [ENTER + 12, 1.13, E.hard], [b(8), 1.17, E.out]]);
  const y = (g: number) => kf(g, [[0, 0], [ENTER + 2, 0], [ENTER + 22, 40, E.hard]]);
  const leave = pr(f, b(3.85), b(4.2), E.in);

  return (
    <AbsoluteFill>
      <DarkWorld f={f} grid={0.6 * (1 - pr(f, MELT_AT, b(7.5)))} />
      <Cam f={f} id="cam-search" s={s} y={y}>
        <HookLine f={f} leave={leave} />
        <SearchBar f={f} />
        {CARDS.map((_, i) => (
          <ResultCard key={i} f={f} i={i} />
        ))}
      </Cam>
    </AbsoluteFill>
  );
};

const HookLine: React.FC<{ f: number; leave: number }> = ({ f, leave }) => {
  // "Still" (light) + "Googling" (bold) + three dots that pop one by one
  const [word] = COPY.hook.replace("…", "").split(" ").slice(1);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 300 - leave * 60, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 30, opacity: 1 - leave, filter: leave > 0.02 ? `blur(${leave * 14}px)` : undefined }}>
      <Elastic f={f} at={b(0.1)} text="Still" size={118} weight={500} color={rgba(PAL.peri, 0.9)} seed={3} />
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <Elastic f={f} at={b(0.7)} text={word} size={118} weight={800} color={PAL.white} seed={9} stagger={1.4} shadow="0 18px 50px rgba(0,0,0,0.6)" />
        {[0, 1, 2].map((d) => {
          const at = b(1.15) + d * 7;
          const s = sp(f, at, SPR.elastic);
          const breathe = f > at + 30 ? 1 + Math.sin((f - at) / 6 - d) * 0.12 : 1;
          return (
            <span key={d} style={{ display: "inline-block", width: 26, height: 26, marginLeft: d === 0 ? 10 : 8, borderRadius: 13, background: PAL.glow, boxShadow: `0 0 22px ${PAL.glow}`, transform: `translateY(${(1 - s) * 40 - 6}px) scale(${s * breathe})`, opacity: clamp01(s * 2) }} />
          );
        })}
      </div>
    </div>
  );
};

const SearchBar: React.FC<{ f: number }> = ({ f }) => {
  const enter = sp(f, b(1.55), SPR.pop);
  const q = COPY.query;
  const typed = Math.max(0, Math.min(q.length, Math.floor((f - TYPE_AT) / PER_CHAR) + 1));
  const squash = f >= ENTER ? sp(f, ENTER, { damping: 7, stiffness: 260, mass: 0.6 }) : 1;
  const press = f >= ENTER ? 1 - Math.sin(clamp01(squash) * Math.PI) * 0.06 : 1;
  // after Enter the bar rises to the top and shrinks
  const up = pr(f, ENTER + 4, ENTER + 30, E.hard);
  const melt = pr(f, MELT_AT + 10, MELT_AT + 50, E.inOut);
  const caretOn = f < TYPE_AT + q.length * PER_CHAR + 6 || Math.floor(f / 16) % 2 === 0;
  const ring = pr(f, ENTER, ENTER + 26, E.out);
  return (
    <div
      style={{
        position: "absolute", left: BAR.x - BAR.w / 2, top: BAR.y - BAR.h / 2 - up * 470, width: BAR.w, height: BAR.h,
        transform: `perspective(1400px) rotateX(${(1 - enter) * 58}deg) translateY(${(1 - enter) * 240}px) scale(${(0.82 + 0.18 * enter) * (1 - up * 0.3)}, ${(0.82 + 0.18 * enter) * press * (1 - up * 0.3)})`,
        opacity: clamp01(enter * 1.6) * (1 - melt), filter: melt > 0.01 ? `blur(${melt * 30}px)` : undefined,
      }}
    >
      <div style={{ ...glassDark, position: "absolute", inset: 0, borderRadius: BAR.h / 2, display: "flex", alignItems: "center", paddingLeft: 46, gap: 26 }}>
        <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={PAL.peri} strokeWidth={2.2} strokeLinecap="round">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 21 21" />
        </svg>
        <div style={{ fontFamily: SANS, fontSize: 50, fontWeight: 500, color: PAL.white, letterSpacing: "-0.01em", display: "flex", alignItems: "center", whiteSpace: "pre" }}>
          {[...q.slice(0, typed)].map((ch, i) => {
            const s = sp(f, TYPE_AT + i * PER_CHAR, { damping: 10, stiffness: 300, mass: 0.5 });
            return (
              <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - s) * -14}px) scale(${0.6 + 0.4 * s})`, opacity: clamp01(s * 3) }}>
                {ch}
              </span>
            );
          })}
          <span style={{ display: "inline-block", width: 4, height: 58, marginLeft: 6, borderRadius: 2, background: PAL.glow, boxShadow: `0 0 14px ${PAL.glow}`, opacity: caretOn ? 1 : 0 }} />
        </div>
        {/* Enter key hint */}
        <div
          style={{
            position: "absolute", right: 22, top: 22, height: BAR.h - 44, padding: "0 22px", borderRadius: 18, display: "flex", alignItems: "center",
            fontFamily: SANS, fontWeight: 700, fontSize: 30, color: PAL.white,
            background: f >= ENTER ? `linear-gradient(180deg, ${PAL.glow}, ${PAL.indigo})` : "rgba(255,255,255,0.08)",
            boxShadow: f >= ENTER ? `0 0 40px ${rgba(PAL.glow, 0.7)}` : "none",
            opacity: pr(f, TYPE_AT + 30, TYPE_AT + 44), transform: `scale(${f >= ENTER ? 1 - Math.sin(clamp01(squash) * Math.PI) * 0.14 : 1})`,
          }}
        >
          ↵
        </div>
      </div>
      {/* Enter ripple */}
      {f >= ENTER && (
        <div style={{ position: "absolute", inset: -ring * 60, borderRadius: BAR.h / 2 + ring * 60, border: `2px solid ${rgba(PAL.glow, 0.7 * (1 - ring))}`, boxShadow: `0 0 40px ${rgba(PAL.glow, 0.5 * (1 - ring))}` }} />
      )}
    </div>
  );
};

const ResultCard: React.FC<{ f: number; i: number }> = ({ f, i }) => {
  const c = CARDS[i];
  const r = COPY.results[i];
  const at = b(4.05) + i * 3.2 + jit(i, 3, 11);
  const s = sp(f, at, { damping: 13, stiffness: 120, mass: 0.9 });
  if (f < at - 1) return null;
  const m = meltOf(f, i);
  const bp = blobPos(f, i);
  const fall = (1 - s) * -900;
  const dof = Math.abs(c.z - 1) * 9 * (1 - m);
  const w = 380;
  const h = 168;
  return (
    <At x={m > 0 ? c.x + (bp.x - c.x) * m : c.x} y={(m > 0 ? c.y + (bp.y - c.y) * m : c.y) + fall} w={w} h={h}
      style={{
        transform: `perspective(1200px) rotateX(${(1 - s) * 70 + 8 * (1 - m)}deg) rotateZ(${c.rz * (1 - m) + (1 - s) * jit(i, 25, 2)}deg) scale(${c.z * (1 + m * 0.5)})`,
        filter: `blur(${(dof + m * 42).toFixed(2)}px)`, opacity: clamp01(s * 2), zIndex: Math.round(c.z * 10),
      }}
    >
      <div
        style={{
          ...glassDark, position: "absolute", inset: 0, borderRadius: 26 + m * 120, padding: "24px 28px",
          background: m > 0 ? `linear-gradient(180deg, ${rgba(PAL.glow, 0.15 + m * 0.75)}, ${rgba(PAL.indigoDeep, 0.1 + m * 0.85)})` : glassDark.background,
        }}
      >
        <div style={{ opacity: 1 - m * 1.4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: "rgba(190,195,251,0.25)" }} />
            <div style={{ height: 10, width: 150, borderRadius: 5, background: "rgba(190,195,251,0.18)" }} />
          </div>
          <div style={{ marginTop: 16, fontFamily: SANS, fontSize: 30, fontWeight: 700, color: PAL.white, letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>{r.title}</div>
          <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 999, background: "rgba(81,99,255,0.16)", border: "1px solid rgba(190,195,251,0.3)", fontFamily: SANS, fontSize: 22, fontWeight: 600, color: PAL.peri }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={PAL.peri} strokeWidth={2.4} strokeLinecap="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            {r.tag}
          </div>
        </div>
      </div>
    </At>
  );
};
