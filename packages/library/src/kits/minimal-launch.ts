// Kit: "High-end minimal launch film with real footage" (@twoclipping). "hooklab": 10 bars at 120 BPM,
// one idea per shot, lots of empty space, one accent colour, one clean sans with tight tracking, masked
// type, match cuts, a circle that opens out of a button into the dark half of the film. Original copy and
// structure as defaults; the clips are placeholders for your own vertical footage.

import { E, P, SPRING, alpha, clamp, defineComponent, glide, logLerp, mix, pr, sp, type Component, type RC, type SoundCue } from "@motioneasy/engine";
import { maskRise } from "../kit";
import { drawClick, drawCursor, mediaOr } from "../parts";
import type { PostSpec } from "../sequence";
import { caret, cursorAt, typed } from "./shared";
import type { Kit } from "./types";

const LIGHT = "#F5F0EB";
const DARK = "#0D0C0B";
const ACCENT = "#FF5A36";
const MUTED_D = "#8C8782";
const BEAT = 0.5;
const LOOK = { mode: "light" as const, bg: LIGHT, fg: "#111111", accent: ACCENT, lighting: 0, grain: 0.1, vignette: 0, backdrop: "plain" as const, camera: "still" as const };

const ui = (size: number, weight = 650) => ({ font: "geist" as const, size, weight, tracking: -0.035, lineHeight: 1.08 });

function text(c: RC, s: string, x: number, baseline: number, size: number, color: string, weight = 650, o: { center?: boolean; alpha?: number; right?: boolean } = {}) {
  const L = c.layout(s, ui(size, weight));
  const lx = o.center ? x - L.width / 2 : o.right ? x - L.width : x;
  c.drawLayout(L, lx, baseline - L.lines[0].y, { color, alpha: o.alpha });
  return L;
}

/** Light half: warm off-white with a soft peach light low on the right. */
function lightBg(c: RC) {
  c.clear(LIGHT);
  c.light(c.W * 0.85, c.H * 1.05, c.W * 0.7, "#FFD3BE", 0.55);
  c.light(c.W * 0.05, -c.H * 0.1, c.W * 0.5, "#FFFFFF", 0.4);
}
/** Dark half: near-black with a faint warm floor. */
function darkBg(c: RC) {
  c.clear(DARK);
  c.lightEllipse(c.W / 2, c.H * 1.0, c.W * 0.7, c.H * 0.3, "#3A2418", 0.35, "screen");
}

const clip = (c: RC, list: string[], i: number, x: number, y: number, w: number, h: number, r = 0, t?: number) =>
  mediaOr(c, list[i % Math.max(1, list.length)] ?? null, x, y, w, h, `clip ${(i % 20) + 1}`, { radius: r, key: `hl-clip-${i}`, t, tone: "#2A2725", ink: "#CFC7BF" });

type Clips = { clips: string[] };
const P_CLIPS = { clips: P.mediaList([], "Your vertical clips (10–20)", "video", { min: 0, max: 20 }) };

const base = {
  version: "1.0.0",
  group: "kits" as const,
  category: "kit-minimal-launch",
  added: "2026-10-04",
  formats: ["landscape" as const],
  theme: LOOK,
  camera: "still" as const,
};

// ── bar 1: the hook lands word by word ─────────────────────────────────────
const hook = defineComponent<{ line1: string; line2: string; block: string }>({
  ...base,
  id: "hooklab-hook",
  name: "Hook on the Beats",
  description: "Bar 1. The hook lands word by word on the beats, centred in a lot of empty space; the first line steps up as the second arrives with an accent block standing in for one word.",
  tags: ["hook", "kinetic", "beats", "minimal"],
  params: { line1: P.text("your next ad", "Line 1", { maxLength: 30 }), line2: P.text("is one [] away", "Line 2 ([] = the accent block)", { maxLength: 30 }), block: P.text("click", "What the block stands for", { maxLength: 12 }) },
  duration: 2,
  sounds: (p) => [...p.line1.split(" ").map((_, i) => ({ at: i * BEAT, sound: "impact.punch", gain: 0.3, seed: i, role: "word" }) as SoundCue), { at: 1.5, sound: "impact.land", gain: 0.35, role: "line 2" }],
  render(c, p) {
    const t = c.t;
    lightBg(c);
    const size = c.H * 0.105;
    const words = p.line1.split(" ");
    const shown = words.slice(0, Math.min(words.length, Math.floor(t / BEAT) + 1)).join(" ");
    const up = pr(t, 1.45, 1.75, E.inOut);
    const y1 = c.H * 0.52 - up * size * 1.25;
    // the line re-centres as each word lands (a short slide, never a dead stop)
    const L = c.layout(shown, ui(size));
    const pop = clamp(sp(t, Math.floor(t / BEAT) * BEAT, SPRING.firm), 0, 1.03);
    c.with({ x: c.W / 2, y: y1, scale: 0.97 + 0.03 * pop }, () => c.drawLayout(L, -L.width / 2, -L.lines[0].y, { color: "#111" }));
    if (t >= 1.5) {
      const u = pr(t, 1.5, 1.8, E.out);
      line2(c, p.line2, c.W / 2, y1 + size * 1.25, size, u, 1);
    }
  },
});

