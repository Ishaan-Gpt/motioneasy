// Kit: "One shape, many UI states" (@twoclipping). Dribbble-level UI motion in one take: a black shape on
// a warm-gray canvas morphs button → loader → island → music player → volume slider → toggle → tabs →
// chart → ⌘K → toast → back to the button, a cursor driving every change, 120 BPM, last frame = first.

import { SPRING, alpha, clamp, mix, pr, spring, E, P, type Component, type RC } from "@motioneasy/engine";
import type { PostSpec } from "../sequence";
import { caret, typed } from "./shared";
import { hand, inside, label, morphState, type Box, type Shape } from "./morph";
import type { Kit } from "./types";

const CANVAS = "#ECEBE8";
const INK = "#0A0A0A";
const WHITE = "#FFFFFF";
const GRAY = "#8E8E8E";
const LOOK = { mode: "light" as const, bg: CANVAS, fg: INK, accent: INK, lighting: 0, grain: 0, vignette: 0, backdrop: "plain" as const, camera: "still" as const };

const S = {
  button: { w: 0.45, h: 0.144, r: 0.072, fill: INK } as Shape,
  loader: { w: 0.155, h: 0.155, r: 0.08, fill: INK } as Shape,
  island: { w: 0.6, h: 0.16, r: 0.08, fill: INK } as Shape,
  player: { w: 0.72, h: 0.46, r: 0.05, fill: INK } as Shape,
  volume: { w: 0.75, h: 0.13, r: 0.065, fill: INK } as Shape,
  toggleOn: { w: 0.34, h: 0.19, r: 0.095, fill: "#2E2E2E" } as Shape,
  toggleOff: { w: 0.34, h: 0.19, r: 0.095, fill: "#A3A3A3" } as Shape,
  tabs: { w: 0.82, h: 0.12, r: 0.06, fill: WHITE, lift: 0.4 } as Shape,
  chart: { w: 0.77, h: 0.59, r: 0.035, fill: WHITE, lift: 0.5 } as Shape,
  palette: { w: 0.75, h: 0.58, r: 0.035, fill: WHITE, lift: 0.5 } as Shape,
  filtered: { w: 0.82, h: 0.42, r: 0.035, fill: WHITE, lift: 0.5 } as Shape,
  toast: { w: 0.66, h: 0.13, r: 0.065, fill: INK } as Shape,
};

const kit = { category: "kit-ui-morph-loop", formats: ["square" as const], theme: LOOK, canvas: CANVAS };
const u = (c: RC) => c.short;

/** A warm gradient square standing in for album art. */
function art(c: RC, x: number, y: number, s: number, ref: string | null) {
  if (ref) return c.media(ref, x, y, s, s, { radius: s * 0.18, key: "um-art" });
  c.rrect(x, y, s, s, s * 0.18, c.linear(x, y, x + s, y + s, [[0, "#FF9F43"], [0.5, "#F2546B"], [1, "#7B4DFF"]]));
}

const P_TRACK = { track: P.text("motion study 02", "Track", { maxLength: 30 }), sub: P.text("made in code", "Subtitle", { maxLength: 30 }), art: P.media(null, "Album art (empty = gradient)", "image") };

// ── states ─────────────────────────────────────────────────────────────────
const button = morphState<{ label: string }>({
  ...kit,
  id: "uimorph-button",
  name: "Button (start + loop point)",
  description: "The black pill button the whole take starts and ends on. A cursor clicks it on the beat.",
  tags: ["button", "click", "morph", "loop"],
  params: { label: P.text("Generate", "Label", { maxLength: 20 }) },
  duration: 0.6,
  sounds: () => [{ at: 0.42, sound: "ui.click", gain: 0.45, role: "click" }],
  from: S.button, to: S.button,
  content: (c, p, t, b) => inside(c, b, t, -1, () => label(c, p.label, b.x + b.w / 2, b.y + b.h * 0.62, u(c) * 0.045, WHITE, { weight: 600, align: "center" })),
  over: (c, p, t) => void hand(c, t, [[0, 0.1, 0.25], [0.4, 0.06, 0.03], [0.6, 0.06, 0.03]], [0.42]),
});

