// Kit: "Product promo built from your real UI" (@AnnaCher___). Sprites, an AI ads platform, in one take: a
// shape morphs through connect → research → an ad up for approval → budget → autopilot → channels → ROAS →
// pause the losers, a cursor driving every change on a 120 BPM grid; the 14 s loop is the whole film.

import { E, SPRING, alpha, clamp, mix, pr, spring, P, type Component, type RC } from "@motioneasy/engine";
import { mediaOr } from "../parts";
import type { PostSpec } from "../sequence";
import { caret, typed } from "./shared";
import { hand, inside, label, morphState, type Box, type Shape } from "./morph";
import type { Kit } from "./types";

const CANVAS = "#E9E5E0";
const INK = "#141414";
const WHITE = "#FFFFFF";
const ORANGE = "#FD9543";
const GRAY = "#8E8A85";
const LOOK = { mode: "light" as const, bg: CANVAS, fg: INK, accent: ORANGE, lighting: 0, grain: 0, vignette: 0, backdrop: "plain" as const, camera: "still" as const };
const kit = { category: "kit-sprites-promo", formats: ["square" as const], theme: LOOK, canvas: CANVAS };
const u = (c: RC) => c.short;

const S = {
  connect: { w: 0.64, h: 0.1, r: 0.05, fill: INK } as Shape,
  check: { w: 0.12, h: 0.12, r: 0.06, fill: INK } as Shape,
  done: { w: 0.24, h: 0.09, r: 0.045, fill: "#F6B98A", lift: 0.4 } as Shape,
  prompt: { w: 0.56, h: 0.07, r: 0.035, fill: WHITE, lift: 0.4 } as Shape,
  island: { w: 0.58, h: 0.08, r: 0.04, fill: INK } as Shape,
  wall: { w: 0.9, h: 0.46, r: 0.025, fill: WHITE, lift: 0.5 } as Shape,
  ad: { w: 0.36, h: 0.52, r: 0.03, fill: WHITE, lift: 0.5 } as Shape,
  budget: { w: 0.56, h: 0.13, r: 0.03, fill: WHITE, lift: 0.5 } as Shape,
  autopilot: { w: 0.66, h: 0.15, r: 0.075, fill: WHITE, lift: 0.5 } as Shape,
  tabs: { w: 0.66, h: 0.1, r: 0.05, fill: WHITE, lift: 0.4 } as Shape,
  chart: { w: 0.58, h: 0.44, r: 0.03, fill: WHITE, lift: 0.5 } as Shape,
  palette: { w: 0.56, h: 0.3, r: 0.03, fill: WHITE, lift: 0.5 } as Shape,
  toast: { w: 0.58, h: 0.08, r: 0.04, fill: INK } as Shape,
};

/** Platform badge: a small disc with the platform's initial (drop in the real logos via media). */
function platform(c: RC, x: number, y: number, r: number, name: string, color: string) {
  c.circle(x, y, r, color);
  label(c, name[0], x, y + r * 0.38, r * 1.05, WHITE, { weight: 700, align: "center" });
}
const PLATFORMS: [string, string][] = [["Meta", "#1877F2"], ["Google", "#EA4335"], ["LinkedIn", "#0A66C2"], ["TikTok", "#111111"], ["Reddit", "#FF4500"]];

function connectContent(c: RC, b: Box, text: string) {
  PLATFORMS.forEach(([n, col], i) => platform(c, b.x + b.h * (0.55 + i * 0.42), b.y + b.h / 2, b.h * 0.2, n, col));
  label(c, `${text}  →`, b.x + b.w - b.h * 0.45, b.y + b.h * 0.6, b.h * 0.25, WHITE, { weight: 600, align: "right" });
}

const connect = morphState<{ label: string }>({
  ...kit, id: "sprites-connect", name: "Connect Ad Account",
  description: "The loop's first and last state: a black pill offering to connect your ad accounts, the platform badges in a row; the cursor clicks it.",
  tags: ["onboarding", "integrations", "button", "loop"], params: { label: P.text("Connect ad account", "Label", { maxLength: 30 }) },
  duration: 1.2, sounds: () => [{ at: 0.9, sound: "ui.click", gain: 0.45, role: "click" }],
  from: S.connect, to: S.connect,
  content: (c, p, t, b) => inside(c, b, t, -1, () => connectContent(c, b, p.label)),
  over: (c, _p, t) => void hand(c, t, [[0, 0.2, 0.25], [0.85, 0.16, 0.02], [1.2, 0.16, 0.03]], [0.9]),
});

