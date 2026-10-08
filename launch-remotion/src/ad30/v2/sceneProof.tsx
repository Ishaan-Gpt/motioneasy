import React from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender, staticFile } from "remotion";
import { COPY, MEDIA, PAL, T } from "./config";
import { E, clamp01, kf, pr, sp } from "../lib";
import { Glyphs, canvasTexture, fontCss } from "./glyphs";
import { Floor, GlassSlab, SoftShadow, roundedRect } from "./world";
import { PROOF } from "./rig";
import { wordTimes } from "./sceneA";

// Proof room · 12–21 s · the real take (3 CaptionsEasy looks, one every 3 s) on a phone that rises on a camera ramp.
// Glass look chips get clicked exactly when the look changes; Export → progress → Done; a glass loupe magnifies
// the corner where a watermark would sit (real refraction).

const P = PROOF.phone;
const SCR = { w: 1.12, h: 1.99 };

// clip frames as an image sequence: deterministic, and we redraw the GL frame once the image is in
const imgCache = new Map<number, HTMLImageElement>();
const loadImg = (i: number) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const c = imgCache.get(i);
    if (c) return res(c);
    const im = new Image();
    im.onload = () => {
      imgCache.set(i, im);
      res(im);
    };
    im.onerror = rej;
    im.src = staticFile(MEDIA.frames(i));
  });
const useClipTexture = (t: number) => {
  const { advance } = useThree();
  const tex = React.useMemo(() => {
    const x = new THREE.Texture();
    x.colorSpace = THREE.SRGBColorSpace;
    x.generateMipmaps = false;
    x.minFilter = THREE.LinearFilter;
    return x;
  }, []);
  const idx = Math.min(MEDIA.frameCount, Math.max(1, Math.floor((t - T.proof[0]) * MEDIA.frameFps) + 1));
  React.useLayoutEffect(() => {
    const cached = imgCache.get(idx);
    if (cached) {
      if (tex.image !== cached) {
        tex.image = cached;
        tex.needsUpdate = true;
      }
    } else {
      const h = delayRender(`clip frame ${idx}`);
      loadImg(idx).then((im) => {
        tex.image = im;
        tex.needsUpdate = true;
        advance(performance.now());
        continueRender(h);
      });
    }
    for (let k = 1; k <= 4; k++) if (idx + k <= MEDIA.frameCount) loadImg(idx + k);
  }, [idx, tex, advance]);
  return tex;
};

const useTextures = (srcs: string[]) => {
  const [tex, setTex] = React.useState<THREE.Texture[] | null>(null);
  const [h] = React.useState(() => delayRender("proof thumbs"));
  const { advance } = useThree();
  React.useEffect(() => {
    if (tex) {
      advance(performance.now());
      continueRender(h);
    }
  }, [tex]);
  React.useEffect(() => {
    const L = new THREE.TextureLoader();
    Promise.all(srcs.map((s) => L.loadAsync(staticFile(s)))).then((ts) => {
      ts.forEach((x) => (x.colorSpace = THREE.SRGBColorSpace));
      setTex(ts);
    });
  }, []);
  return tex;
};

const screenGeo = roundedRect(SCR.w, SCR.h, 0.11);
const thumbGeo = roundedRect(0.4, 0.54, 0.06);