/** "is one [] away": the block is a rounded accent bar sized like a word. */
function line2(c: RC, s: string, cx: number, baseline: number, size: number, u: number, block: number) {
  const [a, b] = s.split("[]");
  const A = c.layout((a ?? "").trimEnd(), ui(size)), B = c.layout((b ?? "").trimStart(), ui(size));
  const bw = size * 1.9 * block, gap = size * 0.25;
  const total = A.width + gap + bw + gap + B.width;
  const x = cx - total / 2;
  maskRise(c, baseline - size * 1.0, size * 1.35, u, () => {
    c.drawLayout(A, x, baseline - A.lines[0].y, { color: "#111" });
    c.rrect(x + A.width + gap, baseline - size * 0.74, bw, size * 0.82, size * 0.14, ACCENT);
    c.drawLayout(B, x + A.width + gap + bw + gap, baseline - B.lines[0].y, { color: "#111" });
  });
  return { x: x + A.width + gap, y: baseline - size * 0.74, w: bw, h: size * 0.82 };
}

// ── bar 2: the block becomes the product UI; type, click ───────────────────
const WIN = { x: 0.175, y: 0.11, w: 0.65, h: 0.78 };

function productWindow(c: RC, a: number, p: { app: string; prompt: string; url: string; cta: string }, t: number, typeAt: number, press: number) {
  const x = c.W * WIN.x, y = c.H * WIN.y, w = c.W * WIN.w, h = c.H * WIN.h;
  c.save();
  c.alpha(a);
  c.save();
  c.shadow(alpha("#7A4A30", 0.16), 50, 0, 20);
  c.rrect(x, y, w, h, h * 0.03, "#FFFFFF");
  c.restore();
  ["#FF5F57", "#FEBC2E", "#28C840"].forEach((col, i) => c.circle(x + h * 0.035 + i * h * 0.03, y + h * 0.04, h * 0.008, alpha(col, 0.8)));
  c.rrect(x + w * 0.035, y + h * 0.075, h * 0.035, h * 0.035, h * 0.008, ACCENT);
  text(c, p.app, x + w * 0.035 + h * 0.05, y + h * 0.103, h * 0.024, "#111", 650);
  ["home", "campaigns", "hooks", "ugc ads", "results"].forEach((s, i) => text(c, s, x + w * 0.04, y + h * (0.2 + i * 0.065), h * 0.022, i ? "#9A948E" : "#111", 500));
  c.rect(x + w * 0.22, y + h * 0.06, 1, h * 0.88, "#EFEAE5");
  const ix = x + w * 0.28;
  text(c, "new campaign", ix, y + h * 0.25, h * 0.018, "#9A948E", 500);
  text(c, p.prompt, ix, y + h * 0.32, h * 0.045, "#111", 650);
  const fw = w * 0.63, fh = h * 0.1, fy = y + h * 0.4;
  c.rrect(ix, fy, fw, fh, fh * 0.2, "#FFFFFF");
  c.strokeRRect(ix, fy, fw, fh, fh * 0.2, t >= typeAt ? ACCENT : "#E5DFD9", 2);
  const q = typed(p.url, t, typeAt, 22);
  const L = text(c, q || " ", ix + fh * 0.35, fy + fh * 0.62, fh * 0.3, "#111", 500);
  if (t >= typeAt && (q.length < p.url.length || caret(t))) c.rect(ix + fh * 0.35 + (q ? L.width : 0) + 2, fy + fh * 0.28, 1.5, fh * 0.44, "#111");
  const bw = w * 0.2, bh = h * 0.075, by = fy + fh + h * 0.06;
  c.with({ x: ix + bw / 2, y: by + bh / 2, scale: 1 - press * 0.05 }, () => {
    c.rrect(-bw / 2, -bh / 2, bw, bh, bh / 2, "#111");
    text(c, `${p.cta} →`, 0, bh * 0.15, bh * 0.32, "#FFF", 600, { center: true });
  });
  ["hooks", "ugc", "launch"].forEach((s, i) => text(c, s, ix + i * w * 0.08, by + bh + h * 0.08, h * 0.018, "#B5AEA8", 500));
  c.restore();
  return { bx: ix + bw / 2, by: by + bh / 2 };
}

