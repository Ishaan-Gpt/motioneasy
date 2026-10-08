import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import { b, COPY, FPS, MEDIA, MUSIC, PAL, SHOT } from "../config";
import { E, Elastic, LightWorld, MBlur, SANS, SPR, clamp01, kf, kfLog, pr, rgba, shutter, sp, vel } from "../lib";

// Beats 20–35 (9.0 s = the merged clip). The real take, captioned by CaptionsEasy in three looks.
// The phone flies in on a 3D camera ramp; a cursor clicks look chips exactly where the clip's look changes;
// then Export → progress → done, and a lens sweeps the corner where a watermark would sit. Exit: dive into the screen.

const START = b(SHOT.proof[0]);
const SW = [START + MEDIA.clipSwitches[0] * FPS, START + MEDIA.clipSwitches[1] * FPS];
const PH = { x: 1215, y: 540, sw: 486, sh: 864, bezel: 14 };
const CHIP = { x: 1640, ys: [330, 520, 710], w: 132, h: 170 };
const EXPORT = { x: 1640, y: 900, w: 250, h: 78 };
const PRESS = b(32);
const DONE = b(33.45);
const LENS = [b(33.6), b(34.6)] as const;
const DIVE = b(34.45);
const CLIP_FRAMES = Math.round(MEDIA.clipSeconds * FPS);

const activeLook = (f: number) => (f < SW[0] ? 0 : f < SW[1] ? 1 : 2);

export const Proof: React.FC<{ f: number }> = ({ f }) => {
  const camS = (g: number) => (g < DIVE ? 1 : kfLog(g, [[DIVE, 1], [b(35), 4.2, E.in]]));
  const vs = vel((g) => camS(g) * 300, f);
  return (
    <AbsoluteFill>
      <LightWorld f={f} />
      <MBlur id="mb-proof" x={shutter(vs)} y={shutter(vs) * 0.6}>
        <AbsoluteFill style={{ transform: `scale(${camS(f)})`, transformOrigin: `${PH.x}px ${PH.y}px` }}>
          <Copy f={f} />
          <Phone f={f} />
          {[0, 1, 2].map((k) => (
            <Chip key={k} f={f} k={k} />
          ))}
          <ExportPill f={f} />
          <Cursor f={f} />
        </AbsoluteFill>
      </MBlur>
    </AbsoluteFill>
  );
};

