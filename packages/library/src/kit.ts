// Shared look-and-feel for components: lighting stages, text with effects, word helpers.
// Keeping these here makes every component read the same and keeps the lighting consistent.

import { alpha, fbm1, mix, parseRich, type LineBox, type RC, type TextLayout, type TextOpts, type TextStyle, type WordBox } from "@motioneasy/engine";
import { drawBackdrop, pickBackdrop, type BackdropId } from "./backdrops";

export { heroWord, tint } from "./backdrops";

export type StageKind = "soft" | "spot" | "horizon" | "studio" | "flat";

/**
 * Background lighting. Light mode: cream with drifting lavender/peach pools and a paper key light.
 * Dark mode: ink with a warm key behind the subject, a cool rim and a floor bounce.
 * `focus` is where the key light sits (ref units); `flare` (0..1) briefly brightens it (impacts).
 */
export function stage(c: RC, o: { kind?: StageKind; focus?: [number, number]; flare?: number; drift?: number; word?: string; backdrop?: BackdropId } = {}) {
  const T = c.theme;
  const L = T.lighting;
  const kind = o.kind ?? "soft";
  const [fx, fy] = o.focus ?? [c.cx, c.cy];
  drawBackdrop(c, pickBackdrop(c, kind, o.backdrop), { focus: [fx, fy], word: o.word });
  const d = (o.drift ?? 1) * c.short * 0.06;
  const t = c.t;
  const nx = (k: number) => fbm1(t * 0.18 + k * 9.1, k) * d;
  if (kind === "flat" || L <= 0) return;
  const dark = T.mode === "dark";

  if (!dark) {
    // depth: paper top → warmer floor
    c.rect(0, 0, c.W, c.H, c.linear(0, 0, 0, c.H, [[0, alpha("#FFFFFF", 0.22 * L)], [0.55, alpha("#FFFFFF", 0)], [1, alpha(mix(T.bg, "#C9C2A0", 0.6), 0.22 * L)]]));
    c.light(c.W * 0.12 + nx(1), c.H * 0.18 + nx(2), c.long * 0.62, T.glow, 0.42 * L);
    c.light(c.W * 0.92 + nx(3), c.H * 0.62 + nx(4), c.long * 0.55, T.glow2, 0.34 * L);
    c.light(fx, fy, c.short * 0.75, "#FFFFFF", (0.32 + (o.flare ?? 0) * 0.5) * L);
    if (kind === "horizon") c.lightEllipse(c.cx, c.H * 0.72, c.W * 0.9, c.H * 0.12, T.glow2, 0.35 * L);
    if (kind === "studio") {
      // A soft cyclorama: floor curve shading.
      c.rect(0, c.H * 0.7, c.W, c.H * 0.3, c.linear(0, c.H * 0.7, 0, c.H, [[0, alpha(T.fg, 0)], [1, alpha(T.fg, 0.07 * L)]]));
    }
    return;
  }

  // dark
  c.rect(0, 0, c.W, c.H, c.radial(c.cx, c.cy * 0.9, c.long * 0.75, [[0, alpha(mix(T.bg, T.fg, 0.1), L)], [1, alpha("#000000", 0.35 * L)]]));
  if (kind === "spot") {
    // Volumetric cone from above: drawn small, blurred hard, so it has no edges.
    const top = -c.H * 0.1;
    const bottom = fy + c.short * 0.38;
    const w0 = c.short * 0.16, w1 = c.short * 1.05;
    const sway = nx(5) * 0.3;
    const cone = c.layer(c.W, c.H, (lc) => {
      const g = lc.linear(0, top, 0, bottom, [[0, alpha(T.glow, 0.5)], [0.55, alpha(T.glow, 0.2)], [1, alpha(T.glow, 0)]]);
      lc.poly([[fx - w0 / 2 + sway, top], [fx + w0 / 2 + sway, top], [fx + w1 / 2, bottom], [fx - w1 / 2, bottom]], g);
    }, { res: 0.25 });
    c.drawLayer(cone, 0, 0, { blur: c.short * 0.045, blend: "screen", alpha: 0.75 * L });
    c.lightEllipse(fx, bottom - c.short * 0.05, c.short * 0.5, c.short * 0.085, T.glow, 0.3 * L, "screen");
  }
  c.light(fx + nx(6) * 0.5, fy + nx(7) * 0.5, c.short * 0.85, T.glow, (0.16 + (o.flare ?? 0) * 0.32) * L, "screen");
  c.light(c.W * 0.9 + nx(8), c.H * 0.08 + nx(9), c.long * 0.5, T.glow2, 0.07 * L, "screen");
  c.lightEllipse(c.cx, c.H * 0.98, c.W * 0.75, c.H * 0.14, T.glow, 0.08 * L, "screen");
  if (kind === "horizon") c.lightEllipse(c.cx, c.H * 0.62, c.W * 0.85, c.H * 0.06, T.glow, 0.22 * L, "screen");
}

/** Words of a rich string, keeping the *accent* markers so each word can be laid out on its own. */
export function richWords(text: string): string[] {
  return parseRich(text)
    .filter((t) => !t.br)
    .map((t) => (t.em ? `*${t.text}*` : t.text));
}