const P_UI = { app: P.text("hooklab", "App name", { maxLength: 20 }), prompt: P.text("drop a product link", "Prompt", { maxLength: 40 }), url: P.text("lumadrink.com/yuzu-spark", "Typed link", { maxLength: 40 }), cta: P.text("generate ads", "Button", { maxLength: 20 }) };

const uiShot = defineComponent<{ line1: string; line2: string; app: string; prompt: string; url: string; cta: string }>({
  ...base,
  id: "hooklab-word-to-ui",
  name: "Hook Word → Product UI",
  description: "Bar 2. The accent block that stands in for a hook word grows into the product window; a cursor types the product link and clicks the button.",
  tags: ["match cut", "ui", "typing", "click"],
  params: { line1: P.text("your next ad", "Line 1", { maxLength: 30 }), line2: P.text("is one [] away", "Line 2", { maxLength: 30 }), ...P_UI },
  duration: 2,
  sounds: (p) => [{ at: 0, sound: "whoosh.air", gain: 0.35, role: "grow" }, ...Array.from(p.url).filter((_, i) => i % 2 === 0).map((_, i) => ({ at: 0.55 + (i * 2) / 22, sound: "foley.key", gain: 0.13, seed: i, role: "type" }) as SoundCue), { at: 1.8, sound: "ui.click", gain: 0.45, role: "click" }],
  render(c, p) {
    const t = c.t;
    lightBg(c);
    const size = c.H * 0.105;
    const g = pr(t, 0, 0.45, E.inOut);
    const out = 1 - pr(t, 0, 0.15);
    const y1 = c.H * 0.52 - size * 1.25;
    if (out > 0) {
      c.save();
      c.alpha(out);
      text(c, p.line1, c.W / 2, y1, size, "#111", 650, { center: true });
      c.restore();
    }
    const blk = line2(c, p.line2, c.W / 2, y1 + size * 1.25, size, 1, 0);
    // the block grows into the window (match cut through the accent colour)
    const from = { x: blk.x, y: blk.y, w: size * 1.9, h: size * 0.82 };
    const to = { x: c.W * WIN.x, y: c.H * WIN.y, w: c.W * WIN.w, h: c.H * WIN.h };
    if (g < 1) {
      c.save();
      c.alpha(1 - pr(t, 0.3, 0.45));
      c.rrect(from.x + (to.x - from.x) * g, from.y + (to.y - from.y) * g, logLerp(from.w, to.w, g), logLerp(from.h, to.h, g), size * 0.14, mix(ACCENT, "#FFFFFF", g));
      c.restore();
    }
    const press = Math.max(0, 1 - Math.abs(t - 1.84) / 0.06);
    const b = productWindow(c, pr(t, 0.3, 0.5), p, t, 0.55, press);
    const cp = cursorAt(t, [[0, c.W * 0.7, c.H * 0.9], [0.5, c.W * 0.62, c.H * 0.56], [1.6, b.bx + 8, b.by + 6], [2, b.bx + 8, b.by + 6]]);
    drawClick(c, cp.x, cp.y, pr(t, 1.8, 2.0), "#111");
    drawCursor(c, cp.x, cp.y, { scale: 1.4, press });
  },
});

