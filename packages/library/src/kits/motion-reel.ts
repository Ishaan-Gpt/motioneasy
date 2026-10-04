// Kit: "The original showreel prompt" (@stephanlivera). "Make a dynamic 15-second motion graphics video that
// shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out."
// What the model built: eight one-bar chapters at 120 BPM under a technical HUD (corner brackets, section,
// timecode, beat boxes, bar counter), each chapter a different craft: identity mark, wordmark squash and
// collapse, an easing lab, shape morphing, a Truchet system, a 3D point cloud, kinetic type, the end lockup.

import { E, P, SPRING, alpha, clamp, defineComponent, lerp, mix, pr, rand, spring, type Component, type RC } from "@motioneasy/engine";
import { wordFx } from "../kit";
import type { PostSpec } from "../sequence";
import type { Kit } from "./types";

const RED = "#EE4B2F";
const INK = "#111111";
const DARK = "#0E0E0E";
const CREAM = "#F1EEE6";
const BLUE = "#2D2BF2";
const LIME = "#DFFF3A";
const PAPER = "#F2EFE8";
const LOOK = { mode: "dark" as const, bg: DARK, fg: PAPER, accent: RED, lighting: 0, grain: 0.3, vignette: 0.08, backdrop: "plain" as const, camera: "still" as const };
const BPM = 120;
const TOTAL = 15;

const wide = (size: number, weight = 900) => ({ font: "archivo" as const, size, weight, tracking: -0.03, lineHeight: 0.9, uppercase: true });
const serif = (size: number) => ({ font: "instrument" as const, size, weight: 400, italic: true, tracking: -0.01, lineHeight: 1 });
const mono = (size: number, weight = 500) => ({ font: "mono" as const, size, weight, tracking: 0.08, uppercase: true });

type Hud = {
  brand: string;
  section: string;
  at: number;
};
const hudParams = (section: string, at: number) => ({
  brand: P.text("CLAUDE", "Name", { maxLength: 16 }),
  section: P.text(section, "HUD section", { maxLength: 24 }),
  at: P.number(at, "Reel time at start (HUD)", { min: 0, max: 60, step: 0.5, unit: "s" }),
});

/** Text with its baseline at y. */
function txt(c: RC, s: string, x: number, y: number, style: Parameters<RC["layout"]>[1], color: string, align: "left" | "center" | "right" = "left") {
  const L = c.layout(s, style);
  const ox = align === "center" ? x - L.width / 2 : align === "right" ? x - L.width : x;
  c.drawLayout(L, ox, y - (L.lines[0]?.y ?? L.size), { color });
  return L.width;
}

