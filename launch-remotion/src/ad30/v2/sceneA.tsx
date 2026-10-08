import React from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { continueRender, delayRender, staticFile } from "remotion";
import { useThree } from "@react-three/fiber";
import { COPY, MEDIA, PAL, T } from "./config";
import { E, clamp01, jit, pr, sp } from "../lib";
import { Glyphs, advance, canvasTexture, fontCss } from "./glyphs";
import { Floor, Glass, GlassSlab, SoftShadow, StringLine, type Ripple } from "./world";
import { A, TOGGLE, knobX, turnDot } from "./rig";
import voJson from "./vo.json";

// Scene A · 0–12 s · one space: hook → search bar → hanging cards → pains → THE DROP → marble → liquid → logo → toggle.

type V3 = [number, number, number];
type VoLine = { id: string; onset: number; words: { t: number; w: string; show?: string }[] };
const VO = voJson as VoLine[];
/** Absolute time (s) of each word of a VO phrase whose speech onset is placed at `at`. */
export const wordTimes = (id: string, at: number) => {
  const l = VO.find((x) => x.id === id)!;
  const w0 = l.words[0]?.t ?? 0;
  return l.words.map((w) => at + (w.t - w0));
};

// ── hook text lying on the floor (read from the top view) ─────────────────────
const HookText: React.FC<{ t: number }> = ({ t }) => (
  <group position={[0, 0.012, A.hookZ]} rotation={[-Math.PI / 2, 0, 0]}>
    <Glyphs t={t} text={COPY.hook} size={A.hookSize} at={T.hookWords[0]} wordAt={[T.hookWords[0], T.hookWords[1]]} stagger={0.035} mode="pop" font="sans800" color={PAL.ink} shadow="rgba(34,51,181,0.28)" seed={3} />
  </group>
);

