// Kit: "Music-product film at 1080p and 60 fps" (@brainextends). A Spotify-themed 18 s film inside a
// near-black rounded stage over a green atmosphere, one persistent player bar, the same generated
// "Glass Tides" artwork carried through search, album, brand tile and zoom. Copy, palette, layout and
// timings are measured from the original film and kept as defaults.

import { E, P, SPRING, alpha, clamp, defineComponent, glide, logLerp, mix, pr, sp, type Component, type RC, type SoundCue } from "@motioneasy/engine";
import { maskRise } from "../kit";
import type { PostSpec } from "../sequence";
import { cachedArt, caret, drawArt, typed } from "./shared";
import type { Kit } from "./types";

// ── art direction ──────────────────────────────────────────────────────────
const GREEN = "#1ED760";
const STAGE_BG = "#121212";
const PANEL = "#1E1E1E";
const MUTED = "#A7A7A7";
const LOOK = { mode: "dark" as const, bg: "#050805", fg: "#FFFFFF", accent: GREEN, lighting: 0, grain: 0, vignette: 0, backdrop: "plain" as const, camera: "still" as const };

/** The stage: 80% of the width, ~76% of the height, centred horizontally, slightly below centre. */
const stageOf = (c: RC) => ({ x: c.W * 0.1, y: c.H * 0.153, w: c.W * 0.8, h: c.H * 0.764, r: c.H * 0.058 });
type Stage = ReturnType<typeof stageOf>;

/** Outside: luminous emerald top-left, deeper forest green at the sides, near-black at the bottom. */
function atmosphere(c: RC) {
  c.rect(0, 0, c.W, c.H, c.linear(0, 0, 0, c.H, [[0, "#22C45C"], [0.28, "#0F6630"], [0.58, "#052410"], [1, "#020503"]]));
  c.light(c.W * 0.12, -c.H * 0.15, c.W * 0.85, "#41F28F", 0.45, "screen");
  c.rect(0, 0, c.W, c.H, c.linear(0, 0, c.W, 0, [[0, alpha("#000", 0.1)], [0.5, alpha("#000", 0)], [1, alpha("#000", 0.2)]]));
}

/** Frame + stage, then `inner` clipped to the stage. */
function film(c: RC, inner: (S: Stage) => void) {
  const S = stageOf(c);
  atmosphere(c);
  c.save();
  c.shadow(alpha("#000", 0.45), 60, 0, 24);
  c.rrect(S.x, S.y, S.w, S.h, S.r, STAGE_BG);
  c.restore();
  c.save();
  c.clipRRect(S.x, S.y, S.w, S.h, S.r);
  inner(S);
  c.restore();
  c.strokeRRect(S.x + 0.75, S.y + 0.75, S.w - 1.5, S.h - 1.5, S.r, alpha("#FFFFFF", 0.05), 1.5);
}

const font = (size: number, weight = 400) => ({ font: "geist" as const, size, weight, tracking: -0.015, lineHeight: 1.1 });

/** Text with its baseline at y, centred on cx (or left-aligned at cx when `left`). */
function text(c: RC, s: string, cx: number, baseline: number, size: number, color: string, weight = 400, o: { left?: boolean; alpha?: number } = {}) {
  const L = c.layout(s, font(size, weight));
  c.drawLayout(L, o.left ? cx : cx - L.width / 2, baseline - L.lines[0].y, { color, alpha: o.alpha });
  return L;
}

/**
 * Two centred lines (white over green) revealed by short masked vertical moves. `mid` is the point
 * between the two baselines and `pitch` the distance between them.
 */
function twoLines(c: RC, l1: string, l2: string, cx: number, mid: number, size: number, pitch: number, t: number, at: number, w1 = 400, w2 = 400) {
  const lines: [string, string, number, number][] = [[l1, "#FFFFFF", w1, mid - pitch / 2], [l2, GREEN, w2, mid + pitch / 2]];
  lines.forEach(([s, col, w, b], i) => {
    const L = c.layout(s, font(size, w));
    const u = pr(t, at + i * 0.12, at + i * 0.12 + 0.4, E.out);
    maskRise(c, b - size * 1.0, size * 1.3, u, () => c.drawLayout(L, cx - L.width / 2, b - L.lines[0].y, { color: col }));
  });
}

/** Stand-in brand mark (a disc with three sound bars). Upload the real mark through `mark`. */
function mark(c: RC, cx: number, cy: number, r: number, ref?: string | null, color = GREEN, ink = "#0B0B0B") {
  if (r <= 0.3) return;
  if (ref) {
    c.media(ref, cx - r, cy - r, r * 2, r * 2, { fit: "contain", key: "mark" });
    return;
  }
  c.circle(cx, cy, r, color);
  const bw = r * 0.2;
  [0.5, 0.85, 0.62].forEach((h, i) => c.rrect(cx + (i - 1) * bw * 1.6 - bw / 2, cy - (r * h) / 2, bw, r * h, bw / 2, ink));
}

/** Small identity: mark + name (green on dark, or dark on the green flood). */
function identity(c: RC, name: string, cx: number, cy: number, size: number, dark = false, a = 1, ref?: string | null, left = false) {
  if (a <= 0) return;
  const L = c.layout(name, font(size, 700));
  const r = size * 0.62;
  const w = r * 2 + size * 0.35 + L.width;
  const x0 = left ? cx : cx - w / 2;
  c.save();
  c.alpha(a);
  mark(c, x0 + r, cy, r, ref, dark ? "#0B0B0B" : GREEN, dark ? GREEN : "#0B0B0B");
  c.drawLayout(L, x0 + r * 2 + size * 0.35, cy - L.height / 2 + size * 0.04, { color: dark ? "#0B0B0B" : GREEN });
  c.restore();
}

