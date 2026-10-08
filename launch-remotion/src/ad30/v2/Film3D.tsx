import React from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { COPY, CUES, DURATION, FPS, MEDIA, MUSIC, T, VO, VO_GAIN, s2f } from "./config";
import { pr } from "../lib";
import { useFonts, FAMILY } from "./glyphs";
import { Post } from "./post";
import { applyCam, camAt, postAt } from "./rig";
import { Sky, Studio } from "./world";
import { SceneA } from "./sceneA";
import { SceneProof } from "./sceneProof";
import { SceneHinglish } from "./sceneHinglish";
import { SceneEnd } from "./sceneEnd";
import voJson from "./vo.json";

// CaptionsEasy · 30 s · v2 — one continuous 3D take. Edit config.ts; scenes live in scene*.tsx.

const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  useFrame(() => applyCam(camera as THREE.PerspectiveCamera, camAt(t)), -1);
  return null;
};

export const Film3D: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ready = useFonts();
  return (
    <AbsoluteFill style={{ background: "#DCDDFF" }}>
      {ready && (
        <ThreeCanvas width={1920} height={1080} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: 38, near: 0.1, far: 220, position: [0, 9, 0.35] }}>
          <CameraRig t={t} />
          <Sky t={t} />
          <Studio />
          <SceneA t={t} />
          <SceneProof t={t} />
          <SceneHinglish t={t} />
          <SceneEnd t={t} />
          <Post frame={frame} params={(fr) => postAt(fr / FPS)} />
        </ThreeCanvas>
      )}
      <Credit t={t} />
      <Soundtrack />
    </AbsoluteFill>
  );
};

const Credit: React.FC<{ t: number }> = ({ t }) => {
  const o = pr(t * 60, 28.7 * 60, 29.3 * 60);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, textAlign: "center", fontFamily: FAMILY.sans500, fontSize: 18, color: "rgba(11,12,26,0.5)", opacity: o, letterSpacing: "0.01em" }}>{COPY.credit}</div>
  );
};

type VoLine = { id: string; onset: number; end: number };
const VOL = voJson as VoLine[];
const voWindows = VO.map(([id, at]) => {
  const l = VOL.find((x) => x.id === id)!;
  return [at, at + (l.end - l.onset)] as const;
});
const voActive = (s: number) => {
  let v = 0;
  for (const [a, b2] of voWindows) v = Math.max(v, Math.min(pr(s * 60, (a - 0.12) * 60, (a + 0.02) * 60), 1 - pr(s * 60, (b2 - 0.05) * 60, (b2 + 0.2) * 60)));
  return v;
};

const Soundtrack: React.FC = () => (
  <>
    {MUSIC.pieces.map((p, i) => {
      const from = s2f(p.filmFrom);
      const len = s2f(p.filmTo) - from;
      return (
        <Sequence key={`m${i}`} from={from} durationInFrames={len} layout="none">
          <Audio
            src={staticFile(MUSIC.src)}
            trimBefore={s2f(p.songFrom)}
            volume={(lf) => {
              const s = (lf + from) / FPS;
              const duck = 1 - (1 - MUSIC.duckUnderVO) * voActive(s);
              const fade = i === MUSIC.pieces.length - 1 ? 1 - pr(lf + from, DURATION - 30, DURATION) : 1;
              return MUSIC.volume * duck * fade;
            }}
          />
        </Sequence>
      );
    })}
    {VO.map(([id, at]) => {
      const l = VOL.find((x) => x.id === id)!;
      const from = s2f(at - l.onset);
      return (
        <Sequence key={`v${id}`} from={Math.max(0, from)} layout="none">
          <Audio src={staticFile(`ad30/vo/${id}.mp3`)} volume={VO_GAIN} trimBefore={from < 0 ? -from : undefined} />
        </Sequence>
      );
    })}
    <Sequence from={s2f(T.proof[0])} durationInFrames={s2f(MEDIA.frameCount / MEDIA.frameFps)} layout="none">
      <Audio src={staticFile(MEDIA.voice)} volume={(lf) => { const s = T.proof[0] + lf / FPS; return MUSIC.voiceVolume - (MUSIC.voiceVolume - MUSIC.voiceUnderVO) * voActive(s); }} />
    </Sequence>
    {CUES.map(([at, sfx, gain, peak], i) => {
      const from = s2f(at - (peak ?? 0));
      return (
        <Sequence key={`c${i}`} from={Math.max(0, from)} layout="none">
          <Audio src={staticFile(`ad30/sfx/${sfx}.wav`)} volume={gain} trimBefore={from < 0 ? -from : undefined} />
        </Sequence>
      );
    })}
  </>
);
