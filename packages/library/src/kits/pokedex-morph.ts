// Kit: "Pokédex-style UI morph" (@TheGrootDev). A modern "Field Index" in one take: the card scans, finds a
// match, plays the cry, sets the volume, flips shiny, shows stats, searches the index and adds a Pokémon
// to the team, then returns to the opening card. Names, types and stats as in the original; the artwork
// is a placeholder (bring your own licensed art).

import { E, SPRING, alpha, clamp, mix, pr, spring, P, type Component, type RC } from "@motioneasy/engine";
import { mediaOr } from "../parts";
import type { PostSpec } from "../sequence";
import { caret, typed } from "./shared";
import { hand, inside, label, morphState, type Box, type Shape } from "./morph";
import type { Kit } from "./types";

const CANVAS = "#ECE8E2";
const PAPER = "#FAF7F2";
const RED = "#D7392D";
const INK = "#141414";
const GRAY = "#8F8A84";
const LOOK = { mode: "light" as const, bg: CANVAS, fg: INK, accent: RED, lighting: 0, grain: 0, vignette: 0, backdrop: "plain" as const, camera: "still" as const };
const kit = { category: "kit-pokedex-morph", formats: ["square" as const], theme: LOOK, canvas: CANVAS };
/** Measured against the original, the card system sits at 1.55× the base layout units. */
const Z = 1.55;
const u = (c: RC) => c.short * Z;

const S = {
  card: { w: 0.558, h: 0.372, r: 0.046, fill: PAPER, lift: 0.6 } as Shape,
  match: { w: 0.713, h: 0.465, r: 0.046, fill: PAPER, lift: 0.6 } as Shape,
  profile: { w: 0.775, h: 0.651, r: 0.046, fill: PAPER, lift: 0.6 } as Shape,
  stats: { w: 0.837, h: 0.620, r: 0.046, fill: PAPER, lift: 0.6 } as Shape,
  field: { w: 0.806, h: 0.155, r: 0.046, fill: PAPER, lift: 0.5 } as Shape,
  palette: { w: 0.806, h: 0.512, r: 0.046, fill: PAPER, lift: 0.5 } as Shape,
  result: { w: 0.837, h: 0.341, r: 0.046, fill: PAPER, lift: 0.5 } as Shape,
  toast: { w: 0.713, h: 0.139, r: 0.070, fill: INK } as Shape,
  blob: { w: 0.651, h: 0.248, r: 0.062, fill: "#7C7A76" } as Shape,
};

type Mon = { name: string; no: string; type: string; height: string; weight: string; ability: string; art: string | null; shiny: string | null };
const P_MON = {
  name: P.text("Pikachu", "Name", { maxLength: 20 }), no: P.text("0025", "Number", { maxLength: 6 }), type: P.text("Electric", "Type", { maxLength: 12 }),
  height: P.text("0.4 m", "Height", { maxLength: 10 }), weight: P.text("6.0 kg", "Weight", { maxLength: 10 }), ability: P.text("Static", "Ability", { maxLength: 16 }),
  art: P.media(null, "Artwork (your licensed art)", "image"), shiny: P.media(null, "Shiny artwork", "image"),
};

/** The red header strip every state of the card keeps (the Poké Ball's upper shell). */
function header(c: RC, b: Box, title: string, right?: (x: number, y: number, h: number) => void) {
  const h = Math.min(b.h * 0.24, u(c) * 0.06);
  c.save();
  c.clipRRect(b.x, b.y, b.w, b.h, b.r);
  c.rect(b.x, b.y, b.w, h, RED);
  c.rect(b.x, b.y + h, b.w, u(c) * 0.004, INK);
  c.restore();
  label(c, title, b.x + u(c) * 0.025, b.y + h * 0.62, h * 0.32, "#FFFFFF", { weight: 650 });
  right?.(b.x + b.w - u(c) * 0.02, b.y + h / 2, h);
  return h;
}
const checkBadge = (c: RC, x: number, y: number, h: number) => {
  c.circle(x - h * 0.25, y, h * 0.24, INK);
  c.polyline([[x - h * 0.36, y], [x - h * 0.27, y + h * 0.09], [x - h * 0.13, y - h * 0.09]], "#FFFFFF", h * 0.05);
};

