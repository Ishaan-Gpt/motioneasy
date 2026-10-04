// Kit: "UI story film with one draw(t) function" (@verbove). "explain MakerMap, but make it insane": one
// shape morphs through the whole product — sign up → your pin → real makers lighting up the globe →
// matches → stats → a meetup → search — on a 120 BPM grid, closed-form springs, short blur swaps.

import { E, SPRING, alpha, clamp, mix, pr, rand, spring, P, type Component, type RC } from "@motioneasy/engine";
import { drawAvatar } from "../parts";
import type { PostSpec } from "../sequence";
import { caret, typed } from "./shared";
import { hand, inside, label, morphState, type Box, type Shape } from "./morph";
import type { Kit } from "./types";

const CANVAS = "#EEEDEA";
const INK = "#121212";
const WHITE = "#FFFFFF";
const ORANGE = "#E8552F";
const GRAY = "#8F8F8B";
const LOOK = { mode: "light" as const, bg: CANVAS, fg: INK, accent: ORANGE, lighting: 0, grain: 0, vignette: 0, backdrop: "plain" as const, camera: "still" as const };
const kit = { category: "kit-makermap", formats: ["square" as const], theme: LOOK, canvas: CANVAS };

const S = {
  logo: { w: 0.42, h: 0.12, r: 0.06, fill: INK } as Shape,
  cta: { w: 0.54, h: 0.11, r: 0.055, fill: INK } as Shape,
  field: { w: 0.66, h: 0.095, r: 0.048, fill: WHITE, lift: 0.4 } as Shape,
  card: { w: 0.58, h: 0.38, r: 0.035, fill: WHITE, lift: 0.5 } as Shape,
  blob: { w: 0.42, h: 0.3, r: 0.045, fill: "#8A8A88" } as Shape,
  check: { w: 0.22, h: 0.22, r: 0.11, fill: INK } as Shape,
  pin: { w: 0.11, h: 0.11, r: 0.055, fill: ORANGE } as Shape,
  globe: { w: 0.7, h: 0.7, r: 0.35, fill: WHITE, lift: 0.5 } as Shape,
  dot: { w: 0.42, h: 0.42, r: 0.21, fill: WHITE, lift: 0.3 } as Shape,
  pill: { w: 0.6, h: 0.11, r: 0.055, fill: INK } as Shape,
  list: { w: 0.56, h: 0.44, r: 0.04, fill: "#141516" } as Shape,
  stats: { w: 0.6, h: 0.33, r: 0.035, fill: WHITE, lift: 0.5 } as Shape,
  event: { w: 0.6, h: 0.39, r: 0.035, fill: WHITE, lift: 0.5 } as Shape,
  search: { w: 0.62, h: 0.4, r: 0.03, fill: WHITE, lift: 0.5 } as Shape,
};
const u = (c: RC) => c.short;

function logoContent(c: RC, b: Box, name: string) {
  const L = c.layout(name, { font: "geist", size: b.h * 0.42, weight: 700, tracking: -0.02 });
  const dot = b.h * 0.13, gap = b.h * 0.18;
  const x = b.x + b.w / 2 - (dot * 2 + gap + L.width) / 2;
  c.circle(x + dot, b.y + b.h / 2, dot, ORANGE);
  c.drawLayout(L, x + dot * 2 + gap, b.y + b.h / 2 - L.height / 2 + b.h * 0.03, { color: WHITE });
}

// ── 1–3: logo, call to action, handle field ────────────────────────────────
const logo = morphState<{ name: string }>({
  ...kit, id: "makermap-logo", name: "Logo Pill",
  description: "The film opens (and closes) on the product logo as a black pill with an orange dot.",
  tags: ["logo", "pill", "loop"], params: { name: P.text("MakerMap", "Name", { maxLength: 20 }) },
  duration: 0.9, sounds: () => [{ at: 0.05, sound: "ui.pop", gain: 0.35, role: "logo" }],
  from: { ...S.logo, w: 0.3, h: 0.09 }, to: S.logo,
  content: (c, p, t, b) => inside(c, b, t, -1, () => logoContent(c, b, p.name)),
});

const cta = morphState<{ cta: string }>({
  ...kit, id: "makermap-cta", name: "Logo → Call to Action",
  description: "The logo pill stretches into the sign-up button; the cursor clicks it on the beat.",
  tags: ["button", "cta", "click", "morph"], params: { cta: P.text("Put me on the map", "Button", { maxLength: 30 }) },
  duration: 0.9, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "morph" }, { at: 0.62, sound: "ui.click", gain: 0.45, role: "click" }],
  from: S.logo, to: S.cta,
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => label(c, p.cta, b.x + b.w / 2, b.y + b.h * 0.62, b.h * 0.34, WHITE, { weight: 600, align: "center" })),
  over: (c, _p, t) => void hand(c, t, [[0, 0.15, 0.2], [0.55, 0.06, 0.02], [0.9, 0.08, 0.04]], [0.62]),
});

