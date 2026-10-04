import React from "react";
import { AbsoluteFill, Img, Loop, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { B, C, E, MBlur, Rise, SANS, Words, kf, shutter, tw, vel } from "./core";
import { LOCK, Lockup } from "./ActOne";

// ── Shot 4 · beats 22.5–34 · The real site, in a browser, under a camera. ─────
// Base layout: screenshot (1920×1080) shown in a 1500px-wide window.
const S = 0.78125;
const WIN = { x: 210, y: (1080 - (1080 * S + 52)) / 2, chrome: 52 };
const CX = WIN.x;
const CY = WIN.y + WIN.chrome;
const base = (px: number, py: number): [number, number] => [CX + px * S, CY + py * S];

// Nav logo on the screenshot (measured): svg box at x 401.7, y 33.7, width 160.7.
const NAV = { x: 401.7, y: 33.7, w: 160.7, h: 160.7 * (125.8 / 735.4) };
const navBase = base(NAV.x, NAV.y);
const navCenter: [number, number] = [navBase[0] + (NAV.w * S) / 2, navBase[1] + (NAV.h * S) / 2];
const Z0 = (735.4 * LOCK.U * LOCK.push) / (NAV.w * S);

// Centre card of the hero carousel on the screenshot (Sol's clip).
const CARD = { x: 840, y: 653, w: 241, h: 339 };
const cardBase = base(CARD.x, CARD.y);
export const CARD_END = { w: 600 * (CARD.w / CARD.h), h: 600, cx: 960, cy: 600 };
const ZCARD = 600 / (CARD.h * S);

type Cam = { at: number; W: [number, number]; T: [number, number]; Z: number; ease?: (t: number) => number };
const CAM: Cam[] = [
  { at: B(22.5), W: navCenter, T: [LOCK.cx, LOCK.cy], Z: Z0 },
  { at: B(24.6), W: [960, 540], T: [960, 540], Z: 1, ease: E.hard },
  { at: B(25.4), W: [960, 540], T: [960, 540], Z: 1 },
  { at: B(26.8), W: base(955, 205), T: [960, 540], Z: 1.85, ease: E.ramp },
  { at: B(27.7), W: base(955, 215), T: [960, 540], Z: 1.9, ease: E.ramp },
  { at: B(28.6), W: base(860, 382), T: [960, 540], Z: 2.35, ease: E.ramp },
  { at: B(29.5), W: base(860, 382), T: [960, 540], Z: 2.38 },
  { at: B(30.9), W: base(960, 800), T: [960, 560], Z: 1.22, ease: E.ramp },
  { at: B(31.7), W: base(960, 805), T: [960, 560], Z: 1.25 },
  { at: B(34), W: [cardBase[0] + (CARD.w * S) / 2, cardBase[1] + (CARD.h * S) / 2], T: [CARD_END.cx, CARD_END.cy], Z: ZCARD, ease: E.hard },
];

const camAt = (f: number) => {
  if (f <= CAM[0].at) return CAM[0];
  for (let i = 0; i < CAM.length - 1; i++) {
    const a = CAM[i];
    const b = CAM[i + 1];
    if (f <= b.at) {
      const p = tw(f, a.at, b.at, 0, 1, b.ease ?? E.ramp);
      const lz = Math.log(a.Z) + (Math.log(b.Z) - Math.log(a.Z)) * p;
      const L = (u: number, v: number) => u + (v - u) * p;
      return { W: [L(a.W[0], b.W[0]), L(a.W[1], b.W[1])] as [number, number], T: [L(a.T[0], b.T[0]), L(a.T[1], b.T[1])] as [number, number], Z: Math.exp(lz) };
    }
  }
  return CAM[CAM.length - 1];
};
const camT = (f: number) => {
  const c = camAt(f);
  return { Z: c.Z, tx: c.T[0] - c.Z * c.W[0], ty: c.T[1] - c.Z * c.W[1] };
};

const Cursor: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <svg width={46} height={58} viewBox="-2 -2 23 29" style={{ position: "absolute", left: x, top: y, transform: `scale(${s})`, transformOrigin: "0 0", filter: "drop-shadow(0 6px 10px rgba(26,26,26,0.25))" }}>
    <path d="M0 0 L0 22 L6 17 L10 26 L13.5 24.5 L9.5 15.8 L17 15.8 Z" fill={C.ink} stroke={C.cream} strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

export const S4Site: React.FC = () => {
  const g = useCurrentFrame() + B(22.5);
  const { Z, tx, ty } = camT(g);
  const vx = vel((f) => camT(f).tx, g);
  const vy = vel((f) => camT(f).ty, g);
  // Zoom moves read as travel too; clamp so text never smears beyond legibility.
  const bX = Math.min(18, shutter(vx) * 0.6);
  const bY = Math.min(18, shutter(vy) * 0.6);

  const cardX = cardBase[0];
  const cardY = cardBase[1];

  // cursor, screen space
  const curX = kf(g, [[B(27.6), 1560], [B(28.6), 958, E.ramp], [B(29.6), 958], [B(30.6), 1700, E.in]]);
  const curY = kf(g, [[B(27.6), 1180], [B(28.6), 548, E.ramp], [B(29.6), 548], [B(30.6), 1250, E.in]]);
  const press = g >= B(29) ? 1 - 0.16 * Math.exp(-(g - B(29)) / 5) * Math.min(1, (g - B(29)) / 2) : 1;
  const ring = tw(g, B(29), B(29) + 24, 0, 1, E.out);
  const btn = base(707, 353);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <MBlur id="s4cam" x={bX} y={bY}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${Z})` }}>
          {/* browser window */}
          <div style={{
            position: "absolute", left: WIN.x, top: WIN.y, width: 1920 * S, height: 1080 * S + WIN.chrome, borderRadius: 22, overflow: "hidden",
            background: C.paper, boxShadow: "0 50px 120px rgba(26,26,26,0.16), 0 0 0 1.5px rgba(26,26,26,0.07)",
          }}>
            <div style={{ height: WIN.chrome, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", background: C.sand2, borderBottom: `1.5px solid ${C.sand}` }}>
              {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
              <div style={{ marginLeft: 400, width: 440, height: 30, borderRadius: 10, background: C.cream, border: `1.5px solid ${C.sand}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 600, fontSize: 15, color: C.muted }}>
                captionseasy.vercel.app
              </div>
            </div>
            <Img src={staticFile("film/site-hero.png")} style={{ width: 1920 * S, height: 1080 * S, display: "block" }} />
          </div>
          {/* button press shade on the real CTA */}
          {g >= B(29) && g < B(29) + 20 && (
            <div style={{ position: "absolute", left: btn[0], top: btn[1], width: 307 * S, height: 58 * S, borderRadius: 40, background: C.ink, opacity: 0.1 * (1 - (g - B(29)) / 20) }} />
          )}
          {/* live clip replaces the still centre card */}
          {g >= B(30.5) && (
            <div style={{ position: "absolute", left: cardX, top: cardY, width: CARD.w * S, height: CARD.h * S, borderRadius: 14 * S, overflow: "hidden", background: C.ink }}>
              <Sequence from={B(30.5) - B(22.5)} layout="none">
                <OffthreadVideo muted src={staticFile("film/hero/sol.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Sequence>
            </div>
          )}
          {/* vector logo sitting exactly on the raster nav logo: the match cut from Shot 3 */}
          <Img src={staticFile("film/brand/captionseasy-logo.svg")} style={{ position: "absolute", left: navBase[0], top: navBase[1], width: NAV.w * S, height: NAV.h * S }} />
        </div>
      </MBlur>
      {g > B(27.6) && g < B(30.6) && (
        <>
          <div style={{ position: "absolute", left: 958 - 46 * ring, top: 548 - 46 * ring, width: 92 * ring, height: 92 * ring, borderRadius: "50%", border: `3px solid ${C.ink}`, opacity: (1 - ring) * 0.5 }} />
          <Cursor x={curX} y={curY} s={press} />
        </>
      )}
    </AbsoluteFill>
  );
};