function artBox(c: RC, x: number, y: number, s: number, ref: string | null, label2: string, shiny = 0) {
  mediaOr(c, ref, x, y, s, s, label2, { radius: s * 0.08, fit: "contain", tone: mix("#F1ECE4", "#F3E6C9", shiny), ink: "#6E655A" });
}

const ready = morphState<{ title: string; cta: string }>({
  ...kit, id: "pokedex-ready", name: "Field Index — Ready to Scan",
  description: "The opening (and closing) card: a red header with 'Field Index' and a black Scan button, 'Ready to scan', an empty number. The cursor clicks Scan.",
  tags: ["card", "scan", "button", "loop"], params: { title: P.text("Field Index", "Title", { maxLength: 20 }), cta: P.text("Scan", "Button", { maxLength: 10 }) },
  duration: 0.9, sounds: () => [{ at: 0.5, sound: "ui.click", gain: 0.45, role: "scan" }],
  from: S.card, to: S.card,
  content: (c, p, t, b) => inside(c, b, t, -1, () => {
    header(c, b, p.title, (x, y, h) => {
      const L = c.layout(p.cta, { font: "geist", size: h * 0.3, weight: 650 });
      c.rrect(x - L.width - h * 0.5, y - h * 0.26, L.width + h * 0.5, h * 0.52, h * 0.26, INK);
      c.drawLayout(L, x - L.width - h * 0.25, y - L.height / 2 + 1, { color: "#FFFFFF" });
    });
    label(c, "Ready to scan", b.x + u(c) * 0.025, b.y + b.h * 0.55, u(c) * 0.026, INK, { weight: 650 });
    label(c, "No. ----", b.x + u(c) * 0.025, b.y + b.h * 0.7, u(c) * 0.016, GRAY, { font: "mono" });
  }),
  over: (c, _p, t, b) => void hand(c, t, [[0, 0.2, 0.25], [0.45, (b.x + b.w - u(c) * 0.06 - c.cx) / c.short, (b.y + u(c) * 0.03 - c.cy) / c.short + 0.01], [0.9, 0.15, 0.03]], [0.5]),
});

const scan = morphState<{ title: string }>({
  ...kit, id: "pokedex-scan", name: "Scanning → Match Found",
  description: "The Scan button becomes a circular scanning loader ('Scanning · Reading signature'), resolves into a check, and the card stretches into 'Match found'.",
  tags: ["loader", "scan", "match", "morph"], params: { title: P.text("Field Index", "Title", { maxLength: 20 }) },
  duration: 1.5, sounds: () => [{ at: 0.05, sound: "fx.glitch", gain: 0.12, role: "scan" }, { at: 0.85, sound: "tonal.notify", gain: 0.3, role: "match" }],
  from: S.card, to: (t) => (t < 0.85 ? S.card : S.match),
  content: (c, p, t, b) => inside(c, b, t, -1, () => {
    const found = t >= 0.85;
    header(c, b, p.title, (x, y, h) => {
      if (!found) {
        c.circle(x - h * 0.25, y, h * 0.24, INK);
        c.arc(x - h * 0.25, y, h * 0.14, (t * 2) % 1, ((t * 2) % 1) + 0.35, "#FFFFFF", h * 0.05);
      } else checkBadge(c, x, y, h);
    });
    label(c, found ? "Match found" : "Scanning", b.x + u(c) * 0.025, b.y + b.h * (found ? 0.45 : 0.55), u(c) * 0.028, INK, { weight: 650 });
    label(c, found ? "opening profile" : "Reading signature", b.x + u(c) * 0.025, b.y + b.h * (found ? 0.56 : 0.7), u(c) * 0.016, GRAY, { font: "mono" });
  }),
  over: (c, _p, t) => void hand(c, t, [[0, 0.15, 0.03], [1.5, 0.2, 0.1]]),
});