const handle = morphState<{ handle: string }>({
  ...kit, id: "makermap-handle", name: "Button → Handle Field",
  description: "The button turns white and becomes a text field; the @handle types itself and the return key lights up.",
  tags: ["input", "typing", "field", "morph"], params: { handle: P.text("verbove", "Handle", { maxLength: 20 }) },
  duration: 1.6,
  sounds: (p) => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "morph" }, ...Array.from(p.handle).map((_, i) => ({ at: 0.25 + i * 0.1, sound: "foley.key", gain: 0.18, seed: i, role: "type" })), { at: 1.4, sound: "ui.click", gain: 0.35, role: "enter" }],
  from: S.cta, to: S.field,
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => {
    const q = typed(p.handle, t, 0.25, 10);
    label(c, "@", b.x + b.h * 0.4, b.y + b.h * 0.63, b.h * 0.34, GRAY);
    const L = label(c, q, b.x + b.h * 0.4 + b.h * 0.3, b.y + b.h * 0.63, b.h * 0.34, INK, { weight: 550 });
    if (caret(t)) c.rect(b.x + b.h * 0.72 + L.width + 1, b.y + b.h * 0.3, 2, b.h * 0.4, ORANGE);
    const done = q.length >= p.handle.length;
    c.rrect(b.x + b.w - b.h * 0.85, b.y + b.h * 0.18, b.h * 0.64, b.h * 0.64, b.h * 0.14, done ? INK : "#F0F0EE");
    label(c, "↵", b.x + b.w - b.h * 0.53, b.y + b.h * 0.64, b.h * 0.3, done ? WHITE : GRAY, { align: "center" });
  }),
  over: (c, _p, t) => void hand(c, t, [[0, 0.08, 0.04], [1.3, 0.28, 0.03], [1.6, 0.3, 0.05]], [1.4]),
});

// ── 4: "is this you?" ──────────────────────────────────────────────────────
const you = morphState<{ name: string; meta: string; bio: string; place: string; avatar: string | null }>({
  ...kit, id: "makermap-is-this-you", name: "Field → 'Is This You?' Card",
  description: "The field grows into a profile card with real data: avatar, name, handle and followers, bio, location, 'Not me' and a black 'That's me' that the cursor clicks.",
  tags: ["profile", "card", "confirm", "ui"],
  params: { name: P.text("Martijn Verbove", "Name", { maxLength: 30 }), meta: P.text("@verbove · 611 followers", "Meta", { maxLength: 40 }), bio: P.text("VC backed founder at day & indie hacker at night.", "Bio", { maxLength: 80 }), place: P.text("Portugal", "Location", { maxLength: 20 }), avatar: P.media(null, "Avatar", "image") },
  duration: 0.9, sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.25, role: "grow" }, { at: 0.7, sound: "ui.click", gain: 0.4, role: "confirm" }],
  from: S.field, to: S.card,
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => {
    const k = b.w;
    label(c, "Is this you?", b.x + k * 0.06, b.y + k * 0.08, k * 0.028, GRAY);
    drawAvatar(c, b.x + k * 0.12, b.y + k * 0.18, k * 0.055, p.name.split(" ").map((s) => s[0]).join(""), "#D9D6D0", INK, p.avatar);
    label(c, p.name, b.x + k * 0.21, b.y + k * 0.18, k * 0.045, INK, { weight: 700 });
    label(c, p.meta, b.x + k * 0.21, b.y + k * 0.225, k * 0.026, GRAY);
    const B = c.fit(p.bio, { font: "geist", size: k * 0.032, weight: 450, lineHeight: 1.3 }, k * 0.86, k * 0.12);
    c.drawLayout(B, b.x + k * 0.06, b.y + k * 0.3, { color: "#444" });
    c.circle(b.x + k * 0.075, b.y + b.h - k * 0.08, k * 0.008, ORANGE);
    label(c, p.place, b.x + k * 0.095, b.y + b.h - k * 0.07, k * 0.026, GRAY);
    label(c, "Not me", b.x + k * 0.6, b.y + b.h - k * 0.07, k * 0.026, GRAY);
    c.rrect(b.x + k * 0.72, b.y + b.h - k * 0.115, k * 0.23, k * 0.075, k * 0.0375, INK);
    label(c, "That's me", b.x + k * 0.835, b.y + b.h - k * 0.07, k * 0.028, WHITE, { weight: 600, align: "center" });
  }),
  over: (c, _p, t) => void hand(c, t, [[0, 0.3, 0.05], [0.65, 0.2, 0.15], [0.9, 0.21, 0.17]], [0.7]),
});