// ── the drop: a circle opens out of the button into the dark ───────────────
const wall = defineComponent<Clips & { app: string; prompt: string; url: string; cta: string; label: string; count: number; winners: number[] }>({
  ...base,
  id: "hooklab-drop-wall",
  name: "Circle Drop → Clip Wall Scan",
  description: "The drop. A circle opens out of the clicked button into the dark half of the film: a wall of real clips, a scan line sweeping down, a counter ('analyzing N competitor ads') and three winners lifting out.",
  tags: ["drop", "circle reveal", "video wall", "scan line", "counter"],
  params: { ...P_CLIPS, ...P_UI, label: P.text("analyzing {n} competitor ads", "Counter line ({n} = number)", { maxLength: 40 }), count: P.number(1284, "Count to", { min: 1, max: 99999, step: 1, group: "content" }), winners: P.json([3, 8, 13], "Winner tiles (indices)") },
  duration: 2,
  sounds: () => [{ at: 0, sound: "whoosh.deep", gain: 0.5, role: "drop" }, { at: 0.05, sound: "impact.sub", gain: 0.45, role: "drop" }, { at: 0.5, sound: "riser.air", len: 1.1, gain: 0.25, role: "scan" }, { at: 1.4, sound: "ui.pop", gain: 0.3, role: "winners" }],
  render(c, p) {
    const t = c.t;
    const open = pr(t, 0, 0.42, E.in);
    const bx = c.W * WIN.x + c.W * 0.28 * WIN.w / WIN.w * 0 + c.W * (WIN.w * 0.28 + 0.1 * WIN.w), by = c.H * WIN.y + c.H * WIN.h * 0.6;
    if (open < 1) {
      lightBg(c);
      productWindow(c, 1, p, 9, 0, 0);
    }
    c.save();
    c.clipCircle(bx, by, Math.hypot(c.W, c.H) * 1.05 * open + 2);
    darkBg(c);
    const cols = 6, rows = 3, cw = c.H * 0.165, ch = cw * 1.65, gap = c.H * 0.022;
    const gw = cols * cw + (cols - 1) * gap * 1.6, gh = rows * ch + (rows - 1) * gap;
    const gx = c.W / 2 - gw / 2, gy = c.H * 0.55 - gh / 2;
    const scan = pr(t, 0.55, 1.45, E.inOut);
    const win = pr(t, 1.4, 1.7, E.out);
    const winners = Array.isArray(p.winners) ? p.winners : [];
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const i = r * cols + k;
      const x = gx + k * (cw + gap * 1.6) + (r % 2) * gap * 0.5, y = gy + r * (ch + gap);
      const isWin = winners.includes(i);
      const s = 1 + (isWin ? 0.08 * win : 0);
      c.with({ x: x + cw / 2, y: y + ch / 2, scale: s, alpha: isWin ? 1 : 1 - win * 0.6 }, () => clip(c, p.clips, i, -cw / 2, -ch / 2, cw, ch, cw * 0.08));
      if (isWin && win > 0) c.strokeRRect(x - 3, y - 3, cw + 6, ch + 6, cw * 0.1, alpha(ACCENT, win), 3);
    }
    if (scan > 0 && scan < 1) {
      const sy = gy - 20 + (gh + 40) * scan;
      c.rect(gx - 30, sy - 1, gw + 60, 2, alpha(ACCENT, 0.9));
      c.rect(gx - 30, sy - 40, gw + 60, 40, c.linear(0, sy - 40, 0, sy, [[0, alpha(ACCENT, 0)], [1, alpha(ACCENT, 0.18)]]));
    }
    const n = Math.round(p.count * glide(pr(t, 0.4, 1.6)));
    const label = p.label.replace("{n}", n.toLocaleString("en-US"));
    text(c, label, c.W / 2, c.H * 0.075, c.H * 0.022, MUTED_D, 500, { center: true, alpha: pr(t, 0.35, 0.55) });
    c.restore();
  },
});

// ── the key output as big type ─────────────────────────────────────────────
const hooks = defineComponent<{ heading: string; rows: string[]; scoreLabel: string }>({
  ...base,
  id: "hooklab-hook-scores",
  name: "Winning Hooks with Scores",
  description: "The key output as big type: winning hooks land one per beat, each with a score that counts up and a small label; a quiet heading above.",
  tags: ["list", "scores", "counter", "big type"],
  params: { heading: P.text("3 hooks already winning in your niche", "Heading", { maxLength: 50 }), rows: P.list(["pov: you swapped your 3pm coffee for this|94", "i didn't think a soda could do this|91", "3 reasons my fridge is only yuzu now|88"], "Hooks (text|score)", { min: 1, max: 5 }), scoreLabel: P.text("hook score", "Score label", { maxLength: 20 }) },
  duration: 2,
  sounds: (p) => p.rows.map((_, i) => ({ at: i * BEAT, sound: "impact.land", gain: 0.3, seed: i, role: "hook" }) as SoundCue),
  render(c, p) {
    const t = c.t;
    darkBg(c);
    text(c, p.heading.toUpperCase(), c.W / 2, c.H * 0.27, c.H * 0.016, MUTED_D, 500, { center: true, alpha: pr(t, 0, 0.2) });
    const size = c.H * 0.046, x0 = c.W * 0.13, x1 = c.W * 0.79;
    p.rows.forEach((r, i) => {
      const [h, sc] = r.split("|");
      const at = i * BEAT;
      const u = pr(t, at, at + 0.3, E.out);
      if (u <= 0) return;
      const y = c.H * (0.42 + i * 0.13);
      maskRise(c, y - size * 1.1, size * 1.5, u, () => {
        text(c, String(i + 1).padStart(2, "0"), x0 - c.W * 0.025, y, size * 0.45, ACCENT, 600);
        text(c, h ?? "", x0, y, size, "#F4EFEA", 650);
      });
      const v = Math.round(Number(sc ?? 0) * pr(t, at + 0.1, at + 0.9, E.out));
      text(c, String(v), x1, y, size * 0.85, "#F4EFEA", 650, { alpha: u });
      text(c, p.scoreLabel, x1 + c.W * 0.03, y, size * 0.42, MUTED_D, 500, { alpha: u });
    });
  },
});