const connected = morphState<{}>({
  ...kit, id: "sprites-check", name: "Loader → Check",
  description: "A spinner runs inside the pill, the pill contracts to a circle, and it opens into a soft peach pill with a check: connected.",
  tags: ["loader", "check"], params: {},
  duration: 1.2, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "collapse" }, { at: 0.75, sound: "tonal.notify", gain: 0.3, role: "connected" }],
  from: S.connect, to: (t) => (t < 0.35 ? S.connect : t < 0.75 ? S.check : S.done),
  content: (c, _p, t, b) => inside(c, b, t, 0.05, () => {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = b.h * 0.25;
    if (t < 0.75) c.arc(cx, cy, r, (t * 2) % 1, ((t * 2) % 1) + 0.3, WHITE, b.h * 0.05);
    else c.polyline([[cx - r * 0.6, cy], [cx - r * 0.15, cy + r * 0.45], [cx + r * 0.7, cy - r * 0.45]], WHITE, r * 0.3, pr(t, 0.78, 1.0, E.out));
  }),
});

const prompt = morphState<{ prompt: string }>({
  ...kit, id: "sprites-prompt", name: "Prompt Bar",
  description: "The check opens into a white prompt bar and the brief types itself, then sends.",
  tags: ["prompt", "typing", "ai", "input"], params: { prompt: P.text("Launch ads that convert", "Prompt", { maxLength: 40 }) },
  duration: 0.9, sounds: (p) => [{ at: 0.05, sound: "whoosh.air", gain: 0.2, role: "open" }, ...Array.from(p.prompt).filter((_, i) => i % 2 === 0).map((_, i) => ({ at: 0.12 + (i * 2) / 30, sound: "foley.key", gain: 0.15, seed: i, role: "type" })), { at: 0.85, sound: "ui.click", gain: 0.3, role: "enter" }],
  from: S.done, to: S.prompt,
  content: (c, p, t, b) => inside(c, b, t, 0.1, () => {
    const q = typed(p.prompt, t, 0.12, 30);
    c.circle(b.x + b.h * 0.5, b.y + b.h / 2, b.h * 0.12, GRAY);
    const L = label(c, q, b.x + b.h * 0.85, b.y + b.h * 0.6, b.h * 0.28, INK, { weight: 550 });
    if (caret(t)) c.rect(b.x + b.h * 0.85 + L.width + 2, b.y + b.h * 0.32, 2, b.h * 0.36, INK);
    c.rrect(b.x + b.w - b.h * 0.82, b.y + b.h * 0.18, b.h * 0.64, b.h * 0.64, b.h * 0.32, q.length >= p.prompt.length ? INK : alpha(INK, 0.2));
    label(c, "↑", b.x + b.w - b.h * 0.5, b.y + b.h * 0.63, b.h * 0.32, WHITE, { align: "center" });
  }),
});