// ── artwork ────────────────────────────────────────────────────────────────
const SILK = [[0.79, 0.71, 1.0], [0.71, 0.91, 0.96], [0.96, 0.76, 0.82], [0.95, 0.86, 0.68], [0.78, 0.95, 0.86]];
/** "Glass Tides": flowing pearlescent silk and molten glass, broad folds and one sweeping S, edge to edge. */
function silk(img: ImageData, n: number) {
  const pal = (v: number) => {
    const x = (((v % 1) + 1) % 1) * SILK.length;
    const i = Math.floor(x), f = x - i, a = SILK[i % SILK.length], b = SILK[(i + 1) % SILK.length];
    const s = f * f * (3 - 2 * f);
    return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
  };
  // Broad warped folds; colour drifts slowly across the square so it reads as one piece of silk.
  const H = (u: number, v: number) => {
    const wx = u + 0.28 * Math.sin(2.3 * v + 0.4) + 0.08 * Math.sin(6.1 * v + 1.7);
    const wy = v + 0.22 * Math.sin(2.0 * u + 1.2) + 0.07 * Math.sin(5.3 * u + 0.3);
    // a sweeping S of folds across the diagonal and a second family crossing it
    return Math.sin(7.2 * (wx + 0.55 * wy) + 2.6 * Math.sin(4.1 * wy + 0.8)) * 0.7 + Math.sin(5.1 * wy - 2.2 * wx + 1.3 * Math.sin(3.2 * wx)) * 0.3;
  };
  const e = 1 / n;
  const deep = [0.36, 0.3, 0.62];
  const gold = [1.0, 0.86, 0.62];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n;
    const h = H(u, v), hx = (H(u + e, v) - h) / e, hy = (H(u, v + e) - h) / e;
    const nx = -hx * 0.2, ny = -hy * 0.2, nl = Math.hypot(nx, ny, 1);
    const Nx = nx / nl, Ny = ny / nl, Nz = 1 / nl;
    const ndl = Nx * -0.55 + Ny * -0.55 + Nz * 0.63;
    const wrap = 0.5 + 0.5 * ndl;
    const spec = Math.pow(Math.max(0, Nx * -0.3 + Ny * -0.38 + Nz * 0.87), 90);
    const rim = Math.pow(Math.max(0, Nx * 0.6 + Ny * 0.45 + Nz * 0.66), 18);
    const col = pal(0.22 * h + 0.42 * u + 0.3 * v + 0.12 * (Nx - Ny));
    const shade = Math.min(0.9, Math.pow(Math.max(0, 1 - wrap), 1.5) * 1.15);
    const k = 0.55 + 0.6 * wrap;
    const i = (y * n + x) * 4;
    for (let ch = 0; ch < 3; ch++) {
      const base = (col[ch] * (1 - shade) + deep[ch] * shade) * k;
      img.data[i + ch] = Math.max(0, Math.min(255, (base + spec * 1.25 + rim * 0.3 * gold[ch]) * 255));
    }
    img.data[i + 3] = 255;
  }
}

type SleeveKind = { title: string; bg: string; ink: string; motif: "circle" | "bars" | "rings" };
const SLEEVES: SleeveKind[] = [
  { title: "Late\nNights", bg: "#F2C230", ink: "#1A1300", motif: "circle" },
  { title: "Good\nEnergy", bg: "#EF5FA7", ink: "#2B0716", motif: "circle" },
  { title: "Deep\nFocus", bg: "#3D6FE0", ink: "#06122E", motif: "rings" },
  { title: "Daily\nMix 1", bg: "#E9E6DA", ink: "#141414", motif: "bars" },
  { title: "Daily\nMix 2", bg: "#8E5CE8", ink: "#F4EEFF", motif: "bars" },
  { title: "Daily\nMix 3", bg: "#E4572E", ink: "#2A0B02", motif: "rings" },
];

/** A designed playlist sleeve: bold type top-left and one geometric motif. */
function sleeve(c: RC, k: SleeveKind, x: number, y: number, s: number, radius = s * 0.035) {
  c.save();
  c.clipRRect(x, y, s, s, radius);
  c.rect(x, y, s, s, k.bg);
  const m = mix(k.bg, k.ink, 0.22);
  if (k.motif === "circle") c.circle(x + s * 0.6, y + s * 0.62, s * 0.36, m);
  if (k.motif === "rings") for (let i = 4; i >= 1; i--) c.circle(x + s * 0.6, y + s * 0.62, s * 0.1 * i, i % 2 ? m : k.bg);
  if (k.motif === "bars") for (let i = 0; i < 9; i++) c.rect(x + s * (0.12 + i * 0.088), y + s * 0.44, s * 0.05, s * 0.46, k.ink);
  const L = c.layout(k.title.toUpperCase(), { font: "geist", size: s * 0.14, weight: 800, tracking: -0.02, lineHeight: 0.95 });
  c.drawLayout(L, x + s * 0.08, y + s * 0.08, { color: k.ink });
  c.restore();
}

/** Cover by index: 0 = the hero artwork (or the uploaded art), 1.. = sleeves. */
function cover(c: RC, i: number, x: number, y: number, s: number, art: string | null, radius = s * 0.03) {
  if (s < 0.5) return;
  if (i === 0) {
    if (art) c.media(art, x, y, s, s, { radius, key: "hero-art" });
    else drawArt(c, cachedArt("glass-tides", 512, silk), x, y, s, radius);
  } else sleeve(c, SLEEVES[(i - 1) % SLEEVES.length], x, y, s, radius);
}