const loader = morphState<{}>({
  ...kit,
  id: "uimorph-loader",
  name: "Button → Loader",
  description: "The click collapses the button into a circle with a spinning arc.",
  tags: ["loader", "spinner", "morph"],
  params: {},
  duration: 0.6,
  sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "morph" }],
  from: S.button, to: S.loader,
  content: (c, _p, t, b) => inside(c, b, t, 0.12, () => {
    const a0 = t * 2.2;
    c.arc(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.22, a0 % 1, (a0 % 1) + 0.3, WHITE, b.w * 0.04);
  }),
  over: (c, _p, t) => void hand(c, t, [[0, 0.06, 0.03], [0.6, 0.12, 0.1]]),
});

const island = morphState<{ art: string | null }>({
  ...kit,
  id: "uimorph-island",
  name: "Loader → Dynamic Island",
  description: "The circle stretches into a dynamic-island pill: album art on the left, a live waveform on the right.",
  tags: ["dynamic island", "waveform", "morph"],
  params: { art: P.media(null, "Album art (empty = gradient)", "image") },
  duration: 0.6,
  sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.25, role: "stretch" }, { at: 0.2, sound: "tonal.notify", gain: 0.2, role: "now playing" }],
  from: S.loader, to: S.island,
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => {
    const s = b.h * 0.56;
    art(c, b.x + b.h * 0.22, b.y + (b.h - s) / 2, s, p.art);
    for (let i = 0; i < 9; i++) {
      const h = b.h * (0.14 + 0.32 * Math.abs(Math.sin(t * 7 + i * 1.3)));
      c.rrect(b.x + b.w - b.h * 0.25 - (9 - i) * b.h * 0.075, b.y + b.h / 2 - h / 2, b.h * 0.04, h, b.h * 0.02, alpha(WHITE, 0.8));
    }
  }),
});

function playerUI(c: RC, b: Box, p: { track: string; sub: string; art: string | null }, t: number, prog: number, pause: number) {
  const k = b.w;
  const s = k * 0.2;
  art(c, b.x + k * 0.05, b.y + k * 0.05, s, p.art);
  label(c, p.track, b.x + k * 0.29, b.y + k * 0.11, k * 0.045, WHITE, { weight: 650 });
  label(c, p.sub, b.x + k * 0.29, b.y + k * 0.16, k * 0.032, GRAY, { weight: 450 });
  const y = b.y + b.h * 0.62, x0 = b.x + k * 0.05, x1 = b.x + b.w - k * 0.05;
  c.rrect(x0, y - 2, x1 - x0, 4, 2, alpha(WHITE, 0.25));
  c.rrect(x0, y - 2, (x1 - x0) * prog, 4, 2, WHITE);
  c.circle(x0 + (x1 - x0) * prog, y, k * 0.014, WHITE);
  const sec = Math.round(171 * prog);
  label(c, `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`, x0, y + k * 0.05, k * 0.022, GRAY, { font: "mono" });
  label(c, `-${Math.floor((171 - sec) / 60)}:${String((171 - sec) % 60).padStart(2, "0")}`, x1, y + k * 0.05, k * 0.022, GRAY, { font: "mono", align: "right" });
  const cy = b.y + b.h * 0.84, cx = b.x + b.w / 2, z = k * 0.028;
  c.poly([[cx - k * 0.13, cy - z], [cx - k * 0.13, cy + z], [cx - k * 0.17, cy]], WHITE);
  c.rect(cx - k * 0.175, cy - z, 3, z * 2, WHITE);
  c.poly([[cx + k * 0.13, cy - z], [cx + k * 0.13, cy + z], [cx + k * 0.17, cy]], WHITE);
  c.rect(cx + k * 0.17, cy - z, 3, z * 2, WHITE);
  // play ▶ morphs into pause ‖
  const L = cx - z * 0.8;
  c.poly([[L, cy - z], [L + z * 0.6, cy - z + z * 0.3 * (1 - pause)], [L + z * 0.6, cy + z - z * 0.3 * (1 - pause)], [L, cy + z]], WHITE);
  c.poly([[L + z * 0.6 + z * 0.4 * pause, cy - z + z * 0.3 * (1 - pause)], [L + z * 1.6, cy - z * (pause)], [L + z * 1.6, cy + z * pause], [L + z * 0.6 + z * 0.4 * pause, cy + z - z * 0.3 * (1 - pause)]], WHITE);
}

