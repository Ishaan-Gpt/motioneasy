import React from "react";
import { AbsoluteFill } from "remotion";
import { b, COPY, PAL } from "../config";
import { Cam, DarkWorld, E, Elastic, SANS, SPR, clamp01, jit, kf, kfLog, pr, rgba, sp, textW } from "../lib";
import { CARDS, blobPos } from "./Search";

// Beats 8–13 · the music drops to near-silence: three pains land one per beat while the camera tracks the line.
// "Plain white subtitles." is set as a literal plain white subtitle (Arial + outline): the words act out their meaning.
// Beat 11 = THE DROP: everything is knocked away, "No more." slams, and its full stop becomes the iris into the logo.

const SIZE = 150;
const GAP = 70;
const ROW_Y = 520;
const PLAIN_FONT = "Arial, Helvetica, sans-serif";
const PLAIN_SIZE = 112;

const words = () => {
  const ws = [
    { text: COPY.pains[0], w: textW(COPY.pains[0], SANS, SIZE, 800, "-0.025em") },
    { text: COPY.pains[1], w: textW(COPY.pains[1], SANS, SIZE, 800, "-0.025em") },
    { text: COPY.pains[2], w: textW(COPY.pains[2], PLAIN_FONT, PLAIN_SIZE, 700) },
  ];
  let x = 0;
  return ws.map((w) => {
    const o = { ...w, x };
    x += w.w + GAP;
    return o;
  });
};

// "No more." geometry (shared with the Logo scene for the iris)
export const TURN_SIZE = 230;
export const dotGeom = () => {
  const text = COPY.turn.replace(/\.$/, "");
  const wNo = textW(text, SANS, TURN_SIZE, 800, "-0.025em");
  const d = TURN_SIZE * 0.17;
  const total = wNo + 8 + d;
  const left = 960 - total / 2;
  return { text, left, wNo, d, x: left + wNo + 8 + d / 2, y: 540 + TURN_SIZE * 0.265 };
};
export const IRIS_AT = b(12);
export const irisR = (f: number) => (f < IRIS_AT ? 0 : kfLog(f, [[IRIS_AT, dotGeom().d / 2], [IRIS_AT + 22, 2400, E.in]]));