// ── persistent player ──────────────────────────────────────────────────────
type PlayerInfo = { art: string | null; title: string; artist: string; progress: number };
function player(c: RC, a: number, o: PlayerInfo) {
  if (a <= 0.002) return;
  const pw = c.W * 0.49, ph = c.H * 0.064;
  const x = (c.W - pw) / 2, y = c.H * 0.853 - ph / 2 + (1 - a) * c.H * 0.05;
  c.save();
  c.alpha(a);
  c.rrect(x, y, pw, ph, ph / 2, alpha("#262626", 0.85));
  c.strokeRRect(x + 0.5, y + 0.5, pw - 1, ph - 1, ph / 2, alpha("#FFFFFF", 0.1), 1);
  const cy = y + ph / 2, u = ph / 10;
  let cx = x + ph * 0.55;
  c.rect(cx - u * 1.3, cy - u * 1.2, u * 0.35, u * 2.4, alpha("#FFFFFF", 0.6));
  c.poly([[cx + u * 0.9, cy - u * 1.2], [cx + u * 0.9, cy + u * 1.2], [cx - u * 0.8, cy]], alpha("#FFFFFF", 0.6));
  cx += ph * 0.5;
  c.poly([[cx - u * 0.8, cy - u * 1.3], [cx - u * 0.8, cy + u * 1.3], [cx + u * 1.2, cy]], "#FFFFFF");
  cx += ph * 0.5;
  c.poly([[cx - u * 0.9, cy - u * 1.2], [cx - u * 0.9, cy + u * 1.2], [cx + u * 0.8, cy]], alpha("#FFFFFF", 0.6));
  c.rect(cx + u * 1.0, cy - u * 1.2, u * 0.35, u * 2.4, alpha("#FFFFFF", 0.6));
  cx += ph * 0.45;
  cover(c, 0, cx, cy - ph * 0.3, ph * 0.6, o.art, ph * 0.06);
  text(c, o.title, cx + ph * 0.75, cy - ph * 0.02, ph * 0.2, "#FFFFFF", 600, { left: true });
  text(c, o.artist, cx + ph * 0.75, cy + ph * 0.24, ph * 0.16, MUTED, 400, { left: true });
  const px0 = x + pw * 0.56, px1 = x + pw * 0.79;
  c.circle(px0 - ph * 0.6, cy, u * 2.2, GREEN);
  c.rrect(px0, cy - u * 0.22, px1 - px0, u * 0.44, u * 0.22, alpha("#FFFFFF", 0.22));
  c.rrect(px0, cy - u * 0.22, (px1 - px0) * clamp(o.progress), u * 0.44, u * 0.22, GREEN);
  const lx = x + pw * 0.87;
  for (let k = 0; k < 3; k++) c.rect(lx - u * 1.2, cy - u * 1 + k * u, u * 2.4, u * 0.3, alpha("#FFFFFF", 0.6));
  const vx = x + pw * 0.93;
  c.rect(vx - u * 1.1, cy - u * 0.55, u * 0.7, u * 1.1, alpha("#FFFFFF", 0.65));
  c.poly([[vx - u * 0.45, cy - u * 0.55], [vx + u * 0.45, cy - u * 1.2], [vx + u * 0.45, cy + u * 1.2], [vx - u * 0.45, cy + u * 0.55]], alpha("#FFFFFF", 0.65));
  c.restore();
}

// ── shared params ──────────────────────────────────────────────────────────
type Track = { art: string | null; title: string; artist: string };
const P_ART = { art: P.media(null, "Hero artwork (empty = generated 'Glass Tides')", "image") };
const P_TRACK = { title: P.text("Glass Tides", "Track", { maxLength: 30 }), artist: P.text("AURA", "Artist", { maxLength: 24 }) };
const P_BRAND = { brand: P.text("Spotify", "Wordmark", { maxLength: 20 }), mark: P.media(null, "Brand mark (empty = stand-in)", "image") };
const playing = (p: Track, t: number, at: number): PlayerInfo => ({ art: p.art, title: p.title, artist: p.artist, progress: at + t * 0.012 });

const base = {
  version: "1.0.0",
  group: "kits" as const,
  category: "kit-spotify-film",
  added: "2026-10-04",
  formats: ["landscape" as const],
  theme: LOOK,
  camera: "still" as const,
};

// ── shots ──────────────────────────────────────────────────────────────────
const open = defineComponent<{ brand: string; mark: string | null; line1: string; line2: string; hold: number }>({
  ...base,
  id: "spotify-open",
  name: "Icon Arrival + Discover",
  description: "0.0–1.5 s. The green mark grows into the centre of the dark stage with a confident, barely-overshooting arrival, then becomes a small identity above two masked lines: white, then green.",
  tags: ["logo", "intro", "masked type", "spring"],
  params: { ...P_BRAND, line1: P.text("Discover", "Line 1 (white)", { maxLength: 30 }), line2: P.text("new music", "Line 2 (green)", { maxLength: 30 }), hold: P.number(0, "Hold", { min: 0, max: 3, step: 0.1, unit: "s" }) },
  duration: (p) => 1.5 + p.hold,
  sounds: () => [{ at: 0.05, sound: "ui.pop", gain: 0.45, role: "mark" }, { at: 0.62, sound: "whoosh.swipe", gain: 0.3, role: "lines" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      const size = c.H * 0.025;
      const grow = clamp(sp(t, 0.02, SPRING.firm), 0, 1.06);
      const move = pr(t, 0.6, 0.95, E.inOut);
      // the mark travels to where the identity's mark sits, then the name appears beside it
      const nameW = c.layout(p.brand, font(size, 700)).width;
      const rId = size * 0.62, wId = rId * 2 + size * 0.35 + nameW;
      const tx = c.W / 2 - wId / 2 + rId, ty = c.H * 0.344;
      const r = logLerp(c.H * 0.058, rId, move) * grow;
      if (move < 1) mark(c, c.W / 2 + (tx - c.W / 2) * move, c.H * 0.53 + (ty - c.H * 0.53) * move, r, p.mark);
      else identity(c, p.brand, c.W / 2, ty, size, false, 1, p.mark);
      if (move >= 1) void 0;
      const nameA = pr(t, 0.85, 1.05);
      if (move < 1 && nameA > 0) text(c, p.brand, tx + rId + size * 0.35, ty + size * 0.36, size, GREEN, 700, { left: true, alpha: nameA });
      twoLines(c, p.line1, p.line2, c.W / 2, c.H * 0.52, c.H * 0.054, c.H * 0.083, t, 0.72);
    });
  },
});

const DESK = { x: 0.206, y: 0.267, w: 0.588, h: 0.522 };

const desktop = defineComponent<Track & { brand: string; mark: string | null; heading: string }>({
  ...base,
  id: "spotify-desktop",
  name: "Desktop UI Rise",
  description: "1.5–2.4 s. A stylised desktop interface rises into view with a perspective tilt that settles to frontal: slim sidebar, 'Made for you', three album cards, small supporting rows. The player bar arrives beneath it.",
  tags: ["ui", "perspective", "rise", "app"],
  params: { ...P_BRAND, ...P_ART, ...P_TRACK, heading: P.text("Made for you", "Heading", { maxLength: 30 }) },
  duration: 0.9,
  sounds: () => [{ at: 0, sound: "whoosh.air", gain: 0.35, role: "rise" }, { at: 0.5, sound: "ui.click", gain: 0.15, role: "player" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      const w = c.W * DESK.w, h = c.H * DESK.h;
      const L = c.layer(w, h, (lc) => desktopUI(lc, w, h, p));
      const u = sp(t, 0, SPRING.soft);
      const cam = c.camera({ fov: 30 });
      cam.plane(L, { x: 0, y: (DESK.y + DESK.h / 2) * c.H - c.cy + (1 - u) * c.H * 0.3, z: 0, w, h, rx: (1 - clamp(u)) * 28, alpha: clamp(u * 2.5) });
      player(c, pr(t, 0.45, 0.9, E.out), playing(p, t, 0.06));
    });
  },
});