const player = morphState<{ track: string; sub: string; art: string | null }>({
  ...kit,
  id: "uimorph-player",
  name: "Island → Music Player (play/pause, scrub)",
  description: "The island opens into a full music player. A click morphs play into pause, then the cursor grabs the progress bar and scrubs it forward.",
  tags: ["music player", "play pause", "scrub", "drag"],
  params: P_TRACK,
  duration: 1.8,
  sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.25, role: "open" }, { at: 0.8, sound: "ui.click", gain: 0.4, role: "pause" }, { at: 1.2, sound: "ui.tick", gain: 0.25, role: "grab" }],
  from: S.island, to: S.player,
  content: (c, p, t, b) => {
    const scrub = pr(t, 1.2, 1.6, E.inOut);
    inside(c, b, t, 0.15, () => playerUI(c, b, p, t, 0.28 + 0.02 * t + 0.32 * scrub, pr(t, 0.8, 0.95, E.inOut)));
  },
  over: (c, _p, t, b) => {
    const S2 = u(c);
    const px = (b.x + b.w / 2 - c.cx) / S2, py = (b.y + b.h * 0.84 - c.cy) / S2;
    const sx = (b.x + b.w * 0.05 + (b.w * 0.9) * 0.3 - c.cx) / S2, sy = (b.y + b.h * 0.62 - c.cy) / S2;
    hand(c, t, [[0, 0.12, 0.1], [0.75, px, py + 0.01], [1.15, sx, sy + 0.01], [1.6, sx + 0.21, sy + 0.01], [1.8, sx + 0.21, sy + 0.01]], [0.8]);
  },
});

const volume = morphState<{}>({
  ...kit,
  id: "uimorph-volume",
  name: "Player → Volume Slider (stretch past max)",
  description: "The player collapses into a volume slider; dragged past max, the whole slider stretches like rubber, then springs back on release.",
  tags: ["slider", "rubber band", "drag", "volume"],
  params: {},
  duration: 1.6,
  sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.25, role: "collapse" }, { at: 0.5, sound: "riser.air", len: 0.7, gain: 0.2, role: "drag" }, { at: 1.25, sound: "impact.land", gain: 0.25, role: "release" }],
  from: S.player,
  to: (t) => {
    const over = pr(t, 0.95, 1.2, E.out) * (1 - pr(t, 1.25, 1.6, E.out));
    return { ...S.volume, w: S.volume.w * (1 + 0.1 * over), h: S.volume.h * (1 - 0.06 * over) };
  },
  content: (c, _p, t, b) => inside(c, b, t, 0.15, () => {
    const v = clamp(pr(t, 0.45, 1.0, E.inOut));
    const x0 = b.x + b.h * 0.95, x1 = b.x + b.w - b.h * 0.4, cy = b.y + b.h / 2;
    const s = b.h * 0.16;
    c.rect(b.x + b.h * 0.35, cy - s * 0.5, s * 0.7, s, WHITE);
    c.poly([[b.x + b.h * 0.35 + s * 0.7, cy - s * 0.5], [b.x + b.h * 0.35 + s * 1.5, cy - s * 1.1], [b.x + b.h * 0.35 + s * 1.5, cy + s * 1.1], [b.x + b.h * 0.35 + s * 0.7, cy + s * 0.5]], WHITE);
    c.rrect(x0, cy - b.h * 0.08, x1 - x0, b.h * 0.16, b.h * 0.08, alpha(WHITE, 0.25));
    c.rrect(x0, cy - b.h * 0.08, Math.max(b.h * 0.16, (x1 - x0) * v), b.h * 0.16, b.h * 0.08, WHITE);
  }),
  over: (c, _p, t, b) => {
    const S2 = u(c);
    const y = (b.y + b.h / 2 - c.cy) / S2, x0 = (b.x + b.h * 0.95 - c.cx) / S2;
    hand(c, t, [[0, 0.06, 0.1], [0.4, x0 + 0.02, y], [1.0, 0.4, y], [1.2, 0.44, y], [1.6, 0.44, y + 0.04]], [0.42]);
  },
});