function profileBody(c: RC, b: Box, p: Mon, t: number, shiny: number) {
  const k = u(c), hh = Math.min(b.h * 0.24, k * 0.06);
  const s = b.h * 0.56;
  const ax = b.x + k * 0.025, ay = b.y + hh + k * 0.025;
  artBox(c, ax, ay, s, shiny > 0.5 && p.shiny ? p.shiny : p.art, shiny > 0.5 ? "shiny art" : "artwork", shiny);
  if (shiny > 0.02) {
    c.rrect(ax + k * 0.012, ay + k * 0.012, k * 0.05, k * 0.022, k * 0.011, alpha(RED, shiny));
    label(c, "Shiny", ax + k * 0.037, ay + k * 0.028, k * 0.012, "#FFF", { weight: 650, align: "center", alpha: shiny });
  }
  const ix = ax + s + k * 0.03;
  label(c, `No. ${p.no}`, ix, ay + k * 0.022, k * 0.014, GRAY, { font: "mono" });
  label(c, p.name, ix, ay + k * 0.07, k * 0.042, INK, { weight: 750 });
  c.strokeRRect(ix, ay + k * 0.088, k * 0.085, k * 0.026, k * 0.013, INK, 1.2);
  label(c, `⚡ ${p.type}`, ix + k * 0.0425, ay + k * 0.106, k * 0.013, INK, { weight: 600, align: "center" });
  [["Height", p.height], ["Weight", p.weight], ["Ability", p.ability]].forEach(([l, v], i) => {
    label(c, l, ix, ay + k * (0.15 + i * 0.05), k * 0.011, GRAY);
    label(c, v, ix, ay + k * (0.172 + i * 0.05), k * 0.02, INK, { weight: 650 });
  });
}

const profile = morphState<Mon & { title: string }>({
  ...kit, id: "pokedex-profile", name: "Profile + Cry Playback",
  description: "The card expands to the featured Pokémon: artwork, number, name and type chip in a quick stagger, height, weight and ability; the cursor taps the cry control and it morphs into pause while a compact waveform plays.",
  tags: ["profile", "card", "audio", "waveform", "play pause"], params: { ...P_MON, title: P.text("Field Index", "Title", { maxLength: 20 }) },
  duration: 1.8, sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.25, role: "expand" }, { at: 0.95, sound: "ui.click", gain: 0.4, role: "play" }, { at: 1.0, sound: "tonal.shimmer", gain: 0.2, role: "cry" }],
  from: S.match, to: S.profile,
  content: (c, p, t, b) => inside(c, b, t, 0.1, () => {
    header(c, b, p.title, (x, y, h) => checkBadge(c, x, y, h));
    profileBody(c, b, p, t, 0);
    const k = u(c), cy = b.y + b.h - k * 0.045, cx = b.x + k * 0.05;
    const playing = pr(t, 0.95, 1.1);
    c.circle(cx, cy, k * 0.02, RED);
    if (playing < 0.5) c.poly([[cx - k * 0.006, cy - k * 0.009], [cx - k * 0.006, cy + k * 0.009], [cx + k * 0.009, cy]], "#FFF");
    else { c.rect(cx - k * 0.007, cy - k * 0.008, k * 0.004, k * 0.016, "#FFF"); c.rect(cx + k * 0.003, cy - k * 0.008, k * 0.004, k * 0.016, "#FFF"); }
    if (playing > 0) for (let i = 0; i < 28; i++) {
      const h = k * 0.026 * (0.2 + 0.8 * Math.abs(Math.sin(t * 9 + i * 0.7))) * playing;
      c.rect(cx + k * 0.035 + i * k * 0.0075, cy - h / 2, k * 0.003, h, INK);
    }
    label(c, "Cry", b.x + b.w * 0.6, cy - k * 0.012, k * 0.011, GRAY);
    label(c, playing > 0.5 ? "Playing" : "Tap to play", b.x + b.w * 0.6, cy + k * 0.01, k * 0.017, INK, { weight: 650 });
  }),
  over: (c, _p, t, b) => void hand(c, t, [[0, 0.2, 0.1], [0.9, (b.x + u(c) * 0.05 - c.cx) / c.short + 0.005, (b.y + b.h - u(c) * 0.045 - c.cy) / c.short + 0.005], [1.8, -0.15, 0.2]], [0.95]),
});