const research = morphState<{ label: string; ads: string[] }>({
  ...kit, id: "sprites-research", name: "Research Island → Ads Library",
  description: "The bar becomes a black island ('Researching 42 competitors') that opens into the Ads Library: real ads scroll past while the analysed count climbs, landing on a top performer.",
  tags: ["island", "research", "ads library", "scroll"],
  params: { label: P.text("Researching 42 competitors", "Island", { maxLength: 40 }), ads: P.mediaList([], "Real ads from your library", "any", { min: 0, max: 16 }) },
  duration: 1.6, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.25, role: "island" }, { at: 0.55, sound: "whoosh.air", gain: 0.3, role: "library" }, { at: 1.4, sound: "impact.land", gain: 0.3, role: "land" }],
  from: S.prompt, to: (t) => (t < 0.55 ? S.island : S.wall),
  content: (c, p, t, b) => inside(c, b, t, 0.1, () => {
    if (t < 0.55) {
      c.arc(b.x + b.h * 0.6, b.y + b.h / 2, b.h * 0.18, (t * 2.4) % 1, ((t * 2.4) % 1) + 0.3, ORANGE, b.h * 0.05);
      label(c, p.label, b.x + b.h * 1.0, b.y + b.h * 0.6, b.h * 0.3, WHITE, { weight: 600 });
      return;
    }
    const k = b.w;
    label(c, "Ads Library", b.x + k * 0.025, b.y + k * 0.04, k * 0.02, INK, { weight: 650 });
    const n = Math.round(1284 * pr(t, 0.55, 1.4));
    label(c, `${n.toLocaleString("en-US")} creatives analyzed`, b.x + k * 0.12, b.y + k * 0.04, k * 0.014, GRAY);
    label(c, "● Finding winners", b.x + b.w - k * 0.025, b.y + k * 0.04, k * 0.014, ORANGE, { align: "right" });
    const cols = 6, gap = k * 0.012, cw = (b.w - k * 0.05 - gap * (cols - 1)) / cols, ch = (b.h - k * 0.09 - gap) / 2;
    const scroll = (1 - E.out(pr(t, 0.55, 1.35))) * (cw + gap) * 3;
    c.save();
    c.clipRect(b.x, b.y + k * 0.06, b.w, b.h - k * 0.06);
    for (let r = 0; r < 2; r++) for (let j = -1; j < cols + 4; j++) {
      const i = r * 8 + j;
      const x = b.x + k * 0.025 + j * (cw + gap) - scroll, y = b.y + k * 0.065 + r * (ch + gap);
      if (x > b.x + b.w || x + cw < b.x) continue;
      const slot = ((i % 16) + 16) % 16;
      mediaOr(c, p.ads[slot] ?? null, x, y, cw, ch, `ad ${slot + 1}`, { radius: k * 0.008, tone: "#EDE8E2", ink: "#6F6A64" });
      if (r === 0 && j === 3 && t > 1.3) {
        c.strokeRRect(x - 2, y - 2, cw + 4, ch + 4, k * 0.01, ORANGE, 3);
        c.rrect(x + cw * 0.08, y + ch * 0.06, cw * 0.84, k * 0.024, k * 0.012, INK);
        label(c, "Top performer", x + cw / 2, y + ch * 0.06 + k * 0.017, k * 0.012, WHITE, { weight: 600, align: "center" });
      }
    }
    c.restore();
  }),
});

