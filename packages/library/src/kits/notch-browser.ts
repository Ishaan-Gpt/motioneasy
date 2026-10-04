// Kit: "Slow, polished teaser on one Mac desktop" (@jake11moran). NotchBrowser teaser: one continuous camera
// over one painterly Mac desktop, no hard cuts. Pushes, pulls and pans run 1.5–3 s on gentle ease-in-out;
// motion blur on fast moves, light film grain, an oversized cursor, lowercase copy, no audio.
// Every component shares the same world (the desktop, in frame units) and hands its camera to the next.

import { E, P, SPRING, alpha, clamp, createCanvas, defineComponent, get2d, lerp, logLerp, mix, pr, rand, spring, type AnyCanvas, type Component, type RC } from "@motioneasy/engine";
import { wordFx } from "../kit";
import { drawCursor, mediaOr } from "../parts";
import type { PostSpec } from "../sequence";
import { boxTrack, cursorAt, type Box } from "./shared";
import type { Kit } from "./types";

const INK = "#FFFFFF";
const LOOK = { mode: "dark" as const, bg: "#55703A", fg: INK, accent: "#FF8A1F", lighting: 0, grain: 0.35, vignette: 0.12, backdrop: "plain" as const, camera: "still" as const };
const sans = (size: number, weight = 600) => ({ font: "inter" as const, size, weight, tracking: -0.02, lineHeight: 1.15 });
const P_WALL = { wallpaper: P.media(null, "Wallpaper (blank = painted garden)", "image") };

// ── Camera over the desktop ─────────────────────────────────────────────────────────────────────────
// World = the desktop in frame units. The camera looks at (x, y) with zoom k.
interface Cam {
  k: number;
  x: number;
  y: number;
}
const camAt = (c: RC, k: number, top = false): Cam => ({ k, x: c.cx, y: top ? c.H / (2 * k) : c.cy });
function view(c: RC, cam: Cam, fn: () => void) {
  c.save();
  c.translate(c.cx, c.cy);
  c.scale(cam.k);
  c.translate(-cam.x, -cam.y);
  fn();
  c.restore();
}
const scr = (c: RC, cam: Cam, x: number, y: number): [number, number] => [(x - cam.x) * cam.k + c.cx, (y - cam.y) * cam.k + c.cy];
/** Shared camera states, so each component starts exactly where the previous one ended. */
const K_TEXT = 1.18; // hook + list: the desktop just past the frame edges, defocused
const K_FLY = 1.35; // after the fly-through
const K_NOTCH = 4; // tight on the notch
const K_PANEL = 1.62; // the browser panel framed

// ── Painted wallpaper ───────────────────────────────────────────────────────────────────────────────
// An impressionist garden built from ~110k seeded brush strokes (H-units, 16:9). Cached as a bitmap for
// wide shots; drawn live when the camera is tight so the strokes stay crisp.
const ASPECT = 16 / 9;
const PAL = [
  "#1B2B18", "#26391F", "#324A27", "#3F5A2E", "#4D6A34", "#5E7A3A", "#718A40", "#869846", "#9CA34E", "#B0AC58", // 0-9 greens → ochre
  "#3E5F55", "#5C7F73", // 10-11 blue-greens
  "#C9D3CF", "#E3E0CC", "#F0EDE0", // 12-14 light
  "#E58A9B", "#F3B6C1", "#C2414F", "#9E2F3E", "#8B5DA6", "#B590C6", "#F4EEE6", "#E6894A", "#F0D35A", // 15-23 flowers
  "#B8432F", "#8C3B2E", "#E9A23B", "#6E4A8E", "#C9708A", // 24-28 rust, brown-red, gold, violet, rose
];
const PAL_HI = PAL.map((col) => mix(col, "#FFF8E8", 0.28));
const FLOWERS = [[15, 28, 21], [24, 22, 25], [27, 19, 20], [25, 17, 18], [21, 16, 20], [28, 16, 24], [26, 24, 15]];
const hash2 = (ix: number, iy: number, s: number) => rand(ix * 7349 + iy * 91813 + s * 1337);
function vnoise(x: number, y: number, s: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), cc = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
  return a + (b - a) * ux + (cc - a) * uy + (a - b - cc + d) * ux * uy;
}
const fbm = (x: number, y: number, s: number) => vnoise(x, y, s) * 0.6 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.1;

let STROKES: Float32Array | null = null; // x, y, rx, ry, rot, colour
function strokes() {
  if (STROKES) return STROKES;
  const N = 110000;
  const S = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) {
    const r = (k: number) => rand(i * 9 + k + 17);
    const x = r(0) * ASPECT, y = r(1);
    const L = (0.004 + Math.pow(r(2), 1.6) * 0.017) * (0.8 + y * 0.6);
    const fl = fbm(x * 2.2, y * 2.2, 3);
    const band = y < 0.2 ? 0.9 : y < 0.62 ? 1 : 0.5;
    let col: number;
    if (y < 0.2 && r(3) < 0.06 * (1 - y / 0.2)) col = 12 + Math.floor(r(4) * 3);
    else if (r(3) < clamp((fl - 0.47) * 3.2, 0, 0.85) * band) {
      const set = FLOWERS[Math.floor(fbm(x * 1.3, y * 1.3, 31) * 9) % FLOWERS.length];
      col = set[Math.floor(r(4) * set.length)];
    } else if (y < 0.3 && r(4) < 0.2) col = 10 + Math.floor(r(5) * 2);
    else {
      const g = clamp(0.1 + y * 0.62 + (fbm(x * 3, y * 3, 9) - 0.5) * 0.9 + (r(5) - 0.5) * 0.4, 0, 0.92);
      col = Math.floor(g * 10);
    }
    const flow = (fbm(x * 1.5, y * 1.5, 21) - 0.5) * 3 * (y > 0.6 ? 0.4 : 1);
    S.set([x, y, L / 2, (L / 2) * (0.32 + r(6) * 0.2), flow + (r(7) - 0.5) * 0.9, col], i * 6);
  }
  STROKES = S;
  return S;
}

type G2 = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
function underpaint(g: G2, ppu: number) {
  const gr = g.createLinearGradient(0, 0, 0, ppu);
  [[0, "#2E4527"], [0.35, "#4F6B37"], [0.65, "#7E9446"], [1, "#6A8A3D"]].forEach(([o, col]) => gr.addColorStop(o as number, col as string));
  g.fillStyle = gr;
  g.fillRect(0, 0, ASPECT * ppu, ppu);
}
function paintStrokes(g: G2, scale: number, ox: number, box?: [number, number, number, number]) {
  const S = strokes();
  let last = -1;
  for (let i = 0; i < S.length; i += 6) {
    const x = S[i], y = S[i + 1], rx = S[i + 2];
    if (box && (x + rx < box[0] || x - rx > box[2] || y + rx < box[1] || y - rx > box[3])) continue;
    const col = S[i + 5];
    if (col !== last) {
      g.fillStyle = PAL[col];
      last = col;
    }
    const px = (x - ox) * scale, py = y * scale, ry = S[i + 3], rot = S[i + 4];
    g.beginPath();
    g.ellipse(px, py, rx * scale, ry * scale, rot, 0, Math.PI * 2);
    g.fill();
    // the loaded edge of the brush: a lighter sliver along one side
    g.fillStyle = PAL_HI[col];
    last = -1;
    g.beginPath();
    g.ellipse(px - Math.sin(rot) * ry * scale * 0.4, py + Math.cos(rot) * ry * scale * 0.4, rx * scale * 0.7, ry * scale * 0.38, rot, 0, Math.PI * 2);
    g.fill();
  }
}
const paintCache = new Map<string, AnyCanvas>();
function painting(ppu: number, soft = false): AnyCanvas {
  const key = `${ppu}:${soft}`;
  const hit = paintCache.get(key);
  if (hit) return hit;
  const w = Math.ceil(ASPECT * ppu), h = Math.ceil(ppu);
  const cv = createCanvas(w, h);
  const g = get2d(cv) as G2;
  if (soft) {
    g.fillStyle = "#5E7838";
    g.fillRect(0, 0, w, h);
    g.filter = `blur(${Math.round(ppu * 0.022)}px)`;
    g.drawImage(painting(1024) as CanvasImageSource, 0, 0, w, h);
    g.filter = "none";
  } else {
    underpaint(g, ppu);
    paintStrokes(g, ppu, 0);
  }
  paintCache.set(key, cv);
  return cv;
}

/** The wallpaper under camera `cam`, with `blur` 0..1 (a focus pull). A media wallpaper replaces the painting. */
function wallpaper(c: RC, cam: Cam, ref: string | null, blur = 0) {
  const H = c.H, ox = (ASPECT - c.W / c.H) / 2;
  if (ref) {
    if (blur < 0.999) view(c, cam, () => c.media(ref, 0, 0, c.W, c.H, { fit: "cover" }));
    if (blur > 0.001) {
      const L = c.layer(c.W, c.H, (lc) => view(lc, cam, () => lc.media(ref, 0, 0, c.W, c.H, { fit: "cover" })), { res: 0.25 });
      c.drawLayer(L, 0, 0, { blur: c.H * 0.022, alpha: blur });
    }
    return;
  }
  const ppu = clamp(Math.round((H * c.deviceScale * 1.5) / 64) * 64, 256, 2048);
  if (blur < 0.999) {
    view(c, cam, () => c.ctx.drawImage(painting(ppu) as CanvasImageSource, -ox * H, 0, ASPECT * H, H));
    const live = pr(cam.k, 1.75, 2.1);
    if (live > 0) {
      const hw = c.cx / cam.k / H, hh = c.cy / cam.k / H;
      const bx = cam.x / H + ox, by = cam.y / H;
      view(c, cam, () => {
        c.ctx.globalAlpha *= live;
        paintStrokes(c.ctx as G2, H, ox, [bx - hw - 0.02, by - hh - 0.02, bx + hw + 0.02, by + hh + 0.02]);
      });
    }
  }
  if (blur > 0.001) view(c, cam, () => {
    c.ctx.globalAlpha *= blur;
    c.ctx.drawImage(painting(240, true) as CanvasImageSource, -ox * H, 0, ASPECT * H, H);
  });
}