const volume = morphState<Mon & { title: string }>({
  ...kit, id: "pokedex-volume", name: "Waveform → Volume Slider",
  description: "The waveform flattens into a volume slider with a Poké Ball knob; dragged to max and beyond, the slider stretches elastically, then settles on release.",
  tags: ["slider", "volume", "drag", "elastic"], params: { ...P_MON, title: P.text("Field Index", "Title", { maxLength: 20 }) },
  duration: 1.6, sounds: () => [{ at: 0.3, sound: "riser.air", len: 0.8, gain: 0.2, role: "drag" }, { at: 1.2, sound: "impact.land", gain: 0.25, role: "release" }],
  from: S.profile,
  to: (t) => ({ ...S.profile, w: S.profile.w * (1 + 0.04 * pr(t, 0.95, 1.15, E.out) * (1 - pr(t, 1.2, 1.5, E.out))) }),
  content: (c, p, t, b) => inside(c, b, t, -1, () => {
    header(c, b, p.title, (x, y, h) => checkBadge(c, x, y, h));
    profileBody(c, b, p, t, 0);
    const k = u(c), cy = b.y + b.h - k * 0.045;
    const v = clamp(0.4 + 0.6 * pr(t, 0.25, 0.95, E.inOut));
    const x0 = b.x + k * 0.06, x1 = b.x + b.w * 0.56;
    c.circle(b.x + k * 0.035, cy, k * 0.008, GRAY);
    c.rrect(x0, cy - 2, x1 - x0, 4, 2, "#E2DDD6");
    c.rrect(x0, cy - 2, (x1 - x0) * v, 4, 2, RED);
    const kx = x0 + (x1 - x0) * v, r = k * 0.013;
    c.circle(kx, cy, r, RED);
    c.ctx.beginPath(); c.ctx.arc(kx, cy, r, 0, Math.PI); c.ctx.fillStyle = "#FFF"; c.ctx.fill();
    c.rect(kx - r, cy - 1, r * 2, 2, INK);
    label(c, "Volume", b.x + b.w * 0.6, cy - k * 0.012, k * 0.011, GRAY);
    label(c, `${Math.round(v * 100)}%`, b.x + b.w * 0.6, cy + k * 0.01, k * 0.017, INK, { weight: 650 });
  }),
  over: (c, _p, t, b) => {
    const y = (b.y + b.h - u(c) * 0.045 - c.cy) / c.short;
    hand(c, t, [[0, -0.15, 0.2], [0.2, -0.16, y + 0.005], [0.95, 0.047, y + 0.005], [1.15, 0.07, y + 0.005], [1.6, 0.08, y + 0.05]], [0.22]);
  },
});

