// Kit: "Apple-keynote launch film in one continuous take" (@twoclipping). "develop." — a 2D one-take
// where every scene is made out of the previous one: a wordmark squeezes into its period, the dot becomes
// a pill, an iris opens onto a photo, a paper-map grid, liquid glass over the photos, a phone, a Mac, a
// print shop, an order button that keeps morphing, a flood onto real wall footage and back to the
// wordmark. Original copy, palette, structure and timings as defaults; photos and footage are placeholders.

import { E, P, SPRING, alpha, clamp, defineComponent, glide, logLerp, pr, sp, type Component, type RC, type SoundCue } from "@motioneasy/engine";
import { drawClick, drawCursor, mediaOr } from "../parts";
import type { PostSpec } from "../sequence";
import { cursorAt } from "./shared";
import type { Kit } from "./types";

const CANVAS = "#ECEBE7";
const INK = "#0B0B0C";
const LOOK = { mode: "light" as const, bg: CANVAS, fg: INK, accent: INK, lighting: 0, grain: 0.12, vignette: 0, backdrop: "plain" as const, camera: "still" as const };

const ui = (size: number, weight = 500) => ({ font: "geist" as const, size, weight, tracking: -0.01, lineHeight: 1.15 });
const mark = (size: number) => ({ font: "archivo" as const, size, weight: 800, tracking: -0.02, lineHeight: 1 });

function text(c: RC, s: string, x: number, baseline: number, size: number, color: string, weight = 500, o: { center?: boolean; alpha?: number; wordmark?: boolean } = {}) {
  const L = c.layout(s, o.wordmark ? mark(size) : ui(size, weight));
  c.drawLayout(L, o.center ? x - L.width / 2 : x, baseline - L.lines[0].y, { color, alpha: o.alpha });
  return L;
}

/** Photo slot i (placeholders until the user adds their 9–12 photos). */
function photo(c: RC, list: string[], i: number, x: number, y: number, w: number, h: number, r = 0, zoom = 1) {
  const ref = list[i % Math.max(1, list.length)] ?? null;
  mediaOr(c, ref, x, y, w, h, `photo ${(i % 12) + 1}`, { radius: r, zoom, key: `ak-photo-${i}`, tone: "#D9D7D1", ink: "#3A3A38" });
}

/**
 * Liquid glass: a slightly magnified copy of the scene behind (refraction), a whisper of frost, a
 * bright top-left rim and a faint bottom-right one. `behind` redraws the scene in frame coordinates.
 */
function glass(c: RC, x: number, y: number, w: number, h: number, r: number, behind: () => void, o: { frost?: number; mag?: number } = {}) {
  c.save();
  c.shadow(alpha("#000", 0.18), 26, 0, 10);
  c.rrect(x, y, w, h, r, alpha("#FFFFFF", 0.01));
  c.restore();
  c.save();
  c.clipRRect(x, y, w, h, r);
  c.with({ x: x + w / 2, y: y + h / 2, scale: o.mag ?? 1.08 }, () => {
    c.translate(-(x + w / 2), -(y + h / 2));
    behind();
  });
  c.rect(x, y, w, h, alpha("#FFFFFF", o.frost ?? 0.16));
  c.rect(x, y, w, h * 0.5, c.linear(0, y, 0, y + h * 0.5, [[0, alpha("#FFFFFF", 0.22)], [1, alpha("#FFFFFF", 0)]]));
  c.restore();
  c.strokeRRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, r, c.linear(x, y, x + w, y + h, [[0, alpha("#FFFFFF", 0.85)], [0.45, alpha("#FFFFFF", 0.18)], [1, alpha("#FFFFFF", 0.5)]]), 1.6);
}

/** Glass glyphs: the scene behind, magnified, seen through the letterforms, with a rim. */
function glassText(c: RC, s: string, cx: number, baseline: number, size: number, weight: number, behind: () => void, a = 1) {
  if (a <= 0.01) return;
  const L = c.layout(s, ui(size, weight));
  const x = cx - L.width / 2, y = baseline - L.lines[0].y;
  const lay = c.layer(c.W, c.H, (lc) => {
    lc.drawLayout(L, x, y, { color: "#000" });
    lc.blend("source-in");
    lc.with({ x: cx, y: baseline - L.cap / 2, scale: 1.12 }, () => {
      lc.translate(-cx, -(baseline - L.cap / 2));
      behind.call(null);
    });
    lc.rect(0, 0, c.W, c.H, alpha("#FFFFFF", 0.22));
    lc.blend("source-over");
  });
  c.drawLayer(lay, 0, 0, { alpha: a });
  c.drawLayout(L, x, y, { outline: true, stroke: { color: alpha("#FFFFFF", 0.7 * a), width: Math.max(1.5, size * 0.012) } });
}

/** Oversized macOS cursor with a click ripple. */
function cursor(c: RC, t: number, path: [number, number, number][], clicks: number[] = [], scale = 1.5) {
  const p = cursorAt(t, path);
  for (const k of clicks) drawClick(c, p.x, p.y, pr(t, k, k + 0.45), INK);
  const press = Math.max(0, ...clicks.map((k) => Math.max(0, 1 - Math.abs(t - k - 0.04) / 0.08)));
  drawCursor(c, p.x, p.y, { scale, press });
}

// ── params shared by the shots ─────────────────────────────────────────────
type Photos = { photos: string[] };
const P_PHOTOS = { photos: P.mediaList([], "Photos (9–12, high-res)", "image", { min: 0, max: 12 }) };
const P_WORD = { word: P.text("develop", "Wordmark (one word; a verb works best)", { maxLength: 14 }) };

const base = {
  version: "1.0.0",
  group: "kits" as const,
  category: "kit-keynote-one-take",
  added: "2026-10-04",
  formats: ["square" as const],
  theme: LOOK,
  camera: "still" as const,
};

// ── 1. wordmark accordion → pill ───────────────────────────────────────────
/** The wordmark: every letter moves toward the period by the same factor and narrows as it goes, so the letters stay touching. */
function wordmark(c: RC, word: string, squeeze: number, cy: number, a = 1) {
  const size = c.W * 0.17;
  const L = c.layout(`${word}.`, mark(size));
  const scale = Math.min(1, (c.W * 0.79) / L.width);
  const w = L.width * scale;
  const x0 = c.cx - w / 2;
  const dot = L.words[0].chars[L.words[0].chars.length - 1];
  const dotX = x0 + (L.words[0].x + dot.x + dot.w / 2) * scale;
  const k = 1 - squeeze;
  if (a > 0) c.with({ x: 0, y: cy - (L.cap * scale) / 2, alpha: a }, () => {
    const wd = L.words[0];
    for (let i = 0; i < wd.chars.length; i++) {
      const ch = wd.chars[i];
      const last = i === wd.chars.length - 1;
      const gx = x0 + (wd.x + ch.x) * scale;
      const nx = last ? gx : dotX - (dotX - gx) * k;
      const sx = last ? 1 : Math.max(0.0001, k);
      if (!last && k < 0.02) continue;
      c.with({ x: nx, y: 0, sx: scale * sx, sy: scale }, () => c.char(wd, i, 0, wd.y - L.lines[0].y + L.cap, { color: INK }));
    }
  });
  return { dotX, dotY: cy + (L.cap * scale) / 2 - size * scale * 0.06, dotR: size * scale * 0.085 };
}

