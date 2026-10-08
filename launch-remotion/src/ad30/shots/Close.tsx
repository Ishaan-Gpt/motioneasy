import React from "react";
import { AbsoluteFill } from "remotion";
import { b, COPY, PAL } from "../config";
import { Cam, E, Elastic, LightWorld, kf, kfLog, pr, rgba } from "../lib";
import { WHIP2 } from "./Hinglish";

// Beats 39–43 · light world, whipped in from the right. One line per beat; each earlier line steps back to grey.
// The last line is the payoff in the serif accent. Exit: everything collapses into the centre (the tile is born there).

const YS = [370, 535, 705];
export const COLLAPSE = [b(42.45), b(43)] as const;

export const Close: React.FC<{ f: number }> = ({ f }) => {
  const x = (g: number) => kf(g, [[WHIP2[0], 2100], [WHIP2[1], 0, E.hard]]);
  const s = (g: number) => (g < COLLAPSE[0] ? kfLog(g, [[WHIP2[1], 1.04], [COLLAPSE[0], 1.0, E.out]]) : kfLog(g, [[COLLAPSE[0], 1], [COLLAPSE[1], 0.12, E.in]]));
  const fade = pr(f, COLLAPSE[0] + 8, COLLAPSE[1], E.in);
  return (
    <AbsoluteFill>
      {f < COLLAPSE[0] && (
        <AbsoluteFill style={{ transform: `translateX(${x(f)}px)` }}>
          <LightWorld f={f} />
        </AbsoluteFill>
      )}
      <Cam f={f} id="cam-close" x={x} s={s}>
        <AbsoluteFill style={{ opacity: 1 - fade }}>
          {COPY.close.map((line, i) => {
            const dim = i < 2 ? pr(f, b(40 + i) - 3, b(40 + i) + 9, E.out) : 0;
            const accent = line.startsWith("*");
            return (
              <div key={i} style={{ position: "absolute", left: 0, right: 0, top: YS[i], transform: "translateY(-50%)" }}>
                <Elastic
                  f={f} at={b(39 + i) - 4} text={line} size={accent ? 104 : 96} weight={800} color={PAL.text} accentColor={PAL.indigo} accentScale={1.15}
                  glow={rgba(PAL.glow, 0.5)} from="slam" stagger={1.1} seed={100 + i} dim={dim * 0.85} dimColor={PAL.greyLight}
                  shadow={`0 14px 40px ${rgba(PAL.indigoDeep, 0.1)}`}
                />
              </div>
            );
          })}
        </AbsoluteFill>
      </Cam>
    </AbsoluteFill>
  );
};