const shinyTabs = morphState<Mon & { title: string }>({
  ...kit, id: "pokedex-shiny-tabs", name: "Shiny Toggle → Tabs",
  description: "The slider compresses into a 'Shiny' toggle; flipped, the artwork switches to its shiny variant. Then the knob stretches into a liquid tab indicator and the cursor picks Stats.",
  tags: ["toggle", "shiny", "tabs", "liquid indicator"], params: { ...P_MON, title: P.text("Field Index", "Title", { maxLength: 20 }) },
  duration: 1.8, sounds: () => [{ at: 0.35, sound: "kenney.toggle", gain: 0.4, role: "shiny" }, { at: 0.4, sound: "tonal.shimmer", gain: 0.2, role: "sparkle" }, { at: 1.4, sound: "ui.click", gain: 0.35, role: "stats" }],
  from: S.profile, to: S.profile,
  content: (c, p, t, b) => inside(c, b, t, -1, () => {
    header(c, b, p.title, (x, y, h) => checkBadge(c, x, y, h));
    const sh = pr(t, 0.35, 0.6, E.inOut);
    profileBody(c, b, p, t, sh);
    const k = u(c), cy = b.y + b.h - k * 0.045;
    if (t < 0.9) {
      label(c, "Shiny", b.x + k * 0.03, cy + k * 0.006, k * 0.017, INK, { weight: 650 });
      const tx = b.x + b.w * 0.45, tw = k * 0.05, th = k * 0.026;
      c.rrect(tx, cy - th / 2, tw, th, th / 2, mix("#D7D2CB", RED, sh));
      c.circle(tx + th / 2 + (tw - th) * clamp(spring(t - 0.35, SPRING.punchy), 0, 1.02), cy, th * 0.4, "#FFF");
    } else {
      const tabs = ["About", "Stats", "Moves"], x0 = b.x + k * 0.03, w = k * 0.08, th = k * 0.03;
      c.rrect(x0, cy - th / 2, w * 3, th, th / 2, "#EDE8E1");
      const lead = x0 + w * clamp(spring(t - 1.4, SPRING.punchy), 0, 1.02), trail = x0 + w + w * clamp(spring(t - 1.45, SPRING.firm), 0, 1.02);
      c.rrect(Math.min(lead, x0 + w), cy - th / 2 + 2, Math.max(w, trail - lead), th - 4, th / 2, INK);
      tabs.forEach((s, i) => label(c, s, x0 + w * i + w / 2, cy + k * 0.006, k * 0.013, (t < 1.45 ? i === 0 : i === 1) ? "#FFF" : INK, { weight: 600, align: "center" }));
    }
  }),
  over: (c, _p, t, b) => {
    const y = (b.y + b.h - u(c) * 0.045 - c.cy) / c.short;
    hand(c, t, [[0, 0.1, y + 0.05], [0.3, (b.x + b.w * 0.45 + u(c) * 0.025 - c.cx) / c.short, y + 0.005], [1.35, -0.155, y + 0.005], [1.8, -0.13, y + 0.05]], [0.35, 1.4]);
  },
});

const STATS = ["HP|35", "Attack|55", "Defense|40", "Sp. Atk|50", "Sp. Def|50", "Speed|90"];

const stats = morphState<{ title: string; stats: string[] }>({
  ...kit, id: "pokedex-stats", name: "Stat Chart",
  description: "The card opens into a clean stat chart: the bars draw themselves on the beat while the numbers count, a total sits top right, and hovering a bar lifts it.",
  tags: ["stats", "bar chart", "counter", "data"], params: { title: P.text("Field Index", "Title", { maxLength: 20 }), stats: P.list(STATS, "Stats (name|value)", { min: 3, max: 8 }) },
  duration: 1.6, sounds: (p) => p.stats.map((_, i) => ({ at: 0.2 + i * 0.12, sound: "ui.tick", gain: 0.2, seed: i, role: "bar" })),
  from: S.profile, to: S.stats,
  content: (c, p, t, b) => inside(c, b, t, 0.1, () => {
    header(c, b, p.title, (x, y, h) => checkBadge(c, x, y, h));
    const k = u(c), rows = p.stats.map((s) => s.split("|"));
    const total = rows.reduce((s, [, v]) => s + Number(v ?? 0), 0);
    const tabs = ["About", "Stats", "Moves"], x0 = b.x + k * 0.03, w = k * 0.075, ty = b.y + k * 0.09, th = k * 0.028;
    c.rrect(x0, ty - th / 2, w * 3, th, th / 2, "#EDE8E1");
    c.rrect(x0 + w, ty - th / 2 + 2, w, th - 4, th / 2, INK);
    tabs.forEach((s, i) => label(c, s, x0 + w * i + w / 2, ty + k * 0.005, k * 0.012, i === 1 ? "#FFF" : INK, { weight: 600, align: "center" }));
    label(c, `Total ${total}`, b.x + b.w - k * 0.03, ty + k * 0.005, k * 0.014, INK, { weight: 650, align: "right" });
    rows.forEach(([n, v], i) => {
      const y = b.y + k * (0.14 + i * 0.038);
      const g = pr(t, 0.2 + i * 0.12, 0.6 + i * 0.12, E.out);
      label(c, n ?? "", x0, y + k * 0.006, k * 0.013, INK, { weight: 500 });
      label(c, String(Math.round(Number(v ?? 0) * g)), x0 + k * 0.1, y + k * 0.006, k * 0.013, INK, { weight: 650 });
      const bx = x0 + k * 0.13, bw = b.w - k * 0.19;
      c.rrect(bx, y - k * 0.005, bw, k * 0.01, k * 0.005, "#EDE8E1");
      const hover = i === 5 && t > 1.2 ? 1 : 0;
      c.rrect(bx, y - k * 0.005 - hover, bw * (Number(v ?? 0) / 160) * g, k * 0.01 + hover * 2, k * 0.005, INK);
    });
  }),
  over: (c, _p, t) => void hand(c, t, [[0, -0.1, 0.2], [1.2, 0.06, 0.12], [1.6, 0.08, 0.14]]),
});

