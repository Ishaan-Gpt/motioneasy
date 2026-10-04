// Text layout with real measurement. Sizes are in reference units (short edge = 1080) and the drawing
// context is scaled, so layouts are identical at every preview size and in the final export.
//
// Rich text convention (zero-token styling): wrap words in *asterisks* to give them the accent style
// (Instrument Serif italic by default). A newline forces a line break.

import { FONTS, fontString, type FontId } from "./fonts";

export interface TextStyle {
  font: FontId;
  size: number;
  weight?: number;
  italic?: boolean;
  /** Letter spacing in em. Defaults to the face's display tracking at large sizes. */
  tracking?: number;
  /** Line height as a multiple of size. */
  lineHeight?: number;
  /** Extra space between words, in em (room for per-word boxes and pills). */
  wordSpacing?: number;
  /** Style for *accent* words. */
  em?: Partial<{ font: FontId; weight: number; italic: boolean; scale: number; tracking: number }>;
  uppercase?: boolean;
}

export interface CharBox {
  ch: string;
  x: number; // relative to word x
  w: number;
}

export interface WordBox {
  text: string;
  em: boolean;
  index: number; // global word index
  line: number;
  x: number; // left edge, relative to the block
  y: number; // baseline, relative to the block top
  w: number;
  size: number;
  font: FontId;
  weight: number;
  italic: boolean;
  tracking: number; // px (ref units)
  chars: CharBox[];
  /** Global index of this word's first character (for char-level staggers). */
  charStart: number;
}

export interface LineBox {
  index: number;
  x: number;
  y: number; // baseline
  w: number;
  words: WordBox[];
}

export interface TextLayout {
  words: WordBox[];
  lines: LineBox[];
  width: number;
  height: number;
  size: number;
  /** Cap height of the base style, for optical vertical centring. */
  cap: number;
  charCount: number;
}

export interface Token {
  text: string;
  em: boolean;
  br?: boolean;
}

export function parseRich(input: string): Token[] {
  const out: Token[] = [];
  let em = false;
  const lines = input.replace(/\r/g, "").split("\n");
  lines.forEach((line, li) => {
    if (li > 0) out.push({ text: "", em: false, br: true });
    for (const raw of line.split(/\s+/)) {
      if (!raw) continue;
      let w = raw;
      let start = em;
      if (w.startsWith("*")) {
        start = true;
        w = w.slice(1);
      }
      let end = start;
      if (w.endsWith("*")) {
        end = false;
        w = w.slice(0, -1);
      }
      if (w) out.push({ text: w, em: start });
      em = end;
    }
  });
  return out;
}

export const plainText = (input: string) => input.replace(/\*/g, "");

// ── Measurement ────────────────────────────────────────────────────────────
let mctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
function measureCtx() {
  if (mctx) return mctx;
  if (typeof OffscreenCanvas !== "undefined") mctx = new OffscreenCanvas(8, 8).getContext("2d")!;
  else mctx = document.createElement("canvas").getContext("2d")!;
  return mctx;
}

export const supportsLetterSpacing = () =>
  typeof CanvasRenderingContext2D !== "undefined" && "letterSpacing" in CanvasRenderingContext2D.prototype;

const wcache = new Map<string, number>();
/** Advance width of a string without tracking, in ref units. */
export function advance(text: string, font: FontId, size: number, weight: number, italic: boolean) {
  const key = `${font}|${size}|${weight}|${italic}|${text}`;
  const hit = wcache.get(key);
  if (hit !== undefined) return hit;
  const c = measureCtx();
  c.font = fontString(font, size, weight, italic);
  if ("letterSpacing" in c) (c as CanvasRenderingContext2D).letterSpacing = "0px";
  const w = c.measureText(text).width;
  if (wcache.size > 20000) wcache.clear();
  wcache.set(key, w);
  return w;
}