// ── 5: loader → check ──────────────────────────────────────────────────────
const check = morphState<{}>({
  ...kit, id: "makermap-check", name: "Card → Loader → Check",
  description: "The card blurs into a gray loading blob, then contracts into a black circle that draws a check.",
  tags: ["loader", "check", "success", "morph"], params: {},
  duration: 1.5, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "collapse" }, { at: 0.75, sound: "tonal.notify", gain: 0.3, role: "check" }],
  from: S.card, to: (t) => (t < 0.6 ? S.blob : S.check),
  content: (c, _p, t, b) => {
    if (t < 0.6) return;
    inside(c, b, t, 0.7, () => {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = b.w * 0.3;
      c.polyline([[cx - r * 0.55, cy + r * 0.02], [cx - r * 0.15, cy + r * 0.42], [cx + r * 0.6, cy - r * 0.38]], WHITE, r * 0.2, pr(t, 0.75, 1.05, E.out));
    });
  },
});

// ── 6: your pin ────────────────────────────────────────────────────────────
const pin = morphState<{ label: string }>({
  ...kit, id: "makermap-pin", name: "Check → Your Pin",
  description: "The check circle shrinks into an orange pin with a pulsing ring, and 'You're on the map' rises beneath it.",
  tags: ["pin", "pulse", "location", "success"], params: { label: P.text("You're on the map", "Line", { maxLength: 30 }) },
  duration: 1.0, sounds: () => [{ at: 0.1, sound: "ui.pop", gain: 0.35, role: "pin" }],
  from: S.check, to: S.pin,
  over: (c, p, t, b) => {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    for (let k = 0; k < 2; k++) {
      const ph = ((t * 1.1 + k * 0.5) % 1);
      c.ctx.beginPath();
      c.ctx.arc(cx, cy, b.w * (0.55 + ph * 0.6), 0, Math.PI * 2);
      c.ctx.strokeStyle = alpha(ORANGE, 0.35 * (1 - ph) * pr(t, 0.2, 0.4));
      c.ctx.lineWidth = 2;
      c.ctx.stroke();
    }
    label(c, p.label, c.cx, c.cy + u(c) * 0.12, u(c) * 0.04, INK, { weight: 650, align: "center", alpha: pr(t, 0.3, 0.5) });
  },
});