const toggle = morphState<{}>({
  ...kit,
  id: "uimorph-toggle",
  name: "Slider → Toggle (flips on the beat)",
  description: "The slider squeezes into a toggle; the knob flips on the beat, its two edges riding different springs so it stretches as it travels, and the track changes colour.",
  tags: ["toggle", "switch", "spring", "beat"],
  params: {},
  duration: 1.2,
  sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "morph" }, { at: 0.5, sound: "kenney.toggle", gain: 0.45, role: "flip" }],
  from: S.volume,
  to: (t) => (t < 0.5 ? S.toggleOn : S.toggleOff),
  morphAt: 0,
  content: (c, _p, t, b) => inside(c, b, t, 0.12, () => {
    const pad = b.h * 0.1, d = b.h - pad * 2;
    const L0 = b.x + b.w - pad - d, L1 = b.x + pad;
    // leading edge (left) on a fast spring, trailing edge on a slower one
    const lead = L0 + (L1 - L0) * clamp(spring(t - 0.5, SPRING.punchy), 0, 1.02);
    const trail = L0 + d + (L1 + d - L0 - d) * clamp(spring(t - 0.56, SPRING.firm), 0, 1.02);
    c.rrect(Math.min(lead, trail - d), b.y + pad, Math.max(d, trail - lead), d, d / 2, WHITE);
  }),
  over: (c, _p, t) => void hand(c, t, [[0, 0.44, 0.04], [0.45, 0.06, 0.02], [1.2, 0.04, 0.06]], [0.5]),
});

const TABS = ["Day", "Week", "Month"];

function tabsUI(c: RC, b: Box, t: number, picks: [number, number][], small = false) {
  const w = b.w / 3, pad = b.h * 0.12;
  const pos = (i: number) => b.x + i * w + pad;
  let lead = pos(picks[0][1]), trail = pos(picks[0][1]) + w - pad * 2;
  for (let k = 1; k < picks.length; k++) {
    const [at, i] = picks[k];
    const dir = picks[k][1] > picks[k - 1][1] ? 1 : -1;
    const fast = clamp(spring(t - at, SPRING.punchy), 0, 1.02), slow = clamp(spring(t - at - 0.05, SPRING.firm), 0, 1.02);
    const dl = pos(i) - pos(picks[k - 1][1]);
    // the edge in the direction of travel leads; the other follows on a softer spring
    lead += dl * (dir > 0 ? slow : fast);
    trail += dl * (dir > 0 ? fast : slow);
  }
  if (!small) c.rrect(lead, b.y + pad, trail - lead, b.h - pad * 2, (b.h - pad * 2) / 2, INK);
  else c.rrect(lead, b.y + pad, trail - lead, b.h - pad * 2, (b.h - pad * 2) / 2, INK);
  const active = picks.filter(([at]) => t >= at).pop()?.[1] ?? 0;
  TABS.forEach((s, i) => label(c, s, b.x + i * w + w / 2, b.y + b.h * 0.62, b.h * 0.3, i === active ? WHITE : GRAY, { weight: 550, align: "center" }));
}

const tabs = morphState<{}>({
  ...kit,
  id: "uimorph-tabs",
  name: "Toggle Knob → Liquid Tabs",
  description: "The knob becomes a tab indicator; clicked from Day to Week to Month, its two edges ride different springs so it stretches ahead and catches up like liquid.",
  tags: ["tabs", "liquid indicator", "segmented", "spring"],
  params: {},
  duration: 1.2,
  sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "morph" }, { at: 0.35, sound: "ui.click", gain: 0.35, role: "week" }, { at: 0.75, sound: "ui.click", gain: 0.35, role: "month" }],
  from: S.toggleOff, to: S.tabs,
  content: (c, _p, t, b) => inside(c, b, t, 0.12, () => tabsUI(c, b, t, [[0, 0], [0.35, 1], [0.75, 2]])),
  over: (c, _p, t) => void hand(c, t, [[0, 0.04, 0.06], [0.3, 0.0, 0.02], [0.7, 0.27, 0.02], [1.2, 0.27, 0.05]], [0.35, 0.75]),
});

