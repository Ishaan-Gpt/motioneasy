import React from "react";
import { AbsoluteFill } from "remotion";
import { b, COPY, PAL } from "../config";
import { E, Elastic, LightWorld, SANS, SPR, clamp01, jit, kfLog, pr, rgba, sp } from "../lib";

// Beats 43–50 · the song's real final hit at beat 43. Dozens of curves race in from both edges and converge
// into a glass app tile that pops with the real logo bars; then the one message, the URL pill and the credit.

const HIT = b(43);
const TILE = 236;
const N = 18;

const BARS = [
  { x: 20, y: 42, h: 48, c: "#1A1A1A" },
  { x: 43, y: 10, h: 80, c: "#FFA946" },
  { x: 66, y: 26, h: 64, c: "#34D399" },
];

export const End: React.FC<{ f: number }> = ({ f }) => {
  const rise = pr(f, b(44.6), b(45.4), E.ramp);
  const tileY = 540 - rise * 150;
  const cam = kfLog(f, [[HIT - 20, 1.08], [HIT + 30, 1.0, E.out], [b(50), 1.035, E.inOut]]);
  return (
    <AbsoluteFill>
      <LightWorld f={f} bloom={1.25} />
      <AbsoluteFill style={{ transform: `scale(${cam})` }}>
        <Curves f={f} tileY={tileY} />
        <Tile f={f} y={tileY} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 610 }}>
          <Elastic f={f} at={b(44.9)} text={`${COPY.endLine} *${COPY.endAccent}*`} size={88} weight={800} color={PAL.text} accentColor={PAL.indigo} accentScale={1.16} glow={rgba(PAL.glow, 0.45)} stagger={1.0} seed={140} />
        </div>
        <UrlPill f={f} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 1022, textAlign: "center", fontFamily: SANS, fontSize: 19, fontWeight: 500, color: PAL.grey, opacity: pr(f, b(45.6), b(46.6)) }}>{COPY.credit}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Curves: React.FC<{ f: number; tileY: number }> = ({ f, tileY }) => {
  const paths: React.ReactNode[] = [];
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < N; i++) {
      const k = side * N + i;
      const sy = 80 + (i / (N - 1)) * 920 + jit(k, 20, 3);
      const sx = side ? 2000 : -80;
      const ex = side ? 960 + TILE / 2 + 6 : 960 - TILE / 2 - 6;
      const ey = tileY + jit(k, 50, 9) * 0.35;
      const c1x = side ? 1500 + jit(k, 120, 4) : 420 + jit(k, 120, 4);
      const c2x = side ? 1250 : 670;
      const d = `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ey}, ${ex} ${ey}`;
      const at = HIT - 26 + Math.abs(jit(k, 8, 7));
      const draw = pr(f, at, HIT + 2, E.out);
      const pulse = pr(f, HIT + 4 + (k % 6) * 3, HIT + 60 + (k % 6) * 3, E.inOut);
      paths.push(
        <g key={k}>
          <path d={d} fill="none" stroke={`url(#lg${side})`} strokeWidth={1.8} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} opacity={0.75} />
          {f > HIT + 4 && pulse < 1 && <path d={d} fill="none" stroke={PAL.glow} strokeWidth={3} pathLength={1} strokeDasharray="0.06 1" strokeDashoffset={-pulse} opacity={0.8} strokeLinecap="round" />}
        </g>,
      );
    }
  }
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="lg0" x1="0" x2="1">
          <stop offset="0" stopColor={PAL.peri} stopOpacity={0} />
          <stop offset="1" stopColor={PAL.indigo} />
        </linearGradient>
        <linearGradient id="lg1" x1="1" x2="0">
          <stop offset="0" stopColor={PAL.peri} stopOpacity={0} />
          <stop offset="1" stopColor={PAL.indigo} />
        </linearGradient>
      </defs>
      {paths}
    </svg>
  );
};

const Tile: React.FC<{ f: number; y: number }> = ({ f, y }) => {
  const s = sp(f, HIT - 2, { damping: 8, stiffness: 170, mass: 0.8 });
  const ring = pr(f, HIT, HIT + 34, E.out);
  const K = (TILE * 0.62) / 100;
  return (
    <>
      {f >= HIT && <div style={{ position: "absolute", left: 960 - TILE / 2 - ring * 140, top: y - TILE / 2 - ring * 140, width: TILE + ring * 280, height: TILE + ring * 280, borderRadius: 60 + ring * 100, border: `2px solid ${rgba(PAL.glow, 0.6 * (1 - ring))}` }} />}
      <div
        style={{
          position: "absolute", left: 960 - TILE / 2, top: y - TILE / 2, width: TILE, height: TILE, borderRadius: 60,
          background: "linear-gradient(160deg, #FFFFFF 0%, #F1F2FC 100%)",
          boxShadow: `0 40px 90px ${rgba(PAL.indigoDeep, 0.28)}, 0 0 ${50 + 40 * (1 - ring)}px ${rgba(PAL.glow, 0.35)}, inset 0 2px 0 #fff, inset 0 -3px 10px rgba(34,51,181,0.08)`,
          transform: `scale(${s})`, opacity: clamp01(s * 2),
        }}
      >
        <div style={{ position: "absolute", left: (TILE - 100 * K) / 2, top: (TILE - 100 * K) / 2, width: 100 * K, height: 100 * K }}>
          {BARS.map((bar, i) => {
            const bs = sp(f, HIT + 4 + i * 4, SPR.elastic);
            return <div key={i} style={{ position: "absolute", left: bar.x * K, top: bar.y * K, width: 14 * K, height: bar.h * K, borderRadius: 7 * K, background: bar.c, transform: `scaleY(${bs})`, transformOrigin: "50% 100%" }} />;
          })}
        </div>
      </div>
    </>
  );
};

const UrlPill: React.FC<{ f: number }> = ({ f }) => {
  const s = sp(f, b(46.5), SPR.elastic);
  const sub = pr(f, b(47.1), b(47.8));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 790, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
      <div
        style={{
          padding: "20px 46px", borderRadius: 999, background: `linear-gradient(180deg, ${PAL.glow}, ${PAL.indigoDeep})`, color: "#fff",
          fontFamily: SANS, fontWeight: 700, fontSize: 42, letterSpacing: "-0.01em",
          boxShadow: `0 22px 50px ${rgba(PAL.indigo, 0.4)}, 0 0 50px ${rgba(PAL.glow, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.4)`,
          transform: `scale(${s})`, opacity: clamp01(s * 2),
        }}
      >
        {COPY.url}
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: PAL.grey, opacity: sub, transform: `translateY(${(1 - sub) * 16}px)` }}>{COPY.endSub}</div>
    </div>
  );
};
