import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { b, COPY, MEDIA, PAL } from "../config";
import { Cam, E, LightWorld, SANS, SPR, clamp01, jit, kfLog, pr, rgba, sp } from "../lib";
import { LOGO_OUT } from "./Logo";

// Beats 15.5–20 · whip-pan down from the logo into the light world. Wordmark + a toggle switch, OFF.
// Grey pills (the old way) float around it. Beat 18: the switch flips, the lights come on, the pills flip over.
// Exit: the camera dives into the glowing knob.

export const WHIP = [LOGO_OUT, b(16.05)] as const;
export const whipP = (f: number) => pr(f, WHIP[0], WHIP[1], E.hard);

const FLIP = b(18);
const TRACK = { w: 210, h: 104 };
const WM_H = 96;
const WM_W = (648.4 / 118.6) * WM_H;
const GAP = 44;
const LEFT = 960 - (WM_W + GAP + TRACK.w) / 2;
const KNOB_X0 = LEFT + WM_W + GAP + TRACK.h / 2;
const KNOB_X1 = LEFT + WM_W + GAP + TRACK.w - TRACK.h / 2;
const PILLS = [
  { x: 470, y: 290, z: 1.0 },
  { x: 1460, y: 300, z: 0.94 },
  { x: 975, y: 815, z: 1.06 },
];

export const Toggle: React.FC<{ f: number }> = ({ f }) => {
  const p = whipP(f);
  const on = sp(f, FLIP, { damping: 9, stiffness: 200, mass: 0.7 });
  const lights = pr(f, FLIP, FLIP + 24, E.out);
  const knobX = KNOB_X0 + (KNOB_X1 - KNOB_X0) * on;
  const v = Math.abs(sp(f + 0.5, FLIP, { damping: 9, stiffness: 200, mass: 0.7 }) - sp(f - 0.5, FLIP, { damping: 9, stiffness: 200, mass: 0.7 })) * (KNOB_X1 - KNOB_X0);
  const stretch = 1 + Math.min(0.45, v * 0.03);
  const DIVE = b(19.55);
  const camS = (g: number) => (g < DIVE ? kfLog(g, [[WHIP[0], 1.06], [FLIP, 1.0, E.out], [DIVE, 1.03, E.inOut]]) : kfLog(g, [[DIVE, 1.03], [b(20.05), 9, E.in]]));
  return (
    <AbsoluteFill style={{ transform: `translateY(${(1 - p) * 1150}px)` }}>
      <LightWorld f={f} bloom={0.35 + 0.65 * lights} dimmer={0.09 * (1 - lights)} />
      <Cam f={f} id="cam-toggle" s={camS} origin={`${KNOB_X1}px 540px`}>
        {PILLS.map((pl, i) => (
          <Pill key={i} f={f} i={i} x={pl.x} y={pl.y} z={pl.z} />
        ))}
        {/* wordmark */}
        <div style={{ position: "absolute", left: LEFT, top: 540 - WM_H / 2 + 4, width: WM_W, height: WM_H, opacity: pr(f, WHIP[0], WHIP[1]) }}>
          <Img src={staticFile(MEDIA.wordmark)} style={{ width: "100%", height: "100%" }} />
        </div>
        {/* track */}
        <div
          style={{
            position: "absolute", left: LEFT + WM_W + GAP, top: 540 - TRACK.h / 2, width: TRACK.w, height: TRACK.h, borderRadius: TRACK.h / 2, overflow: "hidden",
            background: "#E2E3EE", boxShadow: `inset 0 4px 10px rgba(20,22,44,0.16), 0 ${10 + 20 * lights}px ${40 + 40 * lights}px ${rgba(PAL.glow, 0.45 * lights)}`,
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: knobX - (LEFT + WM_W + GAP) + TRACK.h / 2, background: `linear-gradient(90deg, ${PAL.indigoDeep}, ${PAL.glow})`, opacity: clamp01(on * 1.5) }} />
        </div>
        {/* knob */}
        <div
          style={{
            position: "absolute", left: knobX - (TRACK.h - 16) / 2, top: 540 - (TRACK.h - 16) / 2, width: TRACK.h - 16, height: TRACK.h - 16, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #fff 0%, #F3F4FF 60%, #DADDF5 100%)",
            boxShadow: `0 8px 22px rgba(20,22,60,0.28), 0 0 ${30 * lights}px ${rgba("#FFFFFF", 0.9 * lights)}`,
            transform: `scaleX(${stretch}) scaleY(${1 / Math.sqrt(stretch)})`,
          }}
        />
        {/* ripple rings on the flip */}
        {[0, 1].map((k) => {
          const rp = pr(f, FLIP + k * 6, FLIP + 40 + k * 6, E.out);
          if (f < FLIP + k * 6) return null;
          return <div key={k} style={{ position: "absolute", left: KNOB_X1 - 60 - rp * 200, top: 540 - 60 - rp * 200, width: 120 + rp * 400, height: 120 + rp * 400, borderRadius: "50%", border: `2px solid ${rgba(PAL.glow, 0.55 * (1 - rp))}` }} />;
        })}
      </Cam>
    </AbsoluteFill>
  );
};

const Pill: React.FC<{ f: number; i: number; x: number; y: number; z: number }> = ({ f, i, x, y, z }) => {
  const at = b(16.35 + i * 0.3);
  const s = sp(f, at, SPR.elastic);
  const flipAt = b(18.3 + i * 0.25);
  const fl = sp(f, flipAt, { damping: 11, stiffness: 150, mass: 0.8 });
  const rot = Math.min(200, fl * 180);
  const bob = Math.sin((f + i * 40) / 34) * 10;
  const dof = Math.abs(z - 1) * 6;
  const face = (back: boolean): React.CSSProperties => ({
    position: "absolute", inset: 0, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
    backfaceVisibility: "hidden", fontFamily: SANS, fontWeight: 700, fontSize: 40, letterSpacing: "-0.01em", whiteSpace: "nowrap",
    transform: back ? "rotateX(180deg)" : undefined,
    ...(back
      ? { background: `linear-gradient(180deg, ${PAL.glow}, ${PAL.indigoDeep})`, color: "#fff", boxShadow: `0 20px 50px ${rgba(PAL.indigo, 0.45)}, 0 0 50px ${rgba(PAL.glow, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.4)` }
      : { background: "linear-gradient(180deg,#FFFFFF,#F2F3F8)", color: PAL.grey, border: "1px solid rgba(20,22,44,0.08)", boxShadow: "0 16px 40px rgba(20,22,44,0.12)" }),
  });
  const w = 440;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - 52 + bob, width: w, height: 104, perspective: 900, transform: `scale(${s * z}) rotate(${(1 - clamp01(s)) * jit(i, 20, 4)}deg)`, opacity: clamp01(s * 2), filter: dof > 0.3 ? `blur(${dof}px)` : undefined }}>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `rotateX(${rot}deg) scale(${1 + Math.sin(clamp01(fl) * Math.PI) * 0.12})` }}>
        <div style={face(false)}>
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={PAL.grey} strokeWidth={2.4} strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M6 6l12 12" /></svg>
          {COPY.toggleOff[i]}
        </div>
        <div style={face(true)}>
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          {COPY.toggleOn[i]}
        </div>
      </div>
    </div>
  );
};