const open = defineComponent<{ word: string; label: string }>({
  ...base,
  id: "keynote-wordmark-pill",
  name: "Wordmark Squeeze into Pill",
  description: "The opening beat. A huge expanded wordmark squeezes into its own period like an accordion (letters stay touching as they narrow), the dot grows into a black pill, and a label rises inside it.",
  tags: ["wordmark", "accordion", "morph", "pill"],
  params: { ...P_WORD, label: P.text("Develop", "Pill label", { maxLength: 18 }) },
  duration: 2.6,
  sounds: () => [{ at: 0.75, sound: "whoosh.swipe", gain: 0.45, role: "squeeze" }, { at: 1.2, sound: "ui.pop", gain: 0.45, role: "pill" }, { at: 1.85, sound: "whoosh.swipe", gain: 0.25, role: "label" }],
  render(c, p) {
    const t = c.t;
    c.clear(CANVAS);
    const sq = pr(t, 0.7, 1.15, E.inOut);
    // the period itself becomes the pill, so once the letters are in, only the pill is drawn
    const d = sq < 1 ? wordmark(c, p.word, sq, c.cy * 0.98) : wordmark(c.at(0), p.word, 1, c.cy * 0.98, 0);
    // the dot grows into a pill, centred, on a spring
    const g = clamp(sp(t, 1.12, SPRING.firm), 0, 1.04);
    if (sq >= 1) {
      const pw = logLerp(d.dotR * 2, c.W * 0.43, clamp(g)), ph = logLerp(d.dotR * 2, c.W * 0.135, clamp(g));
      const cx = d.dotX + (c.cx - d.dotX) * clamp(g), cy = d.dotY + (c.cy - d.dotY) * clamp(g);
      c.rrect(cx - pw / 2, cy - ph / 2, pw, ph, ph / 2, INK);
      const u = pr(t, 1.8, 2.2, E.out);
      if (u > 0) {
        c.save();
        c.clipRRect(cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
        text(c, p.label, cx, cy + c.W * 0.016 + (1 - u) * ph * 0.7, c.W * 0.045, "#FFFFFF", 600, { center: true });
        c.restore();
      }
    }
    cursor(c, t, [[0, c.W * 0.78, c.H * 0.92], [2.6, c.W * 0.6, c.H * 0.86]]);
  },
});

// ── 2. iris onto a photo ───────────────────────────────────────────────────
/** Six blades around a hexagonal aperture; open 1 = fully open. */
function iris(c: RC, cx: number, cy: number, R: number, open: number, color = INK) {
  const n = 6;
  const a = R * clamp(open);
  c.save();
  c.ctx.beginPath();
  c.ctx.rect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);
  // hexagonal aperture, rotating slightly as it closes
  const rot = (1 - open) * 0.6;
  for (let i = 0; i <= n; i++) {
    const ang = rot + (i / n) * Math.PI * 2;
    const x = cx + Math.cos(ang) * a, y = cy + Math.sin(ang) * a;
    if (i === 0) c.ctx.moveTo(x, y);
    else c.ctx.lineTo(x, y);
  }
  c.ctx.fillStyle = color;
  c.ctx.fill("evenodd");
  // blade seams
  for (let i = 0; i < n; i++) {
    const ang = rot + (i / n) * Math.PI * 2;
    c.line(cx + Math.cos(ang) * a, cy + Math.sin(ang) * a, cx + Math.cos(ang + 0.9) * R * 1.5, cy + Math.sin(ang + 0.9) * R * 1.5, alpha("#FFFFFF", 0.12), 1.5);
  }
  c.restore();
}

const irisShot = defineComponent<Photos & { label: string }>({
  ...base,
  id: "keynote-iris",
  name: "Iris Click onto Photo",
  description: "A click on the pill: six iris blades close over the label and snap open onto a photo; the circle becomes a rounded square.",
  tags: ["iris", "click", "reveal", "photo"],
  params: { ...P_PHOTOS, label: P.text("Develop", "Pill label", { maxLength: 18 }) },
  duration: 1.4,
  sounds: () => [{ at: 0.1, sound: "ui.click", gain: 0.5, role: "click" }, { at: 0.2, sound: "foley.shutter", gain: 0.45, role: "iris" }],
  render(c, p) {
    const t = c.t;
    c.clear(CANVAS);
    const pw = c.W * 0.43, ph = c.W * 0.135;
    const close = pr(t, 0.12, 0.38, E.in), open = pr(t, 0.42, 0.8, E.out);
    const shape = pr(t, 0.75, 1.2, E.inOut); // circle → rounded square, growing
    const s = logLerp(ph * 1.6, c.W * 0.69, shape);
    const r = s / 2 - (s / 2 - c.W * 0.06) * shape;
    const bx = c.cx - s / 2, by = c.cy - s / 2;
    if (open <= 0) {
      // the pill presses, then the iris closes over its label
      c.with({ x: c.cx, y: c.cy, scale: 1 - pr(t, 0.08, 0.14) * 0.04 + pr(t, 0.14, 0.24) * 0.04 }, () => {
        const w = pw + (ph * 1.6 - pw) * close, h = ph + (ph * 1.6 - ph) * close;
        c.rrect(-w / 2, -h / 2, w, h, h / 2, INK);
        text(c, p.label, 0, c.W * 0.016, c.W * 0.045, "#FFFFFF", 600, { center: true, alpha: 1 - close });
      });
      if (close > 0) {
        c.save();
        c.clipCircle(c.cx, c.cy, ph * 0.8);
        iris(c, c.cx, c.cy, ph * 0.8, 1 - close);
        c.restore();
      }
    } else {
      c.save();
      c.clipRRect(bx, by, s, s, r);
      photo(c, p.photos, 4, bx, by, s, s, 0, 1.15 - shape * 0.15);
      if (open < 1) iris(c, c.cx, c.cy, s * 0.75, open);
      c.restore();
    }
    cursor(c, t, [[0, c.W * 0.6, c.H * 0.86], [0.1, c.W * 0.55, c.H * 0.53], [1.4, c.W * 0.62, c.H * 0.86]], [0.1]);
  },
});

// ── 3. paper-map grid → bento → zoom ───────────────────────────────────────
const GRID_ORDER = [4, 1, 3, 5, 7, 0, 2, 6, 8]; // centre, plus, corners

const gridShot = defineComponent<Photos>({
  ...base,
  id: "keynote-grid-bento",
  name: "Paper-Map Grid into Bento",
  description: "The square shrinks and a 3×3 grid unfolds from behind it like a paper map (centre, then the plus, then the corners), reflows into a bento, and a click zooms into one tile, landing exactly on the drop.",
  tags: ["grid", "bento", "unfold", "zoom", "photos"],
  params: P_PHOTOS,
  duration: 2.8,
  sounds: () => [{ at: 0.3, sound: "whoosh.swipe", gain: 0.35, role: "unfold" }, { at: 0.5, sound: "foley.shutter", gain: 0.2, role: "unfold" }, { at: 1.3, sound: "whoosh.air", gain: 0.3, role: "reflow" }, { at: 2.0, sound: "ui.click", gain: 0.45, role: "click" }, { at: 2.15, sound: "whoosh.deep", gain: 0.5, role: "zoom" }],
  render(c, p) {
    const t = c.t;
    c.clear(CANVAS);
    const cell = c.W * 0.205, gap = c.W * 0.012;
    const total = cell * 3 + gap * 2;
    const gx = c.cx - total / 2, gy = c.cy - total / 2;
    const grid = (i: number) => ({ x: gx + (i % 3) * (cell + gap), y: gy + Math.floor(i / 3) * (cell + gap), w: cell, h: cell });
    // bento: the arch tile (index 2) becomes 2×2 in the top-right; the rest pack around it
    const B = c.W * 0.64, bs = (B - gap * 3) / 4;
    const bx = c.cx - B / 2, by = c.cy - (bs * 3 + gap * 2) / 2;
    const bento: Record<number, { x: number; y: number; w: number; h: number }> = {
      0: { x: bx, y: by, w: bs, h: bs }, 1: { x: bx + bs + gap, y: by, w: bs, h: bs },
      2: { x: bx + (bs + gap) * 2, y: by, w: bs * 2 + gap, h: bs * 2 + gap },
      3: { x: bx, y: by + bs + gap, w: bs, h: bs }, 4: { x: bx + bs + gap, y: by + bs + gap, w: bs, h: bs },
      5: { x: bx, y: by + (bs + gap) * 2, w: bs, h: bs }, 6: { x: bx + bs + gap, y: by + (bs + gap) * 2, w: bs, h: bs },
      7: { x: bx + (bs + gap) * 2, y: by + (bs + gap) * 2, w: bs, h: bs }, 8: { x: bx + (bs + gap) * 3, y: by + (bs + gap) * 2, w: bs, h: bs },
    };
    const reflow = clamp(sp(t, 1.25, SPRING.firm), 0, 1.02);
    const zoom = pr(t, 2.1, 2.8, E.inOut);
    // zoom: the camera scales about tile 2 until it fills the square
    const Z = bento[2];
    const zs = logLerp(1, c.W / Z.w, zoom);
    c.with({ x: c.cx, y: c.cy, scale: zs }, () => {
      c.translate(-(Z.x + Z.w / 2) * zoom - c.cx * (1 - zoom), -(Z.y + Z.h / 2) * zoom - c.cy * (1 - zoom));
      GRID_ORDER.forEach((i, k) => {
        const u = clamp(sp(t, 0.15 + (k === 0 ? 0 : k < 5 ? 0.18 : 0.34), SPRING.firm), 0, 1.02);
        if (u <= 0.01) return;
        const g = grid(i);
        // tiles slide out from behind the centre tile, unfolding along their axis
        const from = grid(4);
        const x = from.x + (g.x - from.x) * u, y = from.y + (g.y - from.y) * u;
        const b = bento[i];
        const X = x + (b.x - x) * reflow, Y = y + (b.y - y) * reflow, W = g.w + (b.w - g.w) * reflow, H = g.h + (b.h - g.h) * reflow;
        const fold = i === 4 ? 1 : clamp(u);
        const sx = i % 3 === 1 ? 1 : fold, sy = Math.floor(i / 3) === 1 ? 1 : fold;
        c.with({ x: X + W / 2, y: Y + H / 2, sx, sy }, () => photo(c, p.photos, i, -W / 2, -H / 2, W, H, c.W * 0.018 * (1 - zoom)));
      });
    });
    // before the unfold, the square shrinks into the centre cell
    const shrink = pr(t, 0, 0.3, E.inOut);
    if (shrink < 1) {
      const s = logLerp(c.W * 0.69, cell, shrink);
      photo(c, p.photos, 4, c.cx - s / 2, c.cy - s / 2, s, s, c.W * 0.06 - (c.W * 0.06 - c.W * 0.018) * shrink);
    }
    cursor(c, t, [[0, c.W * 0.62, c.H * 0.86], [1.9, Z.x + Z.w * 0.6, Z.y + Z.h * 0.55], [2.8, c.W * 0.7, c.H * 0.6]], [2.0]);
  },
});