const approve = morphState<{ brand: string; headline: string; ad: string | null; adTitle: string; ctr: string; edit: string; cta: string }>({
  ...kit, id: "sprites-approval", name: "Ad Approval Card",
  description: "The top performer lifts out as an approval card: platform and advertiser, the ad creative, its headline with a CTR badge, Edit and 'Approve & launch', which turns orange when the cursor clicks it.",
  tags: ["approval", "ad creative", "card", "cta"],
  params: { brand: P.text("OpusClip", "Advertiser", { maxLength: 24 }), headline: P.text("Grow your channel in 2026 with the *#1 AI clipping tool*", "Ad copy (*accent*)", { maxLength: 80 }), ad: P.media(null, "Ad creative", "any"), adTitle: P.text("The #1 AI clipping tool", "Headline", { maxLength: 40 }), ctr: P.text("+34% CTR", "Badge", { maxLength: 12 }), edit: P.text("Edit", "Secondary", { maxLength: 10 }), cta: P.text("Approve & launch", "Button", { maxLength: 20 }) },
  duration: 1.2, sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.25, role: "lift" }, { at: 0.9, sound: "ui.click", gain: 0.45, role: "approve" }],
  from: S.wall, to: S.ad,
  content: (c, p, t, b) => inside(c, b, t, 0.1, () => {
    const k = b.w;
    c.rrect(b.x + k * 0.05, b.y + k * 0.04, k * 0.18, k * 0.06, k * 0.03, INK);
    label(c, "Meta Ads", b.x + k * 0.14, b.y + k * 0.081, k * 0.03, WHITE, { weight: 600, align: "center" });
    label(c, p.brand, b.x + k * 0.27, b.y + k * 0.081, k * 0.034, INK, { weight: 650 });
    label(c, "● Needs approval", b.x + k * 0.95, b.y + k * 0.081, k * 0.028, ORANGE, { align: "right" });
    const ax = b.x + k * 0.05, ay = b.y + k * 0.13, aw = k * 0.9, ah = b.h * 0.58;
    if (p.ad) c.media(p.ad, ax, ay, aw, ah, { radius: k * 0.03, key: "sp-ad" });
    else {
      c.rrect(ax, ay, aw, ah, k * 0.03, "#121212");
      label(c, p.brand, ax + aw / 2, ay + ah * 0.13, k * 0.045, WHITE, { weight: 700, align: "center" });
      const H = c.fit(p.headline, { font: "geist", size: k * 0.055, weight: 700, lineHeight: 1.15, em: { font: "geist", italic: false, weight: 800 } }, aw * 0.84, ah * 0.3, { align: "center" });
      c.drawLayout(H, ax + aw / 2 - H.width / 2, ay + ah * 0.2, { color: WHITE, emColor: "#C6F432" });
      for (let i = 0; i < 3; i++) c.rrect(ax + aw * (0.08 + i * 0.29), ay + ah * 0.55, aw * 0.26, ah * 0.4, 6, ["#5C4B3F", "#3E4A5C", "#4C3E5C"][i]);
    }
    label(c, "Headline", b.x + k * 0.05, ay + ah + k * 0.06, k * 0.026, GRAY);
    const T = label(c, p.adTitle, b.x + k * 0.05, ay + ah + k * 0.11, k * 0.036, INK, { weight: 650 });
    c.rrect(b.x + k * 0.07 + T.width, ay + ah + k * 0.08, k * 0.14, k * 0.042, k * 0.021, alpha(ORANGE, 0.18));
    label(c, p.ctr, b.x + k * 0.14 + T.width, ay + ah + k * 0.109, k * 0.024, ORANGE, { weight: 600, align: "center" });
    label(c, p.edit, b.x + k * 0.17, b.y + b.h - k * 0.07, k * 0.032, INK, { align: "center" });
    const press = clamp(1 - Math.abs(t - 0.92) / 0.08);
    c.with({ x: b.x + k * 0.64, y: b.y + b.h - k * 0.08, scale: 1 - press * 0.04 }, () => {
      c.rrect(-k * 0.3, -k * 0.045, k * 0.6, k * 0.09, k * 0.045, mix(INK, ORANGE, pr(t, 0.92, 1.05)));
      label(c, p.cta, 0, k * 0.012, k * 0.032, WHITE, { weight: 600, align: "center" });
    });
  }),
  over: (c, _p, t, b) => void hand(c, t, [[0, 0.2, 0.3], [0.85, (b.x + b.w * 0.64 - c.cx) / u(c), (b.y + b.h - b.w * 0.08 - c.cy) / u(c)], [1.2, 0.1, 0.25]], [0.92]),
});

const budget = morphState<{ label: string; from: number; max: number; unit: string }>({
  ...kit, id: "sprites-budget", name: "Budget Slider (stretch past max)",
  description: "Approval collapses into a daily-budget slider; the value follows the drag up to MAX, and pulled past it the card stretches like rubber before springing back.",
  tags: ["slider", "budget", "drag", "rubber band"],
  params: { label: P.text("Daily budget", "Label", { maxLength: 24 }), from: P.number(62, "Start value", { min: 0, max: 99999, step: 1, group: "content" }), max: P.number(200, "Max", { min: 1, max: 99999, step: 1, group: "content" }), unit: P.text("/day", "Unit", { maxLength: 10 }) },
  duration: 2.0, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.25, role: "collapse" }, { at: 0.6, sound: "riser.air", len: 0.9, gain: 0.2, role: "drag" }, { at: 1.6, sound: "impact.land", gain: 0.25, role: "release" }],
  from: S.ad,
  to: (t) => {
    const over = pr(t, 1.25, 1.5, E.out) * (1 - pr(t, 1.55, 1.9, E.out));
    return { ...S.budget, w: S.budget.w * (1 + 0.08 * over) };
  },
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => {
    const k2 = pr(t, 0.55, 1.25, E.inOut);
    const v = clamp(0.31 + 0.69 * k2);
    const val = Math.round(p.from + (p.max - p.from) * k2);
    label(c, p.label, b.x + b.h * 0.25, b.y + b.h * 0.35, b.h * 0.16, GRAY);
    const U = c.layout(p.unit, { font: "geist", size: b.h * 0.14, weight: 450 });
    label(c, p.unit, b.x + b.w - b.h * 0.25, b.y + b.h * 0.38, b.h * 0.14, GRAY, { align: "right" });
    const V = label(c, `$${val}`, b.x + b.w - b.h * 0.3 - U.width, b.y + b.h * 0.4, b.h * 0.3, INK, { weight: 700, align: "right" });
    if (val >= p.max) {
      const mx = b.x + b.w - b.h * 0.42 - U.width - V.width - b.h * 0.42;
      c.rrect(mx, b.y + b.h * 0.2, b.h * 0.38, b.h * 0.17, b.h * 0.085, alpha(ORANGE, 0.2));
      label(c, "MAX", mx + b.h * 0.19, b.y + b.h * 0.33, b.h * 0.1, ORANGE, { weight: 700, align: "center" });
    }
    const x0 = b.x + b.h * 0.25, x1 = b.x + b.w - b.h * 0.25, y = b.y + b.h * 0.7;
    c.rrect(x0, y - 2, x1 - x0, 4, 2, "#ECE8E3");
    c.rrect(x0, y - 2, (x1 - x0) * v, 4, 2, INK);
    c.circle(x0 + (x1 - x0) * v, y, b.h * 0.08, WHITE);
    c.ctx.beginPath();
    c.ctx.arc(x0 + (x1 - x0) * v, y, b.h * 0.08, 0, Math.PI * 2);
    c.ctx.strokeStyle = alpha(INK, 0.15);
    c.ctx.stroke();
  }),
  over: (c, _p, t, b) => {
    const y = (b.y + b.h * 0.7 - c.cy) / u(c);
    hand(c, t, [[0, 0.1, 0.25], [0.5, -0.09, y + 0.01], [1.25, 0.24, y + 0.01], [1.5, 0.3, y + 0.01], [2.0, 0.32, y + 0.06]], [0.52]);
  },
});

