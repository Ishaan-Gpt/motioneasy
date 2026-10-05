// Kit: "Editorial explainer" — the off-white, ink-black Shorts language (see docs/reference/video-ref-analysis.md).
// Words "develop" (grey, blurred, low → ink, settled) on the voice with a strong ease-out; big words scale down
// from 115%; key phrases type into a black box; media lands like a camera shot (ghost stage → solid, slow push,
// tilt settle, two shadows); layouts scroll-pan into each other; the rare hard cut hides behind a dip to grey.
// One `film` JSON drives everything, so any voiced explainer can be dropped into the same craft.

import { E, P, SPRING, alpha, bezier, clamp, defineComponent, lerp, mix, pr, spring, type Component, type RC, type SoundCue } from "@motioneasy/engine";
import type { PostSpec } from "../sequence";
import type { Kit } from "./types";

const PAPER = "#F4F4F2";
const INK = "#111111";
const GHOST = "#BDBDBD";
const BAR = "#E2E2E0";
const LOOK = { mode: "light" as const, bg: PAPER, fg: INK, accent: "#E46A55", lighting: 0, grain: 0.1, vignette: 0, backdrop: "plain" as const, camera: "still" as const };
const OUT = bezier(0.16, 1, 0.3, 1); // the reference's settle curve
const PAN = bezier(0.65, 0, 0.35, 1);

type Glyph = "plus" | "spark" | "bolt" | "check" | "grid" | "pen" | "curve" | "drop" | "code" | "play" | "lock" | "chat" | "dot";
interface Line { text: string; px?: number; size?: "s" | "m" | "l" | "xl"; weight?: number; caps?: boolean; pop?: boolean; times?: number[] }
interface Item {
  shot: number; kind: string; at: number; out?: number; x?: number; y?: number; w?: number; h?: number; align?: "left" | "center" | "right";
  lines?: Line[]; label?: boolean; text?: string; media?: string | null; ui?: string; glyph?: Glyph; color?: string; rot?: number; from?: string;
  items?: { text: string; t: number; glyph?: Glyph }[]; n?: number; pts?: number[][]; title?: string; sub?: string; dark?: boolean; z?: number; cps?: number; size?: number;
}
interface Shot { at: number; cut?: "dip" | "pan" | "none"; dir?: "down" | "up"; push?: number }
interface Film { shots: Shot[]; items: Item[]; sfx?: [number, string, number][]; watermark?: string; accent?: string; tags?: { tick?: string; thump?: string; whoosh?: string; click?: string; key?: string; pop?: string } }

const SZ = { s: 0.031, m: 0.043, l: 0.062, xl: 0.095 };
const font = (size: number, weight: number, italic = false) => ({ font: "inter" as const, size, weight, italic, tracking: weight >= 700 ? -0.03 : -0.02, lineHeight: 1.05 });