function desktopUI(c: RC, w: number, h: number, p: Track & { brand: string; mark: string | null; heading: string }) {
  c.rrect(0, 0, w, h, h * 0.035, PANEL);
  c.strokeRRect(0.75, 0.75, w - 1.5, h - 1.5, h * 0.035, alpha("#FFFFFF", 0.07), 1.5);
  identity(c, p.brand, w * 0.025, h * 0.075, h * 0.042, false, 1, p.mark, true);
  ["Home", "Search", "Your Library"].forEach((s, i) => text(c, s, w * 0.03, h * (0.2 + i * 0.09), h * 0.032, MUTED, 400, { left: true }));
  text(c, p.heading, w * 0.23, h * 0.1, h * 0.065, "#FFFFFF", 700, { left: true });
  const s = h * 0.372;
  const names: [string, string][] = [[p.title, p.artist], ["Late Nights", "Your evening mix"], ["Good Energy", "Turn it up"]];
  for (let i = 0; i < 3; i++) {
    const x = w * (0.247 + i * 0.24);
    cover(c, i, x, h * 0.207, s, p.art);
    text(c, names[i][0], x, h * 0.207 + s + h * 0.06, h * 0.032, "#FFFFFF", 600, { left: true });
    text(c, names[i][1], x, h * 0.207 + s + h * 0.105, h * 0.026, MUTED, 400, { left: true });
  }
  ["On repeat", "Fresh finds"].forEach((s2, i) => {
    const x = w * (0.24 + i * 0.36);
    text(c, s2, x, h * 0.81, h * 0.034, "#FFFFFF", 600, { left: true });
    c.rrect(x, h * 0.86, w * 0.3, h * 0.05, h * 0.025, "#2A2A2A");
  });
}

const newForYou = defineComponent<Track & { heading: string }>({
  ...base,
  id: "spotify-new-for-you",
  name: "Featured Covers",
  description: "2.4–3.2 s. Closer on the three featured covers under 'New for you', crisp artwork with short titles beneath; the narrow rounded player bar anchors the bottom of the stage.",
  tags: ["covers", "zoom", "player"],
  params: { ...P_ART, ...P_TRACK, heading: P.text("New for you", "Heading", { maxLength: 30 }) },
  duration: 0.8,
  sounds: () => [{ at: 0.02, sound: "whoosh.swipe", gain: 0.3, role: "push" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      const u = clamp(sp(t, 0, SPRING.firm));
      // from the desktop cards' size and place to the close-up
      const s0 = c.H * DESK.h * 0.372, s1 = c.H * 0.27;
      const s = logLerp(s0, s1, u);
      const gap = c.W * 0.035 * (s / s1);
      const total = s * 3 + gap * 2;
      const x0 = c.W / 2 - total / 2, y = c.H * (0.385 + (1 - u) * -0.05);
      text(c, p.heading, x0, y - c.H * 0.045, c.H * 0.032, "#FFFFFF", 700, { left: true, alpha: u });
      const names = [p.title, "Late Nights", "Good Energy"];
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * (s + gap);
        cover(c, i, x, y, s, p.art);
        text(c, names[i], x + s / 2, y + s + c.H * 0.035, c.H * 0.018, "#FFFFFF", 500, { alpha: u });
      }
      player(c, 1, playing(p, t, 0.08));
    });
  },
});

const freshFinds = defineComponent<Track & { heading: string; rows: string[] }>({
  ...base,
  id: "spotify-fresh-finds",
  name: "Covers into List",
  description: "3.2–4.0 s. The featured cards withdraw into a compact 'Fresh finds' list: four rows reveal with a slight stagger, each with a thumbnail, short title, artist and a small menu.",
  tags: ["list", "stagger", "match position"],
  params: { ...P_ART, ...P_TRACK, heading: P.text("Fresh finds", "Heading", { maxLength: 30 }), rows: P.list(["Glass Tides|AURA|3:42", "Night Drive|Neon Club|3:18", "Golden Hour|Dayform|2:56", "Afterglow|Northline|4:05"], "Rows (title|artist|time)", { min: 2, max: 5 }) },
  duration: 0.8,
  sounds: (p) => p.rows.map((_, i) => ({ at: 0.12 + i * 0.06, sound: "ui.tick", gain: 0.16, seed: i, role: "row" }) as SoundCue),
  render(c, p) {
    const t = c.t;
    film(c, () => {
      const pitch = c.H * 0.089, th = c.H * 0.056;
      const x0 = c.W * 0.3, y0 = c.H * 0.395;
      text(c, p.heading, x0, c.H * 0.325, c.H * 0.038, "#FFFFFF", 700, { left: true, alpha: pr(t, 0, 0.2) });
      const s0 = c.H * 0.27, gap0 = c.W * 0.035, fx0 = c.W / 2 - (s0 * 3 + gap0 * 2) / 2, fy = c.H * 0.385;
      p.rows.forEach((r, i) => {
        const [title, artist, time] = r.split("|");
        const m = clamp(sp(t, i * 0.025, SPRING.punchy), 0, 1.02);
        const cy = y0 + i * pitch;
        const from = i < 3 ? { x: fx0 + i * (s0 + gap0), y: fy, s: s0 } : { x: x0, y: cy - th / 2, s: th * 0.2 };
        const s = logLerp(from.s, th, clamp(m));
        cover(c, i, from.x + (x0 - from.x) * m, from.y + (cy - th / 2 - from.y) * m, s, p.art, s * 0.06);
        const a = pr(t, 0.05 + i * 0.04, 0.2 + i * 0.04, E.out);
        const dx = (1 - a) * c.W * 0.01;
        text(c, i === 0 ? p.title : title ?? "", x0 + th + c.W * 0.012 + dx, cy - c.H * 0.002, c.H * 0.022, "#FFFFFF", 650, { left: true, alpha: a });
        text(c, i === 0 ? p.artist : artist ?? "", x0 + th + c.W * 0.012 + dx, cy + c.H * 0.022, c.H * 0.015, MUTED, 400, { left: true, alpha: a });
        text(c, time ?? "", c.W * 0.672, cy + c.H * 0.008, c.H * 0.016, MUTED, 400, { left: true, alpha: a });
        for (let d = 0; d < 3; d++) c.circle(c.W * 0.7 + d * c.H * 0.008, cy, c.H * 0.0025, alpha(MUTED, a));
      });
      player(c, 1, playing(p, t, 0.1));
    });
  },
});