const autopilot = morphState<{ title: string; sub: string }>({
  ...kit, id: "sprites-autopilot", name: "Budget → Autopilot Toggle",
  description: "The budget card compresses into an Autopilot card; its toggle flips on the beat, the knob's two edges riding different springs.",
  tags: ["toggle", "autopilot", "automation"], params: { title: P.text("Autopilot", "Title", { maxLength: 20 }), sub: P.text("Sprites optimizes daily", "Line", { maxLength: 40 }) },
  duration: 0.8, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "morph" }, { at: 0.45, sound: "kenney.toggle", gain: 0.4, role: "flip" }],
  from: S.budget, to: S.autopilot,
  content: (c, p, t, b) => inside(c, b, t, 0.1, () => {
    label(c, p.title, b.x + b.h * 0.45, b.y + b.h * 0.45, b.h * 0.2, INK, { weight: 700 });
    label(c, p.sub, b.x + b.h * 0.45, b.y + b.h * 0.7, b.h * 0.13, GRAY);
    const on = clamp(spring(t - 0.45, SPRING.punchy), 0, 1.02), on2 = clamp(spring(t - 0.5, SPRING.firm), 0, 1.02);
    const tw = b.h * 0.95, th = b.h * 0.5, tx = b.x + b.w - b.h * 0.4 - tw, ty = b.y + (b.h - th) / 2;
    c.rrect(tx, ty, tw, th, th / 2, mix("#E2DDD7", ORANGE, on2));
    const d = th - 6, lead = tx + 3 + (tw - th) * on, trail = tx + 3 + d + (tw - th) * on2;
    c.rrect(Math.min(lead, trail - d), ty + 3, Math.max(d, trail - lead), d, d / 2, WHITE);
  }),
  over: (c, _p, t, b) => void hand(c, t, [[0, 0.32, 0.06], [0.4, (b.x + b.w - b.h * 0.85 - c.cx) / u(c), 0.02], [0.8, 0.2, 0.05]], [0.45]),
});

const CHANNELS = ["Meta", "Google", "LinkedIn", "TikTok"];

function channelTabs(c: RC, b: Box, t: number, picks: [number, number][], h = b.h) {
  const n = CHANNELS.length, w = (b.w - h * 0.2) / n, pad = h * 0.12;
  const pos = (i: number) => b.x + h * 0.1 + i * w;
  let lead = pos(picks[0][1]), trail = lead + w;
  for (let k = 1; k < picks.length; k++) {
    const d = pos(picks[k][1]) - pos(picks[k - 1][1]);
    const fast = clamp(spring(t - picks[k][0], SPRING.punchy), 0, 1.02), slow = clamp(spring(t - picks[k][0] - 0.05, SPRING.firm), 0, 1.02);
    lead += d * (d > 0 ? slow : fast);
    trail += d * (d > 0 ? fast : slow);
  }
  c.rrect(lead + 2, b.y + pad, trail - lead - 4, h - pad * 2, (h - pad * 2) / 2, INK);
  const active = picks.filter(([a]) => t >= a).pop()?.[1] ?? 0;
  CHANNELS.forEach((s, i) => {
    const cx = pos(i) + w / 2;
    platform(c, cx - h * 0.42, b.y + h / 2, h * 0.11, s, PLATFORMS[i][1]);
    label(c, s, cx - h * 0.25, b.y + h * 0.6, h * 0.24, i === active ? WHITE : INK, { weight: 550 });
  });
}