// ── 3D carousel with floor reflections, whip onto the hero ─────────────────
const carousel = defineComponent<Clips & { label: string; total: number; hero: number }>({
  ...base,
  id: "hooklab-carousel",
  name: "3D Clip Carousel + Whip",
  description: "A curved 3D carousel of real vertical videos with floor reflections turns while a counter climbs ('generating N / 24 ugc ads'); then a motion-blurred whip lands on one hero clip.",
  tags: ["carousel", "3d", "reflection", "whip", "video"],
  params: { ...P_CLIPS, label: P.text("generating {n} / {total} ugc ads", "Counter ({n}, {total})", { maxLength: 40 }), total: P.number(24, "Total", { min: 1, max: 999, step: 1, group: "content" }), hero: P.number(4, "Hero clip index", { min: 0, max: 19, step: 1, group: "content" }) },
  duration: 4,
  sounds: () => [{ at: 0, sound: "whoosh.air", gain: 0.35, role: "spin" }, { at: 2.6, sound: "whoosh.whip", gain: 0.5, role: "whip" }, { at: 3.05, sound: "impact.land", gain: 0.35, role: "hero" }],
  render(c, p) {
    const t = c.t;
    darkBg(c);
    const n = 40, R = c.W * 0.85;
    // spin keeps moving; the whip accelerates hard and lands on the hero
    const spin = t * 0.09 + Math.pow(pr(t, 2.55, 3.1, E.inOut), 1) * 0.9;
    const v = (t + 1 / 60) * 0.09 + pr(t + 1 / 60, 2.55, 3.1, E.inOut) * 0.9 - spin;
    const cam = c.camera({ fov: 36 });
    const cw = c.H * 0.21, ch = cw * 1.75;
    const items = Array.from({ length: n }, (_, k) => {
      const a = ((k / n) * Math.PI * 2 - spin * Math.PI * 2) % (Math.PI * 2);
      // seen from inside the curve: edge cards come closer and turn to face the centre
      const x = Math.sin(a) * R, z = R - Math.cos(a) * R;
      return { k, a, x, z, ry: (a * 180) / Math.PI };
    }).filter((q) => Math.cos(q.a) > 0.68).sort((a, b) => a.z - b.z);
    for (const q of items) {
      const L = c.layer(cw, ch, (lc) => clip(lc, p.clips, (q.k + p.hero) % 20, 0, 0, cw, ch, cw * 0.06));
      const smear = Math.abs(v) > 0.004 ? c.smearLayer(L, Math.min(cw * 2, Math.abs(v) * c.W * 3), 0) : L;
      cam.plane(smear, { x: q.x, y: -c.H * 0.02, z: q.z, w: cw, h: ch, ry: q.ry, alpha: 0.95 });
      // floor reflection: flipped, faded
      cam.plane(smear, { x: q.x, y: ch * 1.02 - c.H * 0.02, z: q.z, w: cw, h: -ch, ry: q.ry, alpha: 0.16 });
    }
    c.rect(0, c.H * 0.6, c.W, c.H * 0.4, c.linear(0, c.H * 0.6, 0, c.H, [[0, alpha(DARK, 0)], [0.5, alpha(DARK, 0.75)], [1, DARK]]));
    const k = Math.min(p.total, Math.max(1, Math.round(p.total * pr(t, 0.2, 2.5))));
    const s = p.label.replace("{n}", String(k)).replace("{total}", String(p.total));
    text(c, s, c.W / 2, c.H * 0.1, c.H * 0.022, "#F4EFEA", 550, { center: true, alpha: pr(t, 0, 0.3) * (1 - pr(t, 2.6, 2.9)) });
  },
});

// ── the hero in a phone next to a panel that flips into results ────────────
const PHONE = { x: 0.2, y: 0.1, w: 0.17, h: 0.8 };