const Phone: React.FC<{ t: number }> = ({ t }) => {
  const f = t * 60;
  const tex = useClipTexture(t);
  const s = sp(f, (T.proof[0] - 0.08) * 60, { damping: 12, stiffness: 70, mass: 1 });
  const bump = [15.0, 18.0].reduce((a, at) => a + (t >= at ? Math.sin(Math.PI * clamp01((t - at) / 0.28)) * 0.03 : 0), 0);
  const flash = [15.0, 18.0].reduce((a, at) => a + (t >= at ? 0.55 * (1 - clamp01((t - at) / 0.16)) : 0), 0);
  const ry = -0.85 * (1 - s) - 0.2 + 0.05 * Math.sin(t * 0.5);
  const rx = 0.38 * (1 - s) + 0.03;
  const rz = 0.14 * (1 - s);
  return (
    <group position={[P[0], P[1] - (1 - s) * 3.4, P[2]]} rotation={[rx, ry, rz]} scale={1 - bump}>
      <RoundedBox args={[1.24, 2.27, 0.09]} radius={0.13} smoothness={6}>
        <meshPhysicalMaterial color="#14162A" roughness={0.22} metalness={0.55} clearcoat={1} clearcoatRoughness={0.06} />
      </RoundedBox>
      <mesh geometry={screenGeo} position={[0, 0, 0.0465]}>
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {flash > 0.01 && (
        <mesh geometry={screenGeo} position={[0, 0, 0.048]}>
          <meshBasicMaterial color="#FFFFFF" transparent opacity={flash} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      <RoundedBox args={[0.27, 0.075, 0.01]} radius={0.035} smoothness={4} position={[0, 0.9, 0.05]}>
        <meshBasicMaterial color="#000000" />
      </RoundedBox>
      <Loupe t={t} />
    </group>
  );
};

/** Glass loupe in front of the screen: real refraction of the clip behind it. */
const Loupe: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.lens[0] - 0.05 || t > T.lens[1] + 0.3) return null;
  const f = t * 60;
  const a = sp(f, T.lens[0] * 60, { damping: 10, stiffness: 200, mass: 0.7 });
  const out = pr(f, T.lens[1] * 60, (T.lens[1] + 0.25) * 60, E.in);
  const k = pr(f, T.lens[0] * 60, T.lens[1] * 60, E.inOut);
  const y = -0.7 + k * 1.38;
  const sc = clamp01(a) * (1 - out);
  return (
    <group position={[0.3, y, 0.24]} scale={sc}>
      <mesh>
        <sphereGeometry args={[0.24, 64, 64]} />
        <meshPhysicalMaterial transmission={1} roughness={0} thickness={0.9} ior={1.55} clearcoat={1} color="#FFFFFF" envMapIntensity={1.4} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.245, 0.014, 16, 64]} />
        <meshStandardMaterial color="#E9EAF6" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
};

const checkTex = () =>
  canvasTexture(128, 128, (ctx) => {
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(30, 66);
    ctx.lineTo(55, 90);
    ctx.lineTo(98, 40);
    ctx.stroke();
  });

const Chips: React.FC<{ t: number }> = ({ t }) => {
  const f = t * 60;
  const thumbs = useTextures(MEDIA.thumbs);
  const check = React.useMemo(checkTex, []);
  if (!thumbs) return null;
  const active = t < 15.0 ? 0 : t < 18.0 ? 1 : 2;
  return (
    <>
      {[0, 1, 2].map((k) => {
        const s = sp(f, (12.85 + k * 0.08) * 60, { damping: 9, stiffness: 160, mass: 0.8 });
        const isA = active === k;
        const selAt = k === 0 ? T.proof[0] + 0.85 : k === 1 ? 15.0 : 18.0;
        const sel = isA ? sp(f, selAt * 60, { damping: 8, stiffness: 220, mass: 0.6 }) : 0;
        return (
          <group key={k} position={[PROOF.chipX + (1 - s) * 1.3, PROOF.chipYs[k], P[2] + 0.1]} rotation={[0, -0.28, 0]} scale={(0.6 + 0.4 * s) * (1 + 0.08 * clamp01(sel))}>
            <GlassSlab w={0.48} h={0.62} d={0.05} r={0.07} />
            <mesh geometry={thumbGeo} position={[0, 0, 0.03]}>
              <meshBasicMaterial map={thumbs[k]} toneMapped={false} color={isA ? "#FFFFFF" : "#9A9CB0"} />
            </mesh>
            {isA && (
              <>
                <RoundedBox args={[0.55, 0.69, 0.02]} radius={0.08} smoothness={4} position={[0, 0, -0.02]}>
                  <meshStandardMaterial color={PAL.indigo} emissive={PAL.glow} emissiveIntensity={1.6 * clamp01(sel)} />
                </RoundedBox>
                <group position={[0.21, 0.28, 0.06]} scale={sel}>
                  <mesh>
                    <sphereGeometry args={[0.065, 32, 32]} />
                    <meshStandardMaterial color={PAL.indigo} emissive={PAL.glow} emissiveIntensity={1.2} />
                  </mesh>
                  <mesh position={[0, 0, 0.066]}>
                    <planeGeometry args={[0.1, 0.1]} />
                    <meshBasicMaterial map={check} transparent toneMapped={false} depthWrite={false} />
                  </mesh>
                </group>
              </>
            )}
          </group>
        );
      })}
    </>
  );
};