const channels = morphState<{}>({
  ...kit, id: "sprites-channels", name: "Autopilot → Channel Tabs",
  description: "The toggle's knob becomes a liquid tab indicator across the channels and stretches over to Google.",
  tags: ["tabs", "channels", "liquid indicator"], params: {},
  duration: 0.8, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "morph" }, { at: 0.4, sound: "ui.click", gain: 0.35, role: "google" }],
  from: S.autopilot, to: S.tabs,
  content: (c, _p, t, b) => inside(c, b, t, 0.1, () => channelTabs(c, b, t, [[0, 0], [0.4, 1]])),
  over: (c, _p, t) => void hand(c, t, [[0, 0.2, 0.05], [0.38, -0.11, 0.01], [0.8, -0.08, 0.06]], [0.4]),
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ROAS = [0.22, 0.3, 0.2, 0.42, 0.55, 0.64, 0.86];

const chart = morphState<{ metric: string; value: number; delta: string }>({
  ...kit, id: "sprites-roas", name: "ROAS Chart (draws, hover tooltip)",
  description: "The tabs open into a ROAS card: the value counts up from 0.0x, an orange line draws itself across the week with a soft area under it, and a tooltip lands on Sunday.",
  tags: ["chart", "roas", "counter", "tooltip"], params: { metric: P.text("ROAS · Google Ads", "Metric", { maxLength: 30 }), value: P.number(4.2, "Value", { min: 0, max: 99, step: 0.1, group: "content" }), delta: P.text("+38% vs last week", "Delta", { maxLength: 24 }) },
  duration: 2.2, sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.25, role: "open" }, { at: 0.3, sound: "riser.air", len: 1.2, gain: 0.18, role: "draw" }, { at: 1.6, sound: "ui.pop", gain: 0.3, role: "tooltip" }],
  from: S.tabs, to: S.chart,
  content: (c, p, t, b) => inside(c, b, t, 0.12, () => {
    const k = b.w;
    channelTabs(c, { ...b, h: k * 0.09 }, t + 9, [[0, 1]], k * 0.09);
    label(c, "Last 7 days", b.x + b.w - k * 0.04, b.y + k * 0.055, k * 0.022, GRAY, { align: "right" });
    label(c, p.metric, b.x + k * 0.05, b.y + k * 0.15, k * 0.024, GRAY);
    const draw = pr(t, 0.3, 1.5, E.inOut);
    const V = label(c, `${(p.value * draw).toFixed(1)}x`, b.x + k * 0.05, b.y + k * 0.235, k * 0.075, INK, { weight: 700 });
    c.rrect(b.x + k * 0.08 + V.width, b.y + k * 0.19, k * 0.24, k * 0.04, k * 0.02, alpha(ORANGE, 0.18));
    label(c, p.delta, b.x + k * 0.2 + V.width, b.y + k * 0.217, k * 0.02, ORANGE, { weight: 600, align: "center" });
    const gx0 = b.x + k * 0.05, gx1 = b.x + b.w - k * 0.05, gy0 = b.y + b.h * 0.42, gy1 = b.y + b.h * 0.86;
    for (let i = 0; i < 4; i++) c.rect(gx0, gy0 + ((gy1 - gy0) * i) / 3, gx1 - gx0, 1, "#F1EEEA");
    const pts: [number, number][] = [];
    for (let i = 0; i <= 60; i++) {
      const f = (i / 60) * 6, a = Math.floor(f), w2 = f - a;
      const v = ROAS[a] + (ROAS[Math.min(6, a + 1)] - ROAS[a]) * (w2 * w2 * (3 - 2 * w2));
      pts.push([gx0 + (gx1 - gx0) * (i / 60), gy1 - (gy1 - gy0) * v]);
    }
    const n = Math.max(2, Math.ceil(pts.length * draw));
    c.poly([...pts.slice(0, n), [pts[n - 1][0], gy1], [gx0, gy1]], alpha(ORANGE, 0.12));
    c.polyline(pts, ORANGE, 3, draw);
    DAYS.forEach((d, i) => label(c, d, gx0 + ((gx1 - gx0) * i) / 6, gy1 + k * 0.05, k * 0.02, GRAY, { align: "center" }));
    if (t > 1.55) {
      const [px, py] = pts[pts.length - 1];
      c.circle(px, py, k * 0.012, WHITE);
      c.ctx.beginPath();
      c.ctx.arc(px, py, k * 0.012, 0, Math.PI * 2);
      c.ctx.strokeStyle = ORANGE;
      c.ctx.lineWidth = 2.5;
      c.ctx.stroke();
      const a = pr(t, 1.55, 1.75, E.out);
      c.save();
      c.alpha(a);
      c.rrect(px - k * 0.15, py - k * 0.12, k * 0.14, k * 0.085, k * 0.012, INK);
      label(c, "Sun", px - k * 0.135, py - k * 0.09, k * 0.016, GRAY);
      label(c, `${p.value.toFixed(1)}x ROAS`, px - k * 0.135, py - k * 0.055, k * 0.022, WHITE, { weight: 650 });
      c.restore();
    }
  }),
  over: (c, _p, t, b) => void hand(c, t, [[0, -0.08, 0.06], [1.5, (b.x + b.w - b.w * 0.05 - c.cx) / u(c) + 0.005, (b.y + b.h * 0.42 - c.cy) / u(c) + 0.02], [2.2, 0.26, 0.05]]),
});