// ── 7: the globe fills with makers ─────────────────────────────────────────
type LonLat = [number, number];
const LAND: LonLat[][] = [
  [[-168, 65], [-140, 70], [-95, 72], [-80, 62], [-62, 55], [-55, 47], [-70, 43], [-76, 35], [-81, 25], [-97, 26], [-97, 18], [-88, 15], [-83, 9], [-79, 8], [-92, 15], [-105, 20], [-112, 30], [-118, 33], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60]],
  [[-55, 60], [-42, 60], [-20, 70], [-20, 80], [-60, 82], [-70, 77], [-55, 68]],
  [[-80, 8], [-72, 12], [-60, 10], [-50, 0], [-35, -5], [-38, -15], [-48, -28], [-58, -38], [-66, -55], [-74, -50], [-72, -30], [-70, -18], [-80, -5]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [5, 58], [12, 64], [25, 70], [40, 68], [45, 55], [40, 45], [28, 41], [22, 37], [12, 38], [3, 42]],
  [[-17, 21], [-12, 28], [-6, 35], [10, 37], [20, 32], [32, 31], [35, 23], [43, 12], [51, 12], [40, -2], [40, -15], [35, -25], [28, -33], [18, -35], [12, -18], [9, -2], [5, 4], [-8, 5], [-16, 12]],
  [[40, 45], [45, 55], [40, 68], [60, 72], [80, 73], [110, 76], [140, 72], [170, 68], [180, 65], [160, 60], [140, 55], [135, 43], [122, 40], [120, 30], [110, 20], [106, 10], [100, 13], [98, 8], [92, 20], [88, 22], [80, 8], [73, 20], [66, 25], [57, 25], [52, 30], [48, 30], [36, 35], [28, 41]],
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -27], [150, -37], [141, -38], [131, -31], [115, -34]],
  [[-6, 50], [1, 51], [-2, 56], [-5, 58], [-6, 55]],
];
const inPoly = (pt: LonLat, poly: LonLat[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
let landDots: LonLat[] | null = null;
const land = () => {
  if (landDots) return landDots;
  landDots = [];
  for (let lat = -58; lat <= 80; lat += 2.6) for (let lon = -180; lon < 180; lon += 2.6 / Math.max(0.35, Math.cos((lat * Math.PI) / 180))) if (LAND.some((p) => inPoly([lon, lat], p))) landDots.push([lon, lat]);
  return landDots;
};
/** Orthographic projection centred on (lon0, lat0); returns null on the far side. */
const project = (lon: number, lat: number, lon0: number, lat0: number) => {
  const l = ((lon - lon0) * Math.PI) / 180, p = (lat * Math.PI) / 180, p0 = (lat0 * Math.PI) / 180;
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  if (cosc < 0) return null;
  return { x: Math.cos(p) * Math.sin(l), y: -(Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)), z: cosc };
};

function globe(c: RC, b: Box, t: number, o: { spin: number; fill: number; home: LonLat; seed: number }) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = b.w / 2 * 0.98;
  const lon0 = -55 + o.spin, lat0 = 20;
  c.save();
  c.clipCircle(cx, cy, R);
  c.rect(b.x, b.y, b.w, b.h, c.radial(cx - R * 0.3, cy - R * 0.35, R * 1.4, [[0, "#FFFFFF"], [1, "#E7E5E0"]]));
  const pts = land();
  c.ctx.fillStyle = alpha("#6E6C66", 0.55);
  for (const [lon, lat] of pts) {
    const q = project(lon, lat, lon0, lat0);
    if (!q) continue;
    c.ctx.beginPath();
    c.ctx.arc(cx + q.x * R, cy + q.y * R, R * 0.0075 * (0.6 + 0.4 * q.z), 0, Math.PI * 2);
    c.ctx.fill();
  }
  // makers light up across the land, weighted toward a few hubs
  const n = Math.floor(pts.length * 0.22 * o.fill);
  for (let i = 0; i < n; i++) {
    const [lon, lat] = pts[Math.floor(rand(o.seed + i * 7) * pts.length)];
    const q = project(lon, lat, lon0, lat0);
    if (!q) continue;
    const r = R * 0.011 * (rand(o.seed + i * 13) < 0.08 ? 2.2 : 1) * (0.6 + 0.4 * q.z);
    c.circle(cx + q.x * R, cy + q.y * R, r, alpha(ORANGE, 0.85));
  }
  const h = project(o.home[0], o.home[1], lon0, lat0);
  if (h) {
    c.circle(cx + h.x * R, cy + h.y * R, R * 0.025, ORANGE);
    c.ctx.beginPath();
    c.ctx.arc(cx + h.x * R, cy + h.y * R, R * (0.045 + 0.03 * ((t * 1.2) % 1)), 0, Math.PI * 2);
    c.ctx.strokeStyle = alpha(ORANGE, 0.5 * (1 - ((t * 1.2) % 1)));
    c.ctx.lineWidth = 1.5;
    c.ctx.stroke();
  }
  c.restore();
  c.ctx.beginPath();
  c.ctx.arc(cx, cy, R, 0, Math.PI * 2);
  c.ctx.strokeStyle = alpha("#000", 0.05);
  c.ctx.lineWidth = 1;
  c.ctx.stroke();
}

const HOME: LonLat = [-9, 39];

const globeShot = morphState<{ count: number; unit: string }>({
  ...kit, id: "makermap-globe", name: "Pin → Globe Filling with Makers",
  description: "The pin opens into a dot-matrix globe centred on your location; real makers light up across the continents while a counter pill climbs to the total.",
  tags: ["globe", "map", "counter", "data", "dots"],
  params: { count: P.number(3393, "Makers", { min: 1, max: 9999999, step: 1, group: "content" }), unit: P.text("makers", "Unit", { maxLength: 20 }) },
  duration: 2.4, sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.3, role: "open" }, { at: 0.6, sound: "riser.air", len: 1.4, gain: 0.25, role: "fill" }, { at: 2.0, sound: "ui.pop", gain: 0.3, role: "count" }],
  from: S.pin, to: S.globe, lift: 0.5,
  content: (c, p, t, b) => {
    inside(c, b, t, 0.1, () => globe(c, b, t, { spin: t * 6, fill: pr(t, 0.6, 2.2, E.inOut), home: HOME, seed: 5 }));
    const k = pr(t, 0.7, 0.9);
    if (k > 0) {
      const n = Math.round(p.count * pr(t, 0.6, 2.2, E.out));
      const L = c.layout(`${n.toLocaleString("en-US")} ${p.unit}`, { font: "geist", size: u(c) * 0.022, weight: 650 });
      const w = L.width + u(c) * 0.06, h = u(c) * 0.045, x = c.cx - w / 2, y = b.y + b.h - h * 0.6;
      c.save();
      c.alpha(k);
      c.rrect(x, y, w, h, h / 2, INK);
      c.circle(x + h * 0.45, y + h / 2, h * 0.12, ORANGE);
      c.drawLayout(L, x + h * 0.75, y + h / 2 - L.height / 2 + 1, { color: WHITE });
      c.restore();
    }
  },
});

