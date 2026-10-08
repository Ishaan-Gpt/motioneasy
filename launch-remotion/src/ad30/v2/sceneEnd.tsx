import React from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { COPY, PAL, T } from "./config";
import { E, clamp01, jit, pr, sp } from "../lib";
import { Glyphs, canvasTexture, fontCss } from "./glyphs";
import { Floor, Glass, SoftShadow } from "./world";
import { END } from "./rig";
import { Hanging, wordTimes } from "./sceneA";

// Close + end room · 23.4–30 s · bright. Callback to the opening: three positive cards drop on their strings.
// On the song's final hit they are yanked away, the strings converge and a glass app tile drops in on them,
// the real logo bars spring up inside it, then the tagline (synced to the VO) and the URL.

const CW = 2.05;
const CH = 0.74;
const closeFace = (line: string) =>
  canvasTexture(1024, Math.round((1024 * CH) / CW), (ctx) => {
    const H = ctx.canvas.height;
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.beginPath();
    ctx.roundRect(12, 12, 1000, H - 24, 44);
    ctx.fill();
    const accent = line.startsWith("*");
    const text = line.replace(/\*/g, "");
    ctx.textAlign = "center";
    ctx.font = accent ? fontCss("serif", 150) : fontCss("sans800", 118);
    ctx.fillStyle = accent ? PAL.indigo : PAL.ink;
    if (accent) {
      ctx.shadowColor = "rgba(81,99,255,0.55)";
      ctx.shadowBlur = 24;
    }
    ctx.fillText(text, 512, H / 2 + (accent ? 46 : 40));
  });

const POS: [number, number, number][] = [[END.x - 1.95, 2.3, END.z - 0.7], [END.x, 1.62, END.z + 0.5], [END.x + 1.95, 2.38, END.z - 0.9]];

const seg = (a: THREE.Vector3, b: THREE.Vector3) => {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return { len, mid, q };
};

const BARS = [
  { x: 27, h: 48, c: "#1A1A1A" },
  { x: 50, h: 80, c: PAL.orange },
  { x: 73, h: 64, c: PAL.emerald },
];

const urlFace = () =>
  canvasTexture(1024, 210, (ctx) => {
    ctx.font = fontCss("sans700", 92);
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,40,0.35)";
    ctx.shadowBlur = 12;
    ctx.fillText(COPY.url, 512, 136);
  });

export const SceneEnd: React.FC<{ t: number }> = ({ t }) => {
  const faces = React.useMemo(() => COPY.close.map(closeFace), []);
  const url = React.useMemo(urlFace, []);
  if (t < T.whip[0]) return null;
  const f = t * 60;
  // the tile drops on its strings at the final hit
  const drop = sp(f, (T.end - 0.04) * 60, { damping: 6.5, stiffness: 105, mass: 1 });
  const age = Math.max(0, t - T.end);
  const swing = 0.035 * Math.exp(-age / 1.4) * Math.sin(age * 3.0) + 0.006 * Math.sin(t * 1.2);
  const tileY = 2.05 + (1 - drop) * 7;
  const top = new THREE.Vector3(END.x, tileY + 0.65, END.z);
  const lines: React.ReactNode[] = [];
  if (t >= T.end - 0.12) {
    for (let i = 0; i < 18; i++) {
      const tipX = END.x + (i - 8.5) * 0.95 + jit(i, 0.25, 2);
      const far = new THREE.Vector3(tipX, 10.5, END.z + jit(i, 2.2, 7));
      const k = pr(f, (T.end - 0.12 + Math.abs(jit(i, 0.08, 3))) * 60, (T.end + 0.18) * 60, E.out);
      const end = far.clone().lerp(top, k);
      const { len, mid, q } = seg(far, end);
      if (len < 0.01) continue;
      lines.push(
        <mesh key={i} position={mid} quaternion={q}>
          <cylinderGeometry args={[0.004, 0.004, len, 5]} />
          <meshBasicMaterial color={i % 3 === 0 ? PAL.glow : "#FFFFFF"} transparent opacity={0.8} toneMapped={false} />
        </mesh>,
      );
    }
  }
  const tA = wordTimes("tag_a", T.tagA);
  const tB = wordTimes("tag_b", T.tagB);
  const pill = t >= T.url ? sp(f, T.url * 60, { damping: 8, stiffness: 180, mass: 0.7 }) : 0;
  const K = 0.0086;
  return (
    <>
      <Floor t={t} center={[END.x, END.z]} />
      {POS.map((p, i) => (
        <Hanging key={i} t={t} pos={p} w={CW} h={CH} d={0.06} at={T.closeCards[i]} front={faces[i]} yankAt={T.end - 0.02 + i * 0.03} seed={i * 1.9 + 0.7} top={10} />
      ))}
      {lines}
      {t >= T.end - 0.1 && (
        <group position={[END.x, tileY, END.z]} rotation={[0, 0, swing]}>
          <RoundedBox args={[1.3, 1.3, 0.3]} radius={0.3} smoothness={6}>
            <Glass tint="#F0F1FF" rough={0.22} thickness={0.8} />
          </RoundedBox>
          <mesh position={[0, 0, 0.0]}>
            <boxGeometry args={[1.08, 1.08, 0.14]} />
            <meshStandardMaterial color="#FFFFFF" transparent opacity={0.55} roughness={0.5} />
          </mesh>
          {BARS.map((b2, i) => {
            const s = sp(f, (T.end + 0.22 + i * 0.07) * 60, { damping: 7.5, stiffness: 170, mass: 0.7 });
            const h = b2.h * K;
            const w = 14 * K;
            return (
              <RoundedBox key={i} args={[w, Math.max(0.001, h * clamp01(s * 1.2)), w]} radius={w / 2 - 0.001} smoothness={5} position={[(b2.x - 50) * K * 1.0, -0.38 + (h * Math.min(1.15, s)) / 2, 0.17]}>
                <meshPhysicalMaterial color={b2.c} roughness={0.25} clearcoat={1} />
              </RoundedBox>
            );
          })}
        </group>
      )}
      {t >= T.end && <SoftShadow x={END.x} z={END.z} w={1.6} d={0.7} opacity={clamp01(drop) * 0.6} />}
      <Glyphs t={t} text={`${COPY.tagA} ${COPY.tagB}`} size={0.3} at={tA[0]} wordAt={[tA[0], tA[1], tB[0], tB[1]]} stagger={0.026} color={PAL.ink} accentColor={PAL.indigo} glow="rgba(81,99,255,0.5)" shadow="rgba(34,51,181,0.2)" position={[END.x, 0.82, END.z + 0.45]} seed={140} />
      {pill > 0 && (
        <group position={[END.x, 0.3, END.z + 0.5]} scale={pill}>
          <RoundedBox args={[1.55, 0.3, 0.1]} radius={0.149} smoothness={5}>
            <meshStandardMaterial color={PAL.indigoDeep} emissive={PAL.glow} emissiveIntensity={0.85} roughness={0.25} />
          </RoundedBox>
          <mesh position={[0, 0, 0.056]}>
            <planeGeometry args={[1.55, (1.55 * 210) / 1024]} />
            <meshBasicMaterial map={url} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      )}
    </>
  );
};