const pause = morphState<{ query: string; command: string; others: string[]; toast: string; saved: string }>({
  ...kit, id: "sprites-pause", name: "⌘K 'pause' → Toast",
  description: "The chart folds into a command palette, 'pause' types itself over the command list and Enter fires: the palette collapses into a black toast with an orange check — 'Paused 3 losing ads · $412/wk saved'.",
  tags: ["command palette", "toast", "automation"], params: { query: P.text("pause", "Typed", { maxLength: 20 }), command: P.text("Pause underperforming ads", "Command", { maxLength: 40 }), others: P.list(["Shift budget to winners", "Generate new creatives", "Send weekly report"], "Other commands", { max: 4 }), toast: P.text("Paused 3 losing ads", "Toast", { maxLength: 40 }), saved: P.text("$412/wk saved", "Saved", { maxLength: 20 }) },
  duration: 1.2, sounds: (p) => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.25, role: "fold" }, ...Array.from(p.query).map((_, i) => ({ at: 0.15 + i * 0.06, sound: "foley.key", gain: 0.16, seed: i, role: "type" })), { at: 0.6, sound: "ui.click", gain: 0.35, role: "enter" }, { at: 0.72, sound: "tonal.notify", gain: 0.3, role: "toast" }],
  from: S.chart, to: (t) => (t < 0.6 ? S.palette : S.toast),
  content: (c, p, t, b) => inside(c, b, t, 0.08, () => {
    if (t < 0.6) {
      const k = b.w, q = typed(p.query, t, 0.15, 16);
      label(c, "⌘K", b.x + k * 0.05, b.y + k * 0.07, k * 0.025, GRAY, { font: "mono" });
      const L = label(c, q, b.x + k * 0.13, b.y + k * 0.07, k * 0.035, INK, { weight: 500 });
      if (caret(t)) c.rect(b.x + k * 0.13 + L.width + 2, b.y + k * 0.04, 2, k * 0.04, INK);
      c.rect(b.x, b.y + k * 0.11, b.w, 1, "#EEE");
      [p.command, ...p.others].forEach((s2, i) => {
        const y = b.y + k * (0.14 + i * 0.075);
        if (y + k * 0.07 > b.y + b.h) return;
        if (i === 0) c.rrect(b.x + k * 0.03, y, b.w - k * 0.06, k * 0.065, k * 0.015, "#F4F1ED");
        label(c, s2, b.x + k * 0.06, y + k * 0.043, k * 0.026, i === 0 ? INK : alpha(INK, q.length ? 0.35 : 0.8), { weight: 550 });
        if (i === 0) label(c, "↵", b.x + b.w - k * 0.06, y + k * 0.043, k * 0.026, GRAY, { align: "right" });
      });
      return;
    }
    const cx = b.x + b.h * 0.55, cy = b.y + b.h / 2, r = b.h * 0.2;
    c.circle(cx, cy, r, ORANGE);
    c.polyline([[cx - r * 0.45, cy], [cx - r * 0.1, cy + r * 0.35], [cx + r * 0.5, cy - r * 0.35]], WHITE, r * 0.22, pr(t, 0.7, 0.9));
    const T = label(c, p.toast, cx + b.h * 0.4, b.y + b.h * 0.6, b.h * 0.27, WHITE, { weight: 600 });
    label(c, p.saved, cx + b.h * 0.55 + T.width, b.y + b.h * 0.6, b.h * 0.25, GRAY);
  }),
});