// ── Desktop chrome: menu bar, notch, dock, icons ────────────────────────────────────────────────────
const ICONS = ["finder", "orange", "mono", "slash", "tracker", "browser", "green", "team", "terminal", "mail", "notes", "doc", "messages", "photos", "settings", "calendar", "music", "trash"] as const;
type Icon = (typeof ICONS)[number];

/** Generic app icons (stylised marks, not brand logos): rounded square with a simple glyph. */
function appIcon(c: RC, kind: string, x: number, y: number, s: number) {
  const r = s * 0.225, m = x + s / 2, n = y + s / 2;
  const sq = (fill: string | CanvasGradient) => c.rrect(x, y, s, s, r, fill);
  const g2 = (a: string, b: string) => c.linear(x, y, x, y + s, [[0, a], [1, b]]);
  const w = Math.max(1, s * 0.07);
  switch (kind as Icon) {
    case "finder":
      sq("#8FD3FF");
      c.save(); c.clipRRect(x, y, s, s, r); c.rect(x, y, s * 0.5, s, "#1E9BF0"); c.restore();
      c.line(m - s * 0.18, n - s * 0.12, m - s * 0.18, n - s * 0.02, "#10233A", w);
      c.line(m + s * 0.18, n - s * 0.12, m + s * 0.18, n - s * 0.02, "#10233A", w);
      c.arc(m, n - s * 0.05, s * 0.26, 0.38, 0.62, "#10233A", w);
      break;
    case "orange":
      sq("#D97757");
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI; c.line(m - Math.cos(a) * s * 0.27, n - Math.sin(a) * s * 0.27, m + Math.cos(a) * s * 0.27, n + Math.sin(a) * s * 0.27, "#FFF6EE", w * 1.1); }
      break;
    case "mono":
      sq("#FFFFFF");
      c.arc(m, n, s * 0.24, 0, 1, "#0D0D0D", w);
      c.arc(m, n, s * 0.1, 0, 1, "#0D0D0D", w);
      break;
    case "slash":
      sq("#0A0A0A");
      c.arc(m, n, s * 0.24, 0.1, 0.85, "#FFFFFF", w);
      c.line(m - s * 0.22, n + s * 0.24, m + s * 0.24, n - s * 0.24, "#FFFFFF", w);
      break;
    case "tracker":
      sq(g2("#7A85F0", "#4B55C4"));
      c.save(); c.clipCircle(m, n, s * 0.27);
      c.circle(m, n, s * 0.27, "#FFFFFF");
      for (let i = -2; i <= 2; i++) c.line(m + i * s * 0.12 - s * 0.3, n + s * 0.3, m + i * s * 0.12 + s * 0.3, n - s * 0.3, "#5E6AD2", w * 0.8);
      c.restore();
      break;
    case "browser":
      sq(g2("#4FA3FF", "#1D6EE8"));
      c.circle(m, n, s * 0.27, "#FFFFFF");
      c.arc(m, n, s * 0.2, 0, 1, "#1D6EE8", w * 0.7);
      c.line(m - s * 0.2, n, m + s * 0.2, n, "#1D6EE8", w * 0.7);
      c.line(m, n - s * 0.2, m, n + s * 0.2, "#1D6EE8", w * 0.7);
      break;
    case "green":
      sq("#121212");
      c.circle(m, n, s * 0.3, "#1ED760");
      [0.11, 0.0, -0.1].forEach((dy, i) => c.arc(m, n + s * 0.28 + dy * s, s * (0.3 - i * 0.05), 0.85, 1.15, "#121212", w * (1 - i * 0.15)));
      break;
    case "team":
      sq("#FFFFFF");
      ["#36C5F0", "#2EB67D", "#ECB22E", "#E01E5A"].forEach((col, i) => {
        const a = (i / 4) * Math.PI * 2;
        c.with({ x: m, y: n, rotate: (a * 180) / Math.PI }, () => c.rrect(-s * 0.06, -s * 0.3, s * 0.12, s * 0.26, s * 0.06, col));
      });
      break;
    case "terminal":
      sq(g2("#3A3A3C", "#1C1C1E"));
      c.polyline([[x + s * 0.24, y + s * 0.34], [x + s * 0.38, y + s * 0.46], [x + s * 0.24, y + s * 0.58]], "#E8E8E8", w);
      c.line(x + s * 0.44, y + s * 0.6, x + s * 0.68, y + s * 0.6, "#E8E8E8", w);
      break;
    case "mail":
      sq(g2("#5AC8FA", "#1A7CF5"));
      c.rrect(m - s * 0.28, n - s * 0.18, s * 0.56, s * 0.36, s * 0.04, "#FFFFFF");
      c.polyline([[m - s * 0.26, n - s * 0.16], [m, n + s * 0.04], [m + s * 0.26, n - s * 0.16]], "#1A7CF5", w * 0.7);
      break;
    case "notes":
      sq("#FFFFFF");
      c.save(); c.clipRRect(x, y, s, s, r); c.rect(x, y, s, s * 0.26, "#FFD43B"); c.restore();
      for (let i = 0; i < 3; i++) c.line(x + s * 0.2, y + s * (0.45 + i * 0.14), x + s * 0.8, y + s * (0.45 + i * 0.14), "#D4D4D4", w * 0.5);
      break;
    case "doc":
      sq("#FFFFFF");
      c.strokeRRect(x + s * 0.24, y + s * 0.2, s * 0.52, s * 0.6, s * 0.05, "#111111", w * 0.8);
      c.polyline([[x + s * 0.36, y + s * 0.66], [x + s * 0.36, y + s * 0.34], [x + s * 0.64, y + s * 0.66], [x + s * 0.64, y + s * 0.34]], "#111111", w * 0.8);
      break;
    case "messages":
      sq(g2("#67E36F", "#2DBE3C"));
      c.with({ x: m, y: n - s * 0.02, sy: 0.8 }, () => c.circle(0, 0, s * 0.3, "#FFFFFF"));
      c.poly([[m - s * 0.2, n + s * 0.14], [m - s * 0.26, n + s * 0.28], [m - s * 0.06, n + s * 0.2]], "#FFFFFF");
      break;
    case "photos":
      sq("#FFFFFF");
      ["#F9C846", "#F28C38", "#E5484D", "#B45AC9", "#4C7DF0", "#3DB8E0", "#5BC35B", "#A6D84E"].forEach((col, i) => {
        const a = (i / 8) * Math.PI * 2;
        c.with({ x: m + Math.cos(a) * s * 0.13, y: n + Math.sin(a) * s * 0.13, rotate: (a * 180) / Math.PI, alpha: 0.85 }, () => c.rrect(-s * 0.13, -s * 0.07, s * 0.26, s * 0.14, s * 0.07, col));
      });
      break;
    case "settings":
      sq(g2("#B8B8BD", "#8A8A90"));
      c.arc(m, n, s * 0.24, 0, 1, "#3A3A3C", w * 1.6);
      c.circle(m, n, s * 0.09, "#3A3A3C");
      break;
    case "calendar":
      sq("#FFFFFF");
      c.save(); c.clipRRect(x, y, s, s, r); c.rect(x, y, s, s * 0.26, "#FF3B30"); c.restore();
      c.text("24", m, n + s * 0.12, { font: "inter", size: s * 0.38, weight: 500, align: "center", valign: "middle" }, { color: "#1C1C1E" });
      break;
    case "music":
      sq(g2("#FF6B81", "#FA233B"));
      c.line(m + s * 0.12, n - s * 0.24, m + s * 0.12, n + s * 0.14, "#FFFFFF", w);
      c.line(m + s * 0.12, n - s * 0.24, m - s * 0.12, n - s * 0.18, "#FFFFFF", w);
      c.circle(m + s * 0.04, n + s * 0.16, s * 0.09, "#FFFFFF");
      break;
    case "trash":
      sq(alpha("#FFFFFF", 0.35));
      c.strokeRRect(m - s * 0.2, n - s * 0.22, s * 0.4, s * 0.48, s * 0.04, "#F2F2F2", w * 0.6);
      for (let i = -1; i <= 1; i++) c.line(m + i * s * 0.09, n - s * 0.14, m + i * s * 0.09, n + s * 0.18, "#F2F2F2", w * 0.5);
      break;
    default:
      sq("#888888");
  }
}

function menuBar(c: RC, a = 1) {
  if (a <= 0) return;
  const h = c.H * 0.026, sz = h * 0.48;
  c.save();
  c.alpha(a);
  c.rect(0, 0, c.W, h, alpha("#FFFFFF", 0.14));
  c.circle(c.W * 0.016, h / 2, sz * 0.42, INK);
  let x = c.W * 0.03;
  ["Finder", "File", "Edit", "View", "Go", "Window", "Help"].forEach((s, i) => {
    const L = c.layout(s, sans(sz, i ? 500 : 700));
    c.drawLayout(L, x, h / 2 - L.cap / 2 - (L.lines[0].y - L.cap), { color: INK });
    x += L.width + sz * 1.5;
  });
  const T = c.layout("Thu 24 Sep  12:36 PM", sans(sz, 500));
  c.drawLayout(T, c.W - c.W * 0.012 - T.width, h / 2 - T.cap / 2 - (T.lines[0].y - T.cap), { color: INK });
  for (let i = 0; i < 5; i++) c.rrect(c.W - c.W * 0.012 - T.width - sz * (2.4 + i * 1.9), h / 2 - sz * 0.4, sz * 1.1, sz * 0.8, sz * 0.2, alpha(INK, 0.85));
  c.restore();
}