const toDot = morphState<{}>({
  ...kit, id: "makermap-globe-to-dot", name: "Globe → Dot",
  description: "The globe shrinks into a soft white disc with your orange dot at its centre: the bridge from the map to the people near you.",
  tags: ["globe", "shrink", "transition"], params: {},
  duration: 0.8, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.25, role: "shrink" }],
  from: S.globe, to: S.dot,
  content: (c, _p, t, b) => {
    const fade = pr(t, 0, 0.35);
    if (fade < 1) inside(c, b, t, -1, () => { c.save(); c.alpha(1 - fade); globe(c, b, t + 2.4, { spin: (t + 2.4) * 6, fill: 1, home: HOME, seed: 5 }); c.restore(); });
    c.circle(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.035, ORANGE);
  },
});

// ── 8: matches ─────────────────────────────────────────────────────────────
const PEOPLE = ["Fabrizio Rinaldi|typefully.com · designer|Lisbon", "Daniel Andrade|vitaltrends.net · founder|Lisbon", "Mick.net|besttime.app · maker|Lisbon"];

function faces(c: RC, x: number, cy: number, r: number, n: number, ring: string) {
  for (let i = n - 1; i >= 0; i--) {
    c.circle(x + i * r * 1.3, cy, r + 2, ring);
    drawAvatar(c, x + i * r * 1.3, cy, r, "", ["#C9A98A", "#8FA7C8", "#B7B2A8"][i % 3], INK, null);
  }
}

const matches = morphState<{ title: string; sub: string; people: string[] }>({
  ...kit, id: "makermap-matches", name: "Dot → Matches Pill → List",
  description: "The disc becomes a black pill ('6 matches · all in Lisbon' with stacked avatars) that opens into a dark list of real people, one row per beat.",
  tags: ["matches", "list", "avatars", "people"],
  params: { title: P.text("6 matches", "Title", { maxLength: 20 }), sub: P.text("all in Lisbon", "Subtitle", { maxLength: 30 }), people: P.list(PEOPLE, "People (name|meta|city)", { max: 5 }) },
  duration: 2.6, sounds: (p) => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.25, role: "pill" }, { at: 0.9, sound: "whoosh.air", gain: 0.25, role: "open" }, ...p.people.map((_, i) => ({ at: 1.1 + i * 0.25, sound: "ui.tick", gain: 0.2, seed: i, role: "row" }))],
  from: S.dot, to: (t) => (t < 0.9 ? S.pill : S.list),
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => {
    const k = u(c);
    const open = t >= 0.9;
    const hy = open ? b.y + k * 0.055 : b.y + b.h / 2;
    faces(c, b.x + k * 0.05, hy, k * 0.022, 3, b.fill);
    label(c, p.title, b.x + k * 0.15, hy - k * 0.002, k * 0.026, WHITE, { weight: 650 });
    label(c, p.sub, b.x + k * 0.15, hy + k * 0.027, k * 0.019, GRAY);
    c.circle(b.x + b.w - k * 0.05, hy, k * 0.007, ORANGE);
    if (open) {
      c.rect(b.x, b.y + k * 0.105, b.w, 1, alpha(WHITE, 0.07));
      p.people.forEach((r, i) => {
        const [n, m, city] = r.split("|");
        const a = pr(t, 1.1 + i * 0.25, 1.3 + i * 0.25, E.out);
        if (a <= 0) return;
        const y = b.y + k * (0.16 + i * 0.09);
        c.save();
        c.alpha(a);
        drawAvatar(c, b.x + k * 0.055, y, k * 0.022, (n ?? "?").slice(0, 2), ["#C9A98A", "#8FA7C8", "#B7B2A8"][i % 3], INK, null);
        label(c, n ?? "", b.x + k * 0.1, y - k * 0.002, k * 0.022, WHITE, { weight: 600 });
        label(c, m ?? "", b.x + k * 0.1, y + k * 0.025, k * 0.016, GRAY);
        label(c, city ?? "", b.x + b.w - k * 0.04, y + k * 0.008, k * 0.016, GRAY, { align: "right" });
        c.restore();
      });
    }
  }),
});

