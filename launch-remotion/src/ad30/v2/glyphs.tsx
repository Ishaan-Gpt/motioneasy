import React from "react";
import * as THREE from "three";
import { continueRender, delayRender, staticFile } from "remotion";
import { MEDIA } from "./config";
import { E, clamp01, jit, pr, sp } from "../lib";

// Letters as camera-facing planes, each with its own canvas texture (sharp + pre-blurred twin), so every letter can
// spring on its own: elastic pop, stand up from a surface, slam, drop. Synchronous and deterministic (no troika worker).

export type FontKey = keyof typeof MEDIA.fonts;
export const FAMILY: Record<FontKey, string> = { sans500: "CE-PJS500", sans700: "CE-PJS700", sans800: "CE-PJS800", serif: "CE-ISerif", anton: "CE-Anton" };

let fontsPromise: Promise<void> | null = null;
export const useFonts = () => {
  const [ready, setReady] = React.useState(false);
  const [h] = React.useState(() => delayRender("ad30 fonts"));
  React.useEffect(() => {
    if (!fontsPromise) {
      fontsPromise = Promise.all(
        (Object.keys(MEDIA.fonts) as FontKey[]).map((k) => new FontFace(FAMILY[k], `url(${staticFile(MEDIA.fonts[k])})`).load().then((f) => void document.fonts.add(f))),
      ).then(() => undefined);
    }
    fontsPromise.then(() => {
      setReady(true);
      continueRender(h);
    });
  }, [h]);
  return ready;
};

const PX = 180; // glyph raster size (px per em)
const PAD = 0.42; // em padding around each glyph
const CH = 1.7; // canvas height in em
const BASE = 1.2; // baseline from canvas top (em)

type Style = { font: FontKey; color: string; shadow?: string; glow?: string };
type Glyph = { sharp: THREE.Texture; soft: THREE.Texture; wEm: number };
const cache = new Map<string, Glyph>();
const measureCtx = () => {
  const c = document.createElement("canvas");
  return c.getContext("2d")!;
};
let mctx: CanvasRenderingContext2D | null = null;
const fontStr = (f: FontKey) => `${PX}px "${FAMILY[f]}"`;
export const advance = (text: string, f: FontKey) => {
  mctx = mctx ?? measureCtx();
  mctx.font = fontStr(f);
  return mctx.measureText(text).width / PX;
};