/** The notch at rest, in world units. */
const notchBox = (c: RC): Box => ({ x: c.cx - c.H * 0.085, y: -c.H * 0.01, w: c.H * 0.17, h: c.H * 0.04, r: c.H * 0.011 });
const pillBox = (c: RC): Box => ({ x: c.cx - c.H * 0.155, y: -c.H * 0.01, w: c.H * 0.31, h: c.H * 0.062, r: c.H * 0.026 });
const panelBox = (c: RC): Box => ({ x: c.cx - c.H * 0.36, y: -c.H * 0.004, w: c.H * 0.72, h: c.H * 0.585, r: c.H * 0.026 });
function drawNotch(c: RC, b: Box) {
  const top = Math.min(b.r, c.H * 0.008);
  c.rrect(b.x, b.y, b.w, b.h, [top, top, b.r, b.r], "#000000");
}

function dock(c: RC, a = 1) {
  if (a <= 0) return;
  const s = c.H * 0.04, gap = s * 0.2, n = ICONS.length;
  const w = n * s + (n + 1) * gap + gap, h = s + gap * 2;
  const x = c.cx - w / 2, y = c.H * 0.988 - h;
  c.save();
  c.alpha(a);
  c.rrect(x, y, w, h, h * 0.3, alpha("#FFFFFF", 0.26));
  c.strokeRRect(x, y, w, h, h * 0.3, alpha("#FFFFFF", 0.35), 1);
  ICONS.forEach((k, i) => appIcon(c, k, x + gap + i * (s + gap) + (i === n - 1 ? gap : 0), y + gap, s));
  c.restore();
}

/** Oversized macOS cursor in screen space. */
const cursor = (c: RC, x: number, y: number, press = 0, a = 1) => {
  if (a <= 0) return;
  c.with({ alpha: a }, () => drawCursor(c, x, y, { scale: c.H * 0.0017, press }));
};
const press = (t: number, clicks: number[]) => clicks.reduce((m, at) => Math.max(m, pr(t, at - 0.05, at) * (1 - pr(t, at + 0.05, at + 0.16))), 0);

// ── 1. Hook line with the colorama wipe ─────────────────────────────────────────────────────────────
const HEAD = { x: 0.2, y: 0.35, k: 0.44 }; // the line's resting place above the list (frame fractions, scale)
function headerLayout(c: RC, text: string) {
  return c.fit(text, sans(c.H * 0.1, 600), c.W * 0.86, c.H * 0.22);
}
function headerPlace(c: RC, L: ReturnType<RC["layout"]>, u: number) {
  const e = E.inOut(u);
  const base = L.lines[0]?.y ?? L.size;
  const left = lerp(c.cx - L.width / 2, c.W * HEAD.x, e);
  const baseline = lerp(c.cy + L.cap / 2, c.H * HEAD.y, e);
  const k = logLerp(1, HEAD.k, e);
  return { left, top: baseline - base * k, k };
}

const hook = defineComponent<{ line: string; wallpaper: string | null }>({
  version: "1.0.0", group: "kits", category: "kit-notch-browser", added: "2026-10-04", formats: ["landscape"], theme: LOOK, camera: "still",
  id: "notch-hook-wipe", name: "Hook Line · Colorama Wipe",
  description: "A big centred lowercase line enters word by word from the right while an orange colorama band wipes over it; it holds about a second, then scales down into place above the list.",
  tags: ["hook", "text", "wipe", "colorama", "word by word"],
  params: { line: P.text("in the AI era, the hard part is", "Line", { maxLength: 60 }), ...P_WALL },
  duration: 2.25,
  render(c, p) {
    const t = c.t;
    wallpaper(c, camAt(c, K_TEXT), p.wallpaper, 1);
    const L = headerLayout(c, p.line);
    const pl = headerPlace(c, L, pr(t, 1.55, 2.2));
    const n = L.words.length;
    const wipe = pr(t, 0.45, 1.45, E.inOut);
    const entering = t < 0.35 + n * 0.09 + 0.7;
    if (!entering && (wipe <= 0 || wipe >= 1)) {
      c.with({ x: pl.left, y: pl.top, scale: pl.k }, () => c.drawLayout(L, 0, 0, { color: INK }));
      return;
    }
    const Lr = c.layer(c.W, c.H, (lc) => {
      L.words.forEach((w, i) => {
        const u = pr(t, 0.3 + i * 0.09, 0.3 + i * 0.09 + 0.7, E.out);
        wordFx(lc, w, pl.left, pl.top, { dx: (1 - u) * c.W * 0.07, alpha: pr(u, 0, 0.45), blur: (1 - u) * c.H * 0.012, color: INK });
      });
      if (wipe > 0 && wipe < 1) {
        const bw = Math.max(c.W * 0.18, L.width * 0.35);
        const bx = lerp(pl.left - bw * 0.6, pl.left + L.width + bw, wipe);
        const g = lc.ctx;
        g.save();
        g.globalCompositeOperation = "source-atop";
        g.fillStyle = lc.linear(bx - bw, 0, bx + bw * 0.25, 0, [[0, "rgba(255,122,0,0)"], [0.3, "#FF7A00"], [0.55, "#FFB547"], [0.78, "#FF5A36"], [1, "rgba(255,90,54,0)"]]);
        g.fillRect(0, 0, c.W, c.H);
        g.restore();
      }
    });
    c.drawLayer(Lr, 0, 0);
  },
});

// ── 2. Spinning list landing on the line ────────────────────────────────────────────────────────────
const HARD = [
  "spending tokens wisely|orange", "picking the right model|mono", "writing the perfect prompt|terminal", "managing context windows|tracker",
  "evaluating outputs|messages", "trusting the output|tracker", "shipping before friday|calendar", "reviewing ai code|browser",
  "naming your agents|notes", "keeping up with releases|slash", "choosing a framework|doc", "reading the docs|notes",
  "debugging hallucinations|orange", "writing evals|terminal", "caching prompts|settings", "routing between models|mono",
  "staying in flow|green", "finding the right tab|browser", "explaining it to your boss|mail", "budgeting api spend|calendar",
  "keeping secrets out of logs|settings", "merging agent branches|terminal", "testing edge cases|doc", "staying focused|music",
  "sorting your downloads|finder", "answering every ping|team", "knowing when to stop|slash", "switching between apps|music",
  "finding that one chat|messages", "managing your desktop|finder",
];

const list = defineComponent<{ line: string; items: string[]; land: number; wallpaper: string | null }>({
  version: "1.0.0", group: "kits", category: "kit-notch-browser", added: "2026-10-04", formats: ["landscape"], theme: LOOK, camera: "still",
  id: "notch-spin-list", name: "Spinning List · Lands With a Question",
  description: "Under the settled line, a drum of 30 'hard things', each with an app icon, spins too fast to read (motion-blurred), slows and lands on the last one; 0.2 s later a question mark pops on.",
  tags: ["list", "wheel", "slot", "spin", "icons", "question"],
  params: {
    line: P.text("in the AI era, the hard part is", "Line", { maxLength: 60 }),
    items: P.list(HARD, "Items (text|icon), last one lands", { min: 3, max: 40 }),
    land: P.number(2.7, "Lands at", { min: 1, max: 5, step: 0.1, unit: "s" }),
    ...P_WALL,
  },
  duration: (p) => p.land + 1.3,
  render(c, p) {
    const t = c.t;
    wallpaper(c, camAt(c, K_TEXT), p.wallpaper, 1);
    const L = headerLayout(c, p.line);
    const pl = headerPlace(c, L, 1);
    c.with({ x: pl.left, y: pl.top, scale: pl.k }, () => c.drawLayout(L, 0, 0, { color: INK }));

    const items = p.items.map((s) => { const [text, icon] = s.split("|"); return { text: (text ?? "").trim(), icon: (icon ?? "finder").trim() }; });
    const last = items.length - 1;
    const pos = (tt: number) => last * (1 - Math.pow(1 - clamp(tt / p.land), 3.2)) - 1.2 * (1 - pr(tt, 0, 0.35, E.out));
    const at = pos(t), vel = (pos(t + 1 / 120) - pos(t - 1 / 120)) * 60;
    const size = c.H * 0.086;
    const widest = Math.max(...items.map((it) => c.layout(it.text + "?", sans(size, 600)).width));
    const k = Math.min(1, (c.W * 0.74 - size * 1.3) / widest);
    const fs = size * k, ic = fs * 0.82, x0 = c.W * HEAD.x;
    const fy = c.H * 0.555, R = c.H * 0.26;
    const landed = pr(t, p.land - 0.25, p.land + 0.15);
    const appear = pr(t, 0, 0.3);

    const Lr = c.layer(c.W, c.H, (lc) => {
      for (let i = Math.max(0, Math.floor(at) - 3); i <= Math.min(last, Math.ceil(at) + 3); i++) {
        const d = i - at;
        const ang = clamp(d * 0.42, -1.5, 1.5);
        const y = fy + Math.sin(ang) * R;
        const sy = Math.cos(ang);
        let a = Math.pow(Math.max(0, sy), 2) * (Math.abs(d) < 0.5 ? 1 : 0.55) * appear;
        if (d < 0) a *= clamp(1 + d * 1.4);
        if (i !== last) a *= 1 - landed;
        if (a <= 0.01) continue;
        const T = lc.layout(items[i].text, sans(fs, 600));
        lc.with({ x: x0, y, sy, alpha: a }, () => {
          appIcon(lc, items[i].icon, 0, -ic / 2, ic);
          lc.drawLayout(T, ic * 1.35, -T.cap / 2 - (T.lines[0].y - T.cap), { color: INK });
          if (i === last) {
            const q = spring(t - p.land - 0.2, SPRING.pop);
            if (q > 0.01) {
              const Q = lc.layout("?", sans(fs, 600));
              const qx = ic * 1.35 + T.width + fs * 0.02;
              lc.with({ x: qx + Q.width / 2, y: 0, scale: 0.4 + 0.6 * q, alpha: pr(t, p.land + 0.2, p.land + 0.28) }, () => lc.drawLayout(Q, -Q.width / 2, -Q.cap / 2 - (Q.lines[0].y - Q.cap), { color: INK }));
            }
          }
        });
      }
    });
    const smear = Math.abs(vel) * 0.42 * R * (0.5 / 60);
    c.drawLayer(smear > 1.5 ? c.smearLayer(Lr, 0, Math.min(smear, c.H * 0.08)) : Lr, 0, 0);
  },
});