// ── 4. glass word → droplet → toolbar ──────────────────────────────────────
const fullPhoto = (c: RC, list: string[], i: number, zoom = 1) => () => photo(c, list, i, 0, 0, c.W, c.H, 0, zoom);

const glassWord = defineComponent<Photos & { glassWord: string }>({
  ...base,
  id: "keynote-glass-toolbar",
  name: "Glass Word → Droplet → Toolbar",
  description: "Over the full-bleed photo a liquid-glass word pops in letter by letter, melts into a droplet, and the droplet stretches into a glass toolbar (share, like, info, adjust).",
  tags: ["liquid glass", "morph", "toolbar", "ios"],
  params: { ...P_PHOTOS, glassWord: P.text("relight", "Glass word", { maxLength: 12 }) },
  duration: 2.4,
  sounds: (p) => [...Array.from(p.glassWord).map((_, i) => ({ at: 0.15 + i * 0.07, sound: "ui.pop", gain: 0.18, seed: i, role: "letter" }) as SoundCue), { at: 1.15, sound: "fx.glitch", gain: 0.12, role: "melt" }, { at: 1.5, sound: "whoosh.swipe", gain: 0.3, role: "toolbar" }],
  render(c, p) {
    const t = c.t;
    const scene = fullPhoto(c, p.photos, 2, 1.04 + 0.03 * glide(t / 2.4));
    scene();
    const n = p.glassWord.length;
    const melt = pr(t, 1.0, 1.35, E.in);
    if (melt < 1) {
      // letters pop one by one, then pull together and shrink into a droplet
      const size = c.W * 0.16;
      const L = c.layout(p.glassWord, ui(size, 700));
      for (let i = 0; i < n; i++) {
        const u = clamp(sp(t, 0.15 + i * 0.07, SPRING.pop), 0, 1.1);
        if (u <= 0.01) continue;
        const ch = L.words[0].chars[i];
        const cx0 = c.cx - L.width / 2 + ch.x + ch.w / 2;
        const cx = cx0 + (c.cx - cx0) * melt;
        c.with({ x: cx, y: c.H * 0.42, scale: u * (1 - melt * 0.85) }, () => {
          c.translate(-cx, -c.H * 0.42);
          glassText(c, ch.ch, cx, c.H * 0.42 + L.cap / 2, size, 700, scene);
        });
      }
    }
    // droplet → toolbar
    const drop = pr(t, 1.2, 1.45, E.out);
    const bar = clamp(sp(t, 1.45, SPRING.firm), 0, 1.03);
    if (drop > 0) {
      const w = logLerp(c.W * 0.06, c.W * 0.62, clamp(bar)), h = logLerp(c.W * 0.06, c.W * 0.11, clamp(bar));
      const y = c.H * 0.42 + (c.H * 0.82 - c.H * 0.42) * clamp(bar) - h / 2;
      glass(c, c.cx - w / 2, y, w, h, h / 2, scene);
      const ia = pr(t, 1.75, 2.0);
      if (ia > 0) icons(c, c.cx, y + h / 2, w, h, ia);
    }
    cursor(c, t, [[0, c.W * 0.7, c.H * 0.6], [2.4, c.W * 0.78, c.H * 0.84]], [2.15]);
  },
});

/** Four toolbar glyphs (share, heart, info, sliders), drawn as simple strokes. */
function icons(c: RC, cx: number, cy: number, w: number, h: number, a: number) {
  const col = alpha("#FFFFFF", 0.92 * a), s = h * 0.18;
  [-0.36, -0.12, 0.12, 0.36].forEach((k, i) => {
    const x = cx + w * k;
    if (i === 0) { c.strokeRRect(x - s * 0.8, cy - s * 0.3, s * 1.6, s * 1.4, s * 0.3, col, 2); c.line(x, cy - s * 1.2, x, cy + s * 0.3, col, 2); }
    if (i === 1) { c.circle(x - s * 0.4, cy - s * 0.25, s * 0.5, col); c.circle(x + s * 0.4, cy - s * 0.25, s * 0.5, col); c.poly([[x - s * 0.88, cy - s * 0.05], [x + s * 0.88, cy - s * 0.05], [x, cy + s * 0.9]], col); }
    if (i === 2) { c.ctx.beginPath(); c.ctx.arc(x, cy, s * 0.95, 0, Math.PI * 2); c.ctx.strokeStyle = col; c.ctx.lineWidth = 2; c.ctx.stroke(); c.line(x, cy - s * 0.1, x, cy + s * 0.5, col, 2.5); c.circle(x, cy - s * 0.45, 2, col); }
    if (i === 3) for (let k2 = -1; k2 <= 1; k2++) { c.line(x - s, cy + k2 * s * 0.6, x + s, cy + k2 * s * 0.6, col, 2); c.circle(x + (k2 * 0.5) * s, cy + k2 * s * 0.6, s * 0.22, col); }
  });
}