// ── 9: stats tabs ──────────────────────────────────────────────────────────
const STATS = ["Makers|3,393|makers on the map", "Products|2,295|products they're building", "Meetups|119|countries to meet up in"];

function scramble(target: string, t: number, at: number, dur = 0.45) {
  const k = pr(t, at, at + dur);
  if (k >= 1) return target;
  return target.replace(/\d/g, (d, i) => (i / target.length < k ? d : String(Math.floor(t * 40 + i * 3) % 10)));
}

const stats = morphState<{ stats: string[] }>({
  ...kit, id: "makermap-stats", name: "List → Stats Tabs",
  description: "The list turns into a white stats card with three tabs; each click slides the liquid indicator and the big number scrambles into the new value.",
  tags: ["tabs", "stats", "counter", "scramble"], params: { stats: P.list(STATS, "Tabs (tab|value|label)", { min: 2, max: 3 }) },
  duration: 1.6, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "morph" }, { at: 0.3, sound: "ui.click", gain: 0.3, role: "tab" }, { at: 0.95, sound: "ui.click", gain: 0.3, role: "tab" }],
  from: S.list, to: S.stats,
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => {
    const k = u(c);
    const tabs = p.stats.map((s) => s.split("|"));
    const picks: [number, number][] = [[0, 0], [0.3, 1], [0.95, Math.min(2, tabs.length - 1)]];
    const tw = b.w * 0.88 / tabs.length, tx = b.x + b.w * 0.06, ty = b.y + k * 0.03, th = k * 0.05;
    c.rrect(tx, ty, b.w * 0.88, th, th / 2, "#F3F2EF");
    let pos = 0;
    for (let i = 1; i < picks.length; i++) pos += (picks[i][1] - picks[i - 1][1]) * clamp(spring(t - picks[i][0], SPRING.firm), 0, 1.02);
    c.rrect(tx + pos * tw + 3, ty + 3, tw - 6, th - 6, (th - 6) / 2, INK);
    const active = picks.filter(([at]) => t >= at).pop()?.[1] ?? 0;
    tabs.forEach(([name], i) => label(c, name ?? "", tx + i * tw + tw / 2, ty + th * 0.64, th * 0.32, i === active ? WHITE : GRAY, { weight: 550, align: "center" }));
    const [, value, lab] = tabs[active] ?? [];
    const at = picks.filter(([a]) => t >= a).pop()?.[0] ?? 0;
    label(c, scramble(value ?? "", t, at), b.x + b.w / 2, b.y + b.h * 0.66, k * 0.085, INK, { weight: 700, align: "center" });
    label(c, lab ?? "", b.x + b.w / 2, b.y + b.h * 0.82, k * 0.02, GRAY, { align: "center" });
  }),
  over: (c, _p, t) => void hand(c, t, [[0, 0.1, 0.25], [0.25, 0.0, -0.1], [0.9, 0.19, -0.1], [1.6, 0.2, -0.06]], [0.3, 0.95]),
});