const everyMood = defineComponent<Track & { heading: string; sub: string }>({
  ...base,
  id: "spotify-every-mood",
  name: "Mood Strip",
  description: "4.0–4.9 s. A horizontal strip of colourful playlist covers slides sideways under 'Every mood', the edge cards cropped by the stage; 'Find what moves you' beneath.",
  tags: ["carousel", "strip", "slide", "covers"],
  params: { ...P_ART, ...P_TRACK, heading: P.text("Every mood", "Heading", { maxLength: 30 }), sub: P.text("Find what moves you", "Supporting line", { maxLength: 40 }) },
  duration: 0.9,
  sounds: () => [{ at: 0, sound: "whoosh.air", gain: 0.35, role: "strip" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      const s = c.H * 0.255, gap = c.W * 0.012;
      const slide = (0.35 - pr(t, 0, 0.9, E.inOut)) * c.W * 0.28;
      const y = c.H * 0.43;
      const ids = [1, 2, 3, 4, 5, 0, 6, 1, 2];
      const n = ids.length;
      const x0 = c.W / 2 - (n * s + (n - 1) * gap) / 2 + slide;
      for (let i = 0; i < n; i++) cover(c, ids[i], x0 + i * (s + gap), y, s, p.art);
      const a = pr(t, 0, 0.25);
      text(c, p.heading, c.W / 2, c.H * 0.385, c.H * 0.034, "#FFFFFF", 400, { alpha: a });
      text(c, p.sub, c.W / 2, y + s + c.H * 0.05, c.H * 0.016, MUTED, 400, { alpha: a });
      player(c, 1, playing(p, t, 0.12));
    });
  },
});

const FIELD = { x: 0.3, y: 0.41, w: 0.4, h: 0.05 };
const RESULT = { y: 0.48, h: 0.068 };

const search = defineComponent<Track & { query: string }>({
  ...base,
  id: "spotify-search",
  name: "Search + Result",
  description: "4.9–5.8 s. A compact search field appears, the query types itself, and one selected result slides in beneath: artwork, title, artist and a green play icon.",
  tags: ["search", "typing", "ui", "result"],
  params: { ...P_ART, ...P_TRACK, query: P.text("Glass Tides", "Query", { maxLength: 30 }) },
  duration: 0.9,
  sounds: (p) => [...Array.from(p.query).map((_, i) => ({ at: 0.1 + i / 18, sound: "foley.key", gain: 0.14, seed: i, role: "type" }) as SoundCue), { at: 0.62, sound: "ui.click", gain: 0.28, role: "select" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      const fx = c.W * FIELD.x, fy = c.H * FIELD.y, fw = c.W * FIELD.w, fh = c.H * FIELD.h;
      const a = clamp(sp(t, 0, SPRING.firm));
      c.with({ x: fx + fw / 2, y: fy + fh / 2, sx: 0.92 + 0.08 * a, alpha: clamp(a * 2) }, () => {
        c.rrect(-fw / 2, -fh / 2, fw, fh, fh * 0.22, "#2A2A2A");
        const q = typed(p.query, t, 0.1, 18);
        const L = text(c, q || " ", -fw / 2 + fh * 0.4, fh * 0.13, fh * 0.34, "#FFFFFF", 400, { left: true });
        if (q.length < p.query.length || caret(t)) c.rect(-fw / 2 + fh * 0.4 + (q ? L.width : 0) + 3, -fh * 0.22, 1.5, fh * 0.44, alpha("#FFFFFF", 0.8));
      });
      const r = pr(t, 0.55, 0.85, E.out);
      if (r > 0) {
        const ry = c.H * RESULT.y + (1 - r) * c.H * 0.015, rh = c.H * RESULT.h;
        c.save();
        c.alpha(r);
        c.rrect(fx, ry, fw, rh, rh * 0.14, mix("#171717", GREEN, 0.2));
        cover(c, 0, fx + rh * 0.16, ry + rh * 0.16, rh * 0.68, p.art, rh * 0.05);
        text(c, p.title, fx + rh * 1.05, ry + rh * 0.45, rh * 0.22, "#FFFFFF", 600, { left: true });
        text(c, p.artist, fx + rh * 1.05, ry + rh * 0.78, rh * 0.18, MUTED, 400, { left: true });
        const px = fx + fw - rh * 0.5, py = ry + rh / 2;
        c.poly([[px - rh * 0.1, py - rh * 0.14], [px - rh * 0.1, py + rh * 0.14], [px + rh * 0.13, py]], GREEN);
        c.restore();
      }
      player(c, 1, playing(p, t, 0.14));
    });
  },
});

const album = defineComponent<Track & { tagline: string; cta: string }>({
  ...base,
  id: "spotify-album",
  name: "Album Detail",
  description: "5.8–7.5 s. The selected artwork expands from its search-row position into a large centred cover with title and artist; then the cover slides left while track info, a tagline and a rounded green Play button arrive on the right, all on one move.",
  tags: ["match cut", "album", "detail", "cta"],
  params: { ...P_ART, ...P_TRACK, tagline: P.text("A new frequency", "Tagline", { maxLength: 40 }), cta: P.text("Play", "Button", { maxLength: 12 }) },
  duration: 1.7,
  sounds: () => [{ at: 0, sound: "whoosh.air", gain: 0.4, role: "expand" }, { at: 0.8, sound: "whoosh.swipe", gain: 0.3, role: "slide" }, { at: 1.25, sound: "ui.pop", gain: 0.3, role: "play" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      const rh = c.H * RESULT.h;
      const from = { x: c.W * FIELD.x + rh * 0.16, y: c.H * RESULT.y + rh * 0.16, s: rh * 0.68 };
      const mid = { s: c.H * 0.31, x: c.W / 2 - (c.H * 0.31) / 2, y: c.H * 0.3 };
      const end = { s: c.H * 0.361, x: c.W * 0.27, y: c.H * 0.322 };
      const e = clamp(sp(t, 0, SPRING.firm), 0, 1.01);
      const sl = clamp(sp(t, 0.8, SPRING.firm), 0, 1.01);
      const s = logLerp(logLerp(from.s, mid.s, clamp(e)), end.s, clamp(sl));
      const x = from.x + (mid.x - from.x) * e + (end.x - mid.x) * sl;
      const y = from.y + (mid.y - from.y) * e + (end.y - mid.y) * sl;
      cover(c, 0, x, y, s, p.art);
      const under = pr(t, 0.3, 0.55) * (1 - pr(t, 0.78, 0.9));
      text(c, p.title, c.W / 2, mid.y + mid.s + c.H * 0.045, c.H * 0.03, "#FFFFFF", 400, { alpha: under });
      text(c, p.artist, c.W / 2, mid.y + mid.s + c.H * 0.075, c.H * 0.016, GREEN, 500, { alpha: under });
      const ix = c.W * 0.506;
      const info: [string, number, string, number, number, number][] = [[p.title, c.H * 0.037, "#FFFFFF", 400, c.H * 0.44, 0.95], [p.artist, c.H * 0.016, GREEN, 500, c.H * 0.48, 1.03], [p.tagline, c.H * 0.014, MUTED, 400, c.H * 0.51, 1.1]];
      for (const [s2, size, col, w, b, at] of info) {
        const L = c.layout(s2, font(size, w));
        const u = pr(t, at, at + 0.35, E.out);
        maskRise(c, b - size, size * 1.32, u, () => c.drawLayout(L, ix, b - L.lines[0].y, { color: col }));
      }
      const bu = clamp(sp(t, 1.2, SPRING.firm), 0, 1.06);
      if (bu > 0.01) {
        const bh = c.H * 0.05, bw = c.W * 0.1;
        c.with({ x: ix + bw / 2, y: c.H * 0.57, scale: bu }, () => {
          c.rrect(-bw / 2, -bh / 2, bw, bh, bh / 2, GREEN);
          c.poly([[-bw / 2 + bh * 0.5, -bh * 0.17], [-bw / 2 + bh * 0.5, bh * 0.17], [-bw / 2 + bh * 0.8, 0]], "#000");
          text(c, p.cta, -bw / 2 + bh * 1.05, bh * 0.14, bh * 0.36, "#000", 650, { left: true });
        });
      }
      player(c, 1, playing(p, t, 0.16));
    });
  },
});