// ── 5. glass slider relights the photo ─────────────────────────────────────
const slider = defineComponent<Photos & { label: string; day: string | null; golden: string | null }>({
  ...base,
  id: "keynote-glass-slider",
  name: "Glass Slider Relight",
  description: "The adjust icon turns the toolbar into a glass slider; dragging it relights the photo from day to golden hour (two aligned shots), the value counting up as the knob travels.",
  tags: ["liquid glass", "slider", "drag", "relight"],
  params: { ...P_PHOTOS, label: P.text("Golden hour", "Slider label", { maxLength: 20 }), day: P.media(null, "Day shot", "image"), golden: P.media(null, "Golden-hour shot (same framing)", "image") },
  duration: 2.0,
  sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.3, role: "morph" }, { at: 0.5, sound: "riser.air", len: 1.2, gain: 0.3, role: "drag" }],
  render(c, p) {
    const t = c.t;
    const v = 0.23 + 0.77 * pr(t, 0.5, 1.7, E.inOut);
    const scene = () => {
      mediaOr(c, p.day ?? p.photos[2] ?? null, 0, 0, c.W, c.H, "day shot", { key: "ak-day", tone: "#C9D3DA", ink: "#2A3238", zoom: 1.07 });
      c.save();
      c.alpha(v);
      if (p.golden) c.media(p.golden, 0, 0, c.W, c.H, { key: "ak-golden", zoom: 1.07 });
      else c.rect(0, 0, c.W, c.H, c.linear(0, 0, 0, c.H, [[0, alpha("#FF9A3D", 0.55)], [0.6, alpha("#C2541B", 0.35)], [1, alpha("#2B1206", 0.45)]]));
      c.restore();
    };
    scene();
    const m = clamp(sp(t, 0, SPRING.firm), 0, 1.02);
    const w = logLerp(c.W * 0.62, c.W * 0.86, clamp(m)), h = logLerp(c.W * 0.11, c.W * 0.15, clamp(m));
    const x = c.cx - w / 2, y = c.H * 0.82 - h / 2;
    glass(c, x, y, w, h, h * 0.3, scene);
    const a = pr(t, 0.15, 0.4);
    text(c, `☀ ${p.label}`, x + h * 0.3, y + h * 0.4, h * 0.2, "#FFFFFF", 600, { alpha: a });
    text(c, String(Math.round(v * 100)), x + w - h * 0.3 - c.layout(String(Math.round(v * 100)), ui(h * 0.2, 600)).width, y + h * 0.4, h * 0.2, "#FFFFFF", 600, { alpha: a });
    const tx0 = x + h * 0.3, tx1 = x + w - h * 0.3, ty = y + h * 0.72;
    c.rrect(tx0, ty - 3, tx1 - tx0, 6, 3, alpha("#FFFFFF", 0.35 * a));
    c.rrect(tx0, ty - 3, (tx1 - tx0) * v, 6, 3, alpha("#FFFFFF", 0.95 * a));
    const kx = tx0 + (tx1 - tx0) * v;
    c.circle(kx, ty, h * 0.13 * a, "#FFFFFF");
    cursor(c, t, [[0, c.W * 0.78, c.H * 0.84], [0.45, tx0 + (tx1 - tx0) * 0.23, ty + 8], [1.7, tx1, ty + 8], [2.0, tx1, ty + 8]], [0.48]);
  },
});

// ── 6. knob → lens → orb → next photo ──────────────────────────────────────
const orb = defineComponent<Photos>({
  ...base,
  id: "keynote-glass-orb",
  name: "Knob into Glass Orb",
  description: "Held, the slider knob turns into a glass lens, lifts into a glass orb, the next photo opens inside it as a circle, and the orb expands to fill the frame.",
  tags: ["liquid glass", "orb", "lens", "transition"],
  params: P_PHOTOS,
  duration: 1.3,
  sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.35, role: "lift" }, { at: 0.6, sound: "whoosh.deep", gain: 0.45, role: "open" }],
  render(c, p) {
    const t = c.t;
    const before = fullPhoto(c, p.photos, 2, 1.07);
    before();
    c.rect(0, 0, c.W, c.H, alpha("#FF9A3D", 0.25));
    const lift = clamp(sp(t, 0, SPRING.firm), 0, 1.03);
    const R = logLerp(c.W * 0.05, c.W * 0.2, clamp(lift));
    const ox = c.W * 0.86 + (c.cx - c.W * 0.86) * clamp(lift), oy = c.H * 0.86 + (c.H * 0.45 - c.H * 0.86) * clamp(lift);
    const open = pr(t, 0.45, 1.3, E.inOut);
    const r = logLerp(R, Math.hypot(c.W, c.H) * 0.62, open);
    c.save();
    c.clipCircle(ox, oy, r);
    photo(c, p.photos, 6, 0, 0, c.W, c.H, 0, 1.2 - 0.15 * open);
    c.restore();
    c.ctx.beginPath();
    c.ctx.arc(ox, oy, r, 0, Math.PI * 2);
    c.ctx.strokeStyle = c.linear(ox - r, oy - r, ox + r, oy + r, [[0, alpha("#FFFFFF", 0.9 * (1 - open))], [1, alpha("#FFFFFF", 0.3 * (1 - open))]]);
    c.ctx.lineWidth = 3;
    c.ctx.stroke();
  },
});

// ── 7. lock screen ─────────────────────────────────────────────────────────
const lock = defineComponent<Photos & { date: string; time: string; track: string; sub: string }>({
  ...base,
  id: "keynote-lock-screen",
  name: "Glass Lock Screen",
  description: "The orb settles into a lock screen: glass clock digits over the photo, the date above, and a home bar that stretches into a glass music player.",
  tags: ["lock screen", "liquid glass", "clock", "player"],
  params: { ...P_PHOTOS, date: P.text("Friday, September 25", "Date", { maxLength: 30 }), time: P.text("9:41", "Clock", { maxLength: 5 }), track: P.text("motion study 04", "Player title", { maxLength: 24 }), sub: P.text("made in code", "Player subtitle", { maxLength: 24 }) },
  duration: 2.2,
  sounds: () => [{ at: 0.1, sound: "tonal.chime", gain: 0.25, role: "clock" }, { at: 1.0, sound: "whoosh.swipe", gain: 0.3, role: "player" }],
  render(c, p) {
    const t = c.t;
    const scene = fullPhoto(c, p.photos, 6, 1.05 - 0.03 * glide(t / 2.2));
    scene();
    const a = pr(t, 0, 0.3);
    text(c, p.date, c.cx, c.H * 0.115, c.W * 0.03, "#FFFFFF", 600, { center: true, alpha: a });
    glassText(c, p.time, c.cx, c.H * 0.3, c.W * 0.24, 700, scene, a);
    // home bar → glass music player
    const g = clamp(sp(t, 0.9, SPRING.firm), 0, 1.03);
    const w = logLerp(c.W * 0.22, c.W * 0.66, clamp(g)), h = logLerp(c.W * 0.012, c.W * 0.12, clamp(g));
    const y = c.H * 0.95 - (c.H * 0.95 - c.H * 0.86) * clamp(g) - h / 2;
    if (g < 0.05) c.rrect(c.cx - w / 2, y, w, h, h / 2, alpha("#FFFFFF", 0.9));
    else {
      glass(c, c.cx - w / 2, y, w, h, Math.min(h / 2, c.W * 0.04), scene);
      const ia = pr(t, 1.2, 1.5);
      text(c, p.track, c.cx - w / 2 + h * 0.3, y + h * 0.45, h * 0.17, "#FFFFFF", 650, { alpha: ia });
      text(c, p.sub, c.cx - w / 2 + h * 0.3, y + h * 0.7, h * 0.13, alpha("#FFFFFF", 0.7), 500, { alpha: ia });
      const px = c.cx + w / 2 - h * 0.45;
      c.save();
      c.alpha(ia);
      c.poly([[px - h * 0.55, y + h * 0.4], [px - h * 0.55, y + h * 0.6], [px - h * 0.72, y + h * 0.5]], "#FFFFFF");
      c.rect(px - h * 0.08, y + h * 0.38, h * 0.05, h * 0.24, "#FFFFFF");
      c.rect(px + h * 0.04, y + h * 0.38, h * 0.05, h * 0.24, "#FFFFFF");
      c.poly([[px + h * 0.25, y + h * 0.4], [px + h * 0.25, y + h * 0.6], [px + h * 0.42, y + h * 0.5]], "#FFFFFF");
      c.restore();
    }
  },
});