const capCache = new Map<string, number>();
export function capHeight(font: FontId, size: number, weight = 400) {
  const key = `${font}|${weight}`;
  let r = capCache.get(key);
  if (r === undefined) {
    const c = measureCtx();
    c.font = fontString(font, 200, weight, false);
    r = c.measureText("H").actualBoundingBoxAscent / 200 || 0.7;
    capCache.set(key, r);
  }
  return r * size;
}

/** Width of a word including tracking between (not after) characters. */
export function wordWidth(text: string, font: FontId, size: number, weight: number, italic: boolean, trackingPx: number) {
  const n = [...text].length;
  return advance(text, font, size, weight, italic) + trackingPx * Math.max(0, n - 1);
}

function resolveStyle(s: TextStyle, em: boolean) {
  const baseTracking = s.tracking ?? FONTS[s.font].displayTracking;
  if (!em) {
    return { font: s.font, size: s.size, weight: s.weight ?? 600, italic: s.italic ?? false, tracking: baseTracking * s.size };
  }
  const e = s.em ?? {};
  const font = e.font ?? "instrument";
  const size = s.size * (e.scale ?? (font === "instrument" ? 1.12 : 1));
  return {
    font,
    size,
    weight: e.weight ?? (font === "instrument" ? 400 : s.weight ?? 600),
    italic: e.italic ?? true,
    tracking: (e.tracking ?? FONTS[font].displayTracking) * size,
  };
}

export interface LayoutOpts {
  maxWidth?: number;
  align?: "left" | "center" | "right";
  maxLines?: number;
  /** Even out line lengths when the text wraps (no orphans). Default: on for centred text. */
  balance?: boolean;
}

const lcache = new Map<string, TextLayout>();

export function layoutText(input: string, style: TextStyle, opts: LayoutOpts = {}): TextLayout {
  const key = JSON.stringify([input, style, opts]);
  const hit = lcache.get(key);
  if (hit) return hit;
  if ((opts.balance ?? opts.align === "center") && opts.maxWidth !== undefined && Number.isFinite(opts.maxWidth)) {
    const out = balanced(input, style, opts);
    lcache.set(key, out);
    return out;
  }

  const tokens = parseRich(style.uppercase ? input.toUpperCase() : input);
  const maxW = opts.maxWidth ?? Infinity;
  const lh = (style.lineHeight ?? 1.08) * style.size;
  const base = resolveStyle(style, false);
  const spaceOf = (st: ReturnType<typeof resolveStyle>) => advance(" ", st.font, st.size, st.weight, st.italic) + st.tracking * 0.5;

  const lines: { words: WordBox[]; w: number }[] = [{ words: [], w: 0 }];
  const all: WordBox[] = [];
  let charIndex = 0;
  for (const tok of tokens) {
    if (tok.br) {
      lines.push({ words: [], w: 0 });
      continue;
    }
    const st = resolveStyle(style, tok.em);
    const w = wordWidth(tok.text, st.font, st.size, st.weight, st.italic, st.tracking);
    // The gap before a word takes the narrower of the two neighbouring styles (mono spaces are wide).
    const prev = lines[lines.length - 1].words.at(-1);
    const space = Math.min(spaceOf(st), prev ? spaceOf(resolveStyle(style, prev.em)) : Infinity) + (style.wordSpacing ?? 0) * style.size;
    let line = lines[lines.length - 1];
    const needed = line.words.length ? line.w + space + w : w;
    if (line.words.length && needed > maxW) {
      line = { words: [], w: 0 };
      lines.push(line);
    }
    const chars: CharBox[] = [];
    const glyphs = [...tok.text];
    let acc = "";
    for (let i = 0; i < glyphs.length; i++) {
      const x = advance(acc, st.font, st.size, st.weight, st.italic) + st.tracking * i;
      const cw = advance(glyphs[i], st.font, st.size, st.weight, st.italic);
      chars.push({ ch: glyphs[i], x, w: cw });
      acc += glyphs[i];
    }
    const box: WordBox = {
      text: tok.text, em: tok.em, index: all.length, line: lines.length - 1,
      x: line.words.length ? line.w + space : 0, y: 0, w,
      size: st.size, font: st.font, weight: st.weight, italic: st.italic, tracking: st.tracking,
      chars, charStart: charIndex,
    };
    charIndex += glyphs.length;
    line.words.push(box);
    line.w = box.x + w;
    all.push(box);
  }

  const used = lines.filter((l, i) => l.words.length || i < lines.length - 1);
  const width = Math.max(0, ...used.map((l) => l.w));
  const blockW = Number.isFinite(maxW) ? Math.min(maxW, Math.max(width, 0)) : width;
  const cap = capHeight(base.font, base.size, base.weight);
  const lineBoxes: LineBox[] = used.map((l, i) => {
    const off = opts.align === "center" ? (blockW - l.w) / 2 : opts.align === "right" ? blockW - l.w : 0;
    // The block box runs from the first line's cap top to the last baseline (descenders hang below),
    // which is what optical centring wants.
    const y = cap + i * lh;
    for (const w of l.words) {
      w.x += off;
      w.y = y;
      w.line = i;
    }
    return { index: i, x: off, y, w: l.w, words: l.words };
  });
  const height = lineBoxes.length ? cap + (lineBoxes.length - 1) * lh : 0;
  const layout: TextLayout = { words: all, lines: lineBoxes, width: blockW, height, size: style.size, cap, charCount: charIndex };
  if (lcache.size > 4000) lcache.clear();
  lcache.set(key, layout);
  return layout;
}