const flood = defineComponent<Track & { brand: string; mark: string | null }>({
  ...base,
  id: "spotify-brand-flood",
  name: "Brand-Colour Flood",
  description: "7.5–8.3 s. A brief brand-colour transformation fills the inner stage with green; the artwork contracts into a small centred tile with a dark identity beneath, and the player briefly recedes.",
  tags: ["flood", "brand colour", "tile", "transition"],
  params: { ...P_ART, ...P_TRACK, ...P_BRAND },
  duration: 0.8,
  sounds: () => [{ at: 0, sound: "whoosh.deep", gain: 0.35, role: "flood" }, { at: 0.3, sound: "impact.land", gain: 0.3, role: "tile" }],
  render(c, p) {
    const t = c.t;
    film(c, (S) => {
      // the flood grows out of the Play button and overscales past the stage corners (~0.3 s)
      const f = pr(t, 0, 0.3, E.in);
      c.circle(c.W * 0.556, c.H * 0.57, Math.hypot(S.w, S.h) * 1.05 * f, GREEN);
      const e = clamp(sp(t, 0.04, SPRING.firm), 0, 1.01);
      const from = { x: c.W * 0.27, y: c.H * 0.322, s: c.H * 0.361 };
      const to = { s: c.H * 0.2, x: c.W / 2 - c.H * 0.1, y: c.H * 0.36 };
      cover(c, 0, from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e, logLerp(from.s, to.s, clamp(e)), p.art);
      identity(c, p.brand, c.W / 2, c.H * 0.615, c.H * 0.018, true, pr(t, 0.3, 0.5), p.mark);
      player(c, 1 - pr(t, 0, 0.3, E.in), playing(p, t, 0.18));
    });
  },
});

const zoom = defineComponent<Track>({
  ...base,
  id: "spotify-cover-zoom",
  name: "Cover Zoom",
  description: "8.3–9.8 s. Back on the dark stage, the same artwork expands dramatically toward the camera until it is oversized and cropped by the rounded stage, with controlled motion blur on the fastest part; the player is restored.",
  tags: ["zoom", "motion blur", "artwork", "hero"],
  params: { ...P_ART, ...P_TRACK },
  duration: 1.5,
  sounds: () => [{ at: 0.05, sound: "riser.reverse", len: 0.55, gain: 0.35, role: "suck" }, { at: 0.55, sound: "whoosh.deep", gain: 0.45, role: "zoom" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      // already moving on the first frame, still growing at the end (measured: 0.4 H at 0.4 s, 0.84 H at 1.1 s)
      const ease = (x: number) => glide(x / 1.2);
      const s = logLerp(c.H * 0.2, c.H * 0.9, ease(t));
      const ds = logLerp(c.H * 0.2, c.H * 0.9, ease(t + 1 / 60)) - s;
      const L = c.layer(s, s, (lc) => cover(lc, 0, 0, 0, s, p.art, 0), { res: Math.min(1, 900 / s) });
      c.drawLayer(L, c.W / 2 - s / 2, c.H * 0.5 - s / 2, { blur: Math.min(5, Math.abs(ds) * 0.18) });
      player(c, pr(t, 0.15, 0.5, E.out), playing(p, t, 0.2));
    });
  },
});

const statement = defineComponent<Track & { line1: string; line2: string; hold: number }>({
  ...base,
  id: "spotify-statement",
  name: "Typographic Statement",
  description: "9.8–11.2 s. The oversized artwork clears and a centred two-line statement rises: white first line, bold green second; the player stays stable beneath.",
  tags: ["statement", "masked type", "headline"],
  params: { ...P_ART, ...P_TRACK, line1: P.text("Find your", "Line 1 (white)", { maxLength: 30 }), line2: P.text("rhythm", "Line 2 (green)", { maxLength: 30 }), hold: P.number(0, "Hold", { min: 0, max: 3, step: 0.1, unit: "s" }) },
  duration: (p) => 1.4 + p.hold,
  sounds: () => [{ at: 0.2, sound: "whoosh.swipe", gain: 0.3, role: "lines" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      const clear = pr(t, 0, 0.22, E.in);
      if (clear < 1) {
        const s = c.H * 0.9 * (1 + clear * 0.25);
        c.save();
        c.alpha(1 - clear);
        cover(c, 0, c.W / 2 - s / 2, c.H * 0.5 - s / 2, s, p.art, 0);
        c.restore();
      }
      twoLines(c, p.line1, p.line2, c.W / 2, c.H * 0.5, c.H * 0.058, c.H * 0.088, t, 0.06, 400, 700);
      player(c, 1, playing(p, t, 0.22));
    });
  },
});

