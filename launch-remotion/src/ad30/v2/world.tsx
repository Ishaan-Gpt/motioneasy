import React from "react";
import * as THREE from "three";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { SKY } from "./config";
import { E, tw } from "../lib";

// The world the camera lives in: a sky whose mood changes over time, a floor that can flood into liquid indigo
// (with ripples), studio light for the glass, and the small shared pieces (glass, strings, soft shadows).

const col = (h: string) => new THREE.Color(h);
/** Sky colours at time t (seconds), eased between keys. */
export const skyAt = (t: number) => {
  let i = 0;
  while (i < SKY.length - 2 && t > SKY[i + 1][0]) i++;
  const [t0, a0, b0, c0] = SKY[i];
  const [t1, a1, b1, c1] = SKY[i + 1];
  const k = tw(t, t0, t1, 0, 1, E.inOut);
  return [col(a0).lerp(col(a1), k), col(b0).lerp(col(b1), k), col(c0).lerp(col(c1), k)] as const;
};

const SKY_VERT = "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const SKY_FRAG = `
uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float t; varying vec3 vP;
void main(){
  float h = vP.y * 0.5 + 0.5;
  vec3 c = mix(bot, mid, smoothstep(0.2, 0.52, h));
  c = mix(c, top, smoothstep(0.5, 0.85, h));
  float glow = exp(-pow(atan(vP.x, -vP.z) - 0.4 * sin(t * 0.15), 2.0) * 2.0) * smoothstep(0.3, 0.6, h) * 0.08;
  c += vec3(glow);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export const Sky: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  const m = React.useMemo(
    () => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, toneMapped: false, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: { top: { value: col("#fff") }, mid: { value: col("#fff") }, bot: { value: col("#fff") }, t: { value: 0 } } }),
    [],
  );
  const [a, b2, c] = skyAt(t);
  m.uniforms.top.value.copy(a);
  m.uniforms.mid.value.copy(b2);
  m.uniforms.bot.value.copy(c);
  m.uniforms.t.value = t;
  return (
    <mesh material={m} position={camera.position.clone()} renderOrder={-10}>
      <sphereGeometry args={[150, 48, 32]} />
    </mesh>
  );
};

const FLOOR_VERT = "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";
const FLOOR_FRAG = `
uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float t;
uniform vec2 liqC; uniform float liqR; uniform float liqMood;
uniform vec4 rip[6]; // xz, start time, strength
uniform vec3 deep; uniform vec3 bright;
varying vec3 vW;
float height(vec2 p){
  float h = 0.0;
  for (int i = 0; i < 6; i++) {
    float age = t - rip[i].z;
    if (age < 0.0 || rip[i].w <= 0.0) continue;
    float r = length(p - rip[i].xy);
    float front = age * 2.4;
    h += rip[i].w * sin((r - front) * 10.0) * exp(-abs(r - front) * 2.2) * exp(-age * 0.9);
  }
  h += 0.02 * sin(p.x * 1.7 + t * 0.9) * sin(p.y * 1.3 - t * 0.7);
  return h;
}
void main(){
  vec2 p = vW.xz;
  vec3 V = normalize(cameraPosition - vW);
  float d = length(p - cameraPosition.xz);
  // serene matte floor
  vec3 base = mix(mid, bot, 0.42 + 0.45 * smoothstep(1.0, 14.0, d));
  base = mix(base, top, 0.18 * exp(-d * 0.18));
  // liquid indigo (flooding out from liqC)
  float r = length(p - liqC);
  float wet = 1.0 - smoothstep(liqR - 0.35, liqR, r);
  if (wet > 0.0) {
    float e = 0.04;
    float hx = height(p + vec2(e, 0.0)) - height(p - vec2(e, 0.0));
    float hz = height(p + vec2(0.0, e)) - height(p - vec2(0.0, e));
    vec3 N = normalize(vec3(-hx * 3.0, 1.0, -hz * 3.0));
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 R = reflect(-V, N);
    float skyY = R.y * 0.5 + 0.5;
    vec3 refl = mix(mid, top, smoothstep(0.5, 0.9, skyY));
    vec3 liq = mix(deep, bright, 0.35 + 0.3 * liqMood);
    liq = mix(liq, refl, 0.25 + 0.6 * fres);
    float spec = pow(max(dot(R, normalize(vec3(-0.3, 0.8, 0.5))), 0.0), 60.0);
    liq += vec3(spec) * 0.9;
    float rim = exp(-abs(r - liqR) * 6.0) * 0.6;
    liq += bright * rim;
    base = mix(base, liq, wet);
  }
  // fade into the horizon
  float fog = smoothstep(9.0, 38.0, d);
  base = mix(base, mix(mid, top, 0.3), fog);
  gl_FragColor = vec4(base, 1.0);
  #include <colorspace_fragment>
}`;