const launch = defineComponent<Clips & { hero: number; panel: string; toggles: string[]; budget: string; cta: string; live: string; results: string; stats: string[] }>({
  ...base,
  id: "hooklab-phone-panel",
  name: "Phone + Launch Panel → Results",
  description: "The hero clip sits in a phone next to a 'launch campaign' panel: toggles flip on the beat, the budget slides, 'launch 24 ads' turns green and live, then the panel flips into day-7 results with a drawing chart.",
  tags: ["phone", "panel", "toggle", "flip", "results", "chart"],
  params: { ...P_CLIPS, hero: P.number(4, "Hero clip index", { min: 0, max: 19, step: 1, group: "content" }), panel: P.text("launch campaign", "Panel title", { maxLength: 30 }), toggles: P.list(["meta ads", "tiktok ads"], "Toggles", { max: 3 }), budget: P.text("$50 / day", "Budget", { maxLength: 16 }), cta: P.text("launch 24 ads", "Button", { maxLength: 20 }), live: P.text("✓ 24 ads live", "Live state", { maxLength: 20 }), results: P.text("yuzu spark · day 7", "Results title", { maxLength: 30 }), stats: P.list(["4.2x|roas", "$10.86|cpa", "15|winners"], "Result stats (value|label)", { max: 3 }) },
  duration: 2,
  sounds: () => [{ at: 0.25, sound: "ui.click", gain: 0.3, role: "toggle" }, { at: 0.5, sound: "ui.click", gain: 0.3, role: "toggle" }, { at: 0.95, sound: "ui.click", gain: 0.4, role: "launch" }, { at: 1.0, sound: "tonal.notify", gain: 0.3, role: "live" }, { at: 1.35, sound: "whoosh.swipe", gain: 0.35, role: "flip" }],
  render(c, p) {
    const t = c.t;
    darkBg(c);
    const enter = clamp(sp(t, 0, SPRING.firm), 0, 1.02);
    const px = c.W * PHONE.x, py = c.H * PHONE.y, pw = c.W * PHONE.w, ph = c.H * PHONE.h;
    c.with({ x: px + pw / 2, y: py + ph / 2, scale: 0.9 + 0.1 * enter }, () => {
      c.rrect(-pw / 2, -ph / 2, pw, ph, pw * 0.14, "#1B1A19");
      c.save();
      c.clipRRect(-pw / 2 + 6, -ph / 2 + 6, pw - 12, ph - 12, pw * 0.12);
      clip(c, p.clips, p.hero, -pw / 2 + 6, -ph / 2 + 6, pw - 12, ph - 12, 0);
      c.restore();
    });
    // panel: front (launch) flips about its vertical axis into the back (results)
    const flip = pr(t, 1.3, 1.65, E.inOut);
    const qx = c.W * 0.47, qy = c.H * 0.28, qw = c.W * 0.33, qh = c.H * 0.46;
    const sx = Math.abs(Math.cos(flip * Math.PI));
    const front = flip < 0.5;
    c.with({ x: qx + qw / 2, y: qy + qh / 2, sx: Math.max(0.001, sx) }, () => {
      c.translate(-qw / 2, -qh / 2);
      c.rrect(0, 0, qw, qh, qh * 0.04, "#1C1B1A");
      c.strokeRRect(0.5, 0.5, qw - 1, qh - 1, qh * 0.04, alpha("#FFFFFF", 0.07), 1);
      if (front) {
        text(c, p.panel, qw * 0.07, qh * 0.12, qh * 0.045, "#F4EFEA", 600);
        p.toggles.forEach((s, i) => {
          const y = qh * (0.25 + i * 0.12);
          text(c, s, qw * 0.07, y, qh * 0.034, MUTED_D, 500);
          const on = pr(t, 0.25 + i * 0.25, 0.4 + i * 0.25, E.inOut);
          c.rrect(qw * 0.8, y - qh * 0.035, qw * 0.12, qh * 0.05, qh * 0.025, mix("#3A3836", "#2BD46B", on));
          c.circle(qw * 0.8 + qh * 0.025 + on * (qw * 0.12 - qh * 0.05), y - qh * 0.01, qh * 0.02, "#FFF");
        });
        text(c, "daily budget", qw * 0.07, qh * 0.52, qh * 0.034, MUTED_D, 500);
        text(c, p.budget, qw * 0.93, qh * 0.52, qh * 0.03, "#F4EFEA", 500, { right: true });
        const live = pr(t, 0.95, 1.1);
        c.rrect(qw * 0.07, qh * 0.72, qw * 0.86, qh * 0.12, qh * 0.025, mix("#E9E3DD", "#2BD46B", live));
        text(c, live > 0.5 ? p.live : p.cta, qw / 2, qh * 0.795, qh * 0.035, live > 0.5 ? "#FFF" : "#111", 600, { center: true });
      } else {
        text(c, p.results, qw * 0.07, qh * 0.12, qh * 0.042, "#F4EFEA", 600);
        p.stats.forEach((s, i) => {
          const [v, l] = s.split("|");
          text(c, v ?? "", qw * (0.07 + i * 0.3), qh * 0.3, qh * 0.07, "#F4EFEA", 650);
          text(c, l ?? "", qw * (0.07 + i * 0.3), qh * 0.37, qh * 0.028, MUTED_D, 500);
        });
        const draw = pr(t, 1.6, 2.0, E.out);
        const pts: [number, number][] = [];
        for (let i = 0; i <= 24; i++) pts.push([qw * (0.07 + i * 0.036), qh * (0.88 - 0.38 * Math.pow(i / 24, 1.6) - Math.sin(i * 1.7) * 0.025)]);
        c.polyline(pts, ACCENT, 2.5, draw);
      }
    });
    const cp = cursorAt(t, [[0, c.W * 0.7, c.H * 0.8], [0.25, qx + qw * 0.86, qy + qh * 0.24], [0.5, qx + qw * 0.86, qy + qh * 0.36], [0.95, qx + qw * 0.5, qy + qh * 0.79], [2, qx + qw * 0.6, qy + qh * 0.9]]);
    if (t < 1.3) drawCursor(c, cp.x, cp.y, { scale: 1.3, press: [0.25, 0.5, 0.95].some((k) => Math.abs(t - k) < 0.05) ? 1 : 0 });
  },
});