export interface FxOpts extends TextOpts {
  scale?: number;
  sx?: number;
  sy?: number;
  rotate?: number;
  /** ref units */
  blur?: number;
  /** 0..1 anchor inside the block (default centre). */
  anchor?: [number, number];
}

/**
 * Draw a laid-out text block positioned by its anchor at (x, y), with scale/rotate/blur/glow.
 * Blur goes through an offscreen layer (GPU gaussian), everything else draws directly.
 */
export function textFx(c: RC, L: TextLayout, x: number, y: number, o: FxOpts = {}) {
  const [ax, ay] = o.anchor ?? [0.5, 0.5];
  const scale = o.scale ?? 1;
  if ((o.alpha ?? 1) <= 0.002 || scale <= 0.001) return;
  const blur = o.blur ?? 0;
  if (blur < 0.3) {
    c.with({ x, y, scale, sx: o.sx, sy: o.sy, rotate: o.rotate }, () => c.drawLayout(L, -L.width * ax, -L.height * ay, o));
    return;
  }
  // Pad for descenders, glow and blur spread.
  const pad = L.size * 0.45 + (o.glow?.blur ?? 0);
  const layer = c.layer(L.width, L.height, (lc) => lc.drawLayout(L, 0, 0, { ...o, alpha: 1 }), { pad, res: Math.min(2, Math.max(0.5, scale)) });
  c.with({ x, y, scale, sx: o.sx, sy: o.sy, rotate: o.rotate }, () =>
    c.drawLayer(layer, -L.width * ax, -L.height * ay, { blur: blur / Math.max(0.2, scale), alpha: o.alpha }),
  );
}

/** Clip window of one laid-out line, relative to the block top: room for accent ascenders and descenders. */
export function lineWindow(line: LineBox, size: number) {
  const s = Math.max(size, ...line.words.map((w) => w.size));
  return { top: line.y - s * 1.1, h: s * 1.42 };
}

/** Clip window of a whole layout, relative to the block top. */
export function blockWindow(L: TextLayout) {
  const s = Math.max(L.size, ...L.words.map((w) => w.size));
  return { top: L.cap - s * 1.1, h: L.height - L.cap + s * 1.42 };
}

/**
 * Mask rise: `draw` slides up into the window [top, top + h) as u goes 0 → 1. It starts a full window
 * below, so nothing shows before the reveal (not even tall accent glyphs).
 */
export function maskRise(c: RC, top: number, h: number, u: number, draw: () => void, o: { x?: number; w?: number } = {}) {
  if (u <= 0) return;
  c.save();
  c.clipRect(o.x ?? 0, top, o.w ?? c.W, h);
  c.with({ y: (1 - u) * h * 1.04 }, draw);
  c.restore();
}

/** Base type style from the theme + a size; accent words use the brand's accent face. */
export function style(c: RC, size: number, o: Partial<TextStyle> & { fontParam?: unknown } = {}): TextStyle {
  const font = typeof o.fontParam === "string" && o.fontParam !== "brand" ? (o.fontParam as TextStyle["font"]) : c.theme.font;
  return {
    font,
    size,
    weight: o.weight ?? 700,
    lineHeight: o.lineHeight ?? 1.04,
    tracking: o.tracking,
    italic: o.italic,
    uppercase: o.uppercase,
    em: o.em ?? { font: c.theme.accentFont, italic: true, weight: 400 },
  };
}

/** Seconds per beat. */
export const beat = (bpm: number) => 60 / Math.max(1, bpm);

/** Ladder of gains for a series of identical sounds (sound-design §4.5). */
export const ladder = (i: number, n: number, from = 0.9, to = 0.6) => (n <= 1 ? from : from + (to - from) * (i / (n - 1)));

/** One word of a layout, centred on itself, with scale/blur/alpha. */
export function wordFx(c: RC, w: WordBox, ox: number, oy: number, o: { scale?: number; sx?: number; blur?: number; alpha?: number; dy?: number; dx?: number; rotate?: number; color?: string; emColor?: string; glow?: { color: string; blur: number; strength?: number } }) {
  const a = o.alpha ?? 1;
  if (a <= 0.002) return;
  const top = w.y - w.size * 0.95;
  const h = w.size * 1.3;
  const cx = ox + w.x + w.w / 2 + (o.dx ?? 0);
  const cy = oy + top + h / 2 + (o.dy ?? 0);
  const scale = o.scale ?? 1;
  const blur = o.blur ?? 0;
  if (blur < 0.3) {
    c.with({ x: cx, y: cy, scale, sx: o.sx, rotate: o.rotate }, () => c.word(w, -(w.x + w.w / 2), -(top + h / 2), { color: o.color, emColor: o.emColor, alpha: a, glow: o.glow }));
    return;
  }
  const pad = w.size * 0.3 + (o.glow?.blur ?? 0);
  const L = c.layer(w.w, h, (lc) => lc.word(w, -w.x, -top, { color: o.color, emColor: o.emColor, glow: o.glow }), { pad, res: Math.min(2, Math.max(0.5, scale)) });
  c.with({ x: cx, y: cy, scale, sx: o.sx, rotate: o.rotate }, () => c.drawLayer(L, -w.w / 2, -h / 2, { blur: blur / Math.max(0.2, scale), alpha: a }));
}