// ── Shot 5 · beats 34–46 · Coverflow of real captioned clips. ────────────────
const HERO = [
  { id: "aisha", look: "Bouncy Single Word", len: 6.8 },
  { id: "gianna", look: "Jumping Box", len: 6.2 },
  { id: "jesse", look: "3-Line Glow Hero", len: 6.8 },
  { id: "mckensie", look: "Kinetic Big Word", len: 6.5 },
  { id: "sol", look: "3-Line Stagger", len: 6.76 },
  { id: "omar", look: "Yellow Highlighter", len: 6.8 },
  { id: "rusita", look: "Giant Italic Hero", len: 6.7 },
  { id: "sam", look: "Script Hero Pop", len: 6.63 },
  { id: "william", look: "Comic Tilt", len: 6.63 },
  { id: "gereon", look: "Underline Sweep", len: 6.1 },
];
const STEPS = [B(37.4), B(39.4), B(41.4)];

export const S5Carousel: React.FC = () => {
  const g = useCurrentFrame() + B(34);
  const cFn = (f: number) =>
    kf(f, [[STEPS[0], 4], [STEPS[0] + 26, 5, E.ramp], [STEPS[1], 5], [STEPS[1] + 26, 6, E.ramp], [STEPS[2], 6], [STEPS[2] + 26, 7, E.ramp]]);
  const c = cFn(g);
  const exitFn = (f: number) => kf(f, [[B(45.1), 0], [B(46), -2500, E.in]]);
  const ex = exitFn(g);
  const bx = shutter(vel(exitFn, g)) + shutter(vel(cFn, g) * 400) * 0.5;
  const { w: CW, h: CH, cx, cy } = CARD_END;
  const labelIdx = [4, 5, 6, 7];
  const labelAt = [B(35), STEPS[0] + 10, STEPS[1] + 10, STEPS[2] + 10];

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <MBlur id="s5" x={bx}>
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${ex}px)` }}>
          <div style={{ position: "absolute", top: 92, width: "100%", display: "flex", justifyContent: "center" }}>
            <Words f={g} at={B(34.6)} stagger={4} outAt={B(39.9)} text="Word-perfect timing." serifIdx={[1]} serifScale={1.18}
              style={{ fontFamily: SANS, fontWeight: 800, fontSize: 92, letterSpacing: "-0.045em", color: C.ink, justifyContent: "center" }} />
          </div>
          <div style={{ position: "absolute", top: 100, width: "100%", display: "flex", justifyContent: "center" }}>
            <Words f={g} at={B(40.3)} stagger={3} text="Same transcript, same timing, new style." serifIdx={[4, 5]} serifScale={1.18}
              style={{ fontFamily: SANS, fontWeight: 800, fontSize: 80, letterSpacing: "-0.045em", color: C.ink, justifyContent: "center" }} />
          </div>

          <div style={{ position: "absolute", inset: 0, perspective: 2000, perspectiveOrigin: `${cx}px ${cy}px` }}>
            {HERO.map((h, i) => {
              const k = i - c;
              const ak = Math.abs(k);
              if (ak > 4.5) return null;
              const sgn = Math.sign(k);
              const x = sgn * (ak <= 1 ? ak * 400 : 400 + (ak - 1) * 255);
              const enter = i === 4 ? 1 : tw(g, B(34) + ak * 3, B(35.6) + ak * 3, 0, 1, E.out);
              const fly = (1 - enter) * sgn * 1500;
              const rotY = -Math.max(-1, Math.min(1, k)) * 32;
              const sc = 1 - Math.min(ak, 2.6) * 0.12;
              const z = -Math.min(ak, 3) * 140;
              const startFrom = i === 4 ? B(34) - B(30.5) : Math.round(i * 37);
              const lenF = Math.floor(h.len * 60) - startFrom - 2;
              return (
                <div key={h.id} style={{
                  position: "absolute", left: cx - CW / 2, top: cy - CH / 2, width: CW, height: CH, borderRadius: 22, overflow: "hidden",
                  transform: `translateX(${x + fly}px) translateZ(${z}px) rotateY(${rotY}deg) scale(${sc})`,
                  zIndex: 100 - Math.round(ak * 10), background: C.ink,
                  boxShadow: `0 ${40 - ak * 8}px ${90 - ak * 14}px rgba(26,26,26,${0.22 - ak * 0.03})`,
                }}>
                  <Loop durationInFrames={Math.max(60, lenF)}>
                    <OffthreadVideo muted src={staticFile(`film/hero/${h.id}.mp4`)} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </Loop>
                </div>
              );
            })}
          </div>

          {/* look name under the centre card */}
          <div style={{ position: "absolute", top: cy + CH / 2 + 34, width: "100%", display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", height: 58, width: 460 }}>
              {labelIdx.map((li, j) => (
                <div key={li} style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
                  <Rise f={g} at={labelAt[j]} dur={16} outAt={j < 3 ? STEPS[j] : undefined} outDur={8}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 26px", borderRadius: 40, background: C.ink, color: C.cream,
                      fontFamily: SANS, fontWeight: 700, fontSize: 26, letterSpacing: "-0.01em",
                    }}>
                      <span style={{ width: 10, height: 10, borderRadius: 5, background: C.emerald }} />
                      {HERO[li].look}
                    </div>
                  </Rise>
                </div>
              ))}
            </div>
          </div>
        </div>
      </MBlur>
    </AbsoluteFill>
  );
};