const Phone: React.FC<{ f: number }> = ({ f }) => {
  const ty = (g: number) => kf(g, [[START - 8, 1050], [START + 50, 0, E.out]]);
  const ry = kf(f, [[START - 8, -44], [START + 60, -11, E.out], [DIVE, -5, E.inOut]]);
  const rx = kf(f, [[START - 8, 24], [START + 60, 6, E.out], [DIVE, 2, E.inOut]]);
  const s = kfLog(f, [[START - 8, 1.75], [START + 60, 1, E.out], [DIVE, 1.035, E.inOut]]);
  const bump = SW.reduce((acc, at) => acc + (f >= at ? Math.sin(Math.PI * pr(f, at, at + 16, E.out)) * 0.035 : 0), 0);
  const flash = SW.reduce((acc, at) => acc + (f >= at ? 0.4 * (1 - pr(f, at, at + 9, E.out)) : 0), 0);
  const blurY = shutter(vel(ty, f));
  const W = PH.sw + PH.bezel * 2;
  const H = PH.sh + PH.bezel * 2;
  return (
    <MBlur id="mb-phone" y={blurY}>
      {/* floor shadow */}
      <div style={{ position: "absolute", left: PH.x - 300, top: PH.y + H / 2 - 30 + ty(f), width: 600, height: 80, borderRadius: "50%", background: `radial-gradient(ellipse, ${rgba(PAL.indigoDeep, 0.35)} 0%, rgba(0,0,0,0) 70%)`, filter: "blur(18px)" }} />
      <div
        style={{
          position: "absolute", left: PH.x - W / 2, top: PH.y - H / 2 + ty(f), width: W, height: H, borderRadius: 74,
          background: "linear-gradient(160deg, #23263F 0%, #0B0C1A 55%, #1A1C33 100%)",
          boxShadow: `0 60px 120px ${rgba(PAL.indigoDeep, 0.35)}, 0 0 0 1.5px rgba(255,255,255,0.12) inset, 0 0 80px ${rgba(PAL.glow, 0.18)}`,
          transform: `perspective(1800px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${s * (1 - bump)})`,
        }}
      >
        <div style={{ position: "absolute", left: PH.bezel, top: PH.bezel, width: PH.sw, height: PH.sh, borderRadius: 60, overflow: "hidden", background: "#000" }}>
          <Sequence from={START} durationInFrames={CLIP_FRAMES} layout="none">
            <OffthreadVideo src={staticFile(MEDIA.clip)} volume={MUSIC.voiceVolume} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Sequence>
          <Lens f={f} />
          <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} />
          {/* glass glare */}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${115 + ry}deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 38%)`, pointerEvents: "none" }} />
        </div>
        {/* dynamic island */}
        <div style={{ position: "absolute", left: W / 2 - 62, top: PH.bezel + 16, width: 124, height: 34, borderRadius: 17, background: "#000" }} />
      </div>
    </MBlur>
  );
};

/** A glass loupe that magnifies the screen where a watermark would usually sit. */
const Lens: React.FC<{ f: number }> = ({ f }) => {
  if (f < LENS[0] - 2 || f > LENS[1] + 14) return null;
  const app = sp(f, LENS[0], SPR.pop);
  const gone = pr(f, LENS[1], LENS[1] + 12, E.in);
  const t = pr(f, LENS[0], LENS[1], E.inOut);
  const lx = PH.sw - 120 - t * 40;
  const ly = PH.sh - 150 - t * (PH.sh - 330);
  const r = 108 * clamp01(app) * (1 - gone);
  const k = 1.9;
  return (
    <div style={{ position: "absolute", left: lx - r, top: ly - r, width: r * 2, height: r * 2, borderRadius: "50%", overflow: "hidden", border: "4px solid rgba(255,255,255,0.95)", boxShadow: `0 18px 40px rgba(0,0,0,0.45), 0 0 40px ${rgba(PAL.glow, 0.6)}` }}>
      <div style={{ position: "absolute", left: -(lx - r), top: -(ly - r), width: PH.sw, height: PH.sh, transform: `scale(${k})`, transformOrigin: `${lx}px ${ly}px` }}>
        <Sequence from={START} durationInFrames={CLIP_FRAMES} layout="none">
          <OffthreadVideo muted src={staticFile(MEDIA.clip)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
      </div>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 40%)" }} />
    </div>
  );
};

const Chip: React.FC<{ f: number; k: number }> = ({ f, k }) => {
  const at = START + 52 + k * 6;
  const s = sp(f, at, SPR.elastic);
  const active = activeLook(f) === k;
  const sel = k === 0 ? 1 : f >= SW[k - 1] ? sp(f, SW[k - 1], SPR.elastic) : 0;
  const on = active ? clamp01(sel) : 0;
  const lift = active ? Math.min(1.2, sel) : 0;
  return (
    <div
      style={{
        position: "absolute", left: CHIP.x - CHIP.w / 2, top: CHIP.ys[k] - CHIP.h / 2, width: CHIP.w, height: CHIP.h, borderRadius: 30, padding: 7,
        background: "linear-gradient(180deg,#fff,#F3F4FB)",
        boxShadow: `0 18px 40px rgba(34,51,181,${0.12 + 0.2 * on}), 0 0 0 ${3 * on}px ${PAL.indigo}, 0 0 ${40 * on}px ${rgba(PAL.glow, 0.6 * on)}`,
        transform: `translateX(${(1 - s) * 160}px) scale(${(0.6 + 0.4 * s) * (1 + 0.07 * lift)})`, opacity: clamp01(s * 2),
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 23, overflow: "hidden" }}>
        <Img src={staticFile(MEDIA.thumbs[k])} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 62%", filter: active ? "none" : "saturate(0.35) brightness(0.92)" }} />
      </div>
      {active && (
        <div style={{ position: "absolute", right: -10, top: -10, width: 40, height: 40, borderRadius: 20, background: PAL.indigo, boxShadow: `0 0 20px ${rgba(PAL.glow, 0.8)}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${sel})` }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </div>
      )}
    </div>
  );
};

const ExportPill: React.FC<{ f: number }> = ({ f }) => {
  const s = sp(f, b(30.9), SPR.elastic);
  if (f < b(30.9) - 1) return null;
  const press = f >= PRESS ? Math.sin(Math.PI * pr(f, PRESS, PRESS + 10, E.out)) * 0.1 : 0;
  const prog = pr(f, PRESS + 8, DONE, E.inOut);
  const done = f >= DONE ? sp(f, DONE, SPR.elastic) : 0;
  const label = f < PRESS + 8 ? COPY.exportLabel : f < DONE ? `Exporting ${Math.round(prog * 100)}%` : "Done";
  return (
    <div
      style={{
        position: "absolute", left: EXPORT.x - EXPORT.w / 2, top: EXPORT.y - EXPORT.h / 2, width: EXPORT.w, height: EXPORT.h, borderRadius: 999, overflow: "hidden",
        background: `linear-gradient(180deg, ${PAL.glow}, ${PAL.indigoDeep})`, boxShadow: `0 20px 46px ${rgba(PAL.indigo, 0.45)}, 0 0 ${30 + 30 * done}px ${rgba(PAL.glow, 0.5)}, inset 0 1px 0 rgba(255,255,255,0.4)`,
        transform: `scale(${(0.5 + 0.5 * s) * (1 - press)})`, opacity: clamp01(s * 2),
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${prog * 100}%`, background: "rgba(255,255,255,0.22)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: SANS, fontWeight: 700, fontSize: 28, color: "#fff", whiteSpace: "nowrap" }}>
        {f >= DONE ? (
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ transform: `scale(${done})` }}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        ) : (
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></svg>
        )}
        {label}
      </div>
    </div>
  );
};