// ── big stats on push cuts ─────────────────────────────────────────────────
const stats = defineComponent<{ stats: string[] }>({
  ...base,
  id: "hooklab-stats",
  name: "Big Stats on Push Cuts",
  description: "Big numbers, one per beat pair, each pushed in by the next: value huge, label small beneath, lots of black around them.",
  tags: ["stats", "push cut", "numbers", "big type"],
  params: { stats: P.list(["4.2x|return on ad spend", "$9.80|cost per purchase"], "Stats (value|label)", { min: 1, max: 4 }) },
  duration: (p) => p.stats.length * 1,
  sounds: (p) => p.stats.map((_, i) => ({ at: i, sound: "impact.punch", gain: 0.45, seed: i, role: "stat" }) as SoundCue),
  render(c, p) {
    const t = c.t;
    darkBg(c);
    const i = Math.min(p.stats.length - 1, Math.floor(t));
    const lt = t - i;
    const push = pr(lt, 0, 0.22, E.out);
    const draw = (k: number, dy: number, a: number) => {
      const [v, l] = (p.stats[k] ?? "").split("|");
      text(c, v ?? "", c.W / 2, c.H * 0.58 + dy, c.H * 0.21, "#F4EFEA", 700, { center: true, alpha: a });
      text(c, l ?? "", c.W / 2, c.H * 0.67 + dy, c.H * 0.026, MUTED_D, 500, { center: true, alpha: a });
    };
    if (i > 0 && push < 1) draw(i - 1, -push * c.H * 0.6, 1);
    draw(i, (1 - push) * (i > 0 ? c.H * 0.6 : c.H * 0.05), i === 0 ? push : 1);
  },
});

// ── three-word ticker ──────────────────────────────────────────────────────
const ticker = defineComponent<{ words: string[]; sub: string }>({
  ...base,
  id: "hooklab-ticker",
  name: "Three-Word Ticker",
  description: "A three-word ticker rolls upward one word per beat; the last word lands in the accent colour and a quiet line rises beneath it.",
  tags: ["ticker", "roll", "kinetic", "accent"],
  params: { words: P.list(["hooks", "ads", "launched"], "Words", { min: 2, max: 5 }), sub: P.text("before your coffee gets cold", "Line beneath", { maxLength: 40 }) },
  duration: 2,
  sounds: (p) => p.words.map((_, i) => ({ at: i * BEAT, sound: i === p.words.length - 1 ? "impact.punch" : "whoosh.swipe", gain: 0.35, seed: i, role: "word" }) as SoundCue),
  render(c, p) {
    const t = c.t;
    darkBg(c);
    const size = c.H * 0.16;
    const n = p.words.length;
    const pos = Math.min(n - 1, t / BEAT);
    const k = Math.floor(pos), f = E.out(clamp((pos - k) / 0.45));
    const roll = k + f;
    const by = c.H * 0.56;
    c.save();
    c.clipRect(0, by - size * 2.4, c.W, size * 2.8);
    p.words.forEach((w, i) => {
      const d = i - roll;
      if (Math.abs(d) > 1.2) return;
      text(c, w, c.W / 2, by + d * size * 1.2, size, i === n - 1 ? ACCENT : "#F4EFEA", 700, { center: true, alpha: 1 - Math.abs(d) * 0.7 });
    });
    c.restore();
    const u = pr(t, (n - 1) * BEAT + 0.2, (n - 1) * BEAT + 0.5, E.out);
    maskRise(c, by + c.H * 0.04, c.H * 0.06, u, () => text(c, p.sub, c.W / 2, by + c.H * 0.085, c.H * 0.032, MUTED_D, 500, { center: true }));
  },
});