// ── glyphs for discs, bars and list bullets ─────────────────────────────────────────────────────────
function glyph(c: RC, g: Glyph | undefined, x: number, y: number, r: number, ink: string) {
  const w = Math.max(1.2, r * 0.16);
  switch (g) {
    case "plus": c.line(x - r * 0.5, y, x + r * 0.5, y, ink, w); c.line(x, y - r * 0.5, x, y + r * 0.5, ink, w); break;
    case "spark": for (let i = 0; i < 4; i++) c.with({ x, y, rotate: i * 45 }, () => c.rrect(-r * 0.09, -r * 0.6, r * 0.18, r * 1.2, r * 0.09, ink)); break;
    case "bolt": c.poly([[x + r * 0.1, y - r * 0.6], [x - r * 0.35, y + r * 0.08], [x - r * 0.02, y + r * 0.08], [x - r * 0.1, y + r * 0.6], [x + r * 0.35, y - r * 0.08], [x + r * 0.02, y - r * 0.08]], ink); break;
    case "check": c.polyline([[x - r * 0.45, y], [x - r * 0.1, y + r * 0.35], [x + r * 0.5, y - r * 0.35]], ink, w * 1.2); break;
    case "grid": for (let i = 0; i < 4; i++) c.rrect(x - r * 0.5 + (i % 2) * r * 0.55, y - r * 0.5 + Math.floor(i / 2) * r * 0.55, r * 0.42, r * 0.42, r * 0.08, ink); break;
    case "pen": c.line(x - r * 0.45, y + r * 0.45, x + r * 0.4, y - r * 0.4, ink, w * 1.4); c.circle(x - r * 0.48, y + r * 0.48, r * 0.1, ink); break;
    case "curve": c.ctx.save(); c.ctx.beginPath(); c.ctx.moveTo(x - r * 0.55, y + r * 0.4); c.ctx.bezierCurveTo(x - r * 0.1, y + r * 0.4, x + r * 0.1, y - r * 0.4, x + r * 0.55, y - r * 0.4); c.ctx.strokeStyle = ink; c.ctx.lineWidth = w; c.ctx.stroke(); c.ctx.restore(); break;
    case "drop": c.circle(x, y + r * 0.15, r * 0.38, ink); c.poly([[x - r * 0.33, y - r * 0.02], [x, y - r * 0.6], [x + r * 0.33, y - r * 0.02]], ink); break;
    case "code": c.polyline([[x - r * 0.15, y - r * 0.4], [x - r * 0.55, y], [x - r * 0.15, y + r * 0.4]], ink, w); c.polyline([[x + r * 0.15, y - r * 0.4], [x + r * 0.55, y], [x + r * 0.15, y + r * 0.4]], ink, w); break;
    case "play": c.poly([[x - r * 0.3, y - r * 0.45], [x - r * 0.3, y + r * 0.45], [x + r * 0.45, y]], ink); break;
    case "lock": c.rrect(x - r * 0.42, y - r * 0.05, r * 0.84, r * 0.6, r * 0.1, ink); c.arc(x, y - r * 0.08, r * 0.28, 0.75, 1.25, ink, w); break;
    case "chat": c.rrect(x - r * 0.55, y - r * 0.4, r * 1.1, r * 0.7, r * 0.2, ink); c.poly([[x - r * 0.3, y + r * 0.28], [x - r * 0.42, y + r * 0.6], [x - r * 0.05, y + r * 0.3]], ink); break;
    default: c.circle(x, y, r * 0.3, ink);
  }
}
function disc(c: RC, x: number, y: number, r: number, g: Glyph | undefined, media?: string | null, fill = INK) {
  c.save(); c.shadow("rgba(0,0,0,0.22)", r * 0.8, 0, r * 0.35); c.circle(x, y, r, fill); c.restore();
  c.arc(x, y, r * 0.9, 0, 1, alpha("#FFFFFF", 0.18), Math.max(1, r * 0.05));
  if (media) { c.save(); c.clipCircle(x, y, r * 0.78); c.media(media, x - r * 0.78, y - r * 0.78, r * 1.56, r * 1.56, { fit: "cover" }); c.restore(); }
  else glyph(c, g, x, y, r * 0.55, fill === INK ? "#F4F4F2" : INK);
}
/** Two shadows: a long soft ambient one and a tight contact one. */
function shadows(c: RC, x: number, y: number, w: number, h: number, r: number, lift = 1) {
  c.save(); c.shadow(`rgba(0,0,0,${0.16 * lift})`, h * 0.22, 0, h * 0.09 * lift); c.rrect(x, y, w, h, r, PAPER); c.restore();
  c.save(); c.shadow(`rgba(0,0,0,${0.12 * lift})`, h * 0.025, 0, h * 0.01); c.rrect(x, y, w, h, r, PAPER); c.restore();
}

