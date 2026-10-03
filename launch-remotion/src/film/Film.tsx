import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { B, C, FILM_FRAMES, Grain, SiteLight } from "./core";
import { S1Open, S2Stop, S3Logo } from "./ActOne";
import { S4Site, S5Carousel } from "./ActTwo";
import { S6Steps, S7Wall, S8Claims, S9End } from "./ActThree";

// Shot list on the beat grid (beat n = B(n) frames). See launch-remotion/FILM.md.
const SHOTS: [number, number, React.FC][] = [
  [0, 8, S1Open],
  [8, 16, S2Stop],
  [16, 22.5, S3Logo],
  [22.5, 34, S4Site],
  [34, 46, S5Carousel],
  [46, 56, S6Steps],
  [56, 64, S7Wall],
  [64, 72, S8Claims],
];

// Sound cues pinned to beats: [beat, file, volume]
const SFX: [number, string, number][] = [
  [0.2, "pop", 0.25], [0.37, "pop", 0.22], [0.53, "pop", 0.2],
  [3.4, "whoosh", 0.3],
  [5, "tick", 0.22], [5.5, "tick", 0.22], [6, "tick", 0.22], [6.5, "tick", 0.22], [7, "tick", 0.22],
  [7.2, "whoosh", 0.4],
  [8, "bass", 0.6], [9, "pop", 0.3], [10, "pop", 0.3], [12, "pop", 0.25],
  [14.6, "whoosh", 0.35],
  [16, "pop", 0.25], [16.13, "pop", 0.22], [16.27, "pop", 0.2], [17, "whoosh", 0.22],
  [22.5, "whoosh", 0.45],
  [25.5, "whoosh", 0.18], [27.8, "whoosh", 0.15],
  [29.5, "whoosh", 0.25], [31.8, "whoosh", 0.4],
  [37.4, "tick", 0.25], [39.4, "tick", 0.25], [41.4, "tick", 0.25],
  [45.1, "whoosh", 0.45],
  [46.8, "tick", 0.22], [49.05, "tick", 0.22], [51.3, "tick", 0.22], [53.55, "tick", 0.22],
  [56, "bass", 0.55], [60.4, "whoosh", 0.45], [62.7, "whoosh", 0.22],
  [64, "pop", 0.3], [65, "pop", 0.3], [66, "pop", 0.3], [67, "pop", 0.3], [68, "pop", 0.3], [69, "pop", 0.3],
  [70.6, "whoosh", 0.4],
  [72, "bass", 0.7], [75.2, "pop", 0.3],
];

export const CaptionsEasyLaunch: React.FC = () => (
  <AbsoluteFill style={{ background: C.cream }}>
    <SiteLight />
    {SHOTS.map(([a, b, Shot]) => (
      <Sequence key={a} from={B(a)} durationInFrames={B(b) - B(a)}>
        <Shot />
      </Sequence>
    ))}
    <Sequence from={B(72)} durationInFrames={FILM_FRAMES - B(72)}>
      <S9End />
    </Sequence>
    <Grain />

    <Audio src={staticFile("film/music_edit.wav")} volume={0.85} />
    {SFX.map(([beat, name, v], i) => (
      <Sequence key={i} from={B(beat)} durationInFrames={90}>
        <Audio src={staticFile(name === "click" ? "film/sfx/click.ogg" : `film/sfx/${name}.wav`)} volume={v} />
      </Sequence>
    ))}
    <Sequence from={B(29)} durationInFrames={60}>
      <Audio src={staticFile("film/sfx/click.ogg")} volume={0.6} />
    </Sequence>
    <Sequence from={B(55.1)} durationInFrames={60}>
      <Audio src={staticFile("film/sfx/click.ogg")} volume={0.5} />
    </Sequence>
  </AbsoluteFill>
);