/** The technical HUD every chapter wears: brackets, name, section, timecode, beat boxes, bar counter, progress. */
function hud(c: RC, h: Hud, dark: boolean) {
  const g = h.at + c.t;
  const ink = dark ? alpha("#FFFFFF", 0.78) : alpha(INK, 0.82);
  const faint = dark ? alpha("#FFFFFF", 0.42) : alpha(INK, 0.48);
  const m = c.H * 0.03, b = c.H * 0.018, sz = c.H * 0.0105, lw = Math.max(1, c.H * 0.0012);
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [c.W - m, m, -1, 1], [m, c.H - m, 1, -1], [c.W - m, c.H - m, -1, -1]]) {
    c.line(x, y, x + b * sx, y, ink, lw, "butt");
    c.line(x, y, x, y + b * sy, ink, lw, "butt");
  }
  const top = m + b * 0.75, bot = c.H - m - b * 0.35;
  const x0 = m + b * 1.3;
  const bw = txt(c, h.brand, x0, top, mono(sz, 700), ink);
  txt(c, "MOTION REEL — 2026", x0 + bw + sz * 3, top, mono(sz), faint);
  txt(c, h.section, c.W - x0, top, mono(sz, 600), ink, "right");
  const ss = Math.floor(g), ff = Math.floor((g - ss) * 60);
  const tc = `00:00:${String(ss).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
  const tw = txt(c, tc, x0, bot, mono(sz, 600), ink);
  txt(c, "60 FPS", x0 + tw + sz * 3, bot, mono(sz), faint);
  const beats = g * (BPM / 60);
  const bar = Math.min(8, Math.floor(beats / 4) + 1);
  const bx = c.W - x0 - txt(c, `BAR ${bar}/8`, c.W - x0, bot, mono(sz, 600), ink, "right") - sz * 1.5;
  for (let i = 3; i >= 0; i--) {
    const x = bx - (3 - i) * sz * 1.25 - sz;
    if (i === Math.floor(beats) % 4) c.rect(x, bot - sz * 0.85, sz * 0.9, sz * 0.9, ink);
    else c.strokeRRect(x, bot - sz * 0.85, sz * 0.9, sz * 0.9, 0, ink, lw);
  }
  txt(c, `${BPM} BPM`, bx - 4 * sz * 1.25 - sz * 1.5, bot, mono(sz), faint, "right");
  c.line(m, c.H - m * 0.55, m + (c.W - m * 2) * clamp(g / TOTAL), c.H - m * 0.55, faint, lw, "butt");
}

const base = { version: "1.0.0", group: "kits" as const, category: "kit-motion-reel", added: "2026-10-04", formats: ["landscape" as const], theme: LOOK, camera: "still" as const };

// ── 01 · genesis: dot → starburst with an orbiting type ring ────────────────────────────────────────
const genesis = defineComponent<Hud & { ring: string }>({
  ...base, id: "reel-genesis", name: "Genesis · Dot to Starburst",
  description: "On black: a red dot pops inside a thin ring, twelve spokes shoot out one by one into a starburst, the rings fall away and a line of mono type orbits it.",
  tags: ["intro", "mark", "starburst", "ring text", "hud"],
  params: { ...hudParams("01 — IDENTITY", 0), ring: P.text("SHOWREEL 2026 · CLAUDE · MOTION DESIGN · ", "Ring text", { maxLength: 60 }) },
  duration: 2,
  sounds: () => [{ at: 0.05, sound: "ui.click", gain: 0.4, role: "dot" }, { at: 0.3, sound: "whoosh.air", gain: 0.3, role: "spokes" }, { at: 1.0, sound: "tonal.shimmer", gain: 0.2, role: "ring" }],
  render(c, p) {
    const t = c.t;
    c.clear(DARK);
    const fade = 1 - pr(t, 0.95, 1.35);
    c.arc(c.cx, c.cy, c.H * 0.42, 0, pr(t, 0, 0.7, E.out), alpha("#FFFFFF", 0.16 * fade), 1.5);
    c.arc(c.cx, c.cy, c.H * 0.12, 0, pr(t, 0.05, 0.5, E.out), alpha("#FFFFFF", 0.3 * fade), 1.5);
    const grow = 1 + 0.1 * E.inOut(pr(t, 1, 2));
    const rot = -0.45 * E.inOut(pr(t, 0.3, 2));
    for (let i = 0; i < 12; i++) {
      const u = pr(t, 0.28 + i * 0.045, 0.28 + i * 0.045 + 0.35, E.out);
      if (u <= 0) continue;
      const a = (i / 12) * Math.PI * 2 + rot - Math.PI / 2;
      const r0 = c.H * 0.014, r1 = c.H * 0.2 * u * grow;
      c.line(c.cx + Math.cos(a) * r0, c.cy + Math.sin(a) * r0, c.cx + Math.cos(a) * r1, c.cy + Math.sin(a) * r1, RED, c.H * 0.017);
    }
    c.circle(c.cx, c.cy, c.H * 0.026 * spring(t - 0.02, SPRING.pop), RED);
    const chars = [...p.ring];
    const R = c.H * 0.29, step = (Math.PI * 2) / Math.max(1, chars.length), a0 = -t * 0.35 - Math.PI / 2;
    chars.forEach((ch, j) => {
      const a = pr(t, 0.9 + j * 0.012, 1.05 + j * 0.012);
      if (a <= 0 || ch === " ") return;
      const ang = a0 + j * step;
      const L = c.layout(ch, mono(c.H * 0.019, 500));
      c.with({ x: c.cx + Math.cos(ang) * R, y: c.cy + Math.sin(ang) * R, rotate: ((ang + Math.PI / 2) * 180) / Math.PI, alpha: a }, () => c.drawLayout(L, -L.width / 2, -(L.lines[0]?.y ?? 0) + L.cap / 2, { color: alpha(PAPER, 0.85) }));
    });
    hud(c, p, true);
  },
});

// ── 02 · identity: the wordmark squashes in, then collapses letter by letter into dots ──────────────
const identity = defineComponent<Hud & { role: string; kicker: string; edition: string }>({
  ...base, id: "reel-wordmark-collapse", name: "Wordmark · Squash In, Collapse to Dots",
  description: "On red: an extra-wide wordmark springs up letter by letter with squash and stretch under a ruled header; an italic role writes in beneath, then each letter stretches and collapses into a dot.",
  tags: ["wordmark", "squash and stretch", "collapse", "dots", "identity"],
  params: { ...hudParams("01 — IDENTITY", 2), role: P.text("motion designer", "Role (italic)", { maxLength: 30 }), kicker: P.text("N° 01", "Header left", { maxLength: 16 }), edition: P.text("SHOWREEL — 2026", "Header right", { maxLength: 24 }) },
  duration: 2,
  sounds: () => [{ at: 0.05, sound: "impact.land", gain: 0.4, role: "slam" }, { at: 1.1, sound: "ui.click", gain: 0.25, role: "collapse" }],
  render(c, p) {
    const t = c.t;
    c.clear(RED);
    const lx0 = c.W * 0.07, lx1 = c.W * 0.93, ly = c.H * 0.215;
    c.line(lx0, ly, lerp(lx0, lx1, pr(t, 0, 0.45, E.out)), ly, alpha(INK, 0.75), Math.max(1, c.H * 0.0014), "butt");
    txt(c, p.kicker, lx0, ly - c.H * 0.012, mono(c.H * 0.0105), alpha(INK, 0.7));
    txt(c, p.edition, lx1, ly - c.H * 0.012, mono(c.H * 0.0105), alpha(INK, 0.7), "right");
    const L = c.fit(p.brand, wide(c.H * 0.3), c.W * 0.86, c.H * 0.36);
    const w = L.words[0];
    if (w) {
      const left = c.cx - L.width / 2, baseline = c.H * 0.47 + L.cap / 2;
      w.chars.forEach((ch, i) => {
        const s = spring(t - 0.02 - i * 0.05, SPRING.pop);
        const tc = 1.05 + i * 0.1;
        const k = pr(t, tc, tc + 0.22, E.in);
        const pre = pr(t, tc - 0.25, tc) * (1 - k);
        const cx = left + w.x + ch.x + ch.w / 2;
        const sy = Math.max(0, s * (1 + 0.25 * pre) * (1 - k));
        const sx = (1 + (1 - Math.min(1, s)) * 0.35) * (1 - k * 0.8);
        if (sy > 0.01) c.with({ x: cx, y: baseline, sx, sy }, () => c.char(w, i, -ch.w / 2, 0, { color: INK }));
        if (k > 0.6) c.circle(cx, baseline - L.cap * 0.45, c.H * 0.016 * pr(k, 0.6, 1, E.out), INK);
      });
    }
    const R = c.layout(p.role, serif(c.H * 0.09));
    const rx = c.cx - R.width / 2, ry = c.H * 0.76 - (R.lines[0]?.y ?? 0);
    R.words.forEach((wd, i) => {
      const u = pr(t, 0.45 + i * 0.35, 0.85 + i * 0.35, E.out);
      wordFx(c, wd, rx, ry, { alpha: u, blur: (1 - u) * c.H * 0.01, dy: (1 - u) * c.H * 0.02, color: PAPER });
    });
    hud(c, p, false);
  },
});

// ── 03 · easing lab ─────────────────────────────────────────────────────────────────────────────────
const back = (u: number) => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
const elastic = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
const bounce = (u: number) => {
  const n = 7.5625, d = 2.75;
  if (u < 1 / d) return n * u * u;
  if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75;
  if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375;
  return n * (u -= 2.625 / d) * u + 0.984375;
};
const EASES: Record<string, (u: number) => number> = { linear: (u) => u, "ease-in-out": E.inOut, "expo-out": E.out, "back-out": back, elastic, bounce };

const easing = defineComponent<Hud & { title: string; note: string; curves: string[]; travel: number }>({
  ...base, id: "reel-easing-lab", name: "Easing Lab · Six Ways From A to B",
  description: "On cream paper: an italic title, then six labelled tracks with their curve icons; six balls leave A together and arrive at B by six different easings, leaving a faint ghost trail.",
  tags: ["easing", "curves", "explainer", "lab", "craft"],
  params: {
    ...hudParams("02 — EASING", 4),
    title: P.text("Six ways to get from A to B.", "Title (italic)", { maxLength: 40 }),
    note: P.text("SAME DISTANCE · SAME DURATION", "Note", { maxLength: 40 }),
    curves: P.list(Object.keys(EASES), "Curves (linear, ease-in-out, expo-out, back-out, elastic, bounce)", { min: 2, max: 6 }),
    travel: P.number(0.9, "Travel time", { min: 0.3, max: 1.6, step: 0.05, unit: "s" }),
  },
  duration: 2,
  sounds: () => [{ at: 0.3, sound: "whoosh.swipe", gain: 0.3, role: "go" }, { at: 1.2, sound: "ui.click", gain: 0.3, role: "arrive" }],
  render(c, p) {
    const t = c.t;
    c.clear(CREAM);
    const tu = pr(t, 0, 0.3, E.out);
    txt(c, p.title, c.W * 0.04, c.H * 0.17 + (1 - tu) * c.H * 0.02, serif(c.H * 0.066), alpha(INK, tu));
    txt(c, `${p.note} (${p.travel.toFixed(1)}s)`, c.W * 0.89, c.H * 0.15, mono(c.H * 0.0105), alpha(INK, 0.55 * tu), "right");
    const A = c.W * 0.345, B = c.W * 0.89, y0 = c.H * 0.315, gap = c.H * 0.0855;
    txt(c, "A", A, c.H * 0.255, mono(c.H * 0.011, 700), alpha(INK, 0.7 * tu), "center");
    txt(c, "B", B, c.H * 0.255, mono(c.H * 0.011, 700), alpha(INK, 0.7 * tu), "center");
    const cols = [INK, BLUE, RED];
    p.curves.forEach((name, i) => {
      const ease = EASES[name.trim()] ?? EASES.linear;
      const a = pr(t, 0.03 + i * 0.04, 0.3 + i * 0.04);
      if (a <= 0) return;
      const y = y0 + i * gap;
      c.save();
      c.alpha(a);
      txt(c, String(i + 1).padStart(2, "0"), c.W * 0.04, y + c.H * 0.005, mono(c.H * 0.011), RED);
      txt(c, name, c.W * 0.06, y + c.H * 0.007, { font: "mono", size: c.H * 0.02, weight: 500, tracking: 0 }, INK);
      const ix = c.W * 0.235, is = c.H * 0.04;
      c.line(ix, y - is / 2, ix, y + is / 2, alpha(INK, 0.3), 1, "butt");
      c.line(ix, y + is / 2, ix + is, y + is / 2, alpha(INK, 0.3), 1, "butt");
      const pts: [number, number][] = [];
      for (let k = 0; k <= 24; k++) pts.push([ix + (k / 24) * is, y + is / 2 - ease(k / 24) * is * 0.8]);
      c.polyline(pts, INK, 1.4);
      c.line(A, y, B, y, alpha(INK, 0.3), 1, "butt");
      for (let k = 0; k <= 8; k++) c.line(lerp(A, B, k / 8), y - c.H * 0.008, lerp(A, B, k / 8), y - c.H * 0.002, alpha(INK, 0.3), 1, "butt");
      c.line(B, y - c.H * 0.012, B, y + c.H * 0.012, alpha(INK, 0.5), 1, "butt");
      const at = (tt: number) => lerp(A, B, ease(clamp((tt - 0.3) / p.travel)));
      const col = cols[i % 3];
      for (let g = 6; g >= 1; g--) c.circle(at(t - g * 0.018), y, c.H * 0.015, alpha(col, 0.07));
      c.circle(at(t), y, c.H * 0.015, col);
      c.restore();
    });
    hud(c, p, false);
  },
});

// ── 04 · morphing ───────────────────────────────────────────────────────────────────────────────────
/** Radius of a regular n-gon (n = 0: circle) at angle th, unit circumradius. */
const polyR = (n: number, th: number) => (n < 3 ? 1 : Math.cos(Math.PI / n) / Math.cos((((th % ((2 * Math.PI) / n)) + (2 * Math.PI) / n) % ((2 * Math.PI) / n)) - Math.PI / n));
function shapePts(stage: { tri: number; sq: number }, R: number, rot: number, cx: number, cy: number, n = 96): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const r = lerp(lerp(1, polyR(3, th - rot - Math.PI / 2), stage.tri), polyR(4, th - rot - Math.PI / 4) * 0.92, stage.sq);
    pts.push([cx + Math.cos(th) * r * R, cy + Math.sin(th) * r * R]);
  }
  return pts;
}

const morph = defineComponent<Hud & { stages: string[] }>({
  ...base, id: "reel-shape-morph", name: "Shape Morph · Circle → Triangle → Square",
  description: "On electric blue under a crosshair: a white shape springs from circle to triangle to square while rotating, red echoes trailing its outline; a ring of satellites changes shape with it and live readouts tick.",
  tags: ["morph", "shapes", "spring", "satellites", "readout"],
  params: { ...hudParams("03 — MORPHING", 6), stages: P.list(["CIRCLE", "TRIANGLE", "SQUARE"], "Stage names", { min: 3, max: 3 }) },
  duration: 1.5,
  sounds: () => [{ at: 0.35, sound: "whoosh.swipe", gain: 0.25, role: "morph" }, { at: 0.85, sound: "whoosh.swipe", gain: 0.25, role: "morph" }],
  render(c, p) {
    const t = c.t;
    c.clear(BLUE);
    const W = alpha("#FFFFFF", 0.22);
    c.line(c.cx, 0, c.cx, c.H, W, 1, "butt");
    c.line(0, c.cy, c.W, c.cy, W, 1, "butt");
    const st = (tt: number) => ({ tri: clamp(spring(tt - 0.3, SPRING.pop), 0, 1.15), sq: clamp(spring(tt - 0.85, SPRING.pop), 0, 1.15) });
    const rotAt = (tt: number) => ((200 * Math.PI) / 180) * E.inOut(pr(tt, 0.2, 1.4));
    const R = c.H * 0.205;
    for (const [lag, a] of [[0.1, 0.25], [0.05, 0.45]] as const) {
      const pts = shapePts(st(t - lag), R * 1.03, rotAt(t - lag), c.cx, c.cy);
      c.polyline([...pts, pts[0]], alpha(RED, a), 1.6);
    }
    c.poly(shapePts(st(t), R * clamp(spring(t, SPRING.pop), 0, 1.2), rotAt(t), c.cx, c.cy), PAPER);
    const s = st(t);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 0.4;
      const x = c.cx + Math.cos(a) * c.H * 0.39, y = c.cy + Math.sin(a) * c.H * 0.39;
      const k = clamp(spring(t - 0.05 - i * 0.02, SPRING.pop), 0, 1.2);
      const ss = i % 2 ? s : { tri: s.tri, sq: s.sq * 0.6 };
      c.poly(shapePts(ss, c.H * 0.021 * k, a * 2, x, y, 24), PAPER);
    }
    const names = p.stages;
    const lbl = t < 0.75 ? `MORPH · ${names[0]} → ${names[1]}` : `MORPH · ${names[1]} → ${names[2]}`;
    const sz = c.H * 0.0105, ink = alpha("#FFFFFF", 0.7);
    txt(c, lbl, c.W * 0.27, c.cy + c.H * 0.025, mono(sz), ink);
    txt(c, `T ${pr(t, 0.2, 1.4).toFixed(2)}   ROT ${((rotAt(t) * 180) / Math.PI).toFixed(1)}°`, c.W * 0.73, c.cy + c.H * 0.025, mono(sz), ink, "right");
    txt(c, "SPRING K=2.6  C=0.38", c.W * 0.73, c.cy + c.H * 0.05, mono(sz), alpha("#FFFFFF", 0.45), "right");
    txt(c, "120°", c.W * 0.3, c.cy - c.H * 0.015, mono(sz), alpha("#FFFFFF", 0.4));
    txt(c, "30°", c.W * 0.7, c.cy - c.H * 0.015, mono(sz), alpha("#FFFFFF", 0.4), "right");
    hud(c, p, true);
  },
});

// ── 05 · systems: a Truchet field flipped by a colour wave, dissolving to a dot grid ────────────────
const truchet = defineComponent<Hud & { seed: number }>({
  ...base, id: "reel-truchet-wave", name: "Truchet System · Wave Flip → Dot Grid",
  description: "A full-frame Truchet tiling of thick quarter-arcs; a diagonal wave sweeps through, flipping each tile a quarter turn and staining it red, then the arcs shrink away into a quiet dot grid.",
  tags: ["generative", "truchet", "pattern", "wave", "system"],
  params: { ...hudParams("04 — SYSTEMS", 7.5), seed: P.number(42, "Seed", { min: 1, max: 999, step: 1 }) },
  duration: 2,
  sounds: () => [{ at: 0.05, sound: "fx.glitch", gain: 0.2, role: "wave" }],
  render(c, p) {
    const t = c.t;
    c.clear(DARK);
    const s = c.H / 11.5, cols = Math.ceil(c.W / s) + 1, rows = Math.ceil(c.H / s) + 1;
    const ox = (c.W - cols * s) / 2, oy = (c.H - rows * s) / 2;
    const front = lerp(-c.W * 0.4, c.W * 1.45, E.inOut(pr(t, 0.1, 1.45)));
    const shrink = pr(t, 1.4, 1.85, E.inOut);
    const lw = s * 0.3;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = ox + i * s, y = oy + j * s;
      const k = clamp((front - (x + y * 0.35)) / (c.W * 0.22));
      const flip = rand(p.seed * 977 + i * 31 + j * 17) > 0.5 ? 1 : 0;
      const rot = (flip * 90 + 90 * E.outBack(k)) * (Math.PI / 180);
      const col = k > 0 ? mix(PAPER, i % 3 ? RED : "#FF8A7A", Math.min(1, k * 1.6)) : PAPER;
      const sweep = 0.25 * (1 - shrink);
      c.with({ x: x + s / 2, y: y + s / 2, rotate: (rot * 180) / Math.PI }, () => {
        if (sweep > 0.005) {
          c.arc(-s / 2, -s / 2, s / 2, 0.25 + (0.25 - sweep) / 2, 0.25 + (0.25 + sweep) / 2, col, lw, "butt");
          c.arc(s / 2, s / 2, s / 2, 0.75 + (0.25 - sweep) / 2, 0.75 + (0.25 + sweep) / 2, col, lw, "butt");
        }
      });
      if (shrink > 0) c.circle(x + s / 2, y + s / 2, c.H * 0.0035 * shrink, alpha(PAPER, 0.8 * shrink));
    }
    c.rrect(c.cx - c.W * 0.15, c.H * 0.86, c.W * 0.3, c.H * 0.03, 2, alpha(DARK, 0.85));
    txt(c, `TRUCHET × ${cols * rows} · 3 WAVES · SEED 0x${p.seed.toString(16).toUpperCase()}`, c.cx, c.H * 0.88, mono(c.H * 0.0105), alpha(PAPER, 0.75), "center");
    hud(c, p, true);
  },
});

// ── 06 · depth: a 576-point cloud rotating in perspective, morphing sphere → torus ──────────────────
const depth = defineComponent<Hud>({
  ...base, id: "reel-point-cloud", name: "Depth · Point Cloud Sphere → Torus",
  description: "In the dark: 576 points on a ridged sphere rotate in true perspective, drawn as short motion dashes, then flow into a torus; a live readout of vertices, focal length and rotation sits below.",
  tags: ["3d", "particles", "point cloud", "morph", "depth"],
  params: hudParams("05 — DEPTH", 9.5),
  duration: 1.5,
  sounds: () => [{ at: 0.7, sound: "tonal.shimmer", gain: 0.2, role: "morph" }],
  render(c, p) {
    const t = c.t;
    c.clear(DARK);
    const m = E.inOut(pr(t, 0.5, 1.2));
    const f = 3.2, S = c.H * 0.86;
    const proj = (tt: number, i: number, j: number) => {
      const th = ((i + 0.5) / 24) * Math.PI, ph = (j / 24) * Math.PI * 2;
      const rr = 1 + 0.08 * Math.sin(6 * ph) * Math.sin(th);
      const sx = Math.sin(th) * Math.cos(ph) * rr, sy = Math.cos(th) * rr * 0.92, sz = Math.sin(th) * Math.sin(ph) * rr;
      const u = (i / 24) * Math.PI * 2;
      const tx = (1 + 0.38 * Math.cos(u)) * Math.cos(ph), ty = 0.38 * Math.sin(u), tz = (1 + 0.38 * Math.cos(u)) * Math.sin(ph);
      let x = lerp(sx, tx * 0.85, m), y = lerp(sy, ty * 0.85, m), z = lerp(sz, tz * 0.85, m);
      const ry = tt * 1.4 + 1, rx = 0.35 + 0.25 * m;
      [x, z] = [x * Math.cos(ry) - z * Math.sin(ry), x * Math.sin(ry) + z * Math.cos(ry)];
      [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
      const k = f / (f + z + 1.2);
      return { x: c.cx + x * k * S * 0.5, y: c.cy - c.H * 0.03 + y * k * S * 0.5, z };
    };
    const appear = pr(t, 0, 0.35, E.out);
    for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) {
      const a = proj(t, i, j), b = proj(t - 0.03, i, j);
      const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1;
      const len = c.H * 0.014;
      const depthA = clamp(0.95 - (a.z + 1) * 0.35, 0.18, 0.95) * appear;
      const col = (i * 24 + j) % 7 === 0 ? alpha(RED, depthA) : alpha(PAPER, depthA);
      c.line(a.x - (dx / d) * len, a.y - (dy / d) * len, a.x, a.y, col, Math.max(1, c.H * 0.0016));
    }
    const deg = (((t * 1.4 + 1) * 180) / Math.PI) % 360;
    txt(c, `VERTICES 576 · FOCAL 1080 · ROT Y ${deg.toFixed(1)}°`, c.cx, c.H * 0.84, mono(c.H * 0.0105), alpha(PAPER, 0.6), "center");
    hud(c, p, true);
  },
});

// ── 07 · kinetic type: three words, three entrances, three grounds ──────────────────────────────────
const GROUNDS: Record<string, [string, string]> = { dark: [DARK, PAPER], lime: [LIME, INK], red: [RED, INK], blue: [BLUE, PAPER], cream: [CREAM, INK] };
const kinetic = defineComponent<Hud & { words: string[] }>({
  ...base, id: "reel-kinetic-words", name: "Kinetic Type · Three Words, Three Entrances",
  description: "Three huge extra-wide words on the beat, each on its own ground with its own entrance: a blurred slam, letters dropping in with motion smear, a left-to-right reveal with a drawn line; a trailing period becomes a red dot.",
  tags: ["kinetic type", "words", "beat", "slam", "drop"],
  params: { ...hudParams("06 — KINETIC TYPE", 11), words: P.list(["IN.|dark", "NEVER|lime", "LINEAR.|dark"], "Words (text|dark/lime/red/blue/cream)", { min: 1, max: 4 }) },
  duration: 2,
  sounds: (p) => (p.words as string[]).map((_, i) => ({ at: (i * 2) / Math.max(1, (p.words as string[]).length), sound: "impact.land", gain: 0.35, seed: i, role: "word" })),
  render(c, p) {
    const n = Math.max(1, p.words.length), slot = 2 / n;
    const i = Math.min(n - 1, Math.floor(c.t / slot));
    const tl = c.t - i * slot;
    const [text, g] = (p.words[i] ?? "").split("|");
    const [bg, ink] = GROUNDS[(g ?? "dark").trim()] ?? GROUNDS.dark;
    c.clear(bg);
    const word = (text ?? "").trim();
    const dot = word.endsWith(".");
    const L = c.fit(dot ? word.slice(0, -1) : word, wide(c.H * 0.44), c.W * (dot ? 0.74 : 0.84), c.H * 0.5);
    const w = L.words[0];
    const dotR = L.cap * 0.13;
    const total = L.width + (dot ? dotR * 3 : 0);
    const left = c.cx - total / 2, baseline = c.cy + L.cap / 2;
    if (w) {
      const mode = i % 3;
      if (mode === 0) {
        const s = spring(tl, SPRING.punchy);
        c.with({ x: c.cx, y: c.cy, scale: 1.25 - 0.25 * Math.min(1, s) }, () => {
          const u = Math.min(1, s);
          wordFx(c, w, left - c.cx, baseline - c.cy - (L.lines[0]?.y ?? 0), { blur: (1 - u) * c.H * 0.03, alpha: pr(tl, 0, 0.08), color: ink });
        });
      } else if (mode === 1) {
        w.chars.forEach((ch, k) => {
          const e = E.out(pr(tl, k * 0.05, k * 0.05 + 0.32));
          const y = baseline - (1 - e) * c.H * 0.9;
          for (let gh = 3; gh >= 1; gh--) if (e < 0.98) c.char(w, k, left + w.x + ch.x, y - gh * (1 - e) * c.H * 0.06, { color: alpha(ink, 0.12) });
          if (e > 0) c.char(w, k, left + w.x + ch.x, y, { color: ink });
        });
      } else {
        const u = E.out(pr(tl, 0, 0.35));
        c.save();
        c.clipRect(left - c.W * 0.02, 0, (total + c.W * 0.04) * u, c.H);
        c.drawLayout(L, left + (1 - u) * -c.W * 0.04, baseline - (L.lines[0]?.y ?? 0), { color: ink });
        c.restore();
        const lu = pr(tl, 0.1, 0.45, E.out);
        c.line(c.W * 0.22, c.H * 0.86, lerp(c.W * 0.22, left + L.width * 0.3, lu), lerp(c.H * 0.86, baseline + c.H * 0.03, lu), alpha(ink, 0.6), 1.5);
      }
      if (dot) c.circle(left + L.width + dotR * 1.8, baseline - dotR, dotR * clamp(spring(tl - 0.12, SPRING.pop), 0, 1.3), RED);
    }
    hud(c, p, bg === DARK || bg === BLUE);
  },
});

// ── 08 · fin: particles gather into the mark, lockup and credits ────────────────────────────────────
function flower(c: RC, x: number, y: number, R: number, col: string, rot = 0) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + rot;
    c.line(x, y, x + Math.cos(a) * R * 0.72, y + Math.sin(a) * R * 0.72, col, R * 0.42);
  }
  c.circle(x, y, R * 0.42, col);
}
const fin = defineComponent<Hud & { role: string; credits: string[] }>({
  ...base, id: "reel-end-lockup", name: "Fin · Particles to Mark, Lockup",
  description: "On red: scattered particles gather into a petal mark, the extra-wide name slides in beside it, the italic role writes in, a rule draws and a line of mono credits closes the reel.",
  tags: ["end card", "lockup", "particles", "credits", "logo"],
  params: { ...hudParams("07 — FIN", 13), role: P.text("motion designer", "Role (italic)", { maxLength: 30 }), credits: P.list(["SHOWREEL 2026", "15 SECONDS", "EVERY FRAME WRITTEN IN CODE", "AVAILABLE FOR NEW PROJECTS"], "Credits", { max: 5 }) },
  duration: 2,
  sounds: () => [{ at: 0.3, sound: "impact.land", gain: 0.4, role: "resolve" }, { at: 0.6, sound: "tonal.shimmer", gain: 0.2, role: "tail" }],
  render(c, p) {
    const t = c.t;
    c.clear(RED);
    const N = c.fit(p.brand, wide(c.H * 0.17), c.W * 0.6, c.H * 0.2);
    const mR = c.H * 0.1, gap = c.H * 0.05;
    const total = mR * 2 + gap + N.width;
    const mx = c.cx - total / 2 + mR, my = c.H * 0.45;
    const nx = mx + mR + gap, base = my + N.cap / 2;
    const k = clamp(spring(t - 0.3, SPRING.pop), 0, 1.2);
    for (let i = 0; i < 70; i++) {
      const u = E.inOut(pr(t, 0, 0.42 + rand(i + 5) * 0.08));
      const a = (i / 70) * Math.PI * 2 * 3;
      const tx = mx + Math.cos(a) * mR * 0.6 * ((i % 7) / 7), ty = my + Math.sin(a) * mR * 0.6 * ((i % 7) / 7);
      const sx = rand(i) * c.W, sy = rand(i + 99) * c.H;
      const a2 = 1 - pr(t, 0.32, 0.45);
      if (a2 > 0) c.circle(lerp(sx, tx, u), lerp(sy, ty, u), c.H * 0.004, alpha(i % 9 ? INK : BLUE, a2));
    }
    if (k > 0.01) flower(c, mx, my, mR * k, INK, -0.6 * (1 - Math.min(1, k)));
    const w = N.words[0];
    if (w) w.chars.forEach((ch, i) => {
      const u = E.out(pr(t, 0.32 + i * 0.03, 0.62 + i * 0.03));
      if (u > 0) c.char(w, i, nx + w.x + ch.x + (1 - u) * c.W * 0.06, base, { color: alpha(INK, u) });
    });
    const R = c.layout(p.role, serif(c.H * 0.085));
    R.words.forEach((wd) => {
      const u = pr(t, 0.55, 0.85, E.out);
      wordFx(c, wd, nx, base + c.H * 0.095 - (R.lines[0]?.y ?? 0), { alpha: u, blur: (1 - u) * c.H * 0.01, color: "#3A0E06" });
    });
    const ry = base + c.H * 0.13;
    const credits = p.credits.join("   ·   ");
    const C = c.layout(credits, mono(c.H * 0.0105));
    const rx1 = Math.max(nx + N.width, nx + C.width);
    c.line(nx, ry, lerp(nx, rx1, pr(t, 0.7, 1.0, E.out)), ry, alpha(INK, 0.7), Math.max(1, c.H * 0.0013), "butt");
    c.drawLayout(C, nx, ry + c.H * 0.018, { color: alpha(INK, 0.75 * pr(t, 0.85, 1.1)) });
    hud(c, p, false);
  },
});

const components = [genesis, identity, easing, morph, truchet, depth, kinetic, fin] as unknown as Component[];

const template: PostSpec = {
  id: "kit-motion-reel",
  title: "Motion designer showreel — eight chapters, one per bar",
  format: "landscape",
  fps: 60,
  clips: components.map((k) => ({ component: k.id })),
  music: { src: "media/music/library/electrodoodle.mp3", gain: 0.55, offset: 18.042, fadeIn: 0.02, fadeOut: 0.6, credit: "\"Electrodoodle\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Kit template: @stephanlivera's one-line showreel prompt (15 s). Every chapter is a whole number of beats at 120 BPM, so every cut lands on the beat.",
};

export const motionReel: Kit = {
  id: "motion-reel",
  promptId: "2103315922098470926",
  title: "Motion designer showreel",
  family: "showreel",
  format: "landscape",
  summary: "The one-line prompt that started the trend, and what it produces: a 15-second résumé reel in eight one-bar chapters under a technical HUD, each chapter showing a different craft — a mark, a wordmark that squashes and collapses, an easing lab, shape morphing, a generative Truchet system, a 3D point cloud, kinetic type and an end lockup.",
  shots: [
    { at: 0, shot: "01 · A red dot in a ring shoots twelve spokes into a starburst; mono type orbits it", component: "reel-genesis" },
    { at: 2, shot: "01 · On red, the wide wordmark springs up, 'motion designer' writes in, letters collapse into dots", component: "reel-wordmark-collapse" },
    { at: 4, shot: "02 · 'Six ways to get from A to B.' — six balls, six easings", component: "reel-easing-lab" },
    { at: 6, shot: "03 · On blue, circle → triangle → square with red echoes and orbiting satellites", component: "reel-shape-morph" },
    { at: 7.5, shot: "04 · A Truchet field flips under a red wave and dissolves into a dot grid", component: "reel-truchet-wave" },
    { at: 9.5, shot: "05 · A 576-point sphere rotates in perspective and becomes a torus", component: "reel-point-cloud" },
    { at: 11, shot: "06 · IN. / NEVER / LINEAR. — three grounds, three entrances", component: "reel-kinetic-words" },
    { at: 13, shot: "07 · Particles gather into the mark; name, role, credits", component: "reel-end-lockup" },
  ],
  rules: [
    "Each chapter shows a different craft (identity, easing, morphing, generative systems, 3D, kinetic type)",
    "One technical HUD across the whole reel: brackets, section, timecode, beat boxes, bar counter, progress line",
    "Cuts on the beat: every chapter is a whole number of beats",
    "Bold palette per chapter (black, red, cream, electric blue, lime) with one red accent throughout",
    "Extra-wide heavy sans for words, italic serif for the role, mono for every technical label",
  ],
  components,
  template,
};