// ── text that develops ──────────────────────────────────────────────────────────────────────────────
/** Draw stacked lines; each word develops at its own time (grey, blurred, low → ink). */
function developLines(c: RC, it: Item, t: number, accent: string) {
  const lines = it.lines ?? [];
  const L = lines.map((ln) => {
    let sz = (ln.px ?? SZ[ln.size ?? "m"]) * c.H;
    const txt = ln.caps ? ln.text.toUpperCase() : ln.text;
    const style = (z: number) => ({ ...font(z, ln.weight ?? (ln.size === "l" || ln.size === "xl" ? 800 : 600)), em: { font: "inter" as const, italic: true, weight: 800 } });
    let lay = c.layout(txt, style(sz));
    const maxW = c.W * (it.align === "center" || !it.align ? 0.9 : 0.86);
    if (lay.width > maxW) { sz *= maxW / lay.width; lay = c.layout(txt, style(sz)); }
    return { ln, sz, lay };
  });
  const gap = c.H * 0.004;
  // exit: the whole block lifts, blurs and fades so the next beat never stacks on it
  const o = it.out !== undefined ? OUT(pr(t, it.out, it.out + 0.3)) : 0;
  if (o >= 1) return;
  let y = c.H * (it.y ?? 0.3) - o * c.H * 0.03;
  const ax = it.align ?? "center";
  for (const { ln, sz, lay } of L) {
    const left = ax === "left" ? c.W * (it.x ?? 0.08) : ax === "right" ? c.W * (it.x ?? 0.92) - lay.width : c.W * (it.x ?? 0.5) - lay.width / 2;
    const base = y + lay.cap;
    lay.words.forEach((wd, i) => {
      const tw = ln.times?.[i] ?? (it.at + i * 0.12);
      const u = OUT(pr(t, tw - 0.06, tw + 0.26));
      if (u <= 0) return;
      const ink = mix(GHOST, wd.em ? accent : INK, OUT(pr(t, tw - 0.02, tw + 0.36)));
      const cx = left + wd.x + wd.w / 2, cy = base - lay.cap / 2;
      const sc = ln.pop ? lerp(1.15, 1, u) : 1;
      const dy = (1 - u) * c.H * 0.011;
      const blur = (1 - u) * sz * 0.14 + o * sz * 0.2;
      // local frame: word centred on (0, 0), its baseline at +cap/2
      if (blur > 0.6) {
        const pad = sz * 0.4, bl = pad + sz * 1.1;
        const lyr = c.layer(wd.w + pad * 2, sz * 1.5 + pad * 2, (lc) => {
          lc.ctx.save(); lc.ctx.setTransform(1, 0, 0, 1, 0, 0); lc.ctx.clearRect(0, 0, lc.ctx.canvas.width, lc.ctx.canvas.height); lc.ctx.restore();
          lc.word(wd, pad - wd.x, bl - wd.y, { color: ink });
        }, { res: 0.75 });
        c.with({ x: cx, y: cy + dy, scale: sc, alpha: pr(u, 0, 0.3) * (1 - o) }, () => c.drawLayer(lyr, -wd.w / 2 - pad, lay.cap / 2 - bl, { blur }));
      } else c.with({ x: cx, y: cy + dy, scale: sc, alpha: pr(u, 0, 0.3) * (1 - o) }, () => c.word(wd, -wd.w / 2 - wd.x, lay.cap / 2 - wd.y, { color: ink }));
    });
    y += lay.cap + sz * 0.42 + gap;
  }
}

/** Phrase typed character by character inside a black box that grows with it. */
function typeBox(c: RC, it: Item, t: number) {
  const sz = c.H * (it.size ?? 0.03);
  const text = it.text ?? "";
  const n = clamp(Math.floor((t - it.at) * (it.cps ?? 24)), 0, text.length);
  if (t < it.at) return;
  const L = c.layout(text.slice(0, n) || " ", font(sz, 700));
  const padX = sz * 0.35, h = sz * 1.45;
  const w = (n ? L.width : 0) + padX * 2 + 2;
  const x = c.W * (it.x ?? 0.5) - (it.align === "left" ? 0 : w / 2), y = c.H * (it.y ?? 0.5);
  c.rect(x, y, Math.max(3, w), h, it.color ?? INK);
  if (n) c.drawLayout(L, x + padX, y + h / 2 - L.cap / 2 - ((L.lines[0]?.y ?? 0) - L.cap), { color: "#FFFFFF" });
}