// ── the glass search bar ──────────────────────────────────────────────────────
const SearchBar: React.FC<{ t: number }> = ({ t }) => {
  const f = t * 60;
  const { x, y, z, w, h, d } = A.bar;
  const appear = sp(f, 0.0, { damping: 14, stiffness: 120, mass: 1 });
  const press = t >= T.enter ? Math.sin(Math.PI * clamp01((t - T.enter) / 0.22)) : 0;
  const q = COPY.query;
  const typeTimes = wordTimes("hook_b", T.type[0]);
  // spread each word's letters across its spoken length
  const charAt: number[] = [];
  let wi = 0;
  for (let i = 0; i < q.length; i++) {
    if (q[i] === " ") { wi++; charAt.push(-1); continue; }
    const ws = typeTimes[Math.min(wi, typeTimes.length - 1)];
    const we = wi + 1 < typeTimes.length ? typeTimes[wi + 1] : T.type[1];
    const wordStart = q.lastIndexOf(" ", i - 1) + 1;
    const wordEnd = q.indexOf(" ", i) === -1 ? q.length : q.indexOf(" ", i);
    charAt.push(ws + ((i - wordStart) / Math.max(1, wordEnd - wordStart)) * (we - ws) * 0.85);
  }
  const typedChars = charAt.filter((c) => c >= 0 && c <= t).length;
  const caretOn = t < T.type[1] + 0.1 || Math.floor(t * 3.2) % 2 === 0;
  const ring = pr(f, T.enter * 60, (T.enter + 0.6) * 60, E.out);
  return (
    <group position={[x, y - press * 0.035, z]} scale={[1, appear, 1]}>
      <GlassSlab w={w} h={h} d={d} r={0.12} tint="#DCE0FF" rough={0.1} />
      {/* frosted inner panel so letters read */}
      <mesh position={[0, h / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.22, d - 0.2]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* magnifier icon standing up */}
      <group position={[-w / 2 + 0.34, h / 2, 0.02]} rotation={[-(1 - sp(f, 1.15 * 60)) * Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0.17, 0]}>
          <torusGeometry args={[0.085, 0.022, 12, 32]} />
          <meshStandardMaterial color={PAL.indigo} emissive={PAL.glow} emissiveIntensity={0.35} roughness={0.3} />
        </mesh>
        <mesh position={[0.085, 0.085, 0]} rotation={[0, 0, Math.PI / 4]}>
          <capsuleGeometry args={[0.02, 0.07, 6, 12]} />
          <meshStandardMaterial color={PAL.indigo} roughness={0.3} />
        </mesh>
      </group>
      {/* the query, letters standing up as they are typed */}
      <group position={[A.typeX - x, h / 2, 0.02]}>
        <Glyphs t={t} text={q} size={A.typeSize} at={T.type[0]} wordAt={typeTimes} stagger={0.045} mode="standup" font="sans700" color={PAL.ink} shadow="rgba(34,51,181,0.35)" anchor="left" seed={7} />
      </group>
      {/* caret */}
      {t >= T.type[0] - 0.3 && caretOn && (
        <mesh position={[A.typeX - x + caretX(q, typedChars) + 0.03, h / 2 + 0.17, 0.02]}>
          <boxGeometry args={[0.022, 0.34, 0.022]} />
          <meshBasicMaterial color={PAL.glow} toneMapped={false} />
        </mesh>
      )}
      {/* enter key */}
      <group position={[w / 2 - 0.34, h / 2 + 0.06 - press * 0.05, 0]}>
        <RoundedBox args={[0.36, 0.12, 0.36]} radius={0.05} smoothness={4}>
          <meshPhysicalMaterial color={t >= T.enter ? PAL.glow : "#FFFFFF"} emissive={PAL.glow} emissiveIntensity={t >= T.enter ? 1.2 * (1 - ring) + 0.2 : 0} roughness={0.15} clearcoat={1} transmission={t >= T.enter ? 0 : 0.6} thickness={0.3} />
        </RoundedBox>
      </group>
      {/* enter ripple ring on the floor */}
      {t >= T.enter && ring < 1 && (
        <mesh position={[0, -y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={1 + ring * 3}>
          <ringGeometry args={[w / 2 + 0.05, w / 2 + 0.12, 96]} />
          <meshBasicMaterial color={PAL.glow} transparent opacity={0.7 * (1 - ring)} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};
/** Caret sits after the n-th typed letter (spaces count), measured with the same font as the letters. */
const caretX = (q: string, n: number) => {
  let seen = 0;
  let i = 0;
  for (; i < q.length && seen < n; i++) if (q[i] !== " ") seen++;
  return advance(q.slice(0, i), "sans700") * A.typeSize;
};

// ── a card hanging on a string (pendulum, flips, snaps, yanks) ─────────────────
export type HangProps = {
  t: number; pos: V3; w: number; h: number; d?: number; at: number; front: THREE.Texture; back?: THREE.Texture;
  flipAt?: number; snapAt?: number; yankAt?: number; seed: number; top?: number; capsule?: boolean; tint?: string;
};
export const Hanging: React.FC<HangProps> = ({ t, pos, w, h, d = 0.05, at, front, back, flipAt, snapAt, yankAt, seed, top = 9.5, capsule = false, tint }) => {
  const f = t * 60;
  if (t < at - 0.05) return null;
  const s = sp(f, at * 60, { damping: 6.5, stiffness: 110, mass: 1 });
  const age = t - at;
  const L = top - (pos[1] + h / 2);
  let dy = (1 - s) * 3.6;
  let swingZ = 0.03 * Math.exp(-age / 1.5) * Math.sin(age * 2.6 + seed) + 0.006 * Math.sin(t * 1.3 + seed);
  const swingX = 0.022 * Math.exp(-age / 1.7) * Math.sin(age * 2.2 + seed * 2) + 0.004 * Math.sin(t * 1.05 + seed);
  let twist = 0.16 * Math.exp(-age / 1.3) * Math.sin(age * 3.4 + seed) + 0.05 * Math.sin(t * 0.9 + seed * 3);
  if (flipAt !== undefined && t >= flipAt) twist += Math.PI * Math.min(1.08, sp(f, flipAt * 60, { damping: 10, stiffness: 120, mass: 0.8 }));
  let fall = 0;
  let tumble = 0;
  let stringLen = L;
  if (snapAt !== undefined && t >= snapAt) {
    const a = t - snapAt;
    fall = 0.5 * 11 * a * a;
    tumble = a * jit(seed, 3.2, 4);
    stringLen = Math.max(0, L * (1 - a * 5));
  }
  if (yankAt !== undefined && t >= yankAt) dy += 10 * pr(f, yankAt * 60, (yankAt + 0.4) * 60, E.in);
  const pivotY = top + dy;
  return (
    <>
      <group position={[pos[0], pivotY, pos[2]]} rotation={[swingX, 0, swingZ]}>
        <StringLine len={snapAt !== undefined && t >= snapAt ? 0 : L} />
        <group position={[0, -L - h / 2 - fall, 0]} rotation={[tumble * 0.6, twist, tumble]}>
          {capsule ? (
            <RoundedBox args={[w, h, d]} radius={Math.min(h, d) / 2 - 0.001} smoothness={5}>
              <Glass tint={tint} rough={0.14} thickness={d * 3} />
            </RoundedBox>
          ) : (
            <GlassSlab w={w} h={h} d={d} r={0.06} tint={tint} />
          )}
          <mesh position={[0, 0, d / 2 + 0.003]}>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial map={front} transparent depthWrite={false} toneMapped={false} />
          </mesh>
          {back && (
            <mesh position={[0, 0, -d / 2 - 0.003]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial map={back} transparent depthWrite={false} toneMapped={false} />
            </mesh>
          )}
        </group>
        {snapAt !== undefined && t >= snapAt && <group position={[0, 0, 0]}><StringLine len={Math.max(0, stringLen * 0.5)} opacity={0.6} /></group>}
      </group>
      {fall < 3 && <SoftShadow x={pos[0]} z={pos[2]} w={w * 1.3} d={0.8} opacity={clamp01(s) * 0.45 * (1 - fall / 3)} />}
    </>
  );
};

// ── card faces ─────────────────────────────────────────────────────────────────
const CW = 1024;
const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};
const lock = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) => {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.14;
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s * 0.42, s * 0.28, Math.PI, 0);
  ctx.stroke();
  roundRect(ctx, x + s * 0.1, y + s * 0.42, s * 0.8, s * 0.58, s * 0.12);
  ctx.fill();
};
export const resultFace = (title: string, tag: string, aspect: number) =>
  canvasTexture(CW, Math.round(CW / aspect), (ctx) => {
    const H = ctx.canvas.height;
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    roundRect(ctx, 14, 14, CW - 28, H - 28, 46);
    ctx.fill();
    ctx.fillStyle = "rgba(43,59,217,0.25)";
    ctx.beginPath();
    ctx.arc(80, 86, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(11,12,26,0.18)";
    roundRect(ctx, 124, 74, 300, 22, 11);
    ctx.fill();
    ctx.fillStyle = PAL.ink;
    ctx.font = fontCss("sans800", 64);
    ctx.fillText(title, 56, 196);
    ctx.font = fontCss("sans700", 40);
    const tw2 = ctx.measureText(tag).width;
    ctx.fillStyle = "rgba(43,59,217,0.14)";
    roundRect(ctx, 56, 236, tw2 + 120, 74, 37);
    ctx.fill();
    lock(ctx, 80, 250, 44, PAL.indigo);
    ctx.fillStyle = PAL.indigo;
    ctx.fillText(tag, 150, 287);
  });
const painFace = (i: number, aspect: number) =>
  canvasTexture(CW, Math.round(CW / aspect), (ctx) => {
    const H = ctx.canvas.height;
    roundRect(ctx, 10, 10, CW - 20, H - 20, 46);
    ctx.save();
    ctx.clip();
    if (i < 2) {
      const g = ctx.createLinearGradient(0, 0, CW, H);
      g.addColorStop(0, "#3B49E6");
      g.addColorStop(1, "#1B2490");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, H);
      if (i === 0) {
        ctx.save();
        ctx.rotate(-0.32);
        ctx.font = fontCss("sans800", 44);
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        for (let r = -2; r < 9; r++) for (let c = -1; c < 4; c++) ctx.fillText("WATERMARK", c * 330 - (r % 2) * 120, r * 80);
        ctx.restore();
      } else lock(ctx, 70, H / 2 - 80, 150, "rgba(255,255,255,0.9)");
      ctx.fillStyle = "#FFFFFF";
      ctx.font = fontCss("sans800", i === 0 ? 120 : 132);
      ctx.textAlign = i === 0 ? "center" : "left";
      ctx.shadowColor = "rgba(0,0,30,0.35)";
      ctx.shadowBlur = 20;
      ctx.fillText(COPY.pains[i], i === 0 ? CW / 2 : 260, H / 2 + 44);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#5B5C66");
      g.addColorStop(1, "#24252B");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, H);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(CW / 2, H * 0.36, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "bold 66px Arial";
      ctx.textAlign = "center";
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#000";
      ctx.strokeText(COPY.pains[2], CW / 2, H - 70);
      ctx.fillStyle = "#FFF";
      ctx.fillText(COPY.pains[2], CW / 2, H - 70);
    }
    ctx.restore();
  });

const CARD = { w: 1.55, h: 0.6 };
const ResultCards: React.FC<{ t: number }> = ({ t }) => {
  const faces = React.useMemo(() => COPY.results.map((r) => resultFace(r.title, r.tag, CARD.w / CARD.h)), []);
  const backs = React.useMemo(() => [0, 1, 2].map((i) => painFace(i, CARD.w / CARD.h)), []);
  return (
    <>
      {A.cards.map((p, i) => (
        <Hanging
          key={i} t={t} pos={p} w={CARD.w} h={CARD.h} at={T.cardsIn + [0, 0.12, 0.26, 0.4, 0.5, 0.62, 0.72][i]} front={faces[i]} back={i < 3 ? backs[i] : undefined}
          flipAt={i < 3 ? T.pains[i] - 0.04 : undefined} snapAt={T.drop + (i < 3 ? 0 : 0.05 + i * 0.02)} seed={i * 1.7 + 0.4}
        />
      ))}
    </>
  );
};

// ── "No more" and the marble ────────────────────────────────────────────────────
const NoMore: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.drop - 0.1 || t > 7.8) return null;
  const dot = turnDot();
  const f = t * 60;
  const ws = wordTimes("turn", T.drop + 0.02);
  const appear = sp(f, (ws[1] + 0.22) * 60, { damping: 8, stiffness: 220, mass: 0.6 });
  const fallK = pr(f, T.marbleFall[0] * 60, T.marbleFall[1] * 60, E.in);
  const my = dot.y + (0.0 - dot.y) * fallK;
  return (
    <>
      <Glyphs t={t} text={COPY.turn} size={A.turn.size} at={ws[0]} wordAt={[ws[0] - 0.04, ws[1] - 0.04]} mode="slam" stagger={0.025} font="sans800" color={PAL.ink} shadow="rgba(34,51,181,0.4)" position={[0, A.turn.y, A.turn.z]} outAt={T.marbleFall[0] + 0.12} seed={77} />
      {t < T.marbleFall[1] + 0.02 && (
        <mesh position={[dot.x, my, dot.z]} scale={appear * (1 + fallK * 0.25)}>
          <sphereGeometry args={[dot.r, 48, 48]} />
          <meshPhysicalMaterial color={PAL.indigo} emissive={PAL.glow} emissiveIntensity={0.55} roughness={0.04} clearcoat={1} metalness={0.1} />
        </mesh>
      )}
    </>
  );
};

// ── logo rising out of the liquid ─────────────────────────────────────────────
const BARS = [
  { x: 27, h: 48, c: PAL.cream },
  { x: 50, h: 80, c: PAL.orange },
  { x: 73, h: 64, c: PAL.emerald },
];
const BK = 0.0115; // world units per logo-svg unit
const useSvgTexture = (src: string, w: number) => {
  const [tex, setTex] = React.useState<THREE.Texture | null>(null);
  const [h] = React.useState(() => delayRender(`svg ${src}`));
  const { advance } = useThree();
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    if (loaded) {
      advance(performance.now());
      continueRender(h);
    }
  }, [loaded]);
  React.useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = Math.round((w * img.height) / img.width);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const t2 = new THREE.CanvasTexture(c);
      t2.colorSpace = THREE.SRGBColorSpace;
      t2.anisotropy = 8;
      setTex(t2);
      setLoaded(true);
    };
    img.src = staticFile(src);
  }, [src, w, h]);
  return tex;
};
export const lockupShift = (t: number) => A.lockShift * pr(t * 60, 9.05 * 60, 9.6 * 60, E.ramp);
const Logo: React.FC<{ t: number }> = ({ t }) => {
  const wm = useSvgTexture(MEDIA.wordmarkLight, 2048);
  const f = t * 60;
  if (t < T.bars - 0.1) return null;
  const cx = -1.55 + lockupShift(t);
  const wmH = 0.5;
  const wmW = wmH * (648.4 / 118.6);
  const ws = pr(f, T.wordmark[0] * 60, T.wordmark[1] * 60, E.out);
  const wsp = sp(f, T.wordmark[0] * 60, { damping: 9, stiffness: 130, mass: 0.9 });
  return (
    <group position={[0, 0, A.logoZ]}>
      {BARS.map((b2, i) => {
        const s = sp(f, (T.bars + i * 0.1) * 60, { damping: 7.5, stiffness: 150, mass: 0.8 });
        const h = b2.h * BK;
        const w = 14 * BK;
        return (
          <RoundedBox key={i} args={[w, h, w]} radius={w / 2 - 0.001} smoothness={6} position={[cx + (b2.x - 50) * BK, h / 2 - 0.04 - (1 - s) * (h + 0.25), 0]}>
            <meshPhysicalMaterial color={b2.c} roughness={0.22} clearcoat={1} clearcoatRoughness={0.05} emissive={b2.c} emissiveIntensity={0.12} />
          </RoundedBox>
        );
      })}
      {wm && (
        <mesh position={[cx + 40 * BK + 0.16 + wmW / 2, wmH / 2 + 0.02 - (1 - wsp) * 0.75, 0]}>
          <planeGeometry args={[wmW, wmH]} />
          <meshBasicMaterial map={wm} transparent opacity={clamp01(ws * 1.4)} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// ── the switch + hanging pills ───────────────────────────────────────────────────
const pillFace = (label: string, on: boolean) =>
  canvasTexture(1024, 240, (ctx) => {
    roundRect(ctx, 8, 8, 1008, 224, 112);
    if (on) {
      const g = ctx.createLinearGradient(0, 0, 0, 240);
      g.addColorStop(0, "#5B6BFF");
      g.addColorStop(1, "#2233B5");
      ctx.fillStyle = g;
    } else ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
    ctx.font = fontCss("sans700", 84);
    ctx.textAlign = "center";
    ctx.fillStyle = on ? "#FFFFFF" : "#8C90A8";
    ctx.fillText((on ? "✓  " : "⊘  ") + label, 512, 150);
  });
const PILL_POS: V3[] = [[-2.6, 1.5, -5.5], [2.85, 1.7, -5.8], [0.2, 2.05, -6.6]];
const Toggle: React.FC<{ t: number }> = ({ t }) => {
  const f = t * 60;
  const fronts = React.useMemo(() => COPY.toggleOff.map((l) => pillFace(l, false)), []);
  const backs = React.useMemo(() => COPY.toggleOn.map((l) => pillFace(l, true)), []);
  if (t < 9.2) return null;
  const rise = sp(f, 9.3 * 60, { damping: 8, stiffness: 140, mass: 0.8 });
  const on = t < T.flip ? 0 : sp(f, T.flip * 60, { damping: 9, stiffness: 200, mass: 0.7 });
  const v = Math.abs(sp(f + 0.5, T.flip * 60, { damping: 9, stiffness: 200, mass: 0.7 }) - sp(f - 0.5, T.flip * 60, { damping: 9, stiffness: 200, mass: 0.7 }));
  const stretch = 1 + Math.min(0.5, v * 9);
  const kx = knobX(on);
  const y = TOGGLE.y - (1 - rise) * 0.9;
  const fillW = Math.max(0.001, kx - (TOGGLE.x - TOGGLE.w / 2) + TOGGLE.h / 2 - 0.04);
  return (
    <>
      <group position={[0, y, TOGGLE.z]}>
        <RoundedBox args={[TOGGLE.w, TOGGLE.h, 0.24]} radius={TOGGLE.h / 2 - 0.001} smoothness={6} position={[TOGGLE.x, 0, 0]}>
          <Glass tint="#DCE0FF" rough={0.1} thickness={0.6} />
        </RoundedBox>
        <RoundedBox args={[fillW, TOGGLE.h - 0.09, 0.14]} radius={(TOGGLE.h - 0.09) / 2 - 0.001} smoothness={5} position={[TOGGLE.x - TOGGLE.w / 2 + 0.045 + fillW / 2, 0, 0]}>
          <meshStandardMaterial color={PAL.indigo} emissive={PAL.glow} emissiveIntensity={clamp01(on) * 1.6} transparent opacity={clamp01(on * 1.4)} />
        </RoundedBox>
        <mesh position={[kx, 0, 0.06]} scale={[stretch, 1 / Math.sqrt(stretch), 1]}>
          <sphereGeometry args={[TOGGLE.h / 2 - 0.045, 48, 48]} />
          <meshPhysicalMaterial color="#FFFFFF" roughness={0.12} clearcoat={1} emissive="#FFFFFF" emissiveIntensity={0.25 + clamp01(on) * 0.6} />
        </mesh>
      </group>
      {PILL_POS.map((p, i) => (
        <Hanging key={i} t={t} pos={p} w={1.75} h={0.42} d={0.14} capsule at={9.25 + i * 0.15} front={fronts[i]} back={backs[i]} flipAt={T.pillFlips[i]} seed={i * 2.3 + 1} tint="#E6E8FF" />
      ))}
    </>
  );
};

// ── scene ─────────────────────────────────────────────────────────────────────
export const SceneA: React.FC<{ t: number }> = ({ t }) => {
  if (t > T.proof[0] + 0.02) return null;
  const dot = turnDot();
  const flood = t < T.marbleFall[1] ? 0 : 32 * pr(t * 60, T.marbleFall[1] * 60, (T.marbleFall[1] + 1.4) * 60, E.out);
  const mood = t < T.flip ? 0 : pr(t * 60, T.flip * 60, (T.flip + 0.4) * 60);
  const bx = -1.55 + lockupShift(t);
  const ripples: Ripple[] = [
    [dot.x, dot.z, T.marbleFall[1], 0.09],
    [bx - 23 * BK, A.logoZ, T.bars + 0.02, 0.04],
    [bx, A.logoZ, T.bars + 0.12, 0.05],
    [bx + 23 * BK, A.logoZ, T.bars + 0.22, 0.04],
    [TOGGLE.x, A.logoZ, 9.35, 0.035],
    [knobX(1), A.logoZ, T.flip, 0.05],
  ];
  return (
    <>
      <Floor t={t} liquid={{ c: [dot.x, dot.z], r: flood, mood }} ripples={ripples} />
      {t < 3.6 && <HookText t={t} />}
      {t < 3.6 && <SearchBar t={t} />}
      {t < 3.6 && <SoftShadow x={A.bar.x} z={A.bar.z + 0.12} w={A.bar.w * 1.15} d={1.1} opacity={0.5} />}
      {t >= T.cardsIn - 0.1 && t < 8.2 && <ResultCards t={t} />}
      <NoMore t={t} />
      <Logo t={t} />
      <Toggle t={t} />
    </>
  );
};