const SERIES_M = [0.32, 0.36, 0.33, 0.4, 0.44, 0.42, 0.5, 0.55, 0.52, 0.6, 0.66, 0.63, 0.72, 0.8, 0.86];
const SERIES_W = [0.4, 0.48, 0.44, 0.52, 0.46, 0.55, 0.58, 0.5, 0.6, 0.57, 0.64, 0.6, 0.68, 0.62, 0.66];

const chart = morphState<{ metric: string; month: number; week: number; tips: string[] }>({
  ...kit,
  id: "uimorph-chart",
  name: "Tabs → Chart (draws itself, tooltip, tab switch)",
  description: "The tabs open into a chart card: the number scrambles into place, the line draws itself, a tooltip follows the hover, then a click on Week swaps the data and the line reshapes.",
  tags: ["chart", "counter", "tooltip", "data"],
  params: { metric: P.text("total views", "Metric", { maxLength: 30 }), month: P.number(84320, "Month value", { min: 0, max: 1e9, step: 1, group: "content" }), week: P.number(19204, "Week value", { min: 0, max: 1e9, step: 1, group: "content" }), tips: P.list(["22,350", "72,363"], "Tooltip values", { max: 2 }) },
  duration: 2.4,
  sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.25, role: "open" }, { at: 0.3, sound: "ui.tick", gain: 0.2, role: "count" }, { at: 1.6, sound: "ui.click", gain: 0.35, role: "week" }],
  from: S.tabs, to: S.chart,
  content: (c, p, t, b) => inside(c, b, t, 0.15, () => {
    const tb = { x: b.x + b.w * 0.2, y: b.y + b.h * 0.04, w: b.w * 0.6, h: b.h * 0.1, r: b.h * 0.05, fill: WHITE };
    tabsUI(c, tb, t, [[0, 2], [1.6, 1]], true);
    const wk = pr(t, 1.6, 2.0, E.inOut);
    const target = t < 1.6 ? p.month : p.week;
    const settle = t < 1.6 ? pr(t, 0.2, 0.7) : pr(t, 1.6, 2.0);
    const shown = settle >= 1 ? target.toLocaleString("en-US") : target.toLocaleString("en-US").replace(/\d/g, (d, i) => (i < 2 + settle * 4 ? d : String((Math.floor(t * 30) + i) % 10)));
    label(c, shown, b.x + b.w * 0.06, b.y + b.h * 0.3, b.h * 0.12, INK, { weight: 700 });
    label(c, p.metric, b.x + b.w * 0.06, b.y + b.h * 0.37, b.h * 0.035, GRAY);
    const gx0 = b.x + b.w * 0.06, gx1 = b.x + b.w * 0.94, gy0 = b.y + b.h * 0.45, gy1 = b.y + b.h * 0.92;
    c.rect(gx0, gy1, gx1 - gx0, 1, "#EEE");
    const pts: [number, number][] = SERIES_M.map((v, i) => {
      const val = v + (SERIES_W[i] - v) * wk;
      return [gx0 + (gx1 - gx0) * (i / (SERIES_M.length - 1)), gy1 - (gy1 - gy0) * val];
    });
    const draw = pr(t, 0.05, 0.45, E.inOut);
    c.save();
    c.alpha(0.5);
    const area: [number, number][] = [...pts.slice(0, Math.max(2, Math.ceil(pts.length * draw))), [gx0 + (gx1 - gx0) * draw, gy1], [gx0, gy1]];
    c.poly(area, c.linear(0, gy0, 0, gy1, [[0, alpha(INK, 0.08)], [1, alpha(INK, 0)]]));
    c.restore();
    c.polyline(pts, INK, 2.5, draw);
    // tooltip follows the hover
    const hv = pr(t, 0.3, 1.4, E.inOut);
    if (t > 0.25 && t < 1.6) {
      const i = Math.round(1 + hv * (pts.length - 3));
      const [px, py] = pts[i];
      c.line(px, gy0, px, gy1, alpha(INK, 0.15), 1);
      c.circle(px, py, 4, INK);
      const tip = (hv < 0.5 ? p.tips[0] : p.tips[1]) ?? "";
      const L = c.layout(tip, { font: "geist", size: b.h * 0.032, weight: 600 });
      c.rrect(px - L.width / 2 - 6, py - b.h * 0.08, L.width + 12, b.h * 0.05, 5, INK);
      c.drawLayout(L, px - L.width / 2, py - b.h * 0.075, { color: WHITE });
    }
  }),
  over: (c, _p, t, b) => {
    const S2 = u(c);
    const ty = (b.y + b.h * 0.09 - c.cy) / S2;
    hand(c, t, [[0, 0.27, 0.05], [0.3, -0.3, 0.12], [1.4, 0.3, -0.02], [1.6, 0.0, ty], [2.4, 0.08, 0.2]], [1.6]);
  },
});