// ── UI mocks drawn in code (no screenshots, no brand marks) ─────────────────────────────────────────
function uiMock(c: RC, kind: string, x: number, y: number, w: number, h: number, it: Item, t: number) {
  const r = w * 0.04;
  const sk = (xx: number, yy: number, ww: number, col: string, hh = h * 0.012) => c.rrect(xx, yy, ww, hh, hh / 2, col);
  switch (kind) {
    case "chat": {
      c.rrect(x, y, w, h, r, "#0E0E0E");
      c.text(it.title ?? "Welcome", x + w * 0.08, y + h * 0.1, { ...font(w * 0.075, 700), valign: "top" }, { color: "#FFFFFF" });
      for (let i = 0; i < 4; i++) { c.circle(x + w * 0.12, y + h * (0.28 + i * 0.12), w * 0.03, "#3A3A3A"); sk(x + w * 0.2, y + h * (0.265 + i * 0.12), w * 0.6, "#3A3A3A"); sk(x + w * 0.2, y + h * (0.295 + i * 0.12), w * 0.45, "#262626"); }
      c.rrect(x + w * 0.08, y + h * 0.86, w * 0.84, h * 0.07, h * 0.035, "#FFFFFF");
      break;
    }
    case "product": {
      c.rrect(x, y, w, h, r, "#FFFFFF");
      glyph(c, it.glyph ?? "spark", x + w * 0.09, y + h * 0.5, h * 0.12, INK);
      c.text(it.title ?? "Product", x + w * 0.16, y + h * 0.5, { ...font(h * 0.14, 700), valign: "middle" }, { color: INK });
      if (it.media) c.media(it.media, x + w * 0.5, y + h * 0.05, w * 0.48, h * 0.9, { fit: "contain" });
      break;
    }
    case "profile": {
      c.rrect(x, y, w, h, r, "#0B0B0B");
      c.rect(x, y, w, h * 0.22, "#FFFFFF");
      c.circle(x + w * 0.2, y + h * 0.24, h * 0.13, "#B9C7E8");
      if (it.media) { c.save(); c.clipCircle(x + w * 0.2, y + h * 0.24, h * 0.12); c.media(it.media, x + w * 0.2 - h * 0.12, y + h * 0.12, h * 0.24, h * 0.24, { fit: "cover" }); c.restore(); }
      c.rrect(x + w * 0.06, y + h * 0.42, w * 0.38, h * 0.08, 2, "#FFFFFF");
      c.text(it.title ?? "Name", x + w * 0.08, y + h * 0.46, { ...font(h * 0.055, 800), valign: "middle" }, { color: INK });
      for (let i = 0; i < 3; i++) sk(x + w * 0.06, y + h * (0.6 + i * 0.1), w * (0.7 - i * 0.15), "#3A3A3A", h * 0.03);
      break;
    }
    case "site": {
      c.rrect(x, y, w, h, r, it.dark ? "#0E0E0E" : "#FFFFFF");
      const ink = it.dark ? "#FFFFFF" : INK;
      sk(x + w * 0.05, y + h * 0.06, w * 0.12, alpha(ink, 0.8), h * 0.02);
      for (let i = 0; i < 4; i++) sk(x + w * (0.45 + i * 0.12), y + h * 0.065, w * 0.08, alpha(ink, 0.35), h * 0.015);
      c.save(); c.clipRRect(x + w * 0.04, y + h * 0.15, w * 0.92, h * 0.78, r * 0.7);
      if (it.media) c.media(it.media, x + w * 0.04, y + h * 0.15, w * 0.92, h * 0.78, { fit: "cover", focus: [0.5, 0.4] });
      else c.rect(x + w * 0.04, y + h * 0.15, w * 0.92, h * 0.78, alpha(ink, 0.06));
      c.restore();
      if (it.title) { const T = c.layout(it.title, font(h * 0.11, 900)); c.drawLayout(T, x + w / 2 - T.width / 2, y + h * 0.2, { color: it.dark ? "#FFFFFF" : INK }); }
      break;
    }
    case "dashboard": {
      c.rrect(x, y, w, h, r, "#FFFFFF");
      c.text(it.title ?? "$23,880.90", x + w * 0.08, y + h * 0.1, { ...font(h * 0.08, 800), valign: "top" }, { color: INK });
      for (let i = 0; i < 3; i++) { c.rrect(x + w * 0.08, y + h * (0.32 + i * 0.2), w * 0.84, h * 0.15, r, "#F1F1EF"); sk(x + w * 0.12, y + h * (0.37 + i * 0.2), w * 0.4, alpha(INK, 0.5)); }
      const u = OUT(pr(t, it.at + 0.4, it.at + 1.4));
      c.polyline(Array.from({ length: 12 }, (_, i) => [x + w * (0.12 + i * 0.07), y + h * (0.28 - 0.1 * Math.sin(i * 0.9) * u)] as [number, number]), "#2E9E6A", 2);
      break;
    }
    default: c.rrect(x, y, w, h, r, "#FFFFFF");
  }
}