const glyph = (ch: string, st: Style): Glyph => {
  const key = `${ch}|${st.font}|${st.color}|${st.shadow ?? ""}|${st.glow ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const wEm = advance(ch, st.font) + PAD * 2;
  const make = (blur: number) => {
    const c = document.createElement("canvas");
    c.width = Math.ceil(wEm * PX);
    c.height = Math.ceil(CH * PX);
    const ctx = c.getContext("2d")!;
    ctx.font = fontStr(st.font);
    ctx.textBaseline = "alphabetic";
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    if (st.glow) {
      ctx.shadowColor = st.glow;
      ctx.shadowBlur = PX * 0.28;
      ctx.fillStyle = st.color;
      ctx.fillText(ch, PAD * PX, BASE * PX);
    }
    if (st.shadow) {
      ctx.shadowColor = st.shadow;
      ctx.shadowBlur = PX * 0.16;
      ctx.shadowOffsetY = PX * 0.06;
    }
    ctx.fillStyle = st.color;
    ctx.fillText(ch, PAD * PX, BASE * PX);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  const g = { sharp: make(0), soft: make(PX * 0.07), wEm };
  cache.set(key, g);
  return g;
};

export type Letter = { ch: string; x: number; word: number; idx: number; st: Style };
/** Lays out "plain *accent* plain" with real kerning per run. x = letter's glyph-canvas centre in em. */
export const layout = (text: string, base: Style, accent: Style) => {
  const runs = text.split(/(\*[^*]+\*)/g).filter(Boolean).map((r) => (r.startsWith("*") ? { t: r.slice(1, -1), st: accent } : { t: r, st: base }));
  const letters: Letter[] = [];
  let x = 0;
  let word = 0;
  let idx = 0;
  for (const run of runs) {
    for (let i = 0; i < run.t.length; i++) {
      const ch = run.t[i];
      const before = advance(run.t.slice(0, i), run.st.font);
      const w = advance(ch, run.st.font);
      if (ch === " ") {
        word++;
        continue;
      }
      letters.push({ ch, x: x + before + w / 2, word, idx: idx++, st: run.st });
    }
    x += advance(run.t, run.st.font);
  }
  return { letters, width: x };
};

export type Mode = "pop" | "standup" | "slam" | "drop";
export type GlyphsProps = {
  t: number; // seconds
  text: string;
  size: number; // world units per em
  at: number; // seconds: first letter
  stagger?: number; // seconds per letter
  wordAt?: number[]; // seconds per word (overrides at/stagger: VO sync)
  mode?: Mode;
  font?: FontKey;
  accentFont?: FontKey;
  color?: string;
  accentColor?: string;
  shadow?: string;
  glow?: string; // accent glow
  anchor?: "left" | "center" | "right";
  outAt?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  seed?: number;
  dim?: number; // 0..1 toward dimColor
  dimColor?: string;
  opacity?: number;
};

const SPRING_POP = { damping: 9, stiffness: 165, mass: 0.75 };
const SPRING_SLAM = { damping: 12, stiffness: 230, mass: 0.8 };

export const Glyphs: React.FC<GlyphsProps> = ({
  t, text, size, at, stagger = 0.03, wordAt, mode = "pop", font = "sans800", accentFont = "serif", color = "#0B0C1A", accentColor = "#2B3BD9",
  shadow, glow, anchor = "center", outAt, position = [0, 0, 0], rotation = [0, 0, 0], seed = 1, dim = 0, dimColor = "#C9CCDA", opacity = 1,
}) => {
  const base: Style = { font, color: dim > 0.5 ? dimColor : color, shadow };
  const acc: Style = { font: accentFont, color: dim > 0.5 ? dimColor : accentColor, shadow, glow };
  const { letters, width } = React.useMemo(() => layout(text, base, acc), [text, font, accentFont, base.color, acc.color, shadow, glow]);
  const off = anchor === "center" ? -width / 2 : anchor === "right" ? -width : 0;
  const f = t * 60;
  return (
    <group position={position} rotation={rotation}>
      {letters.map((L) => {
        const g = glyph(L.ch, L.st);
        const start = (wordAt ? (wordAt[Math.min(L.word, wordAt.length - 1)] ?? at) + (L.idx - firstIdx(letters, L.word)) * Math.min(stagger, 0.03) : at + L.idx * stagger) + jit(L.idx, 0.012, seed);
        const s = sp(f, start * 60, mode === "slam" ? SPRING_SLAM : SPRING_POP);
        if (s <= 0.0001 && f < start * 60) return null;
        const lin = clamp01(s);
        let y = 0;
        let z = 0;
        let sc = 1;
        let rz = 0;
        let rx = 0;
        if (mode === "pop") { y = (1 - s) * -0.45; sc = 0.35 + 0.65 * s; rz = (1 - s) * jit(L.idx, 0.35, seed + 2); }
        if (mode === "standup") { rx = (1 - s) * -Math.PI / 2; sc = 0.6 + 0.4 * s; }
        if (mode === "slam") { sc = 2.6 - 1.6 * s; z = (1 - s) * 0.6; rz = (1 - s) * jit(L.idx, 0.25, seed + 5); }
        if (mode === "drop") { y = (1 - s) * 1.4; rz = (1 - s) * jit(L.idx, 0.5, seed + 9); }
        let op = clamp01(lin * 2.4) * opacity;
        let blurMix = 1 - clamp01((lin - 0.15) / 0.6);
        if (outAt !== undefined) {
          const o = pr(f, (outAt + L.idx * 0.012) * 60, (outAt + L.idx * 0.012 + 0.28) * 60, E.in);
          y += o * 0.9;
          sc *= 1 + o * 0.3;
          rz += o * jit(L.idx, 0.4, seed + 3);
          op *= 1 - o;
          blurMix = Math.max(blurMix, o);
        }
        if (op <= 0.002) return null;
        const w = g.wEm * size;
        const h = CH * size;
        const cy = (BASE - CH / 2) * size; // plane centre sits this far above the baseline
        return (
          <group key={L.idx} position={[(off + L.x) * size, y * size, z * size]} rotation={[rx, 0, rz]} scale={sc}>
            <mesh position={[0, cy, 0]} renderOrder={10}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial map={g.sharp} transparent opacity={op * (1 - blurMix)} depthWrite={false} toneMapped={false} />
            </mesh>
            {blurMix > 0.01 && (
              <mesh position={[0, cy, 0.001]} renderOrder={11}>
                <planeGeometry args={[w, h]} />
                <meshBasicMaterial map={g.soft} transparent opacity={op * blurMix} depthWrite={false} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

const firstIdx = (letters: Letter[], word: number) => letters.find((l) => l.word === word)?.idx ?? 0;

/** Width in world units of a line (for placing things after it, e.g. the full stop). */
export const lineWidth = (text: string, size: number, font: FontKey = "sans800", accentFont: FontKey = "serif") =>
  layout(text, { font, color: "#000" }, { font: accentFont, color: "#000" }).width * size;

/** A static canvas texture (cards, pills, labels). */
export const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};
export const fontCss = (f: FontKey, px: number) => `${px}px "${FAMILY[f]}"`;
