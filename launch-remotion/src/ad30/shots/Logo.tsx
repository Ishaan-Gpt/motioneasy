import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { b, COPY, MEDIA, PAL } from "../config";
import { E, Elastic, Swirl, clamp01, kfLog, pr, rgba, sp } from "../lib";
import { IRIS_AT, dotGeom, irisR } from "./Pains";

// Beats 12–16 · revealed through the iris born in "No more." · liquid indigo swirl → the real logo:
// the three bars spring up (elastic), slide left, and the wordmark slides out from behind them. Whip up on exit.

// Real logo geometry: sources/brand/captionseasy-icon-light.svg (viewBox 100)
const BARS = [
  { x: 20, y: 42, h: 48, c: "#FFFFEB" },
  { x: 43, y: 10, h: 80, c: "#FFA946" },
  { x: 66, y: 26, h: 64, c: "#34D399" },
];
const K = 1.9; // icon scale (px per svg unit)
const WM = { w: 648.4, h: 118.6, scale: 1.28 };

export const LOGO_OUT = b(15.55);

export const Logo: React.FC<{ f: number }> = ({ f }) => {
  const g = dotGeom();
  const r = irisR(f);
  const clip = f < IRIS_AT + 24 ? `circle(${r}px at ${g.x}px ${g.y}px)` : undefined;
  const BARS_AT = b(13.35);
  const slide = pr(f, b(13.95), b(14.65), E.ramp);
  const iconW = 80 * K;
  const wmW = WM.w * WM.scale;
  const lockW = iconW + 26 + wmW;
  const iconX = 960 - iconW / 2 + slide * (960 - lockW / 2 - (960 - iconW / 2));
  const reveal = pr(f, b(14.05), b(14.85), E.out);
  const camS = kfLog(f, [[IRIS_AT, 1.18], [b(13.6), 1.04, E.out], [LOGO_OUT, 1.0, E.inOut]]);
  const whip = pr(f, LOGO_OUT, b(16.05), E.hard); // same curve as the Toggle scene coming up: one vertical whip pan
  return (
    <AbsoluteFill style={{ clipPath: clip, transform: `translateY(${-whip * 1150}px)`, filter: whip > 0.02 ? `blur(${whip * 10}px)` : undefined }}>
      <Swirl f={f} speed={1.3} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 40% 34% at 50% 50%, rgba(255,255,255,${0.22 * pr(f, b(13.3), b(14))}) 0%, rgba(255,255,255,0) 70%)` }} />
      <AbsoluteFill style={{ transform: `scale(${camS})` }}>
        {/* icon bars */}
        <div style={{ position: "absolute", left: iconX - 20 * K, top: 540 - 50 * K, width: 100 * K, height: 100 * K }}>
          {BARS.map((bar, i) => {
            const s = sp(f, BARS_AT + i * 5, { damping: 8, stiffness: 190, mass: 0.7 });
            return (
              <div
                key={i}
                style={{
                  position: "absolute", left: bar.x * K, top: bar.y * K, width: 14 * K, height: bar.h * K, borderRadius: 7 * K, background: bar.c,
                  transform: `scaleY(${s})`, transformOrigin: "50% 100%", opacity: clamp01(s * 3),
                  boxShadow: `0 18px 40px ${rgba(PAL.navy, 0.55)}, 0 0 30px ${rgba("#FFFFFF", 0.18)}`,
                }}
              />
            );
          })}
        </div>
        {/* wordmark, revealed from behind the bars */}
        <div
          style={{
            position: "absolute", left: iconX + iconW + 26, top: 540 - (WM.h * WM.scale) / 2 + 8, width: wmW, height: WM.h * WM.scale,
            clipPath: `inset(-20% ${(1 - reveal) * 100}% -20% 0)`,
            transform: `translateX(${(1 - reveal) * -90}px)`, filter: reveal < 1 ? `blur(${(1 - reveal) * 10}px)` : undefined,
          }}
        >
          <Img src={staticFile(MEDIA.wordmarkLight)} style={{ width: "100%", height: "100%", filter: `drop-shadow(0 14px 34px ${rgba(PAL.navy, 0.6)})` }} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 690 }}>
          <Elastic f={f} at={b(14.6)} text={COPY.endSub} size={40} weight={600} color={rgba("#FFFFFF", 0.88)} stagger={0.9} seed={12} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

