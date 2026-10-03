import React from "react";
import { AbsoluteFill, Img, Easing, staticFile, useCurrentFrame } from "remotion";
import { B, C, E, LOGO, MBlur, Rise, SANS, SERIF, SPRING, Words, kf, rand, shutter, sp, tw, vel } from "./core";

const gentle = Easing.bezier(0.33, 0, 0.67, 1);

// ── Shot 1 · beats 0–8 · The logo's bars are a voice. Then they become caption
// chips on a timeline that someone is nudging by hand. ─────────────────────────
const CHIPS = [
  { t: "the first three", w: 430, bg: C.ink, fg: C.cream, tc: "00:00.42" },
  { t: "seconds", w: 270, bg: C.orange, fg: C.ink, tc: "00:01.36" },
  { t: "decide", w: 232, bg: C.emerald, fg: C.ink, tc: "00:02.10" },
];
const CHIP_H = 92;
const ROW_Y = 700;
const ROW_X0 = 960 - (CHIPS.reduce((a, c) => a + c.w, 0) + 18 * 2) / 2;
const chipCX = CHIPS.map((c, i) => ROW_X0 + CHIPS.slice(0, i).reduce((a, p) => a + p.w + 18, 0) + c.w / 2);

const NUDGE: Parameters<typeof kf>[1][] = [
  [[0, 0]],
  [[B(5.5), 0], [B(5.85), -30], [B(6.25), 22], [B(6.7), -12], [B(7), 0]],
  [[B(6), 0], [B(6.35), 26], [B(6.8), -16], [B(7.1), 0]],
];

