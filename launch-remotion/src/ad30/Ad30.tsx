import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { CUES, DURATION, FPS, MUSIC, b } from "./config";
import { Grain, Vignette, pr } from "./lib";
import { Search } from "./shots/Search";
import { Pains } from "./shots/Pains";
import { Logo } from "./shots/Logo";
import { Toggle } from "./shots/Toggle";
import { Proof } from "./shots/Proof";
import { Hinglish } from "./shots/Hinglish";
import { Close } from "./shots/Close";
import { End } from "./shots/End";

// Scene windows in frames, drawn in this order (later = on top). Overlaps are the transitions:
// Logo sits over Pains inside the iris; Toggle whips up under the Logo; Close whips in over Hinglish; End lies under Close.
const SCENES: { C: React.FC<{ f: number }>; from: number; to: number; dark?: boolean }[] = [
  { C: Search, from: 0, to: b(7.75), dark: true },
  { C: Pains, from: b(7.75), to: b(12.7), dark: true },
  { C: Logo, from: b(12), to: b(16.06) },
  { C: Toggle, from: b(15.5), to: b(20.05) },
  { C: Proof, from: b(20.05), to: b(35) },
  { C: Hinglish, from: b(35), to: b(39.06), dark: true },
  { C: End, from: b(42.45), to: DURATION },
  { C: Close, from: b(38.55), to: b(43.02) },
];

export const AD30_FRAMES = DURATION;

export const Ad30: React.FC = () => {
  const f = useCurrentFrame();
  const dark = SCENES.some((s) => s.dark && f >= s.from && f < s.to) && !(f >= b(12.4) && f < b(35));
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SCENES.map(({ C, from, to }, i) => (f >= from && f < to ? <C key={i} f={f} /> : null))}
      <Vignette amount={dark ? 0.45 : 0.16} />
      <Grain f={f} opacity={dark ? 0.06 : 0.045} dark={dark} />
      <Soundtrack />
    </AbsoluteFill>
  );
};

const Soundtrack: React.FC = () => {
  const duck = (g: number) => {
    const a = pr(g, b(20) - 10, b(20) + 6);
    const z = 1 - pr(g, b(35) - 6, b(35) + 10);
    return 1 - (1 - MUSIC.duckUnderVoice) * Math.min(a, z);
  };
  return (
    <>
      {MUSIC.pieces.map((p, i) => {
        const from = Math.round(p.filmFrom * FPS);
        const len = Math.round(p.filmTo * FPS) - from;
        return (
          <Sequence key={i} from={from} durationInFrames={len} layout="none">
            <Audio src={staticFile(MUSIC.src)} trimBefore={Math.round(p.songFrom * FPS)} volume={(lf) => MUSIC.volume * duck(lf + from) * (i === MUSIC.pieces.length - 1 ? 1 - pr(lf + from, DURATION - 24, DURATION) : 1)} />
          </Sequence>
        );
      })}
      {CUES.map((c, i) => {
        const at = b(c.beat) - Math.round((c.peak ?? 0) * FPS);
        const trim = at < 0 ? -at : 0;
        return (
          <Sequence key={`c${i}`} from={Math.max(0, at)} layout="none">
            <Audio src={staticFile(`ad30/sfx/${c.sfx}.wav`)} volume={c.gain ?? 1} trimBefore={trim || undefined} />
          </Sequence>
        );
      })}
    </>
  );
};