const COMMANDS = ["New project|⌘N", "Export video|⌘E", "Frame rate · 60fps|", "Render queue|"];

const palette = morphState<{ placeholder: string; query: string; commands: string[]; result: string }>({
  ...kit,
  id: "uimorph-command",
  name: "Chart → ⌘K Palette (type to filter, enter)",
  description: "The chart collapses into a command palette; typing filters the list as you type, the selection moves to the match, and Enter fires it.",
  tags: ["command palette", "search", "typing", "filter"],
  params: { placeholder: P.text("Type a command", "Placeholder", { maxLength: 30 }), query: P.text("frame", "Typed", { maxLength: 20 }), commands: P.list(COMMANDS, "Commands (label|shortcut)", { max: 6 }), result: P.text("Every frame is code", "Matching result", { maxLength: 30 }) },
  duration: 1.8,
  sounds: (p) => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.25, role: "collapse" }, ...Array.from(p.query).map((_, i) => ({ at: 0.55 + i * 0.09, sound: "foley.key", gain: 0.18, seed: i, role: "type" })), { at: 1.55, sound: "ui.click", gain: 0.35, role: "enter" }],
  from: S.chart,
  to: (t) => (t < 0.5 ? S.palette : S.filtered),
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => {
    const q = typed(p.query, t, 0.55, 11);
    const row = u(c) * 0.085;
    c.circle(b.x + row * 0.45, b.y + row * 0.55, row * 0.12, GRAY);
    if (!q) label(c, p.placeholder, b.x + row * 0.8, b.y + row * 0.68, row * 0.4, "#B0B0B0");
    const L = q ? label(c, q, b.x + row * 0.8, b.y + row * 0.68, row * 0.4, INK, { weight: 500 }) : null;
    if (caret(t)) c.rect(b.x + row * 0.8 + (L?.width ?? 0) + 2, b.y + row * 0.38, 1.5, row * 0.4, INK);
    c.rect(b.x, b.y + row * 1.05, b.w, 1, "#EEE");
    const all = p.commands.map((s) => s.split("|")[0]);
    const list = q ? [...all.filter((s) => s.toLowerCase().includes(q.toLowerCase())), p.result] : all;
    const sel = q.length >= p.query.length ? list.length - 1 : 0;
    list.forEach((s, i) => {
      const y = b.y + row * (1.3 + i * 1.0);
      if (y + row > b.y + b.h) return;
      if (i === sel && q) c.rrect(b.x + row * 0.2, y, b.w - row * 0.4, row * 0.85, row * 0.15, "#F2F2F0");
      c.rrect(b.x + row * 0.45, y + row * 0.3, row * 0.25, row * 0.25, 3, alpha(INK, 0.15));
      label(c, s, b.x + row * 0.9, y + row * 0.55, row * 0.34, INK, { weight: 500 });
      const sc = p.commands.find((x) => x.startsWith(s))?.split("|")[1];
      if (sc) label(c, sc, b.x + b.w - row * 0.5, y + row * 0.55, row * 0.24, "#B0B0B0", { align: "right" });
    });
  }),
  over: (c, _p, t) => void hand(c, t, [[0, 0.08, 0.2], [1.8, 0.2, 0.3]]),
});