export const Pains: React.FC<{ f: number }> = ({ f }) => {
  const ws = words();
  const DROP = b(11);
  // camera: centre the newest word, ramping in just before it lands (cut on motion)
  const camX = (g: number) => {
    const keys: [number, number, ((t: number) => number)?][] = [[b(7.6), -(ws[0].x + ws[0].w / 2) + 120]];
    ws.forEach((w, i) => keys.push([b(8 + i) + 6, -(w.x + w.w / 2), i === 0 ? E.out : E.hard]));
    keys.push([DROP, -(ws[2].x + ws[2].w / 2) - 40, E.inOut]);
    return kf(g, keys) + 960;
  };
  const punch = (g: number) => (g < DROP ? kfLog(g, [[b(8), 1.0], [DROP, 1.05, E.inOut]]) : 1 + 0.09 * (1 - pr(g, DROP, DROP + 34, E.out)));
  const dg = dotGeom();
  const drop = f >= DROP;
  return (
    <AbsoluteFill>
      <DarkWorld f={f} glow={1 + (drop ? 0.6 * (1 - pr(f, DROP, DROP + 60)) : 0)} />
      {/* the melted result cards, now soft blobs drifting behind the type */}
      <AbsoluteFill style={{ filter: "blur(46px)", opacity: 0.55 * (1 - pr(f, b(10.6), b(11.3))) }}>
        {CARDS.map((c, i) => {
          const p = blobPos(f, i);
          return <div key={i} style={{ position: "absolute", left: p.x - 260 * c.z, top: p.y - 150 * c.z, width: 520 * c.z, height: 300 * c.z, borderRadius: "50%", background: i % 2 ? PAL.indigoDeep : PAL.glow }} />;
        })}
      </AbsoluteFill>
      {/* drop bloom */}
      {drop && (
        <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, ${rgba(PAL.glow, 0.5 * (1 - pr(f, DROP, DROP + 50)))} 0%, rgba(0,0,0,0) 55%)` }} />
      )}
      <Cam f={f} id="cam-pains" s={punch}>
        {/* the tracked line */}
        <Cam f={f} id="cam-track" x={camX} blur>
          {ws.map((w, i) => {
            const at = b(8 + i) - 4;
            const out = pr(f, DROP - 4 + i, DROP + 7, E.in);
            const flyY = jit(i, 420, 31) * out;
            const style: React.CSSProperties = { position: "absolute", left: w.x, top: ROW_Y, transform: `translate(0, -50%) translateY(${flyY}px) scale(${1 + out * 0.6})`, filter: out > 0 ? `blur(${out * 30}px)` : undefined, opacity: 1 - out };
            if (i < 2)
              return (
                <div key={i} style={style}>
                  <Elastic f={f} at={at} text={w.text} size={SIZE} weight={800} from="slam" stagger={1.1} seed={40 + i} color={i === 0 ? PAL.white : rgba(PAL.peri, 1)} shadow="0 20px 60px rgba(0,0,0,0.7)" align="left" />
                </div>
              );
            // the plain one: no animation at all, it just cuts on, like a boring subtitle
            const on = f >= at + 4;
            return (
              <div key={i} style={{ ...style, top: ROW_Y + 18, opacity: on ? 1 - out : 0 }}>
                <span style={{ fontFamily: PLAIN_FONT, fontWeight: 700, fontSize: PLAIN_SIZE, color: "#fff", WebkitTextStroke: "3px #000", paintOrder: "stroke fill", whiteSpace: "nowrap" }}>{w.text}</span>
              </div>
            );
          })}
          {/* playhead ball rolling under the line */}
          <Ball f={f} ws={ws} />
        </Cam>
        {/* No more. */}
        {drop && (
          <>
            <div style={{ position: "absolute", left: dg.left, top: 540, transform: "translateY(-50%)", whiteSpace: "nowrap" }}>
              <Elastic f={f} at={DROP - 3} text={dg.text} size={TURN_SIZE} weight={800} from="slam" stagger={1.3} seed={77} color={PAL.white} shadow={`0 0 80px ${rgba(PAL.glow, 0.55)}, 0 24px 70px rgba(0,0,0,0.6)`} align="left" />
            </div>
            <Dot f={f} />
          </>
        )}
      </Cam>
    </AbsoluteFill>
  );
};

const Ball: React.FC<{ f: number; ws: { x: number; w: number }[] }> = ({ f, ws }) => {
  const keys: [number, number, ((t: number) => number)?][] = [[b(7.8), ws[0].x - 80]];
  ws.forEach((w, i) => keys.push([b(8 + i) + 8, w.x + w.w + 20, E.hard]));
  const x = kf(f, keys);
  const r = 26;
  const out = pr(f, b(11), b(11) + 16, E.in);
  const appear = sp(f, b(7.7), SPR.pop);
  return (
    <>
      <div style={{ position: "absolute", left: ws[0].x - 140, width: ws[2].x + ws[2].w + 240 - ws[0].x, top: ROW_Y + 132, height: 2, background: `linear-gradient(90deg, rgba(190,195,251,0), ${rgba(PAL.peri, 0.35)} 20%, ${rgba(PAL.peri, 0.35)} 80%, rgba(190,195,251,0))`, opacity: appear * (1 - out) }} />
      <div
        style={{
          position: "absolute", left: x - r, top: ROW_Y + 133 - r * 2, width: r * 2, height: r * 2, borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, #fff 0%, ${PAL.peri} 30%, ${PAL.glow} 62%, ${PAL.indigoDeep} 100%)`,
          boxShadow: `0 0 40px ${rgba(PAL.glow, 0.8)}, 0 12px 26px rgba(0,0,0,0.6)`,
          transform: `scale(${appear}) translateY(${-out * 300}px) rotate(${(x / r) * 57}deg)`, opacity: 1 - out,
        }}
      />
    </>
  );
};

const Dot: React.FC<{ f: number }> = ({ f }) => {
  const g = dotGeom();
  const s = sp(f, b(11) + 6, SPR.elastic);
  const r = Math.max(g.d / 2, irisR(f));
  return (
    <div
      style={{
        position: "absolute", left: g.x - r, top: g.y - r, width: r * 2, height: r * 2, borderRadius: "50%",
        background: f >= IRIS_AT ? PAL.indigo : PAL.glow, boxShadow: `0 0 ${30 + r * 0.2}px ${rgba(PAL.glow, 0.9)}`,
        transform: `scale(${f >= IRIS_AT ? 1 : clamp01(s) * (s > 1 ? s : 1)})`,
      }}
    />
  );
};