// ── 8. phone pull-back → Mac window ────────────────────────────────────────
function wallpaper(c: RC) {
  c.rect(0, 0, c.W, c.H, c.linear(0, 0, c.W, c.H, [[0, "#F1EEFB"], [0.55, "#DCD8F6"], [1, "#C9C9F2"]]));
  for (let i = 0; i < 9; i++) {
    const y0 = c.H * (0.62 + i * 0.035);
    c.ctx.beginPath();
    for (let x = -20; x <= c.W + 20; x += 20) {
      const y = y0 - Math.sin(x / c.W * Math.PI * 1.2 + i * 0.25) * c.H * 0.22;
      if (x === -20) c.ctx.moveTo(x, y);
      else c.ctx.lineTo(x, y);
    }
    c.ctx.strokeStyle = alpha(i % 2 ? "#3A5BE0" : "#1D2FA8", 0.18 + i * 0.05);
    c.ctx.lineWidth = c.H * 0.012;
    c.ctx.stroke();
  }
}

function phoneAt(c: RC, x: number, y: number, w: number, h: number, inner: () => void, island = 0) {
  const r = w * 0.17;
  c.save();
  c.shadow(alpha("#000", 0.25), 40, 0, 18);
  c.rrect(x, y, w, h, r, "#111");
  c.restore();
  const b = w * 0.035;
  c.save();
  c.clipRRect(x + b, y + b, w - b * 2, h - b * 2, r - b);
  c.with({ x: x + b, y: y + b, sx: (w - b * 2) / c.W, sy: (h - b * 2) / c.H }, inner);
  c.restore();
  const iw = w * 0.32 + island;
  c.rrect(x + w / 2 - w * 0.16, y + b * 1.6, iw, w * 0.09, w * 0.045, "#050505");
}

const pullback = defineComponent<Photos & { date: string; time: string }>({
  ...base,
  id: "keynote-phone-to-mac",
  name: "Phone Pull-back → Mac Window",
  description: "The lock screen pulls back into a phone (the bezel grows out of the screen edge) on a wavy wallpaper; the Dynamic Island stretches like liquid, pinches off, flies over and grows into a Mac window.",
  tags: ["phone", "pull back", "dynamic island", "mac", "morph"],
  params: { ...P_PHOTOS, date: P.text("Friday, September 25", "Date", { maxLength: 30 }), time: P.text("9:41", "Clock", { maxLength: 5 }) },
  duration: 2.0,
  sounds: () => [{ at: 0, sound: "whoosh.deep", gain: 0.4, role: "pull back" }, { at: 0.9, sound: "whoosh.swipe", gain: 0.35, role: "island" }, { at: 1.4, sound: "impact.land", gain: 0.3, role: "window" }],
  render(c, p) {
    const t = c.t;
    wallpaper(c);
    const pb = pr(t, 0, 0.75, E.inOut);
    const pw = logLerp(c.W * 1.04, c.W * 0.22, pb), ph = logLerp(c.H * 1.04, c.W * 0.46, pb);
    const px = c.cx - pw / 2 + (c.W * 0.11 - (c.cx - c.W * 0.11)) * pb * 0.62, py = c.cy - ph / 2;
    const stretch = pr(t, 0.85, 1.15, E.inOut) * (1 - pr(t, 1.15, 1.3));
    phoneAt(c, px, py, pw, ph, () => {
      photo(c, p.photos, 6, 0, 0, c.W, c.H, 0, 1.05);
      text(c, p.date, c.cx, c.H * 0.115, c.W * 0.03, "#FFFFFF", 600, { center: true });
      text(c, p.time, c.cx, c.H * 0.3, c.W * 0.24, alpha("#FFFFFF", 0.55), 700, { center: true });
    }, stretch * c.W * 0.3);
    // the pinched-off drop flies right and grows into a window
    const fly = clamp(sp(t, 1.15, SPRING.firm), 0, 1.02);
    if (t > 1.15) {
      const w = logLerp(c.W * 0.06, c.W * 0.56, clamp(fly)), h = logLerp(c.W * 0.03, c.W * 0.4, clamp(fly));
      const x = px + pw * 0.7 + (c.W * 0.4 - px - pw * 0.7) * clamp(fly), y = py + c.W * 0.03 + (c.H * 0.3 - py - c.W * 0.03) * clamp(fly);
      macWindow(c, x, y, w, h, fly, () => favourites(c, x, y, w, h, fly));
    }
  },
});

/** A Safari-style window: traffic lights, a tab strip and a page area. */
function macWindow(c: RC, x: number, y: number, w: number, h: number, a: number, page: () => void, tab = "Start Page") {
  const r = Math.min(w, h) * 0.04;
  c.save();
  c.shadow(alpha("#000", 0.22), 40, 0, 16);
  c.rrect(x, y, w, h, r, "#FBFAF8");
  c.restore();
  c.save();
  c.clipRRect(x, y, w, h, r);
  const bar = Math.max(8, h * 0.075);
  c.rect(x, y, w, bar, "#F1F0EC");
  ["#FF5F57", "#FEBC2E", "#28C840"].forEach((col, i) => c.circle(x + bar * 0.55 + i * bar * 0.42, y + bar / 2, bar * 0.13, col));
  if (a > 0.6) text(c, `★ ${tab}`, x + w * 0.16, y + bar * 0.62, bar * 0.32, "#555", 500, { alpha: (a - 0.6) / 0.4 });
  c.translate(0, 0);
  page();
  c.restore();
}

function favourites(c: RC, x: number, y: number, w: number, h: number, a: number) {
  if (a < 0.7) return;
  const k = (a - 0.7) / 0.3;
  text(c, "Favourites", x + w * 0.06, y + h * 0.2, h * 0.04, "#333", 650, { alpha: k });
  ["A", "M", "N", "Y", "P", "S"].forEach((s, i) => {
    const bx = x + w * (0.06 + i * 0.1), by = y + h * 0.26, s2 = w * 0.065;
    c.rrect(bx, by, s2, s2, s2 * 0.25, alpha(["#F7C9B6", "#C8D6F7", "#CDEBD5", "#F5D7E4", "#E2D5F7", "#F7E8C3"][i], k));
    text(c, s, bx + s2 / 2, by + s2 * 0.62, s2 * 0.35, "#555", 600, { center: true, alpha: k });
  });
  text(c, "Reading List", x + w * 0.06, y + h * 0.52, h * 0.04, "#333", 650, { alpha: k });
  for (let i = 0; i < 3; i++) c.rrect(x + w * (0.06 + i * 0.3), y + h * 0.58, w * 0.27, h * 0.22, 6, alpha("#ECEAE5", k));
}