const INDEX = ["Pikachu|Electric|0025", "Eevee|Normal|0133", "Espeon|Psychic|0196", "Ekans|Poison|0023", "Electrode|Electric|0101"];

const searchShot = morphState<{ placeholder: string; query: string; index: string[]; pick: string | null }>({
  ...kit, id: "pokedex-search", name: "Chart → Search the Index → Pick",
  description: "The chart retracts into a search field that expands into a command palette; a short name types itself, results filter, and the match opens with its mini artwork, type chip and number; Enter adds it.",
  tags: ["search", "command palette", "filter", "result"], params: { placeholder: P.text("Search the index", "Placeholder", { maxLength: 30 }), query: P.text("Eevee", "Typed", { maxLength: 16 }), index: P.list(INDEX, "Index (name|type|no.)", { max: 6 }), pick: P.media(null, "Picked Pokémon artwork", "image") },
  duration: 2.6, sounds: (p) => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.25, role: "retract" }, ...Array.from(p.query).map((_, i) => ({ at: 0.9 + i * 0.12, sound: "foley.key", gain: 0.16, seed: i, role: "type" })), { at: 1.8, sound: "ui.click", gain: 0.35, role: "pick" }, { at: 2.4, sound: "ui.click", gain: 0.35, role: "enter" }],
  from: S.stats, to: (t) => (t < 0.45 ? S.field : t < 1.8 ? S.palette : S.result),
  content: (c, p, t, b) => inside(c, b, t, 0.1, () => {
    const k = u(c);
    const q = typed(p.query, t, 0.9, 8);
    c.circle(b.x + k * 0.04, b.y + k * 0.045, k * 0.017, INK);
    c.circle(b.x + k * 0.038, b.y + k * 0.043, k * 0.006, "#FFF");
    const L = label(c, q || p.placeholder, b.x + k * 0.07, b.y + k * 0.053, k * (q ? 0.026 : 0.02), q ? INK : GRAY, { weight: q ? 600 : 400 });
    if (caret(t)) c.rect(b.x + k * 0.07 + (q ? L.width : 0) + 2, b.y + k * 0.03, 2, k * 0.03, INK);
    if (t < 0.45) return;
    const rows = p.index.map((s) => s.split("|")).filter(([n]) => !q || (n ?? "").toLowerCase().startsWith(q.toLowerCase().slice(0, Math.max(1, q.length))));
    if (t < 1.8) {
      rows.forEach(([n, ty, no], i) => {
        const y = b.y + k * (0.11 + i * 0.045);
        if (y > b.y + b.h - k * 0.02) return;
        if (q && i === 0) c.rrect(b.x + k * 0.015, y - k * 0.025, b.w - k * 0.03, k * 0.04, k * 0.01, "#EFEAE3");
        label(c, n ?? "", b.x + k * 0.035, y + k * 0.002, k * 0.017, INK, { weight: 650 });
        label(c, ty ?? "", b.x + b.w * 0.68, y + k * 0.002, k * 0.012, GRAY, { align: "right" });
        label(c, `No. ${no ?? ""}`, b.x + b.w - k * 0.03, y + k * 0.002, k * 0.012, GRAY, { font: "mono", align: "right" });
      });
      return;
    }
    const [n, ty, no] = rows[0] ?? ["", "", ""];
    c.rrect(b.x + k * 0.015, b.y + k * 0.09, b.w - k * 0.03, b.h - k * 0.105, k * 0.015, "#EFEAE3");
    artBox(c, b.x + k * 0.03, b.y + k * 0.105, b.h - k * 0.135, p.pick, "art");
    label(c, n ?? "", b.x + k * 0.03 + b.h - k * 0.11, b.y + k * 0.135, k * 0.022, INK, { weight: 650 });
    c.strokeRRect(b.x + k * 0.03 + b.h - k * 0.11, b.y + k * 0.15, k * 0.08, k * 0.026, k * 0.013, INK, 1.2);
    label(c, ty ?? "", b.x + k * 0.07 + b.h - k * 0.11, b.y + k * 0.168, k * 0.013, INK, { weight: 600, align: "center" });
    label(c, `No. ${no ?? ""}`, b.x + k * 0.13 + b.h - k * 0.11, b.y + k * 0.168, k * 0.012, GRAY, { font: "mono" });
    c.rrect(b.x + b.w - k * 0.09, b.y + k * 0.03, k * 0.065, k * 0.026, k * 0.008, "#EFEAE3");
    label(c, "↵ Add", b.x + b.w - k * 0.0575, b.y + k * 0.048, k * 0.012, INK, { align: "center" });
  }),
  over: (c, _p, t) => void hand(c, t, [[0, 0.06, 0.14], [1.7, -0.12, 0.0], [2.6, 0.08, 0.1]], [1.8]),
});