const sleeves = defineComponent<Track & { heading: string; sub: string }>({
  ...base,
  id: "spotify-sleeves",
  name: "Sleeves Spread",
  description: "11.2–12.5 s. 'Made for your every day': three playlist sleeves enter with gentle perspective and small opposing tilts, then spread into six smaller sleeves across the stage; 'Your sound, always evolving' beneath.",
  tags: ["playlists", "perspective", "spread", "grid"],
  params: { ...P_ART, ...P_TRACK, heading: P.text("Made for your every day", "Heading", { maxLength: 40 }), sub: P.text("Your sound, always evolving", "Supporting line", { maxLength: 40 }) },
  duration: 1.3,
  sounds: () => [{ at: 0, sound: "whoosh.air", gain: 0.35, role: "in" }, { at: 0.65, sound: "whoosh.swipe", gain: 0.3, role: "spread" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      text(c, p.heading, c.W / 2, c.H * 0.34, c.H * 0.026, "#FFFFFF", 400, { alpha: pr(t, 0, 0.25) });
      text(c, p.sub, c.W / 2, c.H * 0.695, c.H * 0.015, MUTED, 400, { alpha: pr(t, 0.3, 0.55) });
      const spread = clamp(sp(t, 0.65, SPRING.firm), 0, 1.01);
      const cam = c.camera({ fov: 32 });
      const big = c.H * 0.22, small = c.H * 0.175;
      for (let i = 0; i < 6; i++) {
        const enter = i < 3 ? clamp(sp(t, i * 0.07, SPRING.firm), 0, 1.02) : spread;
        if (enter <= 0.01) continue;
        const fromX = (i - 1) * big * 1.18, toX = (i - 2.5) * small * 1.2;
        const x = i < 3 ? fromX + (toX - fromX) * spread : toX;
        const s = i < 3 ? logLerp(big, small, clamp(spread)) : small * clamp(enter);
        const tilt = (i % 2 ? 1 : -1) * 9 * (1 - 0.5 * spread);
        const L = c.layer(s, s, (lc) => sleeve(lc, SLEEVES[i], 0, 0, s));
        cam.plane(L, { x, y: c.H * 0.52 - c.cy + (1 - clamp(enter)) * c.H * 0.06, z: 0, w: s, h: s, ry: tilt, rz: tilt * 0.3, alpha: clamp(enter * 2) });
      }
      player(c, 1, playing(p, t, 0.24));
    });
  },
});

const FLOAT = [
  { i: 0, x: -0.21, y: 0.0, z: -60, ry: 14, rz: -5 },
  { i: 4, x: -0.07, y: 0.012, z: 40, ry: 6, rz: 3 },
  { i: 0, x: 0.07, y: -0.01, z: -20, ry: -6, rz: -3 },
  { i: 3, x: 0.21, y: 0.0, z: 60, ry: -14, rz: 5 },
];

const floating = defineComponent<Track>({
  ...base,
  id: "spotify-float",
  name: "Floating Covers",
  description: "12.5–14.0 s. Four album covers, the hero artwork among them, float with restrained rotation, perspective, depth ordering and overlap; their movement is coordinated, never random drift.",
  tags: ["3d", "float", "depth", "covers"],
  params: { ...P_ART, ...P_TRACK },
  duration: 1.5,
  sounds: () => [{ at: 0, sound: "whoosh.air", gain: 0.3, role: "float" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      const cam = c.camera({ fov: 34, x: (pr(t, 0, 1.5) - 0.5) * 30 });
      const s = c.H * 0.21;
      const order = FLOAT.map((q, k) => ({ q, k, d: cam.depth(q.x * c.W, 0, q.z) })).sort((a, b) => b.d - a.d);
      for (const { q, k } of order) {
        const enter = clamp(sp(t, k * 0.05, SPRING.soft), 0, 1.02);
        const bob = Math.sin(t * 1.5 + k * 0.9) * c.H * 0.01;
        const L = c.layer(s, s, (lc) => cover(lc, q.i, 0, 0, s, p.art));
        cam.plane(L, { x: q.x * c.W, y: c.H * 0.53 - c.cy + q.y * c.H + bob, z: q.z, w: s, h: s, ry: q.ry * enter, rz: q.rz, alpha: clamp(enter * 2) });
      }
      player(c, 1, playing(p, t, 0.26));
    });
  },
});

const converge = defineComponent<Track & { mark: string | null }>({
  ...base,
  id: "spotify-converge",
  name: "Covers Fold into Mark",
  description: "14.0–15.2 s. The covers converge on the centre and fold around a green mark that emerges from the exact point they meet; the artwork withdraws and the player fades away.",
  tags: ["converge", "fold", "logo", "transition"],
  params: { ...P_ART, ...P_TRACK, mark: P.media(null, "Brand mark (empty = stand-in)", "image") },
  duration: 1.2,
  sounds: () => [{ at: 0.1, sound: "whoosh.air", gain: 0.4, role: "converge" }, { at: 0.75, sound: "tonal.chime", gain: 0.3, role: "mark" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      const cx = c.W / 2, cy = c.H * 0.53;
      // converge into a small fan around the centre, then fold edge-on as the mark emerges from the middle
      const g = pr(t, 0, 0.6, E.inOut);
      const s = c.H * 0.21 * (1 - 0.15 * g);
      const fan = [-0.035, -0.012, 0.012, 0.035];
      for (let k = 0; k < 4; k++) {
        const q = FLOAT[k];
        const fold = 1 - pr(t, 0.62 + k * 0.03, 0.92 + k * 0.03, E.in);
        if (fold <= 0.01) continue;
        const x = cx + (q.x * (1 - g) + fan[k] * g) * c.W, y = cy + q.y * c.H * (1 - g) + Math.abs(k - 1.5) * c.H * 0.012 * g;
        c.with({ x, y, sx: fold, rotate: (k - 1.5) * 14 * g + q.rz * (1 - g) }, () => cover(c, q.i, -s / 2, -s / 2, s, p.art));
      }
      mark(c, cx, cy, c.H * 0.06 * clamp(sp(t, 0.45, SPRING.firm), 0, 1.06), p.mark);
      player(c, 1 - pr(t, 0.3, 0.75), playing(p, t, 0.28));
    });
  },
});