// ── 9. drag the wallpaper into a landing page ──────────────────────────────
const landing = defineComponent<Photos & { word: string; headline: string; body: string; nav: string[] }>({
  ...base,
  id: "keynote-drop-landing",
  name: "Drag onto Safari → Landing Page",
  description: "Long-press the wallpaper photo, drag it onto the Safari tab, the page pushes in, drop it and it becomes the hero of a landing page: wordmark, nav, an Order pill, a big two-line headline and the photo as the hero card.",
  tags: ["drag and drop", "safari", "landing page", "hero"],
  params: { ...P_PHOTOS, ...P_WORD, headline: P.text("from screen\nto wall.", "Headline", { multiline: true, maxLength: 40 }), body: P.text("museum-grade prints of the photos you already love. framed by hand, sent in a week.", "Body", { maxLength: 120 }), nav: P.list(["prints", "frames", "journal"], "Nav", { max: 4 }) },
  duration: 2.4,
  sounds: () => [{ at: 0.2, sound: "ui.click", gain: 0.35, role: "long press" }, { at: 0.35, sound: "whoosh.swipe", gain: 0.3, role: "drag" }, { at: 1.0, sound: "impact.land", gain: 0.35, role: "drop" }, { at: 1.25, sound: "whoosh.air", gain: 0.3, role: "push" }],
  render(c, p) {
    const t = c.t;
    wallpaper(c);
    const grow = pr(t, 1.1, 1.7, E.inOut);
    const wx = c.W * 0.4 - c.W * 0.4 * grow + c.W * 0.02 * grow, wy = c.H * 0.3 - (c.H * 0.3 - c.H * 0.06) * grow;
    const ww = c.W * 0.56 + (c.W * 0.96 - c.W * 0.56) * grow, wh = c.W * 0.4 + (c.H * 0.86 - c.W * 0.4) * grow;
    // the phone on the left fades as the page takes over
    if (grow < 1) {
      c.save();
      c.alpha(1 - grow);
      phoneAt(c, c.W * 0.11 - c.W * 0.11 * 0.62 + c.W * 0.04, c.cy - c.W * 0.23, c.W * 0.22, c.W * 0.46, () => photo(c, p.photos, 6, 0, 0, c.W, c.H, 0, 1.05));
      c.restore();
    }
    macWindow(c, wx, wy, ww, wh, 1, () => {
      const bar = Math.max(8, wh * 0.075);
      if (grow < 0.3) {
        // drop zone
        const dz = { x: wx + ww * 0.3, y: wy + wh * 0.25, w: ww * 0.4, h: wh * 0.55 };
        c.ctx.setLineDash([8, 6]);
        c.strokeRRect(dz.x, dz.y, dz.w, dz.h, 10, alpha("#000", 0.35 * pr(t, 0.4, 0.6)), 2);
        c.ctx.setLineDash([]);
      } else {
        const k = pr(t, 1.3, 1.8, E.out);
        const px = wx + ww * 0.05, top = wy + bar + wh * 0.06;
        text(c, p.word, px, top + wh * 0.02, wh * 0.035, INK, 800, { alpha: k, wordmark: true });
        p.nav.forEach((s, i) => text(c, s, wx + ww * (0.62 + i * 0.07), top + wh * 0.015, wh * 0.018, "#666", 500, { alpha: k }));
        c.rrect(wx + ww * 0.86, top - wh * 0.015, ww * 0.08, wh * 0.04, wh * 0.02, alpha(INK, k));
        text(c, "Order", wx + ww * 0.9, top + wh * 0.012, wh * 0.016, "#FFF", 600, { center: true, alpha: k });
        p.headline.split("\n").forEach((ln, i) => text(c, ln, px, top + wh * (0.18 + i * 0.07), wh * 0.07, INK, 800, { alpha: k, wordmark: true }));
        const B = c.layout(p.body, ui(wh * 0.02, 400));
        c.drawLayout(c.fit(p.body, ui(wh * 0.02, 400), ww * 0.38, wh * 0.1), px, top + wh * 0.3, { color: "#666", alpha: k });
        void B;
      }
    });
    // the dragged photo: lifts from the phone, travels, lands as the hero card
    const drag = pr(t, 0.3, 1.0, E.inOut);
    const land = pr(t, 1.1, 1.7, E.inOut);
    const from = { x: c.W * 0.06, y: c.cy - c.W * 0.2, w: c.W * 0.16, h: c.W * 0.4 };
    const drop = { x: c.W * 0.46, y: c.H * 0.38, w: c.W * 0.16, h: c.W * 0.2 };
    const hero = { x: wx + ww * 0.55, y: wy + wh * 0.2, w: ww * 0.4, h: wh * 0.62 };
    const at = (k: "x" | "y" | "w" | "h") => from[k] + (drop[k] - from[k]) * drag + (hero[k] - drop[k]) * land;
    if (t > 0.25) {
      c.save();
      c.shadow(alpha("#000", 0.25), 30, 0, 12);
      c.rrect(at("x"), at("y"), at("w"), at("h"), 12, "#000");
      c.restore();
      photo(c, p.photos, 6, at("x"), at("y"), at("w"), at("h"), 12);
    }
    const cp = cursorAt(t, [[0, c.W * 0.5, c.H * 0.8], [0.25, from.x + from.w / 2, from.y + from.h / 2], [1.0, drop.x + drop.w / 2, drop.y + drop.h / 2], [1.7, hero.x + hero.w * 0.6, hero.y + hero.h * 0.9], [2.4, hero.x + hero.w * 0.6, hero.y + hero.h * 0.9]]);
    drawCursor(c, cp.x, cp.y, { scale: 1.5, press: t > 0.2 && t < 1.0 ? 1 : 0 });
  },
});

// ── 10. the print product card ─────────────────────────────────────────────
const FRAMES = ["#B98B5E", "#111111", "#F3F1EC"];
const SIZES = ["30×40", "50×70", "70×100"];

function framedPrint(c: RC, list: string[], x: number, y: number, w: number, h: number, frame: string, paint = 1, prev = frame) {
  const f = w * 0.06, mat = w * 0.12;
  c.save();
  c.shadow(alpha("#000", 0.2), 24, 0, 10);
  c.rect(x, y, w, h, prev);
  c.restore();
  if (paint < 1) {
    c.save();
    c.clipRect(x, y, w * paint, h);
    c.rect(x, y, w, h, frame);
    c.restore();
  } else c.rect(x, y, w, h, frame);
  c.rect(x + f, y + f, w - f * 2, h - f * 2, "#FBFAF6");
  photo(c, list, 6, x + f + mat, y + f + mat, w - (f + mat) * 2, h - (f + mat) * 2, 0, 1.05);
}

const product = defineComponent<Photos & { title: string; desc: string; price: string; cta: string }>({
  ...base,
  id: "keynote-print-card",
  name: "Print Product Card",
  description: "Scroll: the hero becomes a framed print on a product card (mat and moulding grow out of the photo's edge); a frame colour is picked and paints across, a size is chosen, then the nav button flies down into 'Order print'.",
  tags: ["ecommerce", "product card", "picker", "framed print"],
  params: { ...P_PHOTOS, title: P.text("the print", "Title", { maxLength: 24 }), desc: P.text("archival pigment on cotton rag.\nframed by hand, ready to hang.", "Description", { multiline: true, maxLength: 90 }), price: P.text("$129", "Price", { maxLength: 10 }), cta: P.text("Order print", "Button", { maxLength: 16 }) },
  duration: 2.6,
  sounds: () => [{ at: 0.1, sound: "whoosh.swipe", gain: 0.3, role: "scroll" }, { at: 0.9, sound: "ui.click", gain: 0.35, role: "frame" }, { at: 1.5, sound: "ui.click", gain: 0.35, role: "size" }, { at: 2.0, sound: "ui.pop", gain: 0.3, role: "cta" }],
  render(c, p) {
    const t = c.t;
    wallpaper(c);
    const zoom = pr(t, 0, 0.6, E.inOut);
    const k = logLerp(1, 1.35, zoom);
    c.with({ x: c.cx, y: c.cy, scale: k }, () => {
      c.translate(-c.cx - c.W * 0.06 * zoom, -c.cy + c.H * 0.02 * zoom);
      const wx = c.W * 0.02, wy = c.H * 0.1, ww = c.W * 0.96, wh = c.H * 0.8;
      macWindow(c, wx, wy, ww, wh, 1, () => {
        const col = { x: wx + ww * 0.04, y: wy + wh * 0.12, w: ww * 0.44, h: wh * 0.78 };
        c.rrect(col.x, col.y, col.w, col.h, 14, "#ECEAE4");
        const pick = t < 0.9 ? 0 : 1;
        const paint = pr(t, 0.9, 1.3, E.inOut);
        const fw = col.w * 0.58, fh = fw * 1.25;
        framedPrint(c, p.photos, col.x + (col.w - fw) / 2, col.y + (col.h - fh) / 2, fw, fh, FRAMES[pick], pick ? paint : 1, FRAMES[0]);
        const ix = wx + ww * 0.54;
        text(c, p.title, ix, wy + wh * 0.25, wh * 0.06, INK, 800, { wordmark: true });
        p.desc.split("\n").forEach((ln, i) => text(c, ln, ix, wy + wh * (0.32 + i * 0.04), wh * 0.025, "#777", 400));
        text(c, "frame", ix, wy + wh * 0.45, wh * 0.02, "#555", 600);
        FRAMES.forEach((f, i) => {
          c.circle(ix + wh * 0.025 + i * wh * 0.06, wy + wh * 0.49, wh * 0.02, f);
          if (i === pick) c.strokeRRect(ix + wh * 0.025 + i * wh * 0.06 - wh * 0.028, wy + wh * 0.49 - wh * 0.028, wh * 0.056, wh * 0.056, wh * 0.028, INK, 2);
        });
        text(c, "size", ix, wy + wh * 0.57, wh * 0.02, "#555", 600);
        const sizePick = t < 1.5 ? 1 : 2;
        const segW = ww * 0.13;
        c.rrect(ix, wy + wh * 0.6, segW * 3, wh * 0.06, wh * 0.03, "#ECEAE4");
        const sx = ix + segW * (1 + (sizePick - 1) * pr(t, 1.5, 1.75, E.inOut));
        c.rrect(sx + 3, wy + wh * 0.6 + 3, segW - 6, wh * 0.06 - 6, wh * 0.03, "#FFFFFF");
        SIZES.forEach((s, i) => text(c, s, ix + segW * (i + 0.5), wy + wh * 0.64, wh * 0.02, i === sizePick ? INK : "#888", 600, { center: true }));
        text(c, p.price, ix, wy + wh * 0.75, wh * 0.04, INK, 700);
        const b = clamp(sp(t, 1.9, SPRING.firm), 0, 1.03);
        if (b > 0.01) {
          const bw = segW * 3, bh = wh * 0.07;
          c.rrect(ix, wy + wh * 0.8, bw * b, bh, bh / 2, INK);
          text(c, p.cta, ix + bw * b / 2, wy + wh * 0.845, wh * 0.024, "#FFF", 600, { center: true, alpha: pr(t, 2.1, 2.3) });
        }
      });
    });
    cursor(c, t, [[0, c.W * 0.5, c.H * 0.85], [0.85, c.W * 0.68, c.H * 0.6], [1.45, c.W * 0.86, c.H * 0.76], [2.6, c.W * 0.8, c.H * 0.92]], [0.9, 1.5]);
  },
});