export type Ripple = [number, number, number, number]; // x, z, start (s), strength
export const Floor: React.FC<{ t: number; center?: [number, number]; liquid?: { c: [number, number]; r: number; mood: number }; ripples?: Ripple[] }> = ({ t, center = [0, 0], liquid, ripples = [] }) => {
  const m = React.useMemo(
    () =>
      new THREE.ShaderMaterial({
        toneMapped: false,
        vertexShader: FLOOR_VERT,
        fragmentShader: FLOOR_FRAG,
        uniforms: {
          top: { value: col("#fff") }, mid: { value: col("#fff") }, bot: { value: col("#fff") }, t: { value: 0 },
          liqC: { value: new THREE.Vector2() }, liqR: { value: 0 }, liqMood: { value: 0 },
          rip: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
          deep: { value: col("#1B2490") }, bright: { value: col("#5163FF") },
        },
      }),
    [],
  );
  const [a, b2, c] = skyAt(t);
  m.uniforms.top.value.copy(a);
  m.uniforms.mid.value.copy(b2);
  m.uniforms.bot.value.copy(c);
  m.uniforms.t.value = t;
  m.uniforms.liqC.value.set(liquid?.c[0] ?? 0, liquid?.c[1] ?? 0);
  m.uniforms.liqR.value = liquid?.r ?? 0;
  m.uniforms.liqMood.value = liquid?.mood ?? 0;
  for (let i = 0; i < 6; i++) {
    const r = ripples[i];
    (m.uniforms.rip.value as THREE.Vector4[])[i].set(r?.[0] ?? 0, r?.[1] ?? 0, r?.[2] ?? 0, r?.[3] ?? 0);
  }
  return (
    <mesh material={m} rotation={[-Math.PI / 2, 0, 0]} position={[center[0], 0, center[1]]}>
      <planeGeometry args={[160, 160, 1, 1]} />
    </mesh>
  );
};

/** Studio light for reflections and refraction (procedural, no HDR download). */
export const Studio: React.FC = () => (
  <>
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={4} position={[0, 6, 3]} scale={[14, 2.5, 1]} />
      <Lightformer form="rect" intensity={2.4} position={[-7, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[3, 9, 1]} color="#C9CDFC" />
      <Lightformer form="rect" intensity={2} position={[7, 1.5, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[3, 9, 1]} color="#8E99F7" />
      <Lightformer form="ring" intensity={2.2} position={[2, 3, -6]} scale={3} color="#FFFFFF" />
      <Lightformer form="rect" intensity={1.2} position={[0, -3, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[20, 20, 1]} color="#6E7BF2" />
    </Environment>
    <ambientLight intensity={0.55} />
    <directionalLight position={[3, 6, 4]} intensity={1.4} />
  </>
);

/** Frosted glass. */
export const Glass: React.FC<{ tint?: string; rough?: number; thickness?: number; opacity?: number }> = ({ tint = "#E6E8FF", rough = 0.16, thickness = 0.35, opacity = 1 }) => (
  <meshPhysicalMaterial
    transmission={1}
    roughness={rough}
    thickness={thickness}
    ior={1.42}
    clearcoat={1}
    clearcoatRoughness={0.08}
    attenuationColor={tint}
    attenuationDistance={1.6}
    color="#FFFFFF"
    envMapIntensity={1.35}
    specularIntensity={1}
    transparent={opacity < 1}
    opacity={opacity}
  />
);

export const GlassSlab: React.FC<{ w: number; h: number; d?: number; r?: number; tint?: string; rough?: number }> = ({ w, h, d = 0.06, r, tint, rough }) => (
  <RoundedBox args={[w, h, d]} radius={r ?? Math.min(w, h, d) * 0.45} smoothness={5}>
    <Glass tint={tint} rough={rough} thickness={d * 3} />
  </RoundedBox>
);

/** A thin string from (0,0,0) down to (0,-len,0). */
export const StringLine: React.FC<{ len: number; color?: string; opacity?: number }> = ({ len, color = "#FFFFFF", opacity = 0.85 }) =>
  len <= 0.001 ? null : (
    <mesh position={[0, -len / 2, 0]}>
      <cylinderGeometry args={[0.0045, 0.0045, len, 6]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  );

let shadowTex: THREE.Texture | null = null;
const getShadowTex = () => {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(20,24,80,0.55)");
  grd.addColorStop(0.5, "rgba(20,24,80,0.22)");
  grd.addColorStop(1, "rgba(20,24,80,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
};
/** Soft contact shadow lying on the floor. */
export const SoftShadow: React.FC<{ x: number; z: number; w: number; d: number; opacity?: number }> = ({ x, z, w, d, opacity = 1 }) => (
  <mesh position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
    <planeGeometry args={[w, d]} />
    <meshBasicMaterial map={getShadowTex()} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
  </mesh>
);

/** Rounded-rectangle plane with 0..1 UVs (screens, image tiles). */
export const roundedRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 12);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - x) / w;
    uv[i * 2 + 1] = (pos.getY(i) - y) / h;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
};