/** The narrowest wrap width that keeps the same number of lines, so the lines come out even. */
function balanced(input: string, style: TextStyle, opts: LayoutOpts): TextLayout {
  const plain = { ...opts, balance: false };
  const full = layoutText(input, style, plain);
  if (full.lines.length < 2) return full;
  let lo = Math.max(0, ...full.words.map((w) => w.w));
  let hi = opts.maxWidth!;
  for (let i = 0; i < 12 && hi - lo > 1; i++) {
    const mid = (lo + hi) / 2;
    if (layoutText(input, style, { ...plain, maxWidth: mid }).lines.length <= full.lines.length) hi = mid;
    else lo = mid;
  }
  return layoutText(input, style, { ...plain, maxWidth: Math.ceil(hi) });
}

/** Largest size (≤ style.size) at which the text fits the box. */
export function fitText(input: string, style: TextStyle, maxWidth: number, maxHeight: number, opts: { minSize?: number; maxLines?: number; align?: LayoutOpts["align"]; balance?: boolean } = {}): TextLayout {
  const key = JSON.stringify(["fit", input, style, maxWidth, maxHeight, opts]);
  const hit = lcache.get(key);
  if (hit) return hit;
  // Authored line breaks are intent: shrink a little rather than wrap inside an authored line.
  const authored = input.split("\n").length;
  if (authored > 1 && (!opts.maxLines || opts.maxLines > authored)) {
    const kept = fitText(input, style, maxWidth, maxHeight, { ...opts, maxLines: authored, minSize: Math.max(opts.minSize ?? 0, style.size * 0.72) });
    if (kept.lines.length <= authored && kept.height <= maxHeight && Math.max(0, ...kept.lines.map((l) => l.w)) <= maxWidth + 0.5) {
      lcache.set(key, kept);
      return kept;
    }
  }
  let lo = opts.minSize ?? style.size * 0.2;
  let hi = style.size;
  const fits = (size: number) => {
    const l = layoutText(input, { ...style, size }, { maxWidth, align: opts.align, balance: false });
    const longest = Math.max(0, ...l.words.map((w) => w.w));
    return l.height <= maxHeight && longest <= maxWidth + 0.5 && (!opts.maxLines || l.lines.length <= opts.maxLines);
  };
  let best = lo;
  if (fits(hi)) best = hi;
  else {
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) {
        best = mid;
        lo = mid;
      } else hi = mid;
    }
  }
  const out = layoutText(input, { ...style, size: Math.floor(best * 10) / 10 }, { maxWidth, align: opts.align, balance: opts.balance });
  lcache.set(key, out);
  return out;
}