const toast = morphState<{ result: string }>({
  ...kit,
  id: "uimorph-toast",
  name: "Palette → Toast → Check",
  description: "Enter collapses the palette into a black toast with a pending dot; the dot becomes a check and the label leaves before the next morph.",
  tags: ["toast", "notification", "check", "morph"],
  params: { result: P.text("Every frame is code", "Toast", { maxLength: 30 }) },
  duration: 1.2,
  sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.25, role: "collapse" }, { at: 0.6, sound: "tonal.notify", gain: 0.3, role: "done" }],
  from: S.filtered, to: S.toast,
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => {
    const cx = b.x + b.h * 0.5, cy = b.y + b.h / 2, r = b.h * 0.17;
    const done = pr(t, 0.4, 0.6, E.out);
    c.circle(cx, cy, r, mix("#3A3A3A", WHITE, done));
    if (done > 0) c.polyline([[cx - r * 0.45, cy], [cx - r * 0.1, cy + r * 0.35], [cx + r * 0.5, cy - r * 0.35]], INK, r * 0.25, done);
    label(c, p.result, cx + b.h * 0.35, b.y + b.h * 0.6, b.h * 0.24, WHITE, { weight: 600, alpha: 1 - pr(t, 0.6, 0.8) });
  }),
});

const back = morphState<{ label: string }>({
  ...kit,
  id: "uimorph-return",
  name: "Toast → Button (loop)",
  description: "The toast springs back into the button and the label returns; the last frame equals the first, cursor included, so the take loops.",
  tags: ["loop", "button", "return"],
  params: { label: P.text("Generate", "Label", { maxLength: 20 }) },
  duration: 1.0,
  sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "return" }],
  from: S.toast, to: S.button,
  content: (c, p, t, b) => inside(c, b, t, 0.15, () => label(c, p.label, b.x + b.w / 2, b.y + b.h * 0.62, u(c) * 0.045, WHITE, { weight: 600, align: "center" })),
  over: (c, _p, t) => void hand(c, t, [[0, 0.2, 0.3], [1.0, 0.1, 0.25]]),
});

const components: Component[] = [button, loader, island, player, volume, toggle, tabs, chart, palette, toast, back];

const template: PostSpec = {
  id: "kit-ui-morph-loop",
  title: "One shape, many UI states",
  format: "square",
  fps: 60,
  clips: components.map((k) => ({ component: k.id })),
  music: { src: "media/music/library/screen-saver.mp3", gain: 0.5, offset: 4.247, fadeIn: 0.02, fadeOut: 0.6, credit: "\"Screen Saver\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Kit template: @twoclipping's one-shape UI morph loop, 120 BPM, original states and copy.",
};

export const uiMorphLoop: Kit = {
  id: "ui-morph-loop",
  promptId: "2103273003555402193",
  title: "One shape, many UI states",
  family: "ui",
  format: "square",
  summary: "A 14-second Dribbble-level UI loop: one black shape, never cut, morphs size, radius and colour through eleven interface states while a cursor drives every change on a 120 BPM grid. The last frame is the first frame.",
  shots: [
    { at: 0, shot: "Button, clicked", component: "uimorph-button" },
    { at: 0.6, shot: "→ loader", component: "uimorph-loader" },
    { at: 1.2, shot: "→ dynamic island with art and waveform", component: "uimorph-island" },
    { at: 1.8, shot: "→ music player; play/pause morph; scrub the progress bar", component: "uimorph-player" },
    { at: 3.6, shot: "→ volume slider that stretches when dragged past max", component: "uimorph-volume" },
    { at: 5.2, shot: "→ toggle flips on the beat", component: "uimorph-toggle" },
    { at: 6.4, shot: "→ the knob becomes a liquid tab indicator", component: "uimorph-tabs" },
    { at: 7.6, shot: "→ the tabs open into a chart that draws itself, tooltip on hover, Week swaps the data", component: "uimorph-chart" },
    { at: 10.0, shot: "→ ⌘K; type to filter; enter", component: "uimorph-command" },
    { at: 11.8, shot: "→ toast, check", component: "uimorph-toast" },
    { at: 13.0, shot: "→ back to the button (loop)", component: "uimorph-return" },
  ],
  rules: [
    "One shape, never cut: every state is the same element morphing size, radius and colour; content swaps with a short blur",
    "Light warm-gray canvas, black and white components, one UI font (Geist); springs everywhere, a tiny overshoot at most",
    "Tab indicator and toggle knob: two edges on different springs so the leading edge stretches ahead",
    "Drags are direct manipulation; on release the value springs back from wherever it was",
    "Banned: bouncy easing, particle bursts, glows, gradients on UI chrome, mismatched icon strokes, dead time",
    "120 BPM, something on every beat; last frame = first frame, cursor included",
  ],
  components,
  template,
};

void SPRING;
void spring;