// ── 3. Windows pile in from behind the camera ───────────────────────────────────────────────────────
interface Win {
  title: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
const APPS = ["Chrome|browser", "Linear|tracker", "Grok|grok", "ChatGPT|chat-dark", "Slack|team", "Spotify|player", "Claude Code|terminal", "Claude|chat-light"];
const SPOTS: [number, number, number, number][] = [
  [0.012, 0.05, 0.37, 0.56], [0.585, 0.17, 0.405, 0.64], [0.6, 0.045, 0.33, 0.42], [0.17, 0.08, 0.35, 0.66],
  [0.0, 0.43, 0.3, 0.5], [0.53, 0.6, 0.42, 0.34], [0.36, 0.5, 0.33, 0.42], [0.33, 0.15, 0.36, 0.64],
];
function windows(c: RC, apps: string[]): Win[] {
  return apps.slice(0, SPOTS.length).map((s, i) => {
    const [title, kind] = s.split("|");
    const [x, y, w, h] = SPOTS[i];
    return { title: (title ?? "").trim(), kind: (kind ?? "chat-dark").trim(), x: x * c.W, y: y * c.H, w: w * c.W, h: h * c.H };
  });
}

/** Text-like bars: `n` rows from (x, y), each a seeded width of `w`. */
function bars(c: RC, x: number, y: number, w: number, n: number, lh: number, col: string, seed: number, th = lh * 0.42) {
  for (let i = 0; i < n; i++) {
    const ww = w * (i === n - 1 ? 0.35 + rand(seed + i) * 0.3 : 0.72 + rand(seed + i) * 0.28);
    c.rrect(x, y + i * lh, ww, th, th / 2, col);
  }
}
function ellipsize(c: RC, s: string, style: Parameters<RC["layout"]>[1], maxW: number) {
  const L = c.layout(s, style);
  if (L.width <= maxW) return L;
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (c.layout(s.slice(0, mid).trimEnd() + "…", style).width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return c.layout(s.slice(0, lo).trimEnd() + "…", style);
}
function tiny(c: RC, s: string, x: number, y: number, size: number, col: string, weight = 500) {
  const L = c.layout(s, { font: "inter", size, weight, tracking: 0 });
  c.drawLayout(L, x, y - L.lines[0].y + L.cap, { color: col });
  return L.width;
}
function lights(c: RC, x: number, y: number, s: number) {
  ["#FF5F57", "#FEBC2E", "#28C840"].forEach((col, i) => c.circle(x + i * s * 1.7, y, s * 0.6, col));
}

/** One app window, recreated as a layout (sidebar, rows, bubbles) in world units. */
function drawWindow(c: RC, wn: Win) {
  const { x, y, w, h } = wn;
  const r = c.H * 0.01, u = c.H * 0.01;
  c.cardShadow(x, y, w, h, r, 0.6, 1.4, "#000000");
  c.save();
  c.clipRRect(x, y, w, h, r);
  const side = (col: string, fr = 0.2) => c.rect(x, y, w * fr, h, col);
  switch (wn.kind) {
    case "chat-light": {
      c.rect(x, y, w, h, "#FAF9F5");
      side("#F0EEE6", 0.18);
      bars(c, x + w * 0.02, y + u * 5, w * 0.13, 9, u * 2.2, alpha("#3D3D3A", 0.25), 11);
      c.rrect(x + w * 0.5, y + u * 4, w * 0.44, u * 5.2, u * 1.4, "#EDEAE0");
      bars(c, x + w * 0.52, y + u * 5.2, w * 0.4, 2, u * 1.8, alpha("#3D3D3A", 0.5), 12);
      bars(c, x + w * 0.24, y + u * 12, w * 0.66, 5, u * 1.9, alpha("#3D3D3A", 0.55), 13);
      for (let i = 0; i < 3; i++) {
        tiny(c, `${i + 1}.`, x + w * 0.24, y + u * (23 + i * 6), u * 1.2, "#3D3D3A", 700);
        bars(c, x + w * 0.27, y + u * (23 + i * 6), w * 0.6, 2, u * 1.9, alpha("#3D3D3A", 0.5), 20 + i);
      }
      c.rrect(x + w * 0.24, y + h - u * 9, w * 0.66, u * 6.4, u * 1.6, "#FFFFFF");
      c.strokeRRect(x + w * 0.24, y + h - u * 9, w * 0.66, u * 6.4, u * 1.6, alpha("#3D3D3A", 0.15), 1);
      tiny(c, "Reply to Claude…", x + w * 0.26, y + h - u * 7.6, u * 1.2, alpha("#3D3D3A", 0.45));
      c.circle(x + w * 0.86, y + h - u * 4.6, u * 1.3, "#D97757");
      break;
    }
    case "chat-dark": {
      c.rect(x, y, w, h, "#212121");
      side("#171717", 0.22);
      bars(c, x + w * 0.025, y + u * 5, w * 0.17, 14, u * 2.3, alpha("#ECECEC", 0.22), 31);
      c.rrect(x + w * 0.56, y + u * 5, w * 0.38, u * 4.6, u * 2.3, "#303030");
      bars(c, x + w * 0.58, y + u * 6.2, w * 0.34, 2, u * 1.6, alpha("#ECECEC", 0.5), 32);
      bars(c, x + w * 0.27, y + u * 13, w * 0.64, 6, u * 2, alpha("#ECECEC", 0.42), 33);
      bars(c, x + w * 0.27, y + u * 27, w * 0.6, 5, u * 2, alpha("#ECECEC", 0.42), 34);
      c.rrect(x + w * 0.3, y + h - u * 8.5, w * 0.6, u * 5.6, u * 2.8, "#303030");
      tiny(c, "Ask anything", x + w * 0.33, y + h - u * 6.6, u * 1.2, alpha("#ECECEC", 0.45));
      c.circle(x + w * 0.865, y + h - u * 5.7, u * 1.6, "#ECECEC");
      break;
    }
    case "grok": {
      c.rect(x, y, w, h, "#0A0A0A");
      bars(c, x + w * 0.12, y + u * 6, w * 0.76, 4, u * 2, alpha("#FFFFFF", 0.4), 41);
      c.rrect(x + w * 0.52, y + u * 15, w * 0.36, u * 4, u * 2, "#1F1F1F");
      bars(c, x + w * 0.12, y + u * 22, w * 0.7, 4, u * 2, alpha("#FFFFFF", 0.32), 42);
      c.rrect(x + w * 0.1, y + h - u * 8, w * 0.8, u * 5.2, u * 2.6, "#1A1A1A");
      c.strokeRRect(x + w * 0.1, y + h - u * 8, w * 0.8, u * 5.2, u * 2.6, alpha("#FFFFFF", 0.12), 1);
      tiny(c, "What do you want to know?", x + w * 0.13, y + h - u * 6.2, u * 1.15, alpha("#FFFFFF", 0.4));
      break;
    }
    case "tracker": {
      c.rect(x, y, w, h, "#101113");
      side("#0A0A0B", 0.2);
      bars(c, x + w * 0.025, y + u * 5, w * 0.14, 12, u * 2.4, alpha("#E6E6E6", 0.22), 51);
      tiny(c, "Engineering · Active issues", x + w * 0.23, y + u * 3, u * 1.2, alpha("#E6E6E6", 0.8), 600);
      for (let i = 0; i < 13; i++) {
        const ry = y + u * (7 + i * 3.6);
        c.rect(x + w * 0.21, ry + u * 3.1, w * 0.78, 1, alpha("#FFFFFF", 0.05));
        c.arc(x + w * 0.235, ry + u * 1.4, u * 0.75, 0, rand(i + 50) > 0.5 ? 1 : 0.5, ["#E2B93B", "#5E6AD2", "#4CB782", "#8A8F98"][i % 4], u * 0.28);
        tiny(c, `ENG-${410 + i * 7}`, x + w * 0.26, ry + u * 0.7, u * 1.05, alpha("#E6E6E6", 0.45));
        bars(c, x + w * 0.34, ry + u * 0.9, w * 0.38, 1, u, alpha("#E6E6E6", 0.6), 60 + i, u * 0.9);
        c.circle(x + w * 0.8, ry + u * 1.4, u * 0.45, ["#E5484D", "#5E6AD2", "#4CB782"][i % 3]);
        c.circle(x + w * 0.95, ry + u * 1.4, u * 0.8, alpha("#FFFFFF", 0.25));
      }
      break;
    }
    case "browser": {
      c.rect(x, y, w, h, "#FFFFFF");
      c.rect(x, y, w, u * 5.2, "#DEE1E6");
      lights(c, x + u * 1.6, y + u * 1.7, u * 0.75);
      for (let i = 0; i < 3; i++) c.rrect(x + w * (0.12 + i * 0.17), y + u * 0.8, w * 0.16, u * 2.2, u * 0.6, i === 0 ? "#FFFFFF" : alpha("#FFFFFF", 0.4));
      c.rrect(x + w * 0.08, y + u * 3.3, w * 0.86, u * 1.6, u * 0.8, "#F1F3F4");
      tiny(c, "github.com/acme-ai/agent-runtime/pull/482", x + w * 0.1, y + u * 3.45, u * 1.0, "#5F6368");
      tiny(c, "Reduce context window usage in agent loop #482", x + w * 0.03, y + u * 8, u * 1.9, "#1F2328", 600);
      c.rrect(x + w * 0.03, y + u * 11.4, u * 5.2, u * 2, u, "#1F883D");
      tiny(c, "Open", x + w * 0.03 + u * 1.2, y + u * 11.75, u * 1.0, "#FFFFFF", 600);
      for (let i = 0; i < 3; i++) {
        const by = y + u * (16 + i * 11);
        c.strokeRRect(x + w * 0.07, by, w * 0.6, u * 9, u * 0.6, "#D0D7DE", 1);
        c.rect(x + w * 0.07, by, w * 0.6, u * 2.2, "#F6F8FA");
        bars(c, x + w * 0.09, by + u * 3.4, w * 0.54, 3, u * 1.7, alpha("#1F2328", 0.35), 70 + i);
        c.circle(x + w * 0.04, by + u * 1.2, u * 1.2, ["#B392F0", "#79C0FF", "#FFA657"][i]);
      }
      bars(c, x + w * 0.72, y + u * 16, w * 0.24, 8, u * 2.2, alpha("#1F2328", 0.22), 79);
      break;
    }
    case "team": {
      c.rect(x, y, w, h, "#FFFFFF");
      side("#3F0E40", 0.26);
      lights(c, x + u * 1.6, y + u * 1.7, u * 0.75);
      tiny(c, "Acme", x + w * 0.025, y + u * 4.2, u * 1.4, "#FFFFFF", 700);
      ["threads", "huddles", "drafts & sent", "# general", "# agents", "# launch", "# design", "# random"].forEach((s, i) => {
        const ry = y + u * (8 + i * 2.6);
        if (i === 4) c.rect(x, ry - u * 0.5, w * 0.26, u * 2.4, "#1164A3");
        tiny(c, s, x + w * 0.03, ry, u * 1.1, alpha("#FFFFFF", i === 4 ? 1 : 0.7));
      });
      tiny(c, "# agents", x + w * 0.29, y + u * 1.6, u * 1.3, "#1D1C1D", 700);
      for (let i = 0; i < 6; i++) {
        const ry = y + u * (6 + i * 5.6);
        c.rrect(x + w * 0.29, ry, u * 2.8, u * 2.8, u * 0.6, ["#E8912D", "#2EB67D", "#36C5F0", "#E01E5A"][i % 4]);
        bars(c, x + w * 0.29 + u * 3.8, ry, w * 0.18, 1, u, alpha("#1D1C1D", 0.8), 80 + i, u * 0.9);
        bars(c, x + w * 0.29 + u * 3.8, ry + u * 1.6, w * 0.6, 2, u * 1.5, alpha("#1D1C1D", 0.35), 90 + i, u * 0.7);
      }
      c.strokeRRect(x + w * 0.29, y + h - u * 6.4, w * 0.68, u * 5, u * 0.8, alpha("#1D1C1D", 0.3), 1);
      break;
    }
    case "player": {
      c.rect(x, y, w, h, "#121212");
      c.rrect(x + w * 0.01, y + u, w * 0.25, h - u * 9, u * 0.8, "#181818");
      for (let i = 0; i < 6; i++) {
        c.rrect(x + w * 0.025, y + u * (3 + i * 4), u * 3, u * 3, u * 0.4, ["#5B3A8C", "#1E5631", "#8C3A3A", "#2F4F8C", "#8C6D1F", "#3A7A8C"][i]);
        bars(c, x + w * 0.025 + u * 4, y + u * (3.4 + i * 4), w * 0.15, 2, u * 1.2, alpha("#FFFFFF", 0.35), 100 + i, u * 0.6);
      }
      c.save();
      c.clipRRect(x + w * 0.27, y + u, w * 0.72, h - u * 9, u * 0.8);
      c.rect(x + w * 0.27, y + u, w * 0.72, h - u * 9, c.linear(0, y, 0, y + h * 0.6, [[0, "#5A3E86"], [1, "#121212"]]));
      c.restore();
      c.rrect(x + w * 0.3, y + u * 3, u * 11, u * 11, u * 0.6, c.linear(x, y, x + u * 11, y + u * 11, [[0, "#2B1B4A"], [1, "#E08AB5"]]));
      c.circle(x + w * 0.3 + u * 7.5, y + u * 6.5, u * 1.6, "#FFF2C7");
      tiny(c, "Low Orbit", x + w * 0.3 + u * 13, y + u * 8, u * 2.6, "#FFFFFF", 800);
      c.circle(x + w * 0.32, y + u * 18, u * 2.2, "#1ED760");
      c.poly([[x + w * 0.32 - u * 0.6, y + u * 17], [x + w * 0.32 - u * 0.6, y + u * 19], [x + w * 0.32 + u * 1, y + u * 18]], "#000000");
      for (let i = 0; i < 4; i++) bars(c, x + w * 0.3, y + u * (22 + i * 2.6), w * 0.6, 1, u, alpha("#FFFFFF", 0.4), 110 + i, u * 0.8);
      c.rect(x, y + h - u * 7, w, u * 7, "#000000");
      c.rrect(x + u * 1.5, y + h - u * 5.8, u * 4.6, u * 4.6, u * 0.4, "#5B3A8C");
      c.circle(x + w / 2, y + h - u * 4.4, u * 1.6, "#FFFFFF");
      c.rrect(x + w * 0.32, y + h - u * 1.8, w * 0.36, u * 0.4, u * 0.2, alpha("#FFFFFF", 0.3));
      c.rrect(x + w * 0.32, y + h - u * 1.8, w * 0.14, u * 0.4, u * 0.2, "#FFFFFF");
      break;
    }
    case "terminal":
    default: {
      c.rect(x, y, w, h, "#1A1A1A");
      c.rect(x, y, w, u * 2.8, "#2A2A2A");
      lights(c, x + u * 1.6, y + u * 1.4, u * 0.7);
      tiny(c, wn.title, x + w / 2 - u * 4, y + u * 0.75, u * 1.05, alpha("#FFFFFF", 0.55));
      c.strokeRRect(x + w * 0.04, y + u * 4.5, w * 0.6, u * 6, u * 0.6, "#D97757", 1.5);
      tiny(c, "✻ welcome back", x + w * 0.06, y + u * 5.6, u * 1.3, "#D97757", 600);
      tiny(c, "cwd: ~/acme/agent-runtime", x + w * 0.06, y + u * 8, u * 1.05, alpha("#FFFFFF", 0.45));
      const rows: [string, string][] = [
        ["> reduce context usage in the agent loop", "#FFFFFF"], ["⏺ Read 4 files", "#9CA3AF"], ["⏺ Update(src/agent/loop.ts)", "#FFFFFF"],
        ["+  const prefix = cache.stable(prompt)", "#4ADE80"], ["-  const prefix = buildPrefix(prompt)", "#F87171"], ["+  history = summarise(history, 2_000)", "#4ADE80"],
        ["⏺ Bash(pnpm test)", "#FFFFFF"], ["  ⎿ 128 passed", "#9CA3AF"],
      ];
      rows.forEach(([s, col], i) => tiny(c, s, x + w * 0.04, y + u * (13 + i * 2.5), u * 1.15, col));
      c.strokeRRect(x + w * 0.03, y + h - u * 5, w * 0.94, u * 3.4, u * 0.6, alpha("#FFFFFF", 0.25), 1);
      tiny(c, ">", x + w * 0.045, y + h - u * 4.1, u * 1.2, "#FFFFFF");
    }
  }
  c.restore();
  c.strokeRRect(x, y, w, h, r, alpha("#FFFFFF", 0.14), 1);
}

/** Draw the pile: each window with its own fly scale `z` (about the screen centre), alpha and blur. */
function drawPile(c: RC, cam: Cam, wins: Win[], st: (i: number) => { z: number; a: number; blur: number }) {
  wins.forEach((wn, i) => {
    const { z, a, blur } = st(i);
    if (a <= 0.003) return;
    const put = (cc: RC) => {
      cc.save();
      cc.translate(c.cx, c.cy);
      cc.scale(z);
      cc.translate(-c.cx, -c.cy);
      view(cc, cam, () => drawWindow(cc, wn));
      cc.restore();
    };
    if (blur > 0.6) {
      const L = c.layer(c.W, c.H, (lc) => put(lc), { res: 0.5 });
      c.drawLayer(L, 0, 0, { blur, alpha: a });
    } else c.with({ alpha: a }, () => put(c));
  });
}

const PILE_END: [number, number] = [0.47, 0.6]; // cursor at the end of the pile (frame fractions)

const pile = defineComponent<{ apps: string[]; wallpaper: string | null }>({
  version: "1.0.0", group: "kits", category: "kit-notch-browser", added: "2026-10-04", formats: ["landscape"], theme: LOOK, camera: "still",
  id: "notch-window-pile", name: "Desktop Reveal · Windows Pile In",
  description: "The camera pulls back (focus pulling to sharp) to reveal the Mac desktop as app windows arrive from behind the camera and pile on top of each other; the cursor wanders and an app switcher flicks across.",
  tags: ["desktop", "windows", "chaos", "pull back", "mac", "app switcher"],
  params: { apps: P.list(APPS, "Windows (title|kind), back to front", { min: 1, max: 8 }), ...P_WALL },
  duration: 5.1,
  render(c, p) {
    const t = c.t;
    const cam = camAt(c, logLerp(K_TEXT, 1, E.inOut(pr(t, 0, 2.0))));
    wallpaper(c, cam, p.wallpaper, 1 - pr(t, 0.15, 1.4, E.inOut));
    view(c, cam, () => {
      menuBar(c);
      drawNotch(c, notchBox(c));
      dock(c);
    });
    const wins = windows(c, p.apps);
    drawPile(c, cam, wins, (i) => {
      const u = pr(t, 0.05 + i * 0.16, 0.05 + i * 0.16 + 0.9);
      const e = 1 - Math.pow(1 - u, 3);
      return { z: logLerp(3.4, 1, e), a: pr(u, 0, 0.25), blur: (1 - e) * c.H * 0.018 };
    });
    // the app switcher flicks across the icons
    const sw = pr(t, 3.35, 3.5) * (1 - pr(t, 4.4, 4.55));
    if (sw > 0) {
      const s = c.H * 0.06, gap = s * 0.3, n = 9;
      const w = n * s + (n + 1) * gap, h = s + gap * 2;
      const x = c.cx - w / 2, y = c.cy - h / 2;
      c.save();
      c.alpha(sw);
      c.rrect(x, y, w, h, gap * 1.4, alpha("#1E1E1E", 0.72));
      const sel = Math.min(n - 1, Math.floor(pr(t, 3.5, 4.3) * n));
      for (let i = 0; i < n; i++) {
        const ix = x + gap + i * (s + gap);
        if (i === sel) c.rrect(ix - gap * 0.4, y + gap * 0.6, s + gap * 0.8, s + gap * 0.8, gap, alpha("#FFFFFF", 0.22));
        appIcon(c, ICONS[(i * 2 + 1) % ICONS.length], ix, y + gap, s);
      }
      c.restore();
    }
    const cur = cursorAt(t, [[2.3, c.W * 0.82, c.H * 1.08], [3.2, c.W * 0.6, c.H * 0.42], [4.5, c.W * 0.55, c.H * 0.66], [5.1, c.W * PILE_END[0], c.H * PILE_END[1]]]);
    cursor(c, cur.x, cur.y, 0, pr(t, 2.3, 2.5));
  },
});

// ── 4. Fly-through back to text ─────────────────────────────────────────────────────────────────────
const fly = defineComponent<{ apps: string[]; line1: string; line2: string; wallpaper: string | null }>({
  version: "1.0.0", group: "kits", category: "kit-notch-browser", added: "2026-10-04", formats: ["landscape"], theme: LOOK, camera: "still",
  id: "notch-fly-through", name: "Push In · Windows Fly Past → Text",
  description: "The camera pushes back in; every window flies past it with motion blur, the desktop defocuses and two lowercase lines resolve word by word, hold, then blur away as the wallpaper comes back into focus.",
  tags: ["push in", "fly through", "text", "focus pull", "transition"],
  params: { apps: P.list(APPS, "Windows (title|kind)", { min: 1, max: 8 }), line1: P.text("don't make your browser", "Line 1", { maxLength: 40 }), line2: P.text("one of them", "Line 2", { maxLength: 40 }), ...P_WALL },
  duration: 3.4,
  render(c, p) {
    const t = c.t;
    const cam = camAt(c, logLerp(1, K_FLY, E.inOut(pr(t, 0, 1.5))));
    const blur = pr(t, 0.25, 1.1, E.inOut) * (1 - pr(t, 2.6, 3.35, E.inOut));
    wallpaper(c, cam, p.wallpaper, blur);
    view(c, cam, () => {
      menuBar(c);
      drawNotch(c, notchBox(c));
      dock(c);
    });
    const wins = windows(c, p.apps);
    const n = wins.length;
    drawPile(c, cam, wins, (i) => {
      const u = pr(t, 0.02 + (n - 1 - i) * 0.07, 0.02 + (n - 1 - i) * 0.07 + 0.95);
      return { z: logLerp(1, 9, E.in(u)), a: 1 - pr(u, 0.4, 0.85), blur: pr(u, 0.08, 0.7) * c.H * 0.03 };
    });
    const cur = cursorAt(t, [[0, c.W * PILE_END[0], c.H * PILE_END[1]], [0.7, c.W * 0.62, c.H * 1.15]]);
    cursor(c, cur.x, cur.y, 0, 1 - pr(t, 0.45, 0.7));

    const size = c.H * 0.093;
    const out = pr(t, 2.55, 3.3, E.inOut);
    let wi = 0;
    [p.line1, p.line2].forEach((s, li) => {
      const L = c.fit(s, sans(size, 600), c.W * 0.86, size * 1.4);
      const ox = c.cx - L.width / 2, top = c.H * (li ? 0.545 : 0.425) - L.lines[0].y + L.cap;
      L.words.forEach((w) => {
        const u = pr(t, 0.85 + wi * 0.13, 0.85 + wi * 0.13 + 0.55, E.out);
        wi++;
        wordFx(c, w, ox, top, { alpha: pr(u, 0, 0.6) * (1 - out * 0.85), blur: (1 - u) * c.H * 0.012 + out * c.H * 0.02, color: INK });
      });
    });
  },
});

// ── 5. Pan up to the notch; it becomes a pill ───────────────────────────────────────────────────────
const NOTCH_CURSOR: [number, number] = [0.7, 0.13];
const pill = defineComponent<{ name: string; wallpaper: string | null }>({
  version: "1.0.0", group: "kits", category: "kit-notch-browser", added: "2026-10-04", formats: ["landscape"], theme: LOOK, camera: "still",
  id: "notch-pill", name: "Pan to the Notch · Pill Morph",
  description: "A slow pan up to a tight framing of just the notch and the top of the wallpaper; the oversized cursor comes up and hovers, and the notch morphs into a pill carrying the product name.",
  tags: ["notch", "pan", "morph", "pill", "hover", "mac"],
  params: { name: P.text("NotchBrowser", "Name", { maxLength: 24 }), ...P_WALL },
  duration: 3.6,
  render(c, p) {
    const t = c.t;
    const u = E.inOut(pr(t, 0, 1.15));
    const k = logLerp(K_FLY, K_NOTCH, u);
    const cam: Cam = { k, x: c.cx, y: c.H / (2 * k) + (c.cy - c.H / (2 * k)) * (1 - u) };
    wallpaper(c, cam, p.wallpaper, 0);
    const b = boxTrack(t, [[0, notchBox(c)], [1.95, pillBox(c)]], SPRING.firm);
    view(c, cam, () => {
      dock(c);
      drawNotch(c, b);
      const pb = pillBox(c);
      const T = c.fit(p.name, sans(pb.h * 0.42, 600), pb.w * 0.8, pb.h * 0.6);
      const a = pr(t, 2.15, 2.45);
      if (a > 0) {
        c.save();
        c.clipRRect(b.x, b.y, b.w, b.h, b.r);
        T.words.forEach((w) => wordFx(c, w, c.cx - T.width / 2 - pb.h * 0.25, pb.y + pb.h * 0.6 - T.lines[0].y + T.cap / 2, { alpha: a, blur: (1 - a) * pb.h * 0.15, color: INK }));
        c.restore();
      }
    });
    const cur = cursorAt(t, [[0.95, c.W * 0.66, c.H * 1.1], [1.8, c.W * 0.62, c.H * 0.1], [3.6, c.W * NOTCH_CURSOR[0], c.H * NOTCH_CURSOR[1]]]);
    cursor(c, cur.x, cur.y, 0, pr(t, 0.95, 1.05));
  },
});

// ── 6. The browser panel: open, click tabs, collapse ────────────────────────────────────────────────
const TABS = ["Home · Threads|https://www.threads.com/", "Dia | The browser…|https://www.diabrowser.com/", "You need to try opus 5.5|https://www.reddit.com/r/codex/comments/…", "govjr|https://github.com/govjr", "Google|https://www.google.com/"];
const tabGeo = (pb: Box, i: number) => {
  const tw = pb.w * 0.16, gap = pb.w * 0.008, x0 = pb.x + pb.w * 0.03;
  return { x: x0 + i * (tw + gap), y: pb.y + pb.h * 0.04, w: tw, h: pb.h * 0.042 };
};
const chevron = (pb: Box) => ({ x: pb.x + pb.w - pb.w * 0.035, y: pb.y + pb.h * 0.061 });

function feed(c: RC, x: number, y: number, w: number, h: number, u: number) {
  c.rect(x, y, w, h, "#0A0A0A");
  for (let i = 0; i < 7; i++) c.strokeRRect(x + w * 0.025, y + h * (0.08 + i * 0.07), u * 1.6, u * 1.6, u * 0.5, alpha("#FFFFFF", i === 0 ? 0.9 : 0.35), 1.2);
  const cx = x + w * 0.1, cw = w * 0.78;
  c.rrect(cx, y + h * 0.02, cw, h, u * 2, "#181818");
  tiny(c, "For you", cx + cw * 0.04, y + h * 0.05, u * 1.5, "#F3F5F7", 700);
  c.circle(cx + cw * 0.06, y + h * 0.15, u * 1.6, alpha("#FFFFFF", 0.2));
  tiny(c, "What's new?", cx + cw * 0.11, y + h * 0.135, u * 1.15, alpha("#FFFFFF", 0.35));
  tiny(c, "Post", cx + cw * 0.88, y + h * 0.135, u * 1.15, "#F3F5F7", 600);
  for (let i = 0; i < 3; i++) {
    const py = y + h * (0.24 + i * 0.25);
    c.rect(cx, py - h * 0.03, cw, 1, alpha("#FFFFFF", 0.08));
    c.circle(cx + cw * 0.06, py + u * 1.4, u * 1.6, ["#8E7CC3", "#E0A16B", "#6BAED6"][i]);
    bars(c, cx + cw * 0.11, py, cw * 0.18, 1, u, alpha("#FFFFFF", 0.85), 200 + i, u * 1.0);
    bars(c, cx + cw * 0.11, py + u * 2.2, cw * 0.78, 2, u * 1.9, alpha("#FFFFFF", 0.5), 210 + i, u * 0.8);
    for (let k = 0; k < 4; k++) c.strokeRRect(cx + cw * (0.11 + k * 0.08), py + u * 7, u * 1.2, u * 1.2, u * 0.4, alpha("#FFFFFF", 0.4), 1);
  }
}
function forum(c: RC, x: number, y: number, w: number, h: number, u: number, title: string) {
  c.rect(x, y, w, h, "#FFFFFF");
  c.rrect(x + w * 0.08, y + h * 0.03, w * 0.5, u * 2.6, u * 1.3, "#EAEDEF");
  c.rrect(x + w * 0.1, y + h * 0.03 + u * 0.5, u * 6, u * 1.6, u * 0.8, "#FFFFFF");
  tiny(c, "r/codex", x + w * 0.1 + u * 0.8, y + h * 0.03 + u * 0.75, u * 0.95, "#1C1C1C", 600);
  c.circle(x + w * 0.05, y + h * 0.14, u * 1.3, "#FF4500");
  bars(c, x + w * 0.075, y + h * 0.125, w * 0.2, 1, u, alpha("#1C1C1C", 0.6), 300, u * 0.8);
  const T = c.fit(title, { font: "inter", size: u * 2.4, weight: 700, tracking: -0.01 }, w * 0.55, u * 6);
  c.drawLayout(T, x + w * 0.035, y + h * 0.18, { color: "#1C1C1C" });
  c.rrect(x + w * 0.035, y + h * 0.18 + T.height + u, u * 7, u * 1.6, u * 0.8, "#E5EBEE");
  bars(c, x + w * 0.035, y + h * 0.33, w * 0.55, 7, u * 2.1, alpha("#1C1C1C", 0.42), 310, u * 0.8);
  ["339", "135", "Share"].forEach((s, i) => {
    c.rrect(x + w * (0.035 + i * 0.11), y + h * 0.75, w * 0.1, u * 2.4, u * 1.2, "#EAEDEF");
    tiny(c, s, x + w * (0.05 + i * 0.11), y + h * 0.75 + u * 0.6, u * 1.0, "#1C1C1C", 600);
  });
  // sign-in card and related posts
  const sx = x + w * 0.62, sw = w * 0.35;
  c.cardShadow(sx, y + h * 0.09, sw, h * 0.16, u, 0.4, 0.8);
  c.rrect(sx, y + h * 0.09, sw, h * 0.16, u, "#FFFFFF");
  tiny(c, "sign in to continue", sx + sw * 0.1, y + h * 0.11, u * 1.05, "#1C1C1C", 600);
  c.rrect(sx + sw * 0.08, y + h * 0.17, sw * 0.84, u * 2.4, u * 1.2, "#1A73E8");
  tiny(c, "Continue", sx + sw * 0.4, y + h * 0.17 + u * 0.6, u * 1.0, "#FFFFFF", 600);
  for (let i = 0; i < 4; i++) {
    const ry = y + h * (0.32 + i * 0.15);
    bars(c, sx, ry, sw * 0.6, 3, u * 1.7, alpha("#1C1C1C", 0.4), 320 + i, u * 0.8);
    c.rrect(sx + sw * 0.72, ry, sw * 0.26, h * 0.1, u * 0.6, ["#E8E1D6", "#D9E7D0", "#E4D9EC", "#D6E2EC"][i]);
  }
}
function profile(c: RC, x: number, y: number, w: number, h: number, u: number, handle: string, avatar: string | null) {
  c.rect(x, y, w, h, "#0D1117");
  c.circle(x + w * 0.04, y + h * 0.05, u * 1.4, "#F0F6FC");
  tiny(c, handle, x + w * 0.07, y + h * 0.035, u * 1.2, "#F0F6FC", 600);
  ["Overview", "Repositories 103", "Projects", "Packages", "Stars 63"].forEach((s, i) => {
    const tx = x + w * (0.03 + i * 0.15);
    tiny(c, s, tx, y + h * 0.11, u * 1.0, alpha("#F0F6FC", i ? 0.75 : 1), i ? 500 : 600);
    if (!i) c.rect(tx, y + h * 0.15, w * 0.1, u * 0.3, "#F78166");
  });
  c.rect(x, y + h * 0.16, w, 1, "#30363D");
  const ar = w * 0.13;
  c.save();
  c.clipCircle(x + w * 0.19, y + h * 0.38, ar);
  mediaOr(c, avatar, x + w * 0.19 - ar, y + h * 0.38 - ar, ar * 2, ar * 2, "avatar", { tone: "#21262D", ink: "#F0F6FC" });
  c.restore();
  tiny(c, handle, x + w * 0.06, y + h * 0.6, u * 1.7, alpha("#F0F6FC", 0.8), 400);
  c.rrect(x + w * 0.06, y + h * 0.7, w * 0.26, u * 2.6, u * 0.6, "#21262D");
  c.strokeRRect(x + w * 0.06, y + h * 0.7, w * 0.26, u * 2.6, u * 0.6, "#30363D", 1);
  tiny(c, "Edit profile", x + w * 0.14, y + h * 0.7 + u * 0.7, u * 1.0, "#F0F6FC", 600);
  tiny(c, "Pinned", x + w * 0.38, y + h * 0.2, u * 1.1, "#F0F6FC", 600);
  for (let i = 0; i < 4; i++) {
    const bx = x + w * (0.38 + (i % 2) * 0.305), by = y + h * (0.26 + Math.floor(i / 2) * 0.36), bw = w * 0.29, bh = h * 0.32;
    c.strokeRRect(bx, by, bw, bh, u * 0.6, "#30363D", 1);
    bars(c, bx + bw * 0.08, by + u * 1.2, bw * 0.45, 1, u, "#4493F8", 400 + i, u * 0.9);
    c.strokeRRect(bx + bw * 0.62, by + u * 1, bw * 0.25, u * 1.6, u * 0.8, "#30363D", 1);
    bars(c, bx + bw * 0.08, by + u * 4, bw * 0.84, 4, u * 1.7, alpha("#F0F6FC", 0.35), 410 + i, u * 0.7);
    c.circle(bx + bw * 0.1, by + bh - u * 1.8, u * 0.6, ["#DEA584", "#3178C6", "#00ADD8", "#F1E05A"][i]);
  }
}

const panel = defineComponent<{ tabs: string[]; avatar: string | null; wallpaper: string | null }>({
  version: "1.0.0", group: "kits", category: "kit-notch-browser", added: "2026-10-04", formats: ["landscape"], theme: LOOK, camera: "still",
  id: "notch-browser-panel", name: "Notch Panel · Tabs → Collapse",
  description: "A click on the pill opens it into a browser panel hanging from the notch while the camera eases back; the cursor clicks through tabs (feed, thread, profile), then hits the collapse chevron and the panel retracts into the notch as the camera returns to the desktop.",
  tags: ["browser", "notch", "panel", "tabs", "click", "morph", "collapse"],
  params: { tabs: P.list(TABS, "Tabs (title|url)", { min: 4, max: 6 }), avatar: P.media(null, "Profile photo", "image"), ...P_WALL },
  duration: 4.8,
  render(c, p) {
    const t = c.t;
    const k = t < 3.8 ? logLerp(K_NOTCH, K_PANEL, E.inOut(pr(t, 0.35, 1.95))) : logLerp(K_PANEL, 1, E.inOut(pr(t, 3.85, 4.8)));
    const cam = camAt(c, k, true);
    wallpaper(c, cam, p.wallpaper, 0);
    const pb = panelBox(c);
    const b = boxTrack(t, [[0, pillBox(c)], [0.2, pb], [3.82, notchBox(c)]], SPRING.firm);
    const tabs = p.tabs.map((s) => { const [title, url] = s.split("|"); return { title: (title ?? "").trim(), url: (url ?? "").trim() }; });
    const active = t < 1.95 ? 0 : t < 2.85 ? 2 : 3;
    const content = pr(t, 0.75, 1.05) * (1 - pr(t, 3.8, 4.0));
    view(c, cam, () => {
      menuBar(c, pr(t, 4.3, 4.8));
      dock(c);
      drawNotch(c, b);
      if (content <= 0) return;
      c.save();
      c.clipRRect(b.x, b.y, b.w, b.h, b.r);
      c.alpha(content);
      const u = pb.h * 0.0185;
      tabs.slice(0, 5).forEach((tb, i) => {
        const g = tabGeo(pb, i);
        if (i === active) c.rrect(g.x, g.y, g.w, g.h, u * 0.6, alpha("#FFFFFF", 0.14));
        const T = ellipsize(c, tb.title, { font: "inter", size: u * 0.95, weight: 500, tracking: 0 }, g.w * 0.74);
        c.drawLayout(T, g.x + g.w * 0.07, g.y + g.h / 2 - T.cap / 2 - (T.lines[0].y - T.cap), { color: alpha("#FFFFFF", i === active ? 0.95 : 0.6) });
        tiny(c, "×", g.x + g.w * 0.86, g.y + g.h / 2 - u * 0.45, u * 0.95, alpha("#FFFFFF", 0.5));
      });
      tiny(c, "+", pb.x + pb.w * 0.9, pb.y + pb.h * 0.05, u * 1.2, alpha("#FFFFFF", 0.7));
      const ch = chevron(pb);
      c.polyline([[ch.x - u * 0.55, ch.y + u * 0.3], [ch.x, ch.y - u * 0.25], [ch.x + u * 0.55, ch.y + u * 0.3]], alpha("#FFFFFF", 0.8), u * 0.18);
      const ry = pb.y + pb.h * 0.1;
      tiny(c, "‹  ›  ↻", pb.x + pb.w * 0.03, ry, u * 1.0, alpha("#FFFFFF", 0.6));
      tiny(c, tabs[active]?.url ?? "", pb.x + pb.w * 0.12, ry, u * 0.95, alpha("#FFFFFF", 0.7));
      const cx = pb.x + pb.w * 0.015, cy = pb.y + pb.h * 0.15, cw = pb.w * 0.97, chh = pb.h * 0.83;
      c.save();
      c.clipRRect(cx, cy, cw, chh, u);
      if (active === 0) feed(c, cx, cy, cw, chh, u);
      else if (active === 2) forum(c, cx, cy, cw, chh, u, tabs[2]?.title ?? "");
      else profile(c, cx, cy, cw, chh, u, tabs[3]?.title ?? "", p.avatar);
      c.restore();
      c.restore();
    });
    const settled = camAt(c, K_PANEL, true);
    const at = (x: number, y: number): [number, number] => { const [sx, sy] = scr(c, settled, x, y); return [sx + c.H * 0.004, sy + c.H * 0.012]; };
    const t2 = tabGeo(pb, 2), t3 = tabGeo(pb, 3), ch = chevron(pb);
    const [ax, ay] = at(t2.x + t2.w * 0.45, t2.y + t2.h / 2), [bx, by] = at(t3.x + t3.w * 0.4, t3.y + t3.h / 2), [cx2, cy2] = at(ch.x, ch.y);
    const cur = cursorAt(t, [[0, c.W * NOTCH_CURSOR[0], c.H * NOTCH_CURSOR[1]], [0.3, c.W * NOTCH_CURSOR[0], c.H * NOTCH_CURSOR[1]], [1.75, ax, ay], [2.65, bx, by], [3.55, cx2, cy2], [4.7, c.W * 0.64, c.H * 0.28]]);
    cursor(c, cur.x, cur.y, press(t, [0.15, 1.95, 2.85, 3.75]), 1 - pr(t, 4.1, 4.6));
  },
});

// ── 7. Checklist of the claims ──────────────────────────────────────────────────────────────────────
const checklist = defineComponent<{ items: string[]; wallpaper: string | null }>({
  version: "1.0.0", group: "kits", category: "kit-notch-browser", added: "2026-10-04", formats: ["landscape"], theme: LOOK, camera: "still",
  id: "notch-checklist", name: "Claims Checklist · Rings and Ticks",
  description: "Back on the full desktop, the post's claims arrive one by one, each with a ring drawing on and a tick drawing inside it; an optional quiet aside after the first claim.",
  tags: ["checklist", "claims", "ticks", "rings", "features"],
  params: { items: P.list(["tiny 1.7 mb|(chrome & dia: 1.4 gb)", "native", "ergonomic", "no extra window in the way"], "Claims (text|aside)", { min: 1, max: 6 }), ...P_WALL },
  duration: 2.5,
  render(c, p) {
    const t = c.t;
    const cam = camAt(c, 1);
    wallpaper(c, cam, p.wallpaper, 0);
    view(c, cam, () => {
      menuBar(c);
      drawNotch(c, notchBox(c));
      dock(c);
    });
    const size = c.H * 0.056, gap = c.H * 0.098, r = size * 0.42;
    c.light(c.cx, c.H * 0.52, c.H * 0.6, "#000000", 0.18);
    const rows = p.items.map((s) => { const [main, aside] = s.split("|"); return { main: c.layout((main ?? "").trim(), sans(size, 600)), aside: aside ? c.layout(aside.trim(), sans(size * 0.55, 500)) : null }; });
    const widest = Math.max(...rows.map((rw) => rw.main.width + (rw.aside ? rw.aside.width + size * 0.3 : 0)));
    const x0 = c.cx - (widest + r * 3) / 2;
    const y0 = c.H * 0.52 - ((rows.length - 1) * gap) / 2;
    rows.forEach((rw, i) => {
      const at = 0.05 + i * 0.3;
      const y = y0 + i * gap;
      const u = pr(t, at, at + 0.45, E.out);
      const ring = pr(t, at + 0.2, at + 0.6, E.inOut), tick = pr(t, at + 0.5, at + 0.8, E.out);
      if (u <= 0) return;
      c.arc(x0 + r, y, r, 0, ring, alpha(INK, 0.95), size * 0.07);
      if (tick > 0) c.polyline([[x0 + r * 0.55, y + r * 0.02], [x0 + r * 0.9, y + r * 0.36], [x0 + r * 1.5, y - r * 0.32]], INK, size * 0.075, tick);
      const tx = x0 + r * 3;
      rw.main.words.forEach((w) => wordFx(c, w, tx, y - rw.main.cap / 2 - (rw.main.lines[0].y - rw.main.cap), { alpha: pr(u, 0, 0.6), blur: (1 - u) * c.H * 0.008, dy: (1 - u) * c.H * 0.012, color: INK }));
      if (rw.aside) {
        const A = rw.aside;
        c.drawLayout(A, tx + rw.main.width + size * 0.3, y - A.cap / 2 - (A.lines[0].y - A.cap) + size * 0.06, { color: alpha(INK, 0.7 * pr(t, at + 0.3, at + 0.6)) });
      }
    });
  },
});

// ── 8. Wordmark ─────────────────────────────────────────────────────────────────────────────────────
const wordmark = defineComponent<{ name: string; tagline: string; wallpaper: string | null }>({
  version: "1.0.0", group: "kits", category: "kit-notch-browser", added: "2026-10-04", formats: ["landscape"], theme: LOOK, camera: "still",
  id: "notch-wordmark", name: "Wordmark · Launching Soon",
  description: "The wallpaper softens while the product name focuses in, big and centred over the desktop, with a quiet 'launching soon' beneath it; the dock stays in place.",
  tags: ["wordmark", "end card", "launching soon", "focus"],
  params: { name: P.text("NotchBrowser", "Name", { maxLength: 24 }), tagline: P.text("launching soon", "Tagline", { maxLength: 40 }), ...P_WALL },
  duration: 2.1,
  render(c, p) {
    const t = c.t;
    const cam = camAt(c, logLerp(1, 1.03, pr(t, 0, 2.1)));
    wallpaper(c, cam, p.wallpaper, 0.75 * pr(t, 0, 0.9, E.inOut));
    view(c, cam, () => {
      menuBar(c, 1 - 0.5 * pr(t, 0, 0.9));
      drawNotch(c, notchBox(c));
      dock(c);
    });
    const N = c.fit(p.name, { font: "inter", size: c.H * 0.145, weight: 700, tracking: -0.035 }, c.W * 0.8, c.H * 0.2);
    const u = pr(t, 0.05, 0.7, E.out);
    N.words.forEach((w) => wordFx(c, w, c.cx - N.width / 2, c.H * 0.47 - N.lines[0].y + N.cap / 2, { alpha: pr(u, 0, 0.5), blur: (1 - u) * c.H * 0.03, scale: 1.04 - 0.04 * u, color: INK }));
    const T = c.layout(p.tagline, sans(c.H * 0.034, 500));
    c.drawLayout(T, c.cx - T.width / 2, c.H * 0.575, { color: alpha(INK, 0.85 * pr(t, 0.6, 1.0)) });
  },
});

const components = [hook, list, pile, fly, pill, panel, checklist, wordmark] as unknown as Component[];

const template: PostSpec = {
  id: "kit-notch-browser",
  title: "NotchBrowser — slow, polished Mac desktop teaser",
  format: "landscape",
  fps: 60,
  clips: [
    { component: "notch-hook-wipe" },
    { component: "notch-spin-list" },
    { component: "notch-window-pile", transition: { type: "blur", duration: 0.35 } },
    { component: "notch-fly-through" },
    { component: "notch-pill" },
    { component: "notch-browser-panel" },
    { component: "notch-checklist" },
    { component: "notch-wordmark", transition: { type: "blur", duration: 0.35 } },
  ],
  notes: "Kit template: @jake11moran's NotchBrowser teaser (~27 s, no audio). One camera: every clip starts where the previous one ended.",
};

export const notchBrowser: Kit = {
  id: "notch-browser",
  promptId: "2103237884564414633",
  title: "Slow, polished Mac desktop teaser",
  family: "launch",
  format: "landscape",
  summary: "A hype teaser that moves slowly and expensively: one continuous camera over one painterly Mac desktop. A line wipes in, a list of 30 'hard things' spins and lands on a question, windows pile in from behind the camera, fly past it back to text, the camera pans up to the notch, which becomes a pill and opens into the browser panel; tabs click, the panel retracts, a checklist ticks, the wordmark lands.",
  shots: [
    { at: 0, shot: "Big centred line enters word by word from the right with an orange colorama wipe; holds, scales into place", component: "notch-hook-wipe" },
    { at: 2.25, shot: "A list of 30 hard things spins past (each with an app icon), lands slowly on 'managing your desktop', '?' pops 0.2 s later", component: "notch-spin-list" },
    { at: 5.9, shot: "Camera pulls back to the Mac desktop as windows pile in from behind the camera; an app switcher flicks", component: "notch-window-pile" },
    { at: 11, shot: "Push back in; the windows fly past the camera; 'don't make your browser / one of them'", component: "notch-fly-through" },
    { at: 14.4, shot: "Pan up to a tight framing of the notch; the cursor hovers; the notch becomes a 'NotchBrowser' pill", component: "notch-pill" },
    { at: 18, shot: "The pill opens into the browser panel; click through tabs; the collapse chevron retracts it into the notch", component: "notch-browser-panel" },
    { at: 22.8, shot: "Checklist of the post's claims with rings and ticks drawing on", component: "notch-checklist" },
    { at: 24.95, shot: "'NotchBrowser' · launching soon", component: "notch-wordmark" },
  ],
  rules: [
    "One continuous camera over one desktop, no hard cuts: each clip begins in the previous clip's camera state",
    "Pushes, pulls and pans take 1.5–3 s on gentle ease-in-out: half the speed you would default to",
    "Motion blur on fast moves (the spinning list, windows arriving and flying past); light film grain",
    "Oversized macOS cursor; all on-screen copy lowercase like the post (product name excepted)",
    "Match the product's UI, wallpaper and copy; real app windows and icons go in as your own assets (these are stylised stand-ins)",
    "No audio",
  ],
  components,
  template,
};

void rand;