// ── logo reveal, fade to black ─────────────────────────────────────────────
const logo = defineComponent<{ app: string; glyph: string; tagline: string; logo: string | null }>({
  ...base,
  id: "hooklab-logo",
  name: "Logo Reveal + Fade",
  description: "The icon pops on a spring, the wordmark slides out from behind it, a small tagline lands beneath, and the frame fades to black.",
  tags: ["logo", "end card", "fade"],
  params: { app: P.text("hooklab", "Wordmark", { maxLength: 20 }), glyph: P.text("b", "Icon letter", { maxLength: 2 }), tagline: P.text("ads that make themselves", "Tagline", { maxLength: 40 }), logo: P.media(null, "Icon image (optional)", "image") },
  duration: 2,
  sounds: () => [{ at: 0, sound: "ui.pop", gain: 0.45, role: "icon" }, { at: 0.2, sound: "whoosh.swipe", gain: 0.3, role: "wordmark" }, { at: 0.7, sound: "tonal.chime", gain: 0.25, role: "tagline" }],
  render(c, p) {
    const t = c.t;
    darkBg(c);
    const s = c.H * 0.12;
    const W = c.layout(p.app, ui(c.H * 0.1, 700));
    const total = s + c.H * 0.02 + W.width;
    const ix = c.W / 2 - total / 2, iy = c.H * 0.47;
    const pop = clamp(sp(t, 0, SPRING.pop), 0, 1.1);
    c.with({ x: ix + s / 2, y: iy, scale: pop }, () => {
      if (p.logo) c.media(p.logo, -s / 2, -s / 2, s, s, { radius: s * 0.24, key: "hl-logo" });
      else {
        c.rrect(-s / 2, -s / 2, s, s, s * 0.24, ACCENT);
        text(c, p.glyph, 0, s * 0.22, s * 0.62, "#FFF", 800, { center: true });
      }
    });
    const wu = pr(t, 0.15, 0.5, E.out);
    c.save();
    c.clipRect(ix + s + c.H * 0.01, iy - s, W.width + s, s * 2);
    c.drawLayout(W, ix + s + c.H * 0.02 - (1 - wu) * W.width * 0.4, iy - W.height / 2 + c.H * 0.004, { color: "#F4EFEA", alpha: wu });
    c.restore();
    text(c, p.tagline, c.W / 2, iy + c.H * 0.12, c.H * 0.022, MUTED_D, 500, { center: true, alpha: pr(t, 0.6, 0.9) });
    c.rect(0, 0, c.W, c.H, alpha("#000", pr(t, 1.5, 2.0, E.in)));
  },
});

const components = [hook, uiShot, wall, hooks, carousel, launch, stats, ticker, logo] as unknown as Component[];

const template: PostSpec = {
  id: "kit-minimal-launch",
  title: "hooklab — high-end minimal launch film",
  format: "landscape",
  fps: 60,
  clips: components.map((k) => ({ component: k.id })),
  music: { src: "media/music/library/werq.mp3", gain: 0.5, offset: 0.038, fadeIn: 0.02, fadeOut: 0.8, credit: "\"Werq\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Kit template: @twoclipping's high-end minimal launch film, 10 bars at 120 BPM; drop in 10–20 of your own vertical clips.",
};

export const minimalLaunch: Kit = {
  id: "minimal-launch",
  promptId: "2102554209166000267",
  title: "High-end minimal launch",
  family: "launch",
  format: "landscape",
  summary: "A 20-second high-end minimal launch film: 10 bars at 120 BPM, one idea per bar. A word-by-word hook in warm off-white, a product UI born from one hook word, then a circle opens out of the button into a dark film of real clips, big type, a 3D carousel, a launch panel, stats, a ticker and the logo.",
  shots: [
    { at: 0, shot: "Bar 1: the hook lands word by word on the beats", component: "hooklab-hook" },
    { at: 2, shot: "Bar 2: one hook word (the accent block) morphs into the product UI; a cursor types and clicks", component: "hooklab-word-to-ui" },
    { at: 4, shot: "The drop: a circle opens out of the button into a dark wall of real clips with a scan line and 3 winners", component: "hooklab-drop-wall" },
    { at: 6, shot: "The key output as big type: winning hooks with counting scores", component: "hooklab-hook-scores" },
    { at: 8, shot: "A 3D carousel of real videos with floor reflections; a motion-blurred whip onto one hero clip", component: "hooklab-carousel" },
    { at: 12, shot: "The hero in a phone next to a panel that flips into results", component: "hooklab-phone-panel" },
    { at: 14, shot: "Big stats on push cuts", component: "hooklab-stats" },
    { at: 16, shot: "A 3-word ticker", component: "hooklab-ticker" },
    { at: 18, shot: "Logo reveal, fade to black", component: "hooklab-logo" },
  ],
  rules: [
    "High-end minimal: one idea per shot, lots of empty space, one accent colour, one clean sans (Geist) with tight tracking",
    "Masked type reveals, match cuts, one smooth camera language; real footage only, never placeholder cards in the final",
    "No full stops in on-screen text",
    "Banned: shockwave rings, particle bursts, RGB split, camera shake, lens flares, neon glows, grid floors, flashing backgrounds, bouncy easing",
    "10 bars at 120 BPM, 2 s each; every cut on a downbeat, every UI hit on a beat; effects quiet under the music; −14 LUFS",
  ],
  components,
  template,
};