// ── items ───────────────────────────────────────────────────────────────────────────────────────────
function drawItem(c: RC, it: Item, t: number, film: Film) {
  const accent = film.accent ?? INK;
  const life = (it.out ?? 1e9) - it.at;
  const out = it.out !== undefined ? OUT(pr(t, it.out, it.out + 0.35)) : 0;
  switch (it.kind) {
    case "text": developLines(c, it, t, accent); break;
    case "typebox": typeBox(c, it, t); break;
    case "card": case "phone": case "ui": {
      // media lands like a shot: translucent ghost stage → solid, tilt settles, slow push the whole time
      const u = OUT(pr(t, it.at, it.at + 0.6));
      const ghost = pr(t, it.at + 0.12, it.at + 0.4);
      const push = lerp(0.92, 1.04, clamp((t - it.at) / Math.max(1.5, Math.min(life, 6))));
      const w = c.H * (it.w ?? 0.3), h = c.H * (it.h ?? (it.kind === "phone" ? (it.w ?? 0.2) * 2.05 : 0.2));
      const cx = c.W * (it.x ?? 0.5), cy = c.H * (it.y ?? 0.5) + (1 - u) * c.H * (it.from === "top" ? -0.06 : 0.05);
      c.with({ x: cx, y: cy, scale: push * (1 - out * 0.06), sy: 1 - (1 - u) * 0.1, rotate: (it.rot ?? 0) * (0.6 + 0.4 * u), alpha: pr(t, it.at, it.at + 0.12) * (1 - out) }, () => {
        const r = it.kind === "phone" ? w * 0.16 : w * 0.04;
        shadows(c, -w / 2, -h / 2, w, h, r, ghost);
        c.save();
        c.alpha(0.4 + 0.6 * ghost);
        if (it.kind === "phone") {
          c.rrect(-w / 2, -h / 2, w, h, r, "#131313");
          c.save(); c.clipRRect(-w / 2 + w * 0.04, -h / 2 + w * 0.04, w * 0.92, h - w * 0.08, r * 0.8);
          if (it.media) c.media(it.media, -w / 2, -h / 2, w, h, { fit: "cover", t: t - it.at });
          else uiMock(c, it.ui ?? "chat", -w / 2 + w * 0.04, -h / 2 + w * 0.04, w * 0.92, h - w * 0.08, it, t);
          c.restore();
          c.rrect(-w * 0.13, -h / 2 + w * 0.07, w * 0.26, w * 0.065, w * 0.032, "#131313");
        } else if (it.kind === "ui") uiMock(c, it.ui ?? "product", -w / 2, -h / 2, w, h, it, t);
        else { c.save(); c.clipRRect(-w / 2, -h / 2, w, h, w * 0.04); c.media(it.media, -w / 2, -h / 2, w, h, { fit: "cover", t: t - it.at }); c.restore(); }
        c.restore();
      });
      break;
    }
    case "prop": {
      // 3D prop bleeding off an edge: slides in from its side, then drifts (micro-rotation) forever
      const u = OUT(pr(t, it.at, it.at + 0.7));
      const w = c.H * (it.w ?? 0.2);
      const info = c.mediaInfo(it.media);
      const h = info && info.w ? (w * info.h) / info.w : w;
      const off = (1 - u) * c.H * 0.25;
      const dx = it.from === "left" ? -off : it.from === "right" ? off : 0, dy = it.from === "top" ? -off : it.from === "bottom" ? off : 0;
      const rot = (it.rot ?? 0) + Math.sin((t - it.at) * 0.9) * 2;
      c.with({ x: c.W * (it.x ?? 0.5) + dx, y: c.H * (it.y ?? 0.5) + dy, rotate: rot, alpha: pr(u, 0, 0.3) * (1 - out) }, () => {
        c.lightEllipse(w * 0.08, h * 0.45, w * 0.4, h * 0.06, "#000000", 0.18);
        c.media(it.media, -w / 2, -h / 2, w, h, { fit: "contain" });
      });
      break;
    }
    case "bar": {
      // grey bar sliding in from the left edge, tipped with a black disc
      const u = OUT(pr(t, it.at, it.at + 0.55));
      const y = c.H * (it.y ?? 0.5), bh = c.H * 0.034, len = c.W * (it.w ?? 0.5) * u;
      c.save(); c.alpha(1 - out);
      c.rrect(-bh, y - bh / 2, len + bh, bh, bh / 2, BAR);
      disc(c, len, y, c.H * 0.032, it.glyph, it.media);
      c.restore();
      break;
    }
    case "disc": {
      const s = clamp(spring(t - it.at, SPRING.pop), 0, 1.15);
      if (s > 0.01) c.with({ alpha: 1 - out }, () => disc(c, c.W * (it.x ?? 0.5), c.H * (it.y ?? 0.5), c.H * (it.size ?? 0.04) * s, it.glyph, it.media, it.color ?? INK));
      break;
    }
    case "list": {
      const sz = c.H * (it.size ?? SZ.s);
      (it.items ?? []).forEach((li, i) => {
        if (t < li.t - 0.08) return;
        const y = c.H * (it.y ?? 0.5) + i * sz * 1.55;
        const gx = c.W * (it.x ?? 0.08) + sz * 0.45;
        const gs = clamp(spring(t - li.t + 0.08, SPRING.pop), 0, 1.15);
        glyph(c, li.glyph ?? "plus", gx, y + sz * 0.5, sz * 0.42 * gs, INK);
        developLines(c, { ...it, x: (gx + sz * 0.8) / c.W, y: y / c.H, align: "left", lines: [{ text: li.text, size: "s", px: it.size, weight: 600, times: li.text.split(/\s+/).map((_, k) => li.t + k * 0.11) }] }, t, film.accent ?? INK);
      });
      break;
    }
    case "capsules": {
      const n = it.n ?? 3;
      for (let i = 0; i < n; i++) {
        const u = OUT(pr(t, it.at + i * 0.12, it.at + i * 0.12 + 0.7));
        const w = c.W * 0.11, h = c.H * (0.12 + 0.07 * i) * u;
        const x = c.W * ((it.x ?? 0.5) + (i - (n - 1) / 2) * 0.17) - w / 2;
        c.rrect(x, c.H - h, w, h + w, w / 2, "#1C1C1C");
      }
      break;
    }
    case "line": {
      const pts = it.pts ?? [];
      const u = OUT(pr(t, it.at, it.at + 0.6));
      const n = pts.length - 1;
      const seg: [number, number][] = [];
      for (let i = 0; i <= n; i++) {
        const k = clamp(u * n - (i - 1));
        if (i === 0) seg.push([c.W * pts[0][0], c.H * pts[0][1]]);
        else if (k > 0) seg.push([lerp(c.W * pts[i - 1][0], c.W * pts[i][0], Math.min(1, k)), lerp(c.H * pts[i - 1][1], c.H * pts[i][1], Math.min(1, k))]);
      }
      if (seg.length > 1) c.polyline(seg, INK, 1.4);
      if (u > 0) c.circle(c.W * pts[0][0], c.H * pts[0][1], 3, INK);
      if (u >= 1) c.circle(c.W * pts[n][0], c.H * pts[n][1], 3, INK);
      break;
    }
  }
}