const team = morphState<{ name: string; no: string; toast: string; title: string; cta: string }>({
  ...kit, id: "pokedex-team-return", name: "Added to Team → Back to the Card",
  description: "Enter folds the palette into a black 'Added to team' toast with a red check; the check becomes the card's button, the toast contracts, and the red shell, black divider and paper body settle back into the opening card.",
  tags: ["toast", "confirmation", "loop", "return"], params: { name: P.text("Eevee", "Added", { maxLength: 20 }), no: P.text("0133", "Number", { maxLength: 6 }), toast: P.text("Added to team", "Toast", { maxLength: 30 }), title: P.text("Field Index", "Title", { maxLength: 20 }), cta: P.text("Scan", "Button", { maxLength: 10 }) },
  duration: 2.2, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.25, role: "fold" }, { at: 0.25, sound: "tonal.notify", gain: 0.3, role: "added" }, { at: 1.1, sound: "whoosh.swipe", gain: 0.2, role: "return" }],
  from: S.result, to: (t) => (t < 0.9 ? S.toast : t < 1.3 ? S.blob : S.card),
  content: (c, p, t, b) => {
    if (t < 0.9) inside(c, b, t, 0.1, () => {
      const cx = b.x + b.h * 0.5, cy = b.y + b.h / 2, r = b.h * 0.22;
      c.circle(cx, cy, r, RED);
      c.polyline([[cx - r * 0.45, cy], [cx - r * 0.1, cy + r * 0.35], [cx + r * 0.5, cy - r * 0.35]], "#FFF", r * 0.2, pr(t, 0.2, 0.4));
      label(c, p.toast, cx + b.h * 0.42, b.y + b.h * 0.47, b.h * 0.26, "#FFF", { weight: 650 });
      label(c, `${p.name} · No. ${p.no}`, cx + b.h * 0.42, b.y + b.h * 0.75, b.h * 0.17, GRAY);
    });
    if (t >= 1.3) inside(c, b, t, 1.4, () => {
      header(c, b, p.title, (x, y, h) => {
        const L = c.layout(p.cta, { font: "geist", size: h * 0.3, weight: 650 });
        c.rrect(x - L.width - h * 0.5, y - h * 0.26, L.width + h * 0.5, h * 0.52, h * 0.26, INK);
        c.drawLayout(L, x - L.width - h * 0.25, y - L.height / 2 + 1, { color: "#FFFFFF" });
      });
      label(c, "Ready to scan", b.x + u(c) * 0.025, b.y + b.h * 0.55, u(c) * 0.026, INK, { weight: 650 });
      label(c, "No. ----", b.x + u(c) * 0.025, b.y + b.h * 0.7, u(c) * 0.016, GRAY, { font: "mono" });
    });
  },
  over: (c, _p, t) => void hand(c, t, [[0, 0.08, 0.1], [2.2, 0.2, 0.25]]),
});