// ── 11. one black shape keeps morphing: the order ──────────────────────────
const order = defineComponent<{ steps: string[] }>({
  ...base,
  id: "keynote-order-morph",
  name: "Order Button Morph",
  description: "One black shape keeps morphing through the order: Ordered ✓ → Printing % (a filling bar) → On its way (a van on a route) → Delivered ✓, which becomes a circle.",
  tags: ["button", "morph", "status", "loader"],
  params: { steps: P.list(["Ordered", "Printing", "On its way", "Delivered"], "Steps", { min: 4, max: 4 }) },
  duration: 2.6,
  sounds: () => [{ at: 0.05, sound: "ui.click", gain: 0.4, role: "order" }, { at: 0.35, sound: "tonal.notify", gain: 0.25, role: "ordered" }, { at: 1.35, sound: "ui.pop", gain: 0.3, role: "printed" }, { at: 1.9, sound: "whoosh.swipe", gain: 0.3, role: "van" }, { at: 2.3, sound: "tonal.chime", gain: 0.3, role: "delivered" }],
  render(c, p) {
    const t = c.t;
    wallpaper(c);
    c.rect(0, 0, c.W, c.H, alpha("#FBFAF8", 0.85));
    const cx = c.cx, cy = c.cy;
    const shapes: [number, number, number][] = [[0, 0.5, 0.09], [0.3, 0.42, 0.09], [0.6, 0.6, 0.11], [1.6, 0.6, 0.11], [2.25, 0.16, 0.16]];
    const W = (i: number) => c.W * shapes[i][1], H = (i: number) => c.W * shapes[i][2];
    let w = W(0), h = H(0);
    for (let i = 1; i < shapes.length; i++) {
      const u = clamp(sp(t, shapes[i][0], SPRING.firm), 0, 1.02);
      w += (W(i) - W(i - 1)) * u;
      h += (H(i) - H(i - 1)) * u;
    }
    c.rrect(cx - w / 2, cy - h / 2, w, h, h / 2, INK);
    const fs = c.W * 0.034;
    const seg = t < 0.6 ? 0 : t < 1.6 ? 1 : t < 2.25 ? 2 : 3;
    const inA = pr(t, [0.3, 0.7, 1.65, 2.3][seg], [0.45, 0.85, 1.8, 2.45][seg]);
    c.save();
    c.clipRRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    if (seg === 0) text(c, `✓ ${p.steps[0]}`, cx, cy + fs * 0.35, fs, "#FFF", 600, { center: true, alpha: inA });
    if (seg === 1) {
      const pc = Math.round(100 * pr(t, 0.75, 1.5, E.inOut));
      text(c, p.steps[1], cx - w / 2 + h * 0.4, cy - h * 0.02, fs * 0.9, "#FFF", 600, { alpha: inA });
      text(c, `${pc}%`, cx + w / 2 - h * 0.4 - c.layout(`${pc}%`, ui(fs * 0.9, 600)).width, cy - h * 0.02, fs * 0.9, "#FFF", 600, { alpha: inA });
      c.rrect(cx - w / 2 + h * 0.4, cy + h * 0.2, (w - h * 0.8) * (pc / 100), 4, 2, alpha("#FFF", inA));
    }
    if (seg === 2) {
      const r0 = cx - w / 2 + h * 0.5, r1 = cx + w / 2 - h * 0.5, ry = cy + h * 0.18;
      c.line(r0, ry, r1, ry, alpha("#FFF", 0.3 * inA), 3);
      const vx = r0 + (r1 - r0) * pr(t, 1.7, 2.2, E.inOut);
      c.rrect(vx - h * 0.18, ry - h * 0.22, h * 0.36, h * 0.18, 4, alpha("#FFF", inA));
      text(c, p.steps[2], cx, cy - h * 0.08, fs * 0.85, "#FFF", 600, { center: true, alpha: inA });
    }
    if (seg === 3) text(c, "✓", cx, cy + fs * 0.4, fs * 1.4, "#FFF", 600, { center: true, alpha: inA });
    c.restore();
    cursor(c, t, [[0, cx + c.W * 0.05, cy + c.W * 0.03], [2.6, cx + c.W * 0.22, cy + c.W * 0.25]], [0.05]);
  },
});

// ── 12. flood onto the wall ────────────────────────────────────────────────
const wall = defineComponent<Photos & { wallClip: string | null; handsClip: string | null }>({
  ...base,
  id: "keynote-flood-wall",
  name: "Flood onto Real Wall",
  description: "The delivered circle floods the frame edge to edge (overscaling past the corners in ~0.3 s), holds black for a beat, and contracts into the framed print hanging on real wall footage with moving plant shadows; hands lift it off the wall.",
  tags: ["flood", "match cut", "footage", "framed print"],
  params: { ...P_PHOTOS, wallClip: P.media(null, "Wall with plant shadows (video)", "video"), handsClip: P.media(null, "Hands holding the print (video, optional)", "video") },
  duration: 3.4,
  sounds: () => [{ at: 0, sound: "whoosh.deep", gain: 0.45, role: "flood" }, { at: 0.75, sound: "impact.sub", gain: 0.4, role: "contract" }],
  render(c, p) {
    const t = c.t;
    const contract = pr(t, 0.7, 1.2, E.inOut);
    if (contract < 1) {
      c.clear(CANVAS);
      const R = Math.hypot(c.W, c.H) * 0.75 * pr(t, 0, 0.3, E.in) + c.W * 0.08;
      if (contract <= 0) c.circle(c.cx, c.cy, R, INK);
    }
    if (contract > 0) {
      mediaOr(c, t > 2.2 && p.handsClip ? p.handsClip : p.wallClip, 0, 0, c.W, c.H, "wall footage", { t: t, key: "ak-wall", tone: "#E6E4DE", ink: "#55524C" });
      if (!p.wallClip) {
        // stand-in for the moving plant shadows
        for (let i = 0; i < 6; i++) c.lightEllipse(c.W * (0.15 + i * 0.12) + Math.sin(t * 1.3 + i) * 12, c.H * (0.75 - i * 0.04), c.W * 0.12, c.H * 0.05, "#5B574F", 0.18, "multiply");
      }
      const fw = logLerp(c.W * 2.2, c.W * 0.4, contract), fh = fw * 1.24;
      const lift = pr(t, 2.2, 3.4, E.inOut);
      framedPrint(c, p.photos, c.cx - fw / 2, c.cy - fh / 2 + lift * c.H * 0.02, fw, fh, FRAMES[1]);
      if (contract < 1) c.rect(0, 0, c.W, c.H, alpha(INK, 1 - contract * 2));
    }
  },
});