const exportFace = (label: string) =>
  canvasTexture(1024, 300, (ctx) => {
    ctx.font = fontCss("sans700", 104);
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,40,0.4)";
    ctx.shadowBlur = 16;
    ctx.fillText(label, 512, 186);
  });
const ExportPill: React.FC<{ t: number }> = ({ t }) => {
  const f = t * 60;
  const faces = React.useMemo(() => [exportFace(`⤓  ${COPY.exportLabel}`), exportFace("Exporting..."), exportFace("✓  Done")], []);
  if (t < 17.25) return null;
  const s = sp(f, 17.3 * 60, { damping: 9, stiffness: 170, mass: 0.8 });
  const press = t >= T.exportPress ? Math.sin(Math.PI * clamp01((t - T.exportPress) / 0.2)) * 0.12 : 0;
  const prog = pr(f, (T.exportPress + 0.08) * 60, T.exportDone * 60, E.inOut);
  const done = t >= T.exportDone ? sp(f, T.exportDone * 60, { damping: 8, stiffness: 220, mass: 0.6 }) : 0;
  const face = t < T.exportPress + 0.08 ? faces[0] : t < T.exportDone ? faces[1] : faces[2];
  const W = 0.86;
  const H = 0.25;
  return (
    <group position={[PROOF.chipX - 0.05, PROOF.exportY, P[2] + 0.18]} rotation={[0, -0.28, 0]} scale={[(0.5 + 0.5 * s) * (1 + press * 0.3), (0.5 + 0.5 * s) * (1 - press), 0.5 + 0.5 * s]}>
      <RoundedBox args={[W, H, 0.1]} radius={H / 2 - 0.001} smoothness={5}>
        <meshStandardMaterial color={PAL.indigoDeep} emissive={PAL.glow} emissiveIntensity={0.55 + done * 0.9} roughness={0.25} />
      </RoundedBox>
      {prog > 0 && prog < 1 && (
        <mesh position={[-W / 2 + (W * prog) / 2, 0, 0.052]}>
          <planeGeometry args={[W * prog, H]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.28} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[0, 0, 0.056]}>
        <planeGeometry args={[W, (W * 300) / 1024]} />
        <meshBasicMaterial map={face} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
};

// 3D cursor: an extruded arrow with a dark outline
const arrowShape = (() => {
  const pts: [number, number][] = [[5, 3], [19, 11.2], [12.7, 12.6], [16.3, 19.2], [13.7, 20.6], [10.1, 14], [5, 18.6]];
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo((x - 5) * 0.013, -(y - 3) * 0.013) : s.moveTo((x - 5) * 0.013, -(y - 3) * 0.013)));
  s.closePath();
  return s;
})();
const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, { depth: 0.02, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
const Cursor: React.FC<{ t: number }> = ({ t }) => {
  if (t < 14.15 || t > 19.1) return null;
  const f = t * 60;
  const K: [number, number, number][] = [
    [14.15, 42.7, 0.0],
    [14.85, PROOF.chipX + 0.06, PROOF.chipYs[1] - 0.05],
    [17.85, PROOF.chipX + 0.06, PROOF.chipYs[2] - 0.05],
    [18.22, PROOF.chipX + 0.12, PROOF.exportY - 0.02],
    [19.0, 42.9, -0.4],
  ];
  const x = kf(t, K.map(([a, xx], i) => [a, xx, i ? E.ramp : undefined]));
  const y = kf(t, K.map(([a, , yy], i) => [a, yy, i ? E.ramp : undefined]));
  const clicks = [T.clicks[0], T.clicks[1], T.exportPress];
  let press = 0;
  const rings: React.ReactNode[] = [];
  clicks.forEach((c, i) => {
    if (t >= c - 0.06) press = Math.max(press, Math.sin(Math.PI * clamp01((t - c + 0.06) / 0.2)));
    if (t >= c) {
      const r = pr(f, c * 60, (c + 0.4) * 60, E.out);
      if (r < 1) rings.push(
        <mesh key={i} position={[x, y, P[2] + 0.32]} scale={0.3 + r * 1.4}>
          <torusGeometry args={[0.06, 0.006, 8, 48]} />
          <meshBasicMaterial color={PAL.glow} transparent opacity={0.9 * (1 - r)} toneMapped={false} />
        </mesh>,
      );
    }
  });
  return (
    <>
      {rings}
      <group position={[x, y, P[2] + 0.36 - press * 0.05]} rotation={[0, -0.28, 0]} scale={1 - press * 0.15}>
        <mesh geometry={arrowGeo}>
          <meshPhysicalMaterial color="#FFFFFF" roughness={0.2} clearcoat={1} />
        </mesh>
        <mesh geometry={arrowGeo} position={[0.004, -0.004, -0.012]} scale={1.08}>
          <meshBasicMaterial color={PAL.ink} />
        </mesh>
      </group>
    </>
  );
};

const Copy: React.FC<{ t: number }> = ({ t }) => {
  const st = COPY.proof;
  const looks = wordTimes("looks", T.copyProof[1]);
  const click = wordTimes("click", 16.4);
  const exp = wordTimes("export", T.copyProof[2]);
  const zero = wordTimes("zero", 18.9);
  const states = [
    { at: T.copyProof[0], line: st[0].line, accent: st[0].accent, lineW: undefined as number[] | undefined, accW: [T.copyProof[0] + 0.45], out: 14.75 },
    { at: looks[0], line: st[1].line, accent: st[1].accent, lineW: [looks[0], looks[2], looks[3]], accW: click, out: 17.85 },
    { at: exp[0], line: st[2].line, accent: st[2].accent, lineW: [exp[0], exp[1], exp[1] + 0.22], accW: zero, out: 20.4 },
  ];
  const x = PROOF.copyX;
  return (
    <group>
      {states.map((s, i) =>
        t < s.at - 0.05 || t > s.out + 0.5 ? null : (
          <group key={i}>
            <Glyphs t={t} text={`0${i + 1} / 03`} size={0.11} at={s.at - 0.1} stagger={0.02} font="sans700" color={PAL.indigo} anchor="left" position={[x, 2.3, P[2] + 0.5]} rotation={[0, 0.2, 0]} outAt={s.out} seed={30 + i} />
            <Glyphs t={t} text={s.line} size={0.3} at={s.at} wordAt={s.lineW} stagger={0.028} font="sans800" color={PAL.ink} shadow="rgba(34,51,181,0.22)" anchor="left" position={[x, 1.82, P[2] + 0.5]} rotation={[0, 0.2, 0]} outAt={s.out} seed={40 + i} />
            <Glyphs t={t} text={`*${s.accent}*`} size={0.34} at={s.accW[0]} wordAt={s.accW} stagger={0.028} accentColor={PAL.indigo} glow="rgba(81,99,255,0.55)" anchor="left" position={[x, 1.34, P[2] + 0.5]} rotation={[0, 0.2, 0]} outAt={s.out + 0.05} seed={50 + i} />
          </group>
        ),
      )}
    </group>
  );
};

export const SceneProof: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.proof[0] - 0.05 || t > T.proof[1] + 0.02) return null;
  const s = sp(t * 60, (T.proof[0] - 0.08) * 60, { damping: 12, stiffness: 70, mass: 1 });
  return (
    <>
      <Floor t={t} />
      <SoftShadow x={P[0]} z={P[2]} w={2.0} d={0.8} opacity={clamp01(s) * 0.7} />
      <Phone t={t} />
      <Chips t={t} />
      <ExportPill t={t} />
      <Cursor t={t} />
      <Copy t={t} />
    </>
  );
};