const back = morphState<{ label: string }>({
  ...kit, id: "sprites-return", name: "Toast → Connect (loop)",
  description: "The toast springs back into the opening pill; last frame = first frame, cursor included.",
  tags: ["loop", "return"], params: { label: P.text("Connect ad account", "Label", { maxLength: 30 }) },
  duration: 0.8, sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.2, role: "return" }],
  from: S.toast, to: S.connect,
  content: (c, p, t, b) => inside(c, b, t, 0.15, () => connectContent(c, b, p.label)),
  over: (c, _p, t) => void hand(c, t, [[0, 0.26, 0.05], [0.8, 0.2, 0.25]]),
});

const components: Component[] = [connect, connected, prompt, research, approve, budget, autopilot, channels, chart, pause, back];

const template: PostSpec = {
  id: "kit-sprites-promo",
  title: "Sprites — product promo from your own UI",
  format: "square",
  fps: 60,
  clips: components.map((k) => ({ component: k.id })),
  music: null,
  notes: "Kit template: @AnnaCher___'s Sprites promo, 120 BPM, no music (UI sounds only), original states and copy; drop in your real ads.",
};

export const spritesPromo: Kit = {
  id: "sprites-promo",
  promptId: "2103571096549433425",
  title: "Promo from your real UI",
  family: "ui",
  format: "square",
  summary: "A 14-second product promo built from the product's own UI: one shape morphs through connecting ad accounts, AI research over a library of real ads, an approval card, a budget slider, autopilot, channel tabs, a ROAS chart and a one-word command that pauses the losers. No music, UI sounds only; the loop is seamless.",
  shots: [
    { at: 0, shot: "Connect ad account (Meta, Google, LinkedIn, TikTok, Reddit)", component: "sprites-connect" },
    { at: 1.2, shot: "→ loader → check", component: "sprites-check" },
    { at: 2.4, shot: "→ prompt bar types 'Launch ads that convert'", component: "sprites-prompt" },
    { at: 3.3, shot: "→ island 'Researching 42 competitors' → the Ads Library of real ads scrolls and lands on a top performer", component: "sprites-research" },
    { at: 4.9, shot: "→ approval card → Approve & launch", component: "sprites-approval" },
    { at: 6.1, shot: "→ budget slider that stretches past max", component: "sprites-budget" },
    { at: 8.1, shot: "→ Autopilot toggle", component: "sprites-autopilot" },
    { at: 8.9, shot: "→ the knob becomes a liquid tab indicator across channels", component: "sprites-channels" },
    { at: 9.7, shot: "→ ROAS chart draws itself with a hover tooltip", component: "sprites-roas" },
    { at: 11.9, shot: "→ ⌘K → type 'pause' → toast 'Paused 3 losing ads'", component: "sprites-pause" },
    { at: 13.1, shot: "→ back to the button (loop)", component: "sprites-return" },
  ],
  rules: [
    "Build from the product's own UI, not generic components; real ads, real platform logos",
    "One shape, never cut; content swaps with a short blur; a cursor drives every change with real clicks and drags",
    "Warm-gray canvas, black and white components, one accent (#FD9543), Geist; springs with a tiny overshoot at most",
    "Tab indicator and toggle knob: two edges on different springs; drags are direct manipulation",
    "No music: synthesised UI sounds placed by their measured peaks on the beat grid",
    "Banned: bouncy easing, particles, glows, gradients on UI chrome, mismatched icon strokes, dead time",
  ],
  components,
  template,
};