// ── 13. back to the wordmark ───────────────────────────────────────────────
const outro = defineComponent<Photos & { word: string; tagline: string; hold: number }>({
  ...base,
  id: "keynote-outro-loop",
  name: "Flood → Pill → Dot → Wordmark",
  description: "The print floods the screen, holds black, contracts into the pill, the pill into the dot, and the letters spring back out of the period on the beat return; a small tagline lands under the wordmark. Last frame = first frame.",
  tags: ["loop", "wordmark", "outro", "accordion"],
  params: { ...P_PHOTOS, ...P_WORD, tagline: P.text("from screen to wall.", "Tagline", { maxLength: 40 }), hold: P.number(0.8, "Hold", { min: 0, max: 3, step: 0.1, unit: "s" }) },
  duration: (p) => 2.6 + p.hold,
  sounds: () => [{ at: 0, sound: "whoosh.deep", gain: 0.4, role: "flood" }, { at: 1.45, sound: "whoosh.swipe", gain: 0.45, role: "letters" }, { at: 1.6, sound: "impact.land", gain: 0.4, role: "wordmark" }],
  render(c, p) {
    const t = c.t;
    const flood = pr(t, 0, 0.5, E.inOut);
    if (t < 0.9) {
      c.clear(CANVAS);
      const s = logLerp(c.W * 0.5, c.W * 1.6, flood);
      photo(c, p.photos, 6, c.cx - s / 2, c.cy - s * 0.62, s, s * 1.24, 0, 1.05);
      c.rect(0, 0, c.W, c.H, alpha(INK, pr(t, 0.4, 0.6)));
      return;
    }
    c.clear(CANVAS);
    const back = pr(t, 0.9, 1.3, E.inOut);
    const out = 1 - pr(t, 1.35, 1.75, E.out); // letters spring back out of the period
    if (back < 1) {
      const w = logLerp(c.W * 2.4, c.W * 0.05, back), h = logLerp(c.H * 2.4, c.W * 0.05, back);
      c.rrect(c.cx - w / 2, c.cy - h / 2, w, h, Math.min(w, h) / 2, INK);
    } else wordmark(c, p.word, clamp(out), c.cy * 0.98);
    text(c, p.tagline, c.cx, c.cy + c.W * 0.11, c.W * 0.024, "#555", 500, { center: true, alpha: pr(t, 1.9, 2.3) });
    cursor(c, t, [[0, c.W * 0.74, c.H * 0.9], [3.4, c.W * 0.78, c.H * 0.92]]);
  },
});

const glassPill = defineComponent<Photos & { label: string; hold: number }>({
  ...base,
  id: "keynote-liquid-glass",
  name: "Liquid Glass Pill",
  description: "The film's glass material as an element: a pill that refracts and magnifies the photo behind it, with a whisper of frost and a bright top-left rim, breathing gently.",
  tags: ["liquid glass", "ios", "element", "material"],
  params: { ...P_PHOTOS, label: P.text("Golden hour", "Label", { maxLength: 20 }), hold: P.number(3, "Length", { min: 1, max: 6, step: 0.1, unit: "s" }) },
  duration: (p) => p.hold,
  render(c, p) {
    const t = c.t;
    const scene = fullPhoto(c, p.photos, 2, 1.05 + 0.02 * Math.sin(t * 0.8));
    scene();
    const w = c.W * 0.62, h = c.W * 0.12, y = c.H * 0.5 - h / 2 + Math.sin(t * 1.2) * 6;
    glass(c, c.cx - w / 2, y, w, h, h / 2, scene);
    text(c, p.label, c.cx, y + h * 0.6, h * 0.26, "#FFF", 600, { center: true });
  },
});

const components = [open, irisShot, gridShot, glassWord, slider, orb, lock, pullback, landing, product, order, wall, outro, glassPill] as unknown as Component[];

const template: PostSpec = {
  id: "kit-keynote-one-take",
  title: "develop. — Apple-keynote launch film, one take",
  format: "square",
  fps: 60,
  // played at 1.07× so the take runs the original 29 s
  clips: ["keynote-wordmark-pill", "keynote-iris", "keynote-grid-bento", "keynote-glass-toolbar", "keynote-glass-slider", "keynote-glass-orb", "keynote-lock-screen", "keynote-phone-to-mac", "keynote-drop-landing", "keynote-print-card", "keynote-order-morph", "keynote-flood-wall", "keynote-outro-loop"].map((component) => ({ component, props: { speed: 1.07 } })),
  music: { src: "media/music/library/delightful-d.mp3", gain: 0.5, offset: 0.124, fadeIn: 0.05, fadeOut: 1.0, credit: "\"Delightful D\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Kit template: @twoclipping's Apple-keynote launch film in one continuous take, original copy; drop in 9–12 photos, a day/golden pair and the wall footage.",
};

export const keynoteOneTake: Kit = {
  id: "keynote-one-take",
  promptId: "2103835273813496100",
  title: "Apple-keynote one-take film",
  family: "launch",
  format: "square",
  summary: "A 29-second 2D Apple-keynote launch film in one continuous take: nothing fades or cuts, every scene is made out of the previous one. A wordmark squeezes into its period, liquid glass sits over real photos, a phone becomes a Mac, a print is ordered by one morphing black shape and lands on a real wall, and the film loops back to the wordmark.",
  shots: [
    { at: 0, shot: "'develop.' squeezes into its own period like an accordion; the dot grows into a black pill; a label rises inside", component: "keynote-wordmark-pill" },
    { at: 2.6, shot: "Click: six iris blades close over the label and snap open onto a photo; the circle becomes a square", component: "keynote-iris" },
    { at: 4.0, shot: "The square shrinks; a 3×3 grid unfolds like a paper map (centre, plus, corners), reflows into a bento; a click zooms into one tile on the drop", component: "keynote-grid-bento" },
    { at: 6.8, shot: "A glass word pops in letter by letter, melts into a droplet that stretches into a glass toolbar", component: "keynote-glass-toolbar" },
    { at: 9.2, shot: "The adjust icon becomes a glass slider; dragging relights the photo from day to golden hour", component: "keynote-glass-slider" },
    { at: 11.2, shot: "The knob becomes a lens, lifts into a glass orb; the next photo opens inside and fills the frame", component: "keynote-glass-orb" },
    { at: 12.5, shot: "Lock screen: glass clock digits, date, a home bar that stretches into a glass music player", component: "keynote-lock-screen" },
    { at: 14.7, shot: "The lock screen pulls back into a phone; the Dynamic Island stretches, pinches off and grows into a Mac window", component: "keynote-phone-to-mac" },
    { at: 16.7, shot: "Long-press the wallpaper, drag it onto Safari, drop: it becomes the hero of a landing page", component: "keynote-drop-landing" },
    { at: 19.1, shot: "Scroll: a framed-print product card; pick a frame colour (it paints across) and a size; 'Order print'", component: "keynote-print-card" },
    { at: 21.7, shot: "One black shape morphs: Ordered ✓ → Printing % → On its way → Delivered ✓", component: "keynote-order-morph" },
    { at: 24.3, shot: "The circle floods black and contracts into the framed print on real wall footage", component: "keynote-flood-wall" },
    { at: 27.7, shot: "Flood → pill → dot → the letters spring back out of the period; last frame = first frame", component: "keynote-outro-loop" },
  ],
  rules: [
    "2D only, one continuous take: no crossfades, blur-ins, 3D flips, particles or glows; holds never longer than 1 s",
    "Warm off-white canvas, black UI, iOS-style liquid glass over the photos; Archivo Expanded 800 for the wordmark, Geist for UI",
    "A cursor drives every change with real clicks, drags and long-presses; the camera zooms so each moment fills the square",
    "120 BPM, something on every beat; the zoom lands on the drop, the wall sits in the breakdown, the wordmark returns with the beat",
    "Floods overscale past the corners and take ~0.3 s; text swapping inside a morphing shape gets its own mask",
    "A real SFX for every event placed by its measured peak; −14 LUFS",
  ],
  components,
  template,
};