const Cursor: React.FC<{ f: number }> = ({ f }) => {
  const k: [number, number, number][] = [
    [b(23.3), 1960, 1080],
    [b(24.8), CHIP.x + 18, CHIP.ys[1] + 30],
    [b(29.7), CHIP.x + 18, CHIP.ys[2] + 30],
    [b(31.85), EXPORT.x + 40, EXPORT.y + 14],
    [b(33.3), 1990, 1100],
  ];
  if (f < k[0][0] || f > k[4][0] + 2) return null;
  const x = kf(f, k.map(([t, xx], i) => [t, xx, i ? E.ramp : undefined]));
  const y = kf(f, k.map(([t, , yy], i) => [t, yy, i ? E.ramp : undefined]));
  const clicks = [b(24.95), b(29.95), PRESS];
  let sc = 1;
  const rings: React.ReactNode[] = [];
  clicks.forEach((c, i) => {
    if (f >= c - 4) sc -= Math.sin(Math.PI * pr(f, c - 4, c + 8, E.out)) * 0.2;
    if (f >= c) {
      const rp = pr(f, c, c + 22, E.out);
      rings.push(<div key={i} style={{ position: "absolute", left: x - 10 - rp * 40, top: y - 10 - rp * 40, width: 20 + rp * 80, height: 20 + rp * 80, borderRadius: "50%", border: `3px solid ${rgba(PAL.glow, 0.8 * (1 - rp))}` }} />);
    }
  });
  return (
    <>
      {rings}
      <svg width={54} height={54} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 6, top: y - 4, transform: `scale(${sc})`, transformOrigin: "6px 4px", filter: "drop-shadow(0 8px 14px rgba(11,12,26,0.35))" }}>
        <path d="M5 3l14 8.2-6.3 1.4 3.6 6.6-2.6 1.4-3.6-6.6L5 18.6z" fill="#fff" stroke="#0B0C1A" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </>
  );
};

const Copy: React.FC<{ f: number }> = ({ f }) => {
  const states = COPY.proof;
  return (
    <>
      {states.map((st, i) => {
        const at = b(st.beat);
        const next = i < states.length - 1 ? b(states[i + 1].beat) - 12 : b(34.4);
        if (f < at - 2 || f > next + 30) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 150, top: 320, width: 840 }}>
            <Counter f={f} at={at} n={i + 1} out={next} />
            <Elastic f={f} at={at} text={st.line} size={84} weight={800} color={PAL.text} align="left" seed={60 + i} outAt={next} shadow={`0 14px 40px ${rgba(PAL.indigoDeep, 0.12)}`} />
            <div style={{ height: 6 }} />
            <Elastic f={f} at={at + 8} text={`*${st.accent}*`} size={92} accentScale={1.18} accentColor={PAL.indigo} glow={rgba(PAL.glow, 0.45)} align="left" seed={70 + i} outAt={next + 4} stagger={1.3} />
          </div>
        );
      })}
    </>
  );
};

const Counter: React.FC<{ f: number; at: number; n: number; out: number }> = ({ f, at, n, out }) => {
  const s = sp(f, at - 6, SPR.pop);
  const o = pr(f, out, out + 14, E.in);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26, opacity: clamp01(s) * (1 - o), transform: `translateX(${(1 - s) * -40}px)` }}>
      <div style={{ height: 2, width: 60 * clamp01(s), background: PAL.indigo }} />
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26, color: PAL.indigo, letterSpacing: "0.12em" }}>{`0${n} / 03`}</div>
    </div>
  );
};