// ── 10: a meetup, RSVP ─────────────────────────────────────────────────────
const event = morphState<{ day: string; date: string; title: string; meta: string; body: string; going: number; cta: string; done: string }>({
  ...kit, id: "makermap-meetup", name: "Stats → Meetup RSVP",
  description: "The stats card becomes a meetup: date badge, title, place and time, one line about it, a going count; 'I'm going' turns orange with a check and the count ticks up.",
  tags: ["event", "rsvp", "calendar", "button"],
  params: { day: P.text("SAT", "Day", { maxLength: 4 }), date: P.text("3", "Date", { maxLength: 3 }), title: P.text("Makers coffee", "Title", { maxLength: 30 }), meta: P.text("Lisbon · 10:00", "Place · time", { maxLength: 30 }), body: P.text("Coffee with the makers near you on the map.", "Line", { maxLength: 80 }), going: P.number(7, "Going", { min: 0, max: 9999, step: 1, group: "content" }), cta: P.text("I'm going", "Button", { maxLength: 16 }), done: P.text("You're going", "Done state", { maxLength: 16 }) },
  duration: 1.8, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "morph" }, { at: 0.9, sound: "ui.click", gain: 0.4, role: "rsvp" }, { at: 0.95, sound: "tonal.notify", gain: 0.25, role: "going" }],
  from: S.stats, to: S.event,
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => {
    const k = u(c);
    c.rrect(b.x + k * 0.04, b.y + k * 0.035, k * 0.07, k * 0.08, k * 0.012, "#F3F2EF");
    label(c, p.day, b.x + k * 0.075, b.y + k * 0.06, k * 0.013, ORANGE, { weight: 650, align: "center" });
    label(c, p.date, b.x + k * 0.075, b.y + k * 0.1, k * 0.032, INK, { weight: 700, align: "center" });
    label(c, p.title, b.x + k * 0.13, b.y + k * 0.07, k * 0.036, INK, { weight: 700 });
    c.circle(b.x + k * 0.136, b.y + k * 0.093, k * 0.005, ORANGE);
    label(c, p.meta, b.x + k * 0.146, b.y + k * 0.1, k * 0.017, GRAY);
    c.rect(b.x + k * 0.04, b.y + k * 0.14, b.w - k * 0.08, 1, "#EEE");
    label(c, p.body, b.x + k * 0.04, b.y + k * 0.19, k * 0.02, "#444");
    const done = pr(t, 0.9, 1.05);
    label(c, `${p.going + (done > 0.5 ? 1 : 0)} going`, b.x + k * 0.04, b.y + b.h - k * 0.05, k * 0.019, INK, { weight: 600 });
    const bw = k * 0.17, bh = k * 0.06, bx = b.x + b.w - k * 0.04 - bw, by = b.y + b.h - k * 0.085;
    c.rrect(bx, by, bw, bh, bh / 2, mix(INK, ORANGE, done));
    label(c, done > 0.5 ? `✓ ${p.done}` : p.cta, bx + bw / 2, by + bh * 0.64, bh * 0.32, WHITE, { weight: 600, align: "center" });
  }),
  over: (c, _p, t) => void hand(c, t, [[0, 0.2, -0.06], [0.85, 0.2, 0.14], [1.8, 0.22, 0.18]], [0.9]),
});

// ── 11: search ─────────────────────────────────────────────────────────────
const RESULTS = ["Carmine Paolino|rubyllm.com · Berlin", "Cesare D'Adamo|joboalert.world · Berlin", "Danni Friedland|frontman.sh · Berlin"];

const search = morphState<{ query: string; found: string; results: string[] }>({
  ...kit, id: "makermap-search", name: "Meetup → Natural-Language Search",
  description: "The card empties into a search panel; a natural-language query types itself, then real results land row by row with the first one selected.",
  tags: ["search", "typing", "results", "ai"], params: { query: P.text("ai founders in berlin", "Query", { maxLength: 40 }), found: P.text("13 found", "Count", { maxLength: 16 }), results: P.list(RESULTS, "Results (name|meta)", { max: 5 }) },
  duration: 2.5, sounds: (p) => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "morph" }, ...Array.from(p.query).filter((_, i) => i % 2 === 0).map((_, i) => ({ at: 0.15 + (i * 2) / 14, sound: "foley.key", gain: 0.16, seed: i, role: "type" })), { at: 1.8, sound: "ui.pop", gain: 0.25, role: "results" }],
  from: S.event, to: S.search,
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => {
    const k = u(c);
    const q = typed(p.query, t, 0.15, 14);
    c.circle(b.x + k * 0.045, b.y + k * 0.045, k * 0.009, GRAY);
    const L = label(c, q, b.x + k * 0.07, b.y + k * 0.053, k * 0.022, INK, { weight: 500 });
    if (caret(t)) c.rect(b.x + k * 0.07 + L.width + 1, b.y + k * 0.032, 1.5, k * 0.028, ORANGE);
    c.rect(b.x, b.y + k * 0.09, b.w, 1, "#EEE");
    if (t > 1.75) {
      label(c, p.found, b.x + b.w - k * 0.04, b.y + k * 0.053, k * 0.015, GRAY, { align: "right" });
      p.results.forEach((r, i) => {
        const [n, m] = r.split("|");
        const a = pr(t, 1.75 + i * 0.12, 1.95 + i * 0.12, E.out);
        if (a <= 0) return;
        const y = b.y + k * (0.14 + i * 0.075);
        c.save();
        c.alpha(a);
        if (i === 0) c.rrect(b.x + k * 0.015, y - k * 0.03, b.w - k * 0.03, k * 0.065, k * 0.012, "#F3F2EF");
        drawAvatar(c, b.x + k * 0.05, y, k * 0.018, (n ?? "?").slice(0, 2), ["#C9A98A", "#8FA7C8", "#B7B2A8"][i % 3], INK, null);
        label(c, n ?? "", b.x + k * 0.085, y - k * 0.002, k * 0.019, INK, { weight: 600 });
        label(c, m ?? "", b.x + k * 0.085, y + k * 0.021, k * 0.014, GRAY);
        c.restore();
      });
    }
  }),
  over: (c, _p, t) => void hand(c, t, [[0, 0.22, 0.18], [2.5, 0.05, 0.1]]),
});