const lockup = defineComponent<{ brand: string; mark: string | null; line1: string; line2: string; hold: number }>({
  ...base,
  id: "spotify-lockup",
  name: "Logo Lockup",
  description: "15.2–18.0 s. The mark slides slightly left and settles beside a large white wordmark (they never touch), then 'Discover new music' / 'every day' reveal in white and green and the composition holds clean to the end.",
  tags: ["logo", "lockup", "end card"],
  params: { ...P_BRAND, line1: P.text("Discover new music", "Line 1 (white)", { maxLength: 40 }), line2: P.text("every day", "Line 2 (green)", { maxLength: 40 }), hold: P.number(1.6, "Hold", { min: 0, max: 4, step: 0.1, unit: "s" }) },
  duration: (p) => 1.2 + p.hold,
  sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.3, role: "wordmark" }, { at: 0.6, sound: "tonal.shimmer", gain: 0.2, role: "tag" }],
  render(c, p) {
    const t = c.t;
    film(c, () => {
      const cx = c.W / 2, cy = c.H * 0.49;
      const size = c.H * 0.085;
      const W = c.layout(p.brand, font(size, 700));
      const r = c.H * 0.047, gap = c.W * 0.024;
      const total = r * 2 + gap + W.width;
      const m = clamp(sp(t, 0, SPRING.firm), 0, 1.01);
      const mx = cx + (cx - total / 2 + r - cx) * m;
      mark(c, mx, cy, logLerp(c.H * 0.06, r, clamp(m)), p.mark);
      const wu = pr(t, 0.12, 0.5, E.out);
      const tx = cx - total / 2 + r * 2 + gap;
      c.save();
      c.clipRect(tx - 2, cy - size, W.width + size, size * 2);
      c.drawLayout(W, tx - (1 - wu) * size * 0.9, cy - W.lines[0].y + size * 0.36, { color: "#FFFFFF", alpha: wu });
      c.restore();
      twoLines(c, p.line1, p.line2, cx, c.H * 0.648, c.H * 0.026, c.H * 0.047, t, 0.55);
    });
  },
});

const playerEl = defineComponent<Track & { hold: number }>({
  ...base,
  id: "spotify-player",
  name: "Persistent Player",
  description: "The narrow rounded player bar that connects the middle of the film: hero thumbnail, track and artist, play and skip, a green like dot, a thin green progress track, a queue and a volume icon, in subdued translucent dark with a fine border.",
  tags: ["player", "ui", "persistent", "element"],
  params: { ...P_ART, ...P_TRACK, hold: P.number(2, "Length", { min: 0.5, max: 6, step: 0.1, unit: "s" }) },
  duration: (p) => p.hold,
  render(c, p) {
    const t = c.t;
    film(c, () => player(c, pr(t, 0, 0.4, E.out), { art: p.art, title: p.title, artist: p.artist, progress: 0.1 + t * 0.05 }));
  },
});

const components = [open, desktop, newForYou, freshFinds, everyMood, search, album, flood, zoom, statement, sleeves, floating, converge, lockup, playerEl] as unknown as Component[];

const template: PostSpec = {
  id: "kit-spotify-film",
  title: "Music-product film (Spotify-themed)",
  format: "landscape",
  fps: 60,
  clips: components.slice(0, 14).map((k) => ({ component: k.id })),
  music: { src: "media/music/library/screen-saver.mp3", gain: 0.5, offset: 4.247, fadeIn: 0.05, fadeOut: 1.2, credit: "\"Screen Saver\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Kit template: @brainextends' Spotify-themed music-product film, 18 s, original copy and palette.",
};

export const spotifyFilm: Kit = {
  id: "spotify-film",
  promptId: "2103801834930606193",
  title: "Music-product film",
  family: "launch",
  format: "landscape",
  summary: "An 18-second premium music-product film inside a near-black rounded stage over a green atmosphere. One persistent player bar and one generated hero artwork tie fourteen one-second ideas together through match positions, masked reveals and perspective.",
  shots: [
    { at: 0, shot: "Green icon grows into the centre of the dark stage, minimal overshoot", component: "spotify-open" },
    { at: 0.6, shot: "Icon becomes a small green identity above 'Discover' (white) / 'new music' (green), masked vertical reveals", component: "spotify-open" },
    { at: 1.5, shot: "Desktop interface rises with a perspective tilt settling frontal: sidebar, 'Made for you', three cards; the player arrives", component: "spotify-desktop" },
    { at: 2.4, shot: "Closer on three featured covers under 'New for you'", component: "spotify-new-for-you" },
    { at: 3.2, shot: "Cards withdraw into a 'Fresh finds' list, four rows with a slight stagger", component: "spotify-fresh-finds" },
    { at: 4.0, shot: "'Every mood': a strip of playlist covers slides sideways, cropped by the stage", component: "spotify-every-mood" },
    { at: 4.9, shot: "Search field types 'Glass Tides'; one selected result with a green play icon", component: "spotify-search" },
    { at: 5.8, shot: "The artwork expands into a large cover; then slides left beside track info and a green Play button", component: "spotify-album" },
    { at: 7.5, shot: "Green floods the inner stage; the art contracts into a tile with a dark identity; player recedes", component: "spotify-brand-flood" },
    { at: 8.3, shot: "Dark stage again; the artwork zooms toward camera, oversized and cropped, with motion blur", component: "spotify-cover-zoom" },
    { at: 9.8, shot: "The art clears into 'Find your' / 'rhythm'", component: "spotify-statement" },
    { at: 11.2, shot: "'Made for your every day': three sleeves with opposing tilts spread into six", component: "spotify-sleeves" },
    { at: 12.5, shot: "Four floating covers with coordinated depth and rotation", component: "spotify-float" },
    { at: 14.0, shot: "Covers converge and fold around the emerging mark; player fades", component: "spotify-converge" },
    { at: 15.2, shot: "Mark settles beside the wordmark; 'Discover new music' / 'every day'; clean hold", component: "spotify-lockup" },
  ],
  rules: [
    "Stage: 80% width, ~76% height, near-black, rounded; outside, emerald top-left to forest green to near-black",
    "White primary type, muted gray secondary, green #1ED760 for emphasis and controls; one sans (Geist), mostly regular weight",
    "Compact centred compositions, lots of negative space; music-ad type, not presentation headings",
    "Each idea ~1 s; critically damped springs, no repeated bouncing; outgoing titles leave before incoming ones land",
    "No particles, shockwave rings, lens flares, camera shake, stock footage, watermark or progress counter",
    "~120 BPM electronic bed; effects quieter than the music; no voiceover",
  ],
  components,
  template,
};