export const S1Open: React.FC = () => {
  const g = useCurrentFrame();
  const U = 4.2;
  const barW = LOGO.barW * U;
  const barsSpan = (LOGO.bars[2].x + LOGO.barW) * U;
  const bottom = 540 + (89.33 * U) / 2 + 40;
  const exitX = (f: number) => kf(f, [[B(7.25), 0], [B(8), -2400, E.in]]);
  const ex = exitX(g);
  const bx = shutter(vel(exitX, g));

  const playX = (f: number) =>
    kf(f, [[B(5), 470], [B(5.5), 905, E.ramp], [B(6), 640, E.ramp], [B(6.5), 1265, E.ramp], [B(7), 990, E.ramp]]);
  const ph = tw(g, B(4.9), B(5.3), 0, 1, E.out);

  return (
    <AbsoluteFill>
      {/* headline */}
      <div style={{ position: "absolute", top: 196, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <Words f={g} at={B(4.1)} stagger={4} outAt={B(7.2)} text="Still timing captions"
          style={{ fontFamily: SANS, fontWeight: 800, fontSize: 112, letterSpacing: "-0.045em", color: C.ink, justifyContent: "center" }} />
        <Words f={g} at={B(5.25)} stagger={5} outAt={B(7.3)} text="by hand?" serifFrom={0} serifScale={1.25}
          style={{ fontSize: 112, color: C.ink, justifyContent: "center" }} />
      </div>

      <MBlur id="s1x" x={bx}>
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${ex}px)` }}>
          {/* timeline rail */}
          {(() => {
            const r = tw(g, B(3.9), B(4.7), 0, 1, E.out);
            return (
              <div style={{
                position: "absolute", left: ROW_X0 - 46, width: 966 + 92, top: ROW_Y - 82, height: 164, borderRadius: 34,
                background: C.sand2, border: `2px solid ${C.sand}`, transform: `scaleX(${r})`, opacity: r,
              }} />
            );
          })()}
          {/* timecodes */}
          {CHIPS.map((c, i) => (
            <div key={c.tc} style={{ position: "absolute", left: chipCX[i] - c.w / 2 + 6, top: ROW_Y + 98, fontFamily: SANS, fontWeight: 600, fontSize: 24, color: C.muted, fontVariantNumeric: "tabular-nums" }}>
              <Rise f={g} at={B(4.6) + i * 4}>{c.tc}</Rise>
            </div>
          ))}
          {/* bars → chips */}
          {CHIPS.map((c, i) => {
            const bar = LOGO.bars[i];
            const rise = sp(g, 6 + i * 5, SPRING.pop);
            let eq = 1;
            [1, 1.5, 2, 2.5, 3, 3.25].forEach((beat, k) => {
              const t = g - B(beat);
              if (t >= 0) eq += (rand(i * 31 + k * 7) - 0.42) * 0.85 * Math.min(1, t / 3) * Math.exp(-Math.max(0, t - 3) / 7);
            });
            eq = Math.max(0.35, eq);
            const H = bar.h * U * eq * rise;
            const bCX = 960 - barsSpan / 2 + bar.x * U + barW / 2;
            const bCY = bottom - H / 2;
            const p = tw(g, B(3.5) + i * 3, B(4.5) + i * 3, 0, 1, E.ramp);
            const nud = kf(g, NUDGE[i]);
            const cx = bCX + (chipCX[i] + nud - bCX) * p;
            const cy = bCY + (ROW_Y - bCY) * p;
            const w = barW + (c.w - barW) * p;
            const h = H + (CHIP_H - H) * p;
            return (
              <div key={i} style={{
                position: "absolute", left: cx - w / 2, top: cy - h / 2, width: w, height: h, borderRadius: Math.min(w, h) / 2,
                background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              }}>
                {p > 0.6 && (
                  <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, letterSpacing: "-0.02em", color: c.fg, whiteSpace: "nowrap" }}>
                    <Rise f={g} at={B(4.45) + i * 3} dur={18}>{c.t}</Rise>
                  </div>
                )}
              </div>
            );
          })}
          {/* playhead */}
          <div style={{ position: "absolute", left: playX(g) - 2, top: ROW_Y - 128, width: 4, height: 256, background: C.ink, borderRadius: 2, transform: `scaleY(${ph})`, transformOrigin: "50% 0%" }}>
            <div style={{ position: "absolute", left: -11, top: -14, width: 26, height: 26, borderRadius: 13, background: C.ink }} />
          </div>
        </div>
      </MBlur>
    </AbsoluteFill>
  );
};

// ── Shot 2 · beats 8–16 · The drop. "Stop timing captions." / "Start posting." ─
export const S2Stop: React.FC = () => {
  const g = useCurrentFrame() + B(8);
  const push = tw(g, B(8), B(16), 1, 1.07, gentle);
  const lift = tw(g, B(11.6), B(12.4), 0, 1, E.ramp);
  const slam = (at: number) => {
    const yFn = (f: number) => tw(f, at, at + 16, -70, 0, E.out);
    const s = tw(g, at, at + 16, 1.45, 1, E.out);
    return { s, y: yFn(g), o: tw(g, at, at + 4, 0, 1, E.out), b: shutter(vel(yFn, g) * 3) };
  };
  const word = (t: string, at: number, key: string) => {
    const m = slam(at);
    return (
      <span key={key} style={{ position: "relative", display: "inline-block", width: "auto" }}>
        <span style={{ display: "inline-block", transform: `translateY(${m.y}px) scale(${m.s})`, opacity: m.o, filter: m.b > 0.3 ? `blur(${m.b * 0.25}px)` : undefined }}>{t}</span>
      </span>
    );
  };
  const iris = kf(g, [[B(14.5), 0], [B(16), 1260, E.in]]);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <div style={{
          position: "absolute", width: "100%", top: 300, display: "flex", flexDirection: "column", alignItems: "center",
          fontFamily: SANS, fontWeight: 800, fontSize: 214, letterSpacing: "-0.05em", lineHeight: 0.98, color: C.cream,
          transform: `translateY(${-200 * lift}px) scale(${1 - 0.4 * lift})`, transformOrigin: "50% 0%",
        }}>
          <div style={{ display: "flex", gap: 52 }}>{word("Stop", B(8), "a")}{word("timing", B(9), "b")}</div>
          <div style={{ display: "flex" }}>{word("captions.", B(10), "c")}</div>
        </div>
        <div style={{ position: "absolute", width: "100%", top: 560, display: "flex", justifyContent: "center" }}>
          <Words f={g} at={B(12)} stagger={6} text="Start posting." serifFrom={0} serifScale={1} serifColor={C.emerald}
            style={{ fontSize: 270, color: C.emerald, justifyContent: "center", lineHeight: 1 }} gap={0.2} />
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 960 - iris, top: 690 - iris, width: iris * 2, height: iris * 2, borderRadius: "50%", background: C.cream }} />
    </AbsoluteFill>
  );
};

// ── Shot 3 · beats 16–22.5 · Logo reveal. Bars rise, slide, the wordmark slides
// out from behind them. Ends exactly where the site's nav logo sits (match cut). ─
export const LOCK = { U: 2.1, cx: 960, cy: 452, push: 1.04 };

export const Lockup: React.FC<{
  U: number;
  light?: boolean;
  barRise: (i: number) => number;
  slide?: number; // 0 = bars centred alone, 1 = final lockup
  wipe?: number; // 0..1 left-to-right reveal of the wordmark
  textY?: number; // % offset for a masked rise of the wordmark
}> = ({ U, light, barRise, slide = 1, wipe = 1, textY = 0 }) => {
  const W = LOGO.vbW * U;
  const H = LOGO.vbH * U;
  const dx0 = (LOGO.vbW / 2 - (LOGO.baseX + (LOGO.bars[2].x + LOGO.barW) / 2)) * U;
  const barsDX = dx0 * (1 - slide);
  const barsRight = (LOGO.baseX + LOGO.bars[2].x + LOGO.barW) * U + barsDX;
  const edge = (93 + (745 - 93) * wipe) * U;
  const textDX = -40 * U * (1 - wipe);
  const colors = light ? [C.cream, C.orange, C.emerald] : [C.ink, C.orange, C.emerald];
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(-20% ${W - edge}px -30% ${Math.max(0, barsRight + 4 * U)}px)` }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <Img src={staticFile(light ? "film/brand/logo-text-light.svg" : "film/brand/logo-text.svg")}
            style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translate(${textDX}px, ${textY}%)` }} />
        </div>
      </div>
      {LOGO.bars.map((b, i) => {
        const r = barRise(i);
        return (
          <div key={i} style={{
            position: "absolute", left: (LOGO.baseX + b.x) * U + barsDX, top: (LOGO.baseY - b.h) * U, width: LOGO.barW * U, height: b.h * U,
            borderRadius: 7.82 * U, background: colors[i], transform: `scaleY(${r})`, transformOrigin: "50% 100%",
          }} />
        );
      })}
    </div>
  );
};

export const S3Logo: React.FC = () => {
  const g = useCurrentFrame() + B(16);
  const { U, cx, cy } = LOCK;
  const slide = tw(g, B(17), B(17.9), 0, 1, E.ramp);
  const wipe = tw(g, B(17.45), B(18.6), 0, 1, E.ramp);
  const push = tw(g, B(18), B(22.5), 1, LOCK.push, gentle);
  const W = 735.4 * U;
  const H = 125.8 * U;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: cx - W / 2, top: cy - H / 2, transform: `scale(${push})` }}>
        <Lockup U={U} slide={slide} wipe={wipe} barRise={(i) => sp(g, B(16) + i * 4, SPRING.pop)} />
      </div>
      <div style={{ position: "absolute", top: cy + H / 2 + 70, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <Words f={g} at={B(19.2)} stagger={2} outAt={B(21.7)} text="Animated captions for your Shorts, Reels and TikToks,"
          style={{ fontFamily: SANS, fontWeight: 500, fontSize: 46, letterSpacing: "-0.02em", color: C.ink, justifyContent: "center" }} />
        <Words f={g} at={B(20.2)} stagger={4} outAt={B(21.8)} text="made right in your browser." serifFrom={0} serifScale={1.3}
          style={{ fontSize: 46, color: C.ink, justifyContent: "center" }} />
      </div>
    </AbsoluteFill>
  );
};

