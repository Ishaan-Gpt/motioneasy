import React from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { COPY, PAL, T } from "./config";
import { E, clamp01, pr, sp } from "../lib";
import { Glyphs, canvasTexture, fontCss, lineWidth } from "./glyphs";
import { Floor } from "./world";
import { HING } from "./rig";
import { wordTimes } from "./sceneA";

// Hinglish room · 21–23.4 s · night. A curved wall of Hinglish word pills sliding in alternating rows (the reference's
// pull-out pill grid). The spoken words light up exactly as they are said and a glowing thread connects them.
// The camera starts nose-to-nose with "Hinglish" and pulls out to the whole wall; then "Bilkul sahi." lands.

const PW = 1.28;
const PH = 0.36;
const MID = (HING.cols - 1) / 2;

const pillXYZ = (r: number, c: number, t: number) => {
  const slide = (r % 2 ? 1 : -1) * 0.16 * Math.max(0, t - T.hinglish[0]);
  const x = HING.x + (c - MID) * HING.dx + slide;
  const dx = x - HING.x;
  return { x, y: HING.y0 + r * HING.dy, z: HING.wallZ - dx * dx * 0.035, ry: -dx * 0.07 };
};

const textTex = new Map<string, THREE.Texture>();
const wordTex = (w: string, bright: boolean) => {
  const key = `${w}|${bright}`;
  if (!textTex.has(key))
    textTex.set(
      key,
      canvasTexture(512, 144, (ctx) => {
        ctx.font = fontCss("sans700", 68);
        ctx.textAlign = "center";
        ctx.fillStyle = bright ? "#FFFFFF" : "rgba(190,195,251,0.62)";
        if (bright) {
          ctx.shadowColor = "rgba(255,255,255,0.6)";
          ctx.shadowBlur = 18;
        }
        ctx.fillText(w, 256, 96);
      }),
    );
  return textTex.get(key)!;
};

export const SceneHinglish: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.hinglish[0] - 0.05 || t > T.whip[1] + 0.05) return null;
  const f = t * 60;
  const w1 = wordTimes("hing1", 21.0);
  const w2 = wordTimes("hing2a", 21.95);
  const w3 = wordTimes("hing2b", T.bilkul);
  const spoken = [
    { r: 4, c: MID - 3, w: "Hinglish", at: w1[0] },
    { r: 5, c: MID - 2, w: "mein", at: w1[1] },
    { r: 4, c: MID - 1, w: "bolo", at: w1[2] },
    { r: 3, c: MID, w: "captions?", at: w2[0] },
    { r: 4, c: MID + 1, w: "Bilkul", at: w3[0] },
    { r: 5, c: MID + 2, w: "sahi.", at: w3[1] },
  ];
  const key = (r: number, c: number) => `${r}:${c}`;
  const spokenAt = new Map(spoken.map((s) => [key(s.r, s.c), s]));

  const pills: React.ReactNode[] = [];
  for (let r = 0; r < HING.rows; r++) {
    for (let c = 0; c < HING.cols; c++) {
      const p = pillXYZ(r, c, t);
      const sp0 = spokenAt.get(key(r, c));
      const word = sp0 ? sp0.w : COPY.hinglishFill[(r * 7 + c * 3) % COPY.hinglishFill.length];
      const lit = sp0 && t >= sp0.at - 0.02 ? sp(f, (sp0.at - 0.02) * 60, { damping: 8, stiffness: 220, mass: 0.6 }) : 0;
      const on = clamp01(lit);
      pills.push(
        <group key={key(r, c)} position={[p.x, p.y, p.z]} rotation={[0, p.ry, 0]} scale={1 + 0.16 * lit}>
          <RoundedBox args={[PW, PH, 0.12]} radius={PH / 2 - 0.001} smoothness={4}>
            {on > 0 ? (
              <meshStandardMaterial color={PAL.indigoDeep} emissive={PAL.glow} emissiveIntensity={0.2 + 0.45 * on} roughness={0.3} />
            ) : (
              <meshStandardMaterial color="#141A62" emissive="#0B1052" emissiveIntensity={0.5} roughness={0.32} metalness={0.25} />
            )}
          </RoundedBox>
          <mesh position={[0, 0, 0.062]}>
            <planeGeometry args={[PW, (PW * 144) / 512]} />
            <meshBasicMaterial map={wordTex(word, on > 0.3)} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        </group>,
      );
    }
  }

  // the thread through the spoken words, drawn as they light
  const lit = spoken.filter((s) => t >= s.at);
  let thread: React.ReactNode = null;
  if (lit.length >= 1) {
    const pts = lit.map((s) => {
      const p = pillXYZ(s.r, s.c, t);
      return new THREE.Vector3(p.x, p.y, p.z + 0.1);
    });
    const next = spoken[lit.length];
    if (next) {
      const p = pillXYZ(next.r, next.c, t);
      const k = pr(f, lit[lit.length - 1].at * 60, next.at * 60, E.inOut);
      const a = pts[pts.length - 1];
      pts.push(new THREE.Vector3(a.x + (p.x - a.x) * k, a.y + (p.y - a.y) * k, a.z + (p.z + 0.1 - a.z) * k));
    }
    if (pts.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(pts);
      thread = (
        <mesh>
          <tubeGeometry args={[curve, 64, 0.016, 8, false]} />
          <meshBasicMaterial color="#9AA6FF" toneMapped={false} />
        </mesh>
      );
    }
  }

  // the answer
  const bw = lineWidth(`*${COPY.bilkul}*`, 0.78);
  const badge = t >= T.bilkul + 0.32 ? sp(f, (T.bilkul + 0.32) * 60, { damping: 8, stiffness: 200, mass: 0.6 }) : 0;
  return (
    <>
      <Floor t={t} center={[HING.x, 0]} />
      {pills}
      {thread}
      <group position={[HING.x - 0.3, 1.95, 2.7]}>
        <Glyphs t={t} text={`*${COPY.bilkul}*`} size={0.78} at={T.bilkul} wordAt={[T.bilkul, T.bilkul + 0.26]} stagger={0.03} accentColor="#FFFFFF" glow="rgba(120,135,255,0.95)" seed={88} />
        {badge > 0 && (
          <group position={[bw / 2 + 0.55, 0.22, 0]} scale={badge}>
            <mesh>
              <sphereGeometry args={[0.24, 48, 48]} />
              <meshStandardMaterial color={PAL.indigo} emissive={PAL.glow} emissiveIntensity={1.8} />
            </mesh>
            <Check t={t} at={T.bilkul + 0.4} />
          </group>
        )}
      </group>
    </>
  );
};

const Check: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  const d = pr(t * 60, at * 60, (at + 0.25) * 60, E.out);
  const curve = React.useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(-0.11, 0.0, 0), new THREE.Vector3(-0.03, -0.08, 0), new THREE.Vector3(0.12, 0.09, 0)], false, "catmullrom", 0.01), []);
  if (d <= 0) return null;
  const pts = curve.getPoints(24).slice(0, Math.max(2, Math.round(25 * d)));
  return (
    <mesh position={[0, 0, 0.25]}>
      <tubeGeometry args={[new THREE.CatmullRomCurve3(pts), 24, 0.022, 8, false]} />
      <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
    </mesh>
  );
};