const components: Component[] = [ready, scan, profile, volume, shinyTabs, stats, searchShot, team];

const template: PostSpec = {
  id: "kit-pokedex-morph",
  title: "Field Index — Pokédex-style UI morph",
  format: "square",
  fps: 60,
  clips: components.map((k) => ({ component: k.id })),
  music: { src: "media/music/library/voxel-revolution.mp3", gain: 0.45, offset: 11.834, fadeIn: 0.02, fadeOut: 0.6, credit: "\"Voxel Revolution\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Kit template: @TheGrootDev's Pokédex-style UI morph, 7 bars at 120 BPM; add your licensed artwork.",
};

export const pokedexMorph: Kit = {
  id: "pokedex-morph",
  promptId: "2103516567824966114",
  title: "Pokédex-style UI morph",
  family: "ui",
  format: "square",
  summary: "A 14-second playful-but-precise 'Field Index' film: one card with a red shell and black divider scans, matches, plays a cry, sets the volume, flips shiny, shows stats, searches the index and adds a Pokémon to the team before folding back into the opening card.",
  shots: [
    { at: 0, shot: "Bar 1: the closed card sits centred; the cursor clicks Scan", component: "pokedex-ready" },
    { at: 0.9, shot: "The button becomes a scanning loader, resolves into a check; 'Match found'", component: "pokedex-scan" },
    { at: 2.4, shot: "Bar 2: the featured Pokémon, number, name and type in a stagger; the cry control morphs into pause with a waveform", component: "pokedex-profile" },
    { at: 4.2, shot: "Bar 3: the waveform flattens into a volume slider dragged past max, stretching elastically", component: "pokedex-volume" },
    { at: 5.8, shot: "Bar 4: shiny toggle flips the artwork; the knob stretches into tabs; 'Stats'", component: "pokedex-shiny-tabs" },
    { at: 7.6, shot: "Bar 5: stat bars draw on the beat; hover lifts a bar", component: "pokedex-stats" },
    { at: 9.2, shot: "Bar 6: search field → palette; type a name; pick the result", component: "pokedex-search" },
    { at: 11.8, shot: "Bar 7: 'Added to team' toast; the check becomes the button; back to the opening card", component: "pokedex-team-return" },
  ],
  rules: [
    "One persistent outer element: the card's red shell, black dividing line and central button become every state's structure",
    "Warm off-white, black and Poké Ball red; artwork keeps its original colours and is never stretched",
    "A visible cursor drives every interaction; tightly damped springs with a tiny overshoot",
    "Tab indicator and toggle knob on two springs; drags are direct manipulation with a matching release spring",
    "Accurate names, types, shiny variants and stats; nothing invented",
    "120 BPM, 7 bars, 28 beats; the loop matches geometry, content, camera, cursor position and velocity",
  ],
  components,
  template,
};

void alpha;