// ── the film ────────────────────────────────────────────────────────────────────────────────────────
function shotIndexAt(shots: Shot[], t: number) {
  let i = 0;
  for (let k = 0; k < shots.length; k++) if (shots[k].at <= t) i = k;
  return i;
}

const film = defineComponent<{ film: unknown; duration: number; grid: boolean }>({
  version: "1.0.0", group: "kits", category: "kit-editorial", added: "2026-10-05", formats: ["vertical", "portrait", "square"], theme: LOOK, camera: "still",
  id: "editorial-film", name: "Editorial Explainer Film",
  description: "The off-white editorial Shorts language in one component: words develop on the voice (grey, blurred, low → ink) with a strong ease-out, big words scale down from 115%, key phrases type into a black box, media lands like a shot (ghost stage, tilt settle, slow push, two shadows), grey bars slide in with icon discs, capsules grow from the bottom, layouts scroll-pan into each other and rare hard cuts dip to grey. Sound is placed with restraint: thumps on section labels, whooshes on moves, ticks on accent words, clicks on list items, keys only in typed boxes.",
  tags: ["editorial", "explainer", "shorts", "kinetic type", "develop", "typewriter", "voiceover"],
  params: {
    film: P.json({ shots: [{ at: 0 }], items: [{ shot: 0, kind: "text", at: 0.2, y: 0.4, lines: [{ text: "Three *things*", size: "l" }] }] }, "Film (shots, items, sfx)"),
    duration: P.number(4, "Duration", { min: 1, max: 180, step: 0.1, unit: "s" }),
    grid: P.bool(true, "Blueprint grid"),
  },
  duration: (p) => p.duration,
  media: (p) => [...new Set(((p.film as Film).items ?? []).map((i) => i.media).filter((m): m is string => !!m))],
  sounds: (p) => {
    const f = p.film as Film;
    const tag = { tick: "ui.tick", thump: "impact.land", whoosh: "viral.woosh", click: "ui.click", key: "viral.key", pop: "ui.pop", ...(f.tags ?? {}) };
    const cues: SoundCue[] = [];
    let k = 0;
    (f.shots ?? []).forEach((s, i) => { if (i && s.cut && s.cut !== "none") cues.push({ at: Math.max(0, s.at - 0.12), sound: tag.whoosh, gain: s.cut === "dip" ? 0.55 : 0.42, seed: i, role: "move" }); });
    for (const it of f.items ?? []) {
      if (it.kind === "text") {
        if (it.label) cues.push({ at: it.at, sound: tag.thump, gain: 0.55, seed: k++, role: "label" });
        for (const ln of it.lines ?? []) {
          const words = ln.text.split(/\s+/);
          words.forEach((w, i) => { if (/^\*.*\*[.,!?]*$/.test(w) && ln.times?.[i] !== undefined) cues.push({ at: ln.times[i] - 0.04, sound: tag.tick, gain: 0.22, seed: k++, role: "accent" }); });
          if (ln.pop && ln.times?.length) cues.push({ at: ln.times[0] - 0.05, sound: tag.pop, gain: 0.3, seed: k++, role: "pop" });
        }
      } else if (it.kind === "list") (it.items ?? []).forEach((li) => cues.push({ at: li.t - 0.06, sound: tag.click, gain: 0.25, seed: k++, role: "item" }));
      else if (it.kind === "typebox") {
        const n = (it.text ?? "").length, cps = it.cps ?? 24;
        for (let i = 0; i < n; i += 2) cues.push({ at: it.at + i / cps, sound: `${tag.key}-${(k++ % 6) + 1}`, gain: 0.3, role: "type" });
      } else if (it.kind === "card" || it.kind === "phone" || it.kind === "ui") cues.push({ at: it.at, sound: tag.pop, gain: 0.2, seed: k++, role: "land" });
      else if (it.kind === "bar" || it.kind === "prop") cues.push({ at: it.at, sound: tag.whoosh, gain: 0.22, seed: k++, role: "slide" });
    }
    for (const [at, sound, gain] of f.sfx ?? []) cues.push({ at, sound, gain, role: "manual" });
    return cues;
  },
  render(c, p) {
    const f = p.film as Film;
    const t = c.t;
    const shots = f.shots?.length ? f.shots : [{ at: 0 }];
    const si = shotIndexAt(shots, t);
    const cur = shots[si];
    // scroll-pan: during a pan the previous shot and this one share the frame, offset by a full frame height
    const panU = cur.cut === "pan" ? PAN(pr(t, cur.at - 0.1, cur.at + 0.45)) : 1;
    const dir = cur.dir === "up" ? -1 : 1;
    const renderShot = (idx: number, offset: number) => {
      const s = shots[idx];
      const pushK = 1 + (s.push ?? 0.012) * Math.max(0, t - s.at);
      c.with({ x: c.cx, y: c.cy + offset, scale: pushK }, () => {
        c.translate(-c.cx, -c.cy);
        for (const it of f.items ?? []) if (it.shot === idx && t >= (it.at ?? it.items?.[0]?.t ?? 0) - 0.1) drawItem(c, it, t, f);
      });
    };
    c.clear(PAPER);
    c.rect(0, 0, c.W, c.H, c.radial(c.cx, c.H * 0.42, c.H * 0.85, [[0, "#F7F7F5"], [0.7, PAPER], [1, "#E6E6E3"]]));
    if (p.grid) {
      const pitch = c.W / 8, a = 0.035 + 0.06 * (1 - pr(t, 0.6, 1.4));
      c.save(); c.ctx.setLineDash([3, 5]);
      for (let x = pitch; x < c.W; x += pitch) c.line(x, 0, x, c.H, alpha(INK, a), 1, "butt");
      for (let y = pitch; y < c.H; y += pitch) c.line(0, y, c.W, y, alpha(INK, a), 1, "butt");
      c.restore();
      for (let x = pitch; x < c.W; x += pitch) for (let y = pitch; y < c.H; y += pitch) { c.rect(x - 3, y - 0.5, 6, 1, alpha(INK, a * 1.6)); c.rect(x - 0.5, y - 3, 1, 6, alpha(INK, a * 1.6)); }
    }
    if (cur.cut === "pan" && panU < 1 && si > 0) {
      renderShot(si - 1, dir * panU * c.H);
      renderShot(si, dir * (panU - 1) * c.H);
    } else renderShot(si, 0);
    // dip to grey hides the hard cut
    if (cur.cut === "dip") {
      const d = 1 - Math.abs(t - cur.at) / 0.12;
      if (d > 0) c.rect(0, 0, c.W, c.H, c.radial(c.cx, c.cy, c.H * 0.8, [[0, alpha("#D9D9D9", d)], [1, alpha("#8F8F8F", d)]]));
    }
    if (f.watermark) c.text(f.watermark, c.cx, c.H * 0.955, { ...font(c.H * 0.015, 500), align: "center", valign: "middle" }, { color: alpha(INK, 0.12) });
  },
});

export const editorialKit: Kit = {
  id: "editorial",
  promptId: "",
  title: "Editorial explainer Short",
  family: "social",
  format: "vertical",
  summary: "The off-white, ink-black explainer Short: words develop on the voice, big words scale in, key phrases type into a black box, media lands like a camera shot, bars and discs slide in, layouts scroll-pan, rare cuts dip to grey — with restrained, placed sound.",
  shots: [{ at: 0, shot: "One component, one JSON film: shots, items and sound", component: "editorial-film" }],
  rules: [
    "Words develop on the voice: grey, blurred, 10–14 px low → ink, settled, in ~0.3 s on cubic-bezier(0.16, 1, 0.3, 1)",
    "Two text sizes per beat; emphasis is the italic of the same family",
    "Media lands like a shot: ghost stage, tilt settle, slow push 0.92 → 1.04, two shadows",
    "Few hard cuts (dip to grey); everything else pans or pushes",
    "Sound with restraint: thump on labels, whoosh on moves, tick on accents, click on list items, keys only in typed boxes",
  ],
  components: [film] as unknown as Component[],
  template: { id: "kit-editorial", title: "Editorial explainer", format: "vertical", fps: 30, clips: [{ component: "editorial-film" }] } as PostSpec,
};