// ── 12: back to the logo ───────────────────────────────────────────────────
const end = morphState<{ name: string; url: string; hold: number }>({
  ...kit, id: "makermap-end", name: "Search → Logo + URL (loop)",
  description: "Everything collapses back into the logo pill; the URL types in beneath it in a mono face. The last frame equals the first.",
  tags: ["logo", "url", "end card", "loop"], params: { name: P.text("MakerMap", "Name", { maxLength: 20 }), url: P.text("makermap.lol", "URL", { maxLength: 30 }), hold: P.number(0.9, "Hold", { min: 0, max: 3, step: 0.1, unit: "s" }) },
  duration: (p) => 0.6 + p.hold, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.25, role: "collapse" }, { at: 0.35, sound: "ui.pop", gain: 0.3, role: "logo" }],
  from: S.search, to: S.logo,
  content: (c, p, t, b) => {
    inside(c, b, t, 0.15, () => logoContent(c, b, p.name));
    label(c, p.url, c.cx, b.y + b.h + u(c) * 0.075, u(c) * 0.026, GRAY, { font: "mono", align: "center", alpha: pr(t, 0.3, 0.5) });
  },
});

const components: Component[] = [logo, cta, handle, you, check, pin, globeShot, toDot, matches, stats, event, search, end];

const template: PostSpec = {
  id: "kit-makermap",
  title: "MakerMap — one shape through the product",
  format: "square",
  fps: 60,
  clips: components.map((k) => ({ component: k.id })),
  music: { src: "media/music/library/screen-saver.mp3", gain: 0.5, offset: 22.244, fadeIn: 0.02, fadeOut: 0.8, credit: "\"Screen Saver\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Kit template: @verbove's MakerMap UI story film, 120 BPM, original states and data.",
};

export const makermap: Kit = {
  id: "makermap",
  promptId: "2103483957266268381",
  title: "UI story in one shape",
  family: "ui",
  format: "square",
  summary: "A 20-second UI story film where one shape morphs through an entire product: sign up, your pin, a dot-matrix globe filling with real makers, matches, stats, a meetup and a search, on a 120 BPM grid with closed-form springs and a cursor driving every change.",
  shots: [
    { at: 0, shot: "Logo pill", component: "makermap-logo" },
    { at: 0.9, shot: "→ 'Put me on the map' button, clicked", component: "makermap-cta" },
    { at: 1.8, shot: "→ handle field, @verbove typed", component: "makermap-handle" },
    { at: 3.4, shot: "→ 'Is this you?' card with real data; 'That's me'", component: "makermap-is-this-you" },
    { at: 4.3, shot: "→ loader → check", component: "makermap-check" },
    { at: 5.8, shot: "→ orange pin, 'You're on the map'", component: "makermap-pin" },
    { at: 6.8, shot: "→ globe filling with 3,393 real makers", component: "makermap-globe" },
    { at: 9.2, shot: "→ the globe shrinks to a dot", component: "makermap-globe-to-dot" },
    { at: 10.0, shot: "→ '6 matches · all in Lisbon' → the list", component: "makermap-matches" },
    { at: 12.6, shot: "→ stats tabs: products, countries", component: "makermap-stats" },
    { at: 14.2, shot: "→ meetup, RSVP", component: "makermap-meetup" },
    { at: 16.0, shot: "→ search 'ai founders in berlin' → results", component: "makermap-search" },
    { at: 18.5, shot: "→ logo + makermap.lol (loop)", component: "makermap-end" },
  ],
  rules: [
    "One HTML file, one canvas, one draw(t): no CSS transitions, no timers, no state between frames",
    "One shape, never cut: the same element changes size, radius and colour while the content swaps",
    "A cursor drives the sequence with real clicks, typing and one drag; real UI, real data, no placeholders",
    "Closed-form springs with a tiny overshoot; sum one spring per target change",
    "Content enters after its container starts morphing and leaves before the next; never fade black straight into the accent",
    "Zoom so every state fills the frame; last frame = first frame",
  ],
  components,
  template,
};
