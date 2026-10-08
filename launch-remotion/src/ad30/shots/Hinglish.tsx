import React from "react";
import { AbsoluteFill } from "remotion";
import { b, COPY, PAL } from "../config";
import { Cam, DISPLAY, DarkWorld, E, Elastic, SPR, clamp01, jit, kf, kfLog, pr, rgba, sp } from "../lib";

// Beats 35–39 · dark world. A Hinglish line pops in as an After Effects-style viral caption (word by word,
// a highlight that travels), then the answer: "Bilkul sahi." with a check that draws itself. Whip left on exit.

const WORD_BEATS = [35.55, 35.8, 36.05, 36.3, 36.55, 36.8];
const ANSWER = b(37.15);
export const WHIP2 = [b(38.6), b(39.05)] as const;

export const Hinglish: React.FC<{ f: number }> = ({ f }) => {
  const IN = b(35);
  const s = (g: number) => kfLog(g, [[IN - 4, 1.35], [IN + 34, 1.0, E.out], [WHIP2[0], 1.03]]);
  const x = (g: number) => kf(g, [[WHIP2[0], 0], [WHIP2[1], -2100, E.hard]]);
  const up = pr(f, ANSWER - 6, ANSWER + 18, E.ramp);
  return (
    <AbsoluteFill>
      <DarkWorld f={f} grid={0.9} />
      <Cam f={f} id="cam-hing" s={s} x={x}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 230 - up * 40, opacity: 1 - up * 0.4 }}>
          <Elastic f={f} at={b(35.2)} text={COPY.hinglishAsk} size={58} weight={600} color={PAL.peri} stagger={1.2} seed={81} />
        </div>
        <div style={{ position: "absolute", left: 960 - 650, width: 1300, top: 360 - up * 110, display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", columnGap: 34, rowGap: 18, transform: `scale(${1 - up * 0.22})` }}>
          {COPY.hinglishDemo.map((w, i) => (
            <CapWord key={i} f={f} i={i} word={w} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 690, display: "flex", justifyContent: "center", alignItems: "center", gap: 34 }}>
          <Elastic f={f} at={ANSWER} text={`*${COPY.hinglishAnswer}*`} size={150} accentScale={1.1} accentColor="#FFFFFF" glow={rgba(PAL.glow, 0.8)} stagger={1.4} seed={88} />
          <Check f={f} />
        </div>
      </Cam>
    </AbsoluteFill>
  );
};

const CapWord: React.FC<{ f: number; i: number; word: string }> = ({ f, i, word }) => {
  const at = b(WORD_BEATS[i]);
  const s = sp(f, at, SPR.elastic);
  if (f < at - 1) return <span style={{ fontFamily: DISPLAY, fontSize: 132, visibility: "hidden" }}>{word.toUpperCase()}</span>;
  const next = i < WORD_BEATS.length - 1 ? b(WORD_BEATS[i + 1]) : ANSWER;
  const active = f < next ? 1 : 1 - pr(f, next, next + 8);
  const hero = i === COPY.hinglishHero;
  const hl = clamp01(s) * active;
  return (
    <span
      style={{
        position: "relative", display: "inline-block", fontFamily: DISPLAY, fontSize: 132, lineHeight: 1, letterSpacing: "0.01em", textTransform: "uppercase",
        color: hero ? PAL.peri : "#FFFFFF", textShadow: "0 9px 0 rgba(0,0,0,0.55), 0 0 40px rgba(81,99,255,0.25)",
        transform: `translateY(${(1 - s) * 70}px) scale(${(0.25 + 0.75 * s) * (1 + 0.1 * hl)}) rotate(${(1 - s) * jit(i, 16, 5) - 3 * hl}deg)`,
        opacity: clamp01(s * 2.5), filter: s < 0.9 ? `blur(${(1 - clamp01(s)) * 8}px)` : undefined,
      }}
    >
      <span style={{ position: "absolute", left: -18, right: -18, top: -6, bottom: -10, borderRadius: 22, background: `linear-gradient(180deg, ${PAL.glow}, ${PAL.indigoDeep})`, boxShadow: `0 0 50px ${rgba(PAL.glow, 0.7)}`, opacity: hl, transform: `scaleX(${0.6 + 0.4 * hl})`, zIndex: -1 }} />
      {word.toUpperCase()}
    </span>
  );
};

const Check: React.FC<{ f: number }> = ({ f }) => {
  const at = ANSWER + 16;
  const d = pr(f, at, at + 16, E.out);
  const s = sp(f, at, SPR.elastic);
  return (
    <div style={{ width: 120, height: 120, borderRadius: 60, background: `linear-gradient(180deg, ${PAL.glow}, ${PAL.indigoDeep})`, boxShadow: `0 0 60px ${rgba(PAL.glow, 0.8)}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s})`, opacity: clamp01(s * 2) }}>
      <svg width={70} height={70} viewBox="0 0 24 24" fill="none">
        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - d} />
      </svg>
    </div>
  );
};
