// Kit: "Showreel about your product" (@ann_nnng). Same one-liner as the original showreel prompt, but the model
// reads the product's pages first and writes the script: a 15-second TypingMind reel. A light design-tool
// canvas (rulers, guides, a selection box) carries the product story — every model, one composer, parallel
// answers, the whole team, the feature cloud, white-label branding — then a dark low-poly logo assembly.

import { E, P, SPRING, alpha, clamp, defineComponent, lerp, logLerp, mix, pr, rand, spring, type Component, type RC } from "@motioneasy/engine";
import { wordFx } from "../kit";
import { mediaOr } from "../parts";
import type { PostSpec } from "../sequence";
import { caret, typed } from "./shared";
import type { Kit } from "./types";

const PAPER = "#F1F4F9";
const INK = "#0E1220";
const MUTE = "#7A8194";
const BLUE = "#2F5BEA";
const GUIDE = "#2F7BFF";
const LOOK = { mode: "light" as const, bg: PAPER, fg: INK, accent: BLUE, lighting: 0, grain: 0.12, vignette: 0.06, backdrop: "plain" as const, camera: "still" as const };
const sans = (size: number, weight = 700) => ({ font: "geist" as const, size, weight, tracking: -0.035, lineHeight: 1.12 });
const ui = (size: number, weight = 500) => ({ font: "geist" as const, size, weight, tracking: -0.01, lineHeight: 1.35 });
const mono = (size: number, weight = 500) => ({ font: "mono" as const, size, weight, tracking: 0.06, uppercase: true });

function txt(c: RC, s: string, x: number, y: number, style: Parameters<RC["layout"]>[1], color: string, align: "left" | "center" | "right" = "left") {
  const L = c.layout(s, style);
  const ox = align === "center" ? x - L.width / 2 : align === "right" ? x - L.width : x;
  c.drawLayout(L, ox, y - (L.lines[0]?.y ?? L.size), { color });
  return L.width;
}

/** The light design-tool canvas: soft gradient, two tinted lights, faint guides. */
function canvas(c: RC, guides: number[] = []) {
  c.clear(PAPER);
  c.rect(0, 0, c.W, c.H, c.linear(0, 0, 0, c.H, [[0, "#F6F8FB"], [1, "#E8ECF4"]]));
  c.light(c.W * 0.82, c.H * 0.85, c.H * 0.7, "#DCE3FF", 0.6);
  c.light(c.W * 0.15, c.H * 0.1, c.H * 0.6, "#FFFFFF", 0.7);
  for (const y of guides) c.line(0, y, c.W, y, alpha(GUIDE, 0.12), 1, "butt");
}
function hud(c: RC, brand: string, section: string, at: number) {
  const sz = c.H * 0.0095, m = c.H * 0.045, ink = alpha(INK, 0.38);
  txt(c, `${brand} · MOTION`, m, m, mono(sz), ink);
  txt(c, section, c.W - m, m, mono(sz), ink, "right");
  const g = at + c.t;
  txt(c, `00:${String(Math.floor(g)).padStart(2, "0")}:${String(Math.floor((g % 1) * 60)).padStart(2, "0")} ● 120 BPM`, m, c.H - m * 0.7, mono(sz), ink);
  txt(c, "1920×1080 · 60FPS", c.W - m, c.H - m * 0.7, mono(sz), ink, "right");
}
function card(c: RC, x: number, y: number, w: number, h: number, r: number, fill = "#FFFFFF", lift = 0.5) {
  c.save();
  c.shadow("rgba(27,35,64,0.10)", 30 + lift * 50, 0, 10 + lift * 24);
  c.rrect(x, y, w, h, r, fill);
  c.shadow("rgba(27,35,64,0.08)", 3, 0, 1.5);
  c.rrect(x, y, w, h, r, fill);
  c.restore();
}
function bars(c: RC, x: number, y: number, w: number, n: number, lh: number, col: string, seed: number) {
  for (let i = 0; i < n; i++) c.rrect(x, y + i * lh, w * (i === n - 1 ? 0.45 : 0.75 + rand(seed + i) * 0.25), lh * 0.42, lh * 0.21, col);
}

const HUD = { brand: P.text("TYPINGMIND", "HUD name", { maxLength: 20 }), at: P.number(0, "Reel time at start (HUD)", { min: 0, max: 60, step: 0.5, unit: "s" }) };
const base = { version: "1.0.0", group: "kits" as const, category: "kit-product-showreel", added: "2026-10-04", formats: ["landscape" as const], theme: LOOK, camera: "still" as const };

// ── 1. "Chat with [pill]" — the pill rolls through every model inside a selection box ───────────────
const chatWith = defineComponent<{ brand: string; at: number; lead: string; models: string[] }>({
  ...base, id: "showreel-pill-roll", name: "Lead + Rolling Pill in a Selection Box",
  description: "A bold lead ('Chat with') and a coloured pill whose label rolls through options — the pill re-springs to each width inside a design-tool selection box with handles, guides and a live size readout — then the line whips off with motion blur.",
  tags: ["pill", "roll", "selection box", "design tool", "models", "hook"],
  params: { ...HUD, lead: P.text("Chat with", "Lead", { maxLength: 24 }), models: P.list(["GPT-5|#2E9E6A", "Claude|#C96442", "Grok|#1F2433", "DeepSeek|#3B4FC4", "every model.|#2F5BEA"], "Pill labels (text|colour), last one holds", { min: 2, max: 8 }) },
  duration: 2.75,
  sounds: (p) => (p.models as string[]).map((_, i) => ({ at: 0.35 + i * 0.42, sound: "ui.click", gain: 0.3, seed: i, role: "roll" })).concat([{ at: 2.45, sound: "whoosh.swipe", gain: 0.35, seed: 9, role: "exit" }]),
  render(c, p) {
    const t = c.t;
    const size = c.H * 0.14;
    const items = p.models.map((s) => { const [label, col] = s.split("|"); return { label: (label ?? "").trim(), col: (col ?? BLUE).trim() }; });
    const n = items.length;
    const at = (i: number) => 0.45 + i * 0.42;
    const idx = clamp(Math.floor((t - 0.45) / 0.42) + 1, 0, n - 1);
    const Ls = items.map((it) => c.layout(it.label, sans(size * 0.86, 600)));
    const ph = size * 1.62, pad = size * 0.42;
    const pw = Ls.reduce((w, L, i) => w + (L.width + pad * 2 - (i ? Ls[i - 1].width + pad * 2 : 0)) * (i ? clamp(spring(t - at(i - 1), SPRING.firm), 0, 1.1) : 1), 0);
    const lead = c.layout(p.lead, sans(size));
    const gap = size * 0.18;
    const total = lead.width + gap + pw;
    const x0 = c.cx - total / 2, cy = c.cy;
    const exit = pr(t, 2.45, 2.75, E.in);
    canvas(c, [cy - ph / 2, cy + ph / 2]);
    for (const x of [x0, x0 + lead.width + gap, x0 + total]) c.line(x, 0, x, c.H, alpha(GUIDE, 0.08), 1, "butt");
    const L = c.layer(c.W, c.H, (lc) => {
      lead.words.forEach((w) => w.chars.forEach((ch, i) => {
        const u = pr(t, 0.02 + (w.index * 6 + i) * 0.025, 0.3 + (w.index * 6 + i) * 0.025, E.out);
        if (u > 0) lc.char(w, i, x0 + w.x + ch.x, cy + lead.cap / 2 + (1 - u) * size * 0.2, { color: alpha(INK, u) });
      }));
      const px = x0 + lead.width + gap;
      const pop = clamp(spring(t - 0.3, SPRING.pop), 0, 1.2);
      if (pop > 0.01) {
        const col = items.reduce((cc, it, i) => (i ? mix(cc, it.col, pr(t, at(i - 1), at(i - 1) + 0.15)) : it.col), items[0].col);
        lc.with({ x: px + pw / 2, y: cy, scale: pop }, () => {
          lc.rrect(-pw / 2, -ph / 2, pw, ph, ph / 2, col);
          lc.save();
          lc.clipRRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
          for (let i = Math.max(0, idx - 1); i <= idx; i++) {
            const u = i ? E.out(pr(t, at(i - 1), at(i - 1) + 0.3)) : 1;
            const yy = (i === idx ? 1 - u : -u) * ph * 0.9;
            const Li = Ls[i];
            if (i < idx && u >= 1) continue;
            const blur = (i === idx ? 1 - u : u) * size * 0.12;
            Li.words.forEach((w) => wordFx(lc, w, -Li.width / 2, yy - (Li.lines[0]?.y ?? 0) + Li.cap / 2, { blur, color: "#FFFFFF" }));
          }
          lc.restore();
        });
      }
    });
    c.drawLayer(exit > 0.01 ? c.smearLayer(L, -c.W * 0.25 * exit, 0) : L, -c.W * 0.5 * exit * exit, 0, { alpha: 1 - pr(t, 2.6, 2.75) });
    // selection box around the pill
    const sb = pr(t, 0.4, 0.55) * (1 - pr(t, 2.35, 2.45));
    if (sb > 0) {
      const px = x0 + lead.width + gap - 4, py = cy - ph / 2 - 4, w = pw + 8, h = ph + 8, hs = c.H * 0.008;
      c.save();
      c.alpha(sb);
      c.strokeRRect(px, py, w, h, 0, GUIDE, 1.5);
      for (const [hx, hy] of [[px, py], [px + w, py], [px, py + h], [px + w, py + h]]) {
        c.rect(hx - hs / 2, hy - hs / 2, hs, hs, "#FFFFFF");
        c.strokeRRect(hx - hs / 2, hy - hs / 2, hs, hs, 0, GUIDE, 1.2);
      }
      const label = `${Math.round((w * 1080) / c.H)} × ${Math.round((h * 1080) / c.H)}`;
      const Lb = c.layout(label, { font: "mono", size: c.H * 0.011, weight: 600, tracking: 0 });
      const bw = Lb.width + c.H * 0.016, bh = c.H * 0.022;
      c.rrect(px + w / 2 - bw / 2, py + h + c.H * 0.012, bw, bh, 3, GUIDE);
      c.drawLayout(Lb, px + w / 2 - Lb.width / 2, py + h + c.H * 0.012 + bh / 2 - Lb.cap / 2 - ((Lb.lines[0]?.y ?? 0) - Lb.cap), { color: "#FFFFFF" });
      txt(c, `X ${Math.round((px * 1080) / c.H)}`, px, py - c.H * 0.012, mono(c.H * 0.009), alpha(GUIDE, 0.7));
      c.restore();
    }
    hud(c, p.brand, "01 — MODELS", p.at);
  },
});

// ── 2. composer ─────────────────────────────────────────────────────────────────────────────────────
function chips(c: RC, list: { label: string; col: string }[], x: number, y: number, size: number, a = 1) {
  let cx = x;
  list.forEach((m) => {
    const L = c.layout(m.label, ui(size, 600));
    const w = L.width + size * 2.2, h = size * 2;
    c.save();
    c.alpha(a);
    c.rrect(cx, y - h / 2, w, h, h / 2, "#FFFFFF");
    c.strokeRRect(cx, y - h / 2, w, h, h / 2, alpha(INK, 0.06), 1);
    c.circle(cx + size * 0.85, y, size * 0.28, m.col);
    c.drawLayout(L, cx + size * 1.4, y - L.cap / 2 - ((L.lines[0]?.y ?? 0) - L.cap), { color: INK });
    c.restore();
    cx += w + size * 0.6;
  });
}
function toolbar(c: RC, x: number, y: number, s: number, send: string, press = 0) {
  const ink = alpha(INK, 0.55);
  c.line(x - s * 0.35, y, x + s * 0.35, y, ink, 1.4); c.line(x, y - s * 0.35, x, y + s * 0.35, ink, 1.4);
  c.strokeRRect(x + s * 1.3, y - s * 0.4, s * 0.5, s * 0.8, s * 0.25, ink, 1.3);
  c.strokeRRect(x + s * 2.65, y - s * 0.45, s * 0.42, s * 0.6, s * 0.21, ink, 1.3);
  c.arc(x + s * 4.1, y, s * 0.38, 0, 1, ink, 1.3);
  c.arc(x + s * 5.4, y - s * 0.1, s * 0.3, 0, 1, ink, 1.3);
  void send; void press;
}
const MODELS3 = ["GPT-5|#2E9E6A", "Claude|#C96442", "Gemini|#5B6CE0"];
const parse3 = (list: string[]) => list.map((s) => { const [label, col] = s.split("|"); return { label: (label ?? "").trim(), col: (col ?? BLUE).trim() }; });

const composer = defineComponent<{ brand: string; at: number; models: string[]; prompt: string }>({
  ...base, id: "showreel-composer", name: "Composer · Model Chips + Typed Prompt",
  description: "A chat composer springs in under a row of model chips; the prompt types itself with a caret, the toolbar sits beneath and the send button pulses as it fires.",
  tags: ["composer", "chat", "typing", "chips", "input"],
  params: { ...HUD, at: P.number(2.75, "Reel time at start (HUD)", { min: 0, max: 60, step: 0.5, unit: "s" }), models: P.list(MODELS3, "Model chips (name|colour)", { min: 1, max: 5 }), prompt: P.text("Plan our product launch", "Prompt", { maxLength: 60 }) },
  duration: 1.65,
  sounds: () => [{ at: 0.3, sound: "foley.key", gain: 0.25, role: "type" }, { at: 1.35, sound: "ui.click", gain: 0.35, role: "send" }],
  render(c, p) {
    const t = c.t;
    canvas(c);
    const k = logLerp(1.04, 1, E.out(pr(t, 0, 1.65)));
    c.with({ x: c.cx, y: c.cy, scale: k }, () => {
      c.translate(-c.cx, -c.cy);
      const s = clamp(spring(t, SPRING.firm), 0, 1.1);
      const bx = c.W * 0.12, bw = c.W * 0.76, by = c.H * 0.42, bh = c.H * 0.2;
      chips(c, parse3(p.models), bx + c.W * 0.005, c.H * 0.35, c.H * 0.022, pr(t, 0.05, 0.3));
      c.with({ x: c.cx, y: by + bh / 2, scale: 0.94 + 0.06 * s, alpha: pr(t, 0, 0.15) }, () => {
        c.translate(-c.cx, -(by + bh / 2));
        card(c, bx, by, bw, bh, c.H * 0.03);
        const s1 = typed(p.prompt, t, 0.25, 22);
        const L = c.layout(s1 || " ", ui(c.H * 0.05, 500));
        c.drawLayout(L, bx + c.W * 0.027, by + bh * 0.3 - L.cap / 2 - ((L.lines[0]?.y ?? 0) - L.cap), { color: INK });
        if (caret(t) || t < 1.3) c.rect(bx + c.W * 0.027 + L.width + 3, by + bh * 0.3 - c.H * 0.025, 2.5, c.H * 0.05, BLUE);
        toolbar(c, bx + c.W * 0.035, by + bh * 0.74, c.H * 0.024, BLUE);
        const press = pr(t, 1.3, 1.36) * (1 - pr(t, 1.36, 1.5));
        const sx = bx + bw - c.W * 0.04, sy = by + bh * 0.74;
        c.circle(sx, sy, c.H * 0.034 * (1 - press * 0.12), BLUE);
        c.polyline([[sx - c.H * 0.011, sy - c.H * 0.002], [sx, sy - c.H * 0.013], [sx + c.H * 0.011, sy - c.H * 0.002]], "#FFFFFF", c.H * 0.004);
        c.line(sx, sy - c.H * 0.012, sx, sy + c.H * 0.013, "#FFFFFF", c.H * 0.004);
      });
    });
    hud(c, p.brand, "02 — CHAT", p.at);
  },
});

// ── 3. ask them all at once ─────────────────────────────────────────────────────────────────────────
const ANSWERS = [
  "Here's a 4-week launch plan. Week 1: open a waitlist and tease 15-second demo clips. Week 2: invite 50 power users into early access. Week 3: ship publicly with…",
  "Start with who it's for. A focused launch beats a loud one: pick one audience, one promise and one channel, then let the results pick the next…",
  "Launch plan draft. Phase 1: build anticipation with a teaser page and waitlist. Phase 2: go live on Product Hunt, X and LinkedIn the same morning.",
];
const askAll = defineComponent<{ brand: string; at: number; title: string; button: string; models: string[]; answers: string[] }>({
  ...base, id: "showreel-parallel-answers", name: "Parallel Answers · One Prompt, Three Models",
  description: "A title and the sent prompt as a blue pill; three model cards stream their answers side by side at different speeds, each with its own timing badge and a live dot, the composer resting below.",
  tags: ["chat", "compare", "streaming", "cards", "multi-model"],
  params: {
    ...HUD, at: P.number(4.4, "Reel time at start (HUD)", { min: 0, max: 60, step: 0.5, unit: "s" }),
    title: P.text("Ask them all at once.", "Title", { maxLength: 40 }),
    button: P.text("Plan our product launch", "Sent prompt", { maxLength: 40 }),
    models: P.list(["GPT-5|#2E9E6A|0.9s", "Claude|#C96442|0.8s", "Gemini|#5B6CE0|0.7s"], "Models (name|colour|time)", { min: 2, max: 3 }),
    answers: P.list(ANSWERS, "Answers", { min: 2, max: 3 }),
  },
  duration: 1.5,
  sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.25, role: "in" }],
  render(c, p) {
    const t = c.t;
    canvas(c);
    const T = c.layout(p.title, sans(c.H * 0.068));
    T.words.forEach((w, i) => {
      const u = pr(t, 0.02 + i * 0.06, 0.32 + i * 0.06, E.out);
      wordFx(c, w, c.W * 0.06, c.H * 0.215 - (T.lines[0]?.y ?? 0), { alpha: u, blur: (1 - u) * c.H * 0.01, color: INK });
    });
    const B = c.layout(p.button, ui(c.H * 0.026, 600));
    const bw = B.width + c.H * 0.05, bh = c.H * 0.06, bx = c.W * 0.94 - bw, by = c.H * 0.215 - bh * 0.75;
    const bs = clamp(spring(t - 0.05, SPRING.pop), 0, 1.15);
    c.with({ x: bx + bw / 2, y: by + bh / 2, scale: bs }, () => {
      c.rrect(-bw / 2, -bh / 2, bw, bh, bh / 2, BLUE);
      c.drawLayout(B, -B.width / 2, -B.cap / 2 - ((B.lines[0]?.y ?? 0) - B.cap), { color: "#FFFFFF" });
    });
    const ms = p.models.map((s) => { const [name, col, time] = s.split("|"); return { name: (name ?? "").trim(), col: (col ?? BLUE).trim(), time: (time ?? "").trim() }; });
    const n = ms.length, gx = c.W * 0.02, cw = (c.W * 0.88 - gx * (n - 1)) / n, cy = c.H * 0.3, chh = c.H * 0.39;
    ms.forEach((m, i) => {
      const x = c.W * 0.06 + i * (cw + gx);
      const u = clamp(spring(t - 0.1 - i * 0.06, SPRING.firm), 0, 1.1);
      c.with({ x: x + cw / 2, y: cy + chh / 2 + (1 - u) * c.H * 0.04, alpha: pr(t, 0.1 + i * 0.06, 0.25 + i * 0.06) }, () => {
        c.translate(-(x + cw / 2), -(cy + chh / 2));
        card(c, x, cy, cw, chh, c.H * 0.018);
        c.circle(x + c.H * 0.035, cy + c.H * 0.047, c.H * 0.008, m.col);
        txt(c, m.name, x + c.H * 0.055, cy + c.H * 0.056, ui(c.H * 0.025, 600), INK);
        txt(c, m.time, x + cw - c.H * 0.03, cy + c.H * 0.052, { font: "mono", size: c.H * 0.012, weight: 500, tracking: 0 }, alpha(MUTE, 0.8), "right");
        const s = typed(p.answers[i] ?? "", t, 0.3 + i * 0.05, 70 + i * 18);
        const A = c.layout(s || " ", { ...ui(c.H * 0.025, 400), lineHeight: 1.5 }, { maxWidth: cw - c.H * 0.07 });
        c.drawLayout(A, x + c.H * 0.035, cy + c.H * 0.1, { color: alpha(INK, 0.85) });
        const last = A.lines[A.lines.length - 1];
        if (s.length < (p.answers[i] ?? "").length && last) c.circle(x + c.H * 0.035 + last.x + last.w + c.H * 0.012, cy + c.H * 0.1 + last.y - A.cap * 0.35, c.H * 0.005, INK);
      });
    });
    const iw = c.W * 0.5, ix = c.cx - iw / 2, iy = c.H * 0.77, ih = c.H * 0.09;
    c.with({ alpha: pr(t, 0.15, 0.35) }, () => {
      card(c, ix, iy, iw, ih, c.H * 0.018);
      txt(c, "Press \"/\" to focus input", ix + c.H * 0.025, iy + ih * 0.42, ui(c.H * 0.017, 400), alpha(MUTE, 0.8));
      toolbar(c, ix + c.H * 0.03, iy + ih * 0.73, c.H * 0.012, BLUE);
      c.circle(ix + iw - c.H * 0.035, iy + ih * 0.62, c.H * 0.016, BLUE);
    });
    hud(c, p.brand, "02 — CHAT", p.at);
  },
});

// ── 4. team wall ────────────────────────────────────────────────────────────────────────────────────
const TEAMS = ["Engineering|#2F5BEA", "Sales|#2E9E6A", "Support|#7C3AED", "Legal|#111827", "Design|#E0457B", "Marketing|#F59E0B", "Operations|#F97316", "People|#14B8A6", "Product|#E11D48", "Data|#16A34A", "Leadership|#111827", "Growth|#A855F7"];
const teamWall = defineComponent<{ brand: string; at: number; line: string; accentWord: string; teams: string[] }>({
  ...base, id: "showreel-team-wall", name: "Team Wall · Pull Back to Everyone",
  description: "The camera pulls back across a wall of workspace cards, one per team (each with its colour chip and activity), while the line 'Now for your whole team.' lands in the middle with its last word in the accent colour.",
  tags: ["teams", "grid", "pull back", "workspaces", "scale"],
  params: { ...HUD, at: P.number(5.9, "Reel time at start (HUD)", { min: 0, max: 60, step: 0.5, unit: "s" }), line: P.text("Now for your whole team.", "Line", { maxLength: 40 }), accentWord: P.text("team.", "Accent word", { maxLength: 16 }), teams: P.list(TEAMS, "Teams (name|colour)", { min: 4, max: 16 }) },
  duration: 1.7,
  sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.3, role: "pull" }, { at: 0.45, sound: "impact.land", gain: 0.25, role: "line" }],
  render(c, p) {
    const t = c.t;
    canvas(c);
    const k = logLerp(1.7, 0.92, E.out(pr(t, 0, 1.7)));
    const teams = p.teams.map((s) => { const [name, col] = s.split("|"); return { name: (name ?? "").trim(), col: (col ?? BLUE).trim() }; });
    const cw = c.W * 0.2, ch = c.H * 0.24, gx = c.W * 0.03, gy = c.H * 0.06, cols = 6, rows = 4;
    c.with({ x: c.cx, y: c.cy, scale: k }, () => {
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const i = r * cols + q;
        const x = (q - cols / 2) * (cw + gx) + gx / 2 + (r % 2 ? cw * 0.3 : 0), y = (r - rows / 2) * (ch + gy) + gy / 2;
        const d = Math.hypot(x / c.W, y / c.H);
        const a = pr(t, d * 0.1 - 0.05, d * 0.1 + 0.1);
        if (a <= 0) continue;
        const tm = teams[i % teams.length];
        c.with({ alpha: a }, () => {
          card(c, x, y, cw, ch, c.H * 0.012, "#FFFFFF", 0.3);
          c.rrect(x + cw * 0.06, y + ch * 0.1, cw * 0.1, ch * 0.05, ch * 0.025, alpha(tm.col, 0.85));
          c.circle(x + cw * 0.23, y + ch * 0.125, ch * 0.03, tm.col);
          txt(c, tm.name, x + cw * 0.27, y + ch * 0.15, ui(ch * 0.065, 600), INK);
          bars(c, x + cw * 0.06, y + ch * 0.32, cw * 0.55, 3, ch * 0.1, alpha(INK, 0.12), i * 7);
          c.rrect(x + cw * 0.06, y + ch * 0.68, cw * 0.4, ch * 0.035, ch * 0.017, alpha(tm.col, 0.4));
          c.circle(x + cw * 0.9, y + ch * 0.85, ch * 0.025, tm.col);
        });
      }
    });
    const L = c.layout(p.line, sans(c.H * 0.092));
    const lx = c.cx - L.width / 2, ly = c.cy - L.cap / 2 - ((L.lines[0]?.y ?? 0) - L.cap);
    c.light(c.cx, c.cy, c.W * 0.36, "#F6F8FB", 0.97 * pr(t, 0.15, 0.45));
    L.words.forEach((w, i) => {
      const u = pr(t, 0.2 + i * 0.06, 0.5 + i * 0.06, E.out);
      wordFx(c, w, lx, ly, { alpha: u, blur: (1 - u) * c.H * 0.012, dy: (1 - u) * c.H * 0.015, color: w.text === p.accentWord ? BLUE : INK });
    });
    hud(c, p.brand, "03 — TEAMS", p.at);
  },
});

// ── 5. feature cloud ────────────────────────────────────────────────────────────────────────────────
const TILES = ["5,000+|maroon|members", "300|red", "Knowledge base|note", "SOC 2|card|shield", "Custom branding|card|Acme AI", "Directory sync|card", "Self-host or cloud|navy", "Prompt library|card|/", "Any LLM|card|grid", "AI agents|black", "SSO|blue", "272.2M|chart|tokens"];
const cloud = defineComponent<{ brand: string; at: number; name: string; accentWord: string; url: string; tiles: string[] }>({
  ...base, id: "showreel-feature-cloud", name: "Feature Cloud · Tiles Orbit the Name",
  description: "The product name sits in the middle while feature tiles — stats, badges, notes, dark cards — pop in around it and drift on a slowly turning 3D ring, nearer tiles larger and sharper.",
  tags: ["features", "tiles", "3d", "orbit", "stats", "badges"],
  params: { ...HUD, at: P.number(7.6, "Reel time at start (HUD)", { min: 0, max: 60, step: 0.5, unit: "s" }), name: P.text("TypingMind Teams", "Name", { maxLength: 30 }), accentWord: P.text("Teams", "Accent word", { maxLength: 16 }), url: P.text("CUSTOM.TYPINGMIND.COM", "Small line", { maxLength: 40 }), tiles: P.list(TILES, "Tiles (label|maroon/red/note/card/navy/black/blue/chart|extra)", { min: 4, max: 16 }) },
  duration: 2,
  sounds: (p) => (p.tiles as string[]).slice(0, 8).map((_, i) => ({ at: 0.1 + i * 0.07, sound: "ui.click", gain: 0.18, seed: i, role: "pop" })),
  render(c, p) {
    const t = c.t;
    canvas(c);
    const N = c.layout(p.name, sans(c.H * 0.066));
    const nx = c.cx - N.width / 2, ny = c.cy - N.cap / 2 - ((N.lines[0]?.y ?? 0) - N.cap);
    const tiles = p.tiles.map((s, i) => {
      const [label, kind, extra] = s.split("|");
      const a = (i / p.tiles.length) * Math.PI * 2 + 0.3;
      const ring = 1 + (rand(i + 3) - 0.5) * 0.35;
      return { label: (label ?? "").trim(), kind: (kind ?? "card").trim(), extra: (extra ?? "").trim(), a, ring, y: (rand(i + 11) - 0.5) * 0.55, i };
    });
    const rot = t * 0.22;
    const placed = tiles.map((tl) => {
      const a = tl.a + rot;
      const x = Math.cos(a) * tl.ring, z = Math.sin(a) * tl.ring * 0.6;
      const k = 1 / (1 + z * 0.35);
      return { ...tl, sx: c.cx + x * c.W * 0.37 * k, sy: c.cy + (tl.y + Math.sin(t * 1.2 + tl.i) * 0.02) * c.H * k * 1.45, k, z };
    }).sort((a, b) => b.z - a.z);
    const drawTile = (tl: (typeof placed)[number]) => {
      const pop = clamp(spring(t - 0.04 - tl.i * 0.035, SPRING.pop), 0, 1.15);
      if (pop <= 0.01) return;
      const s = c.H * 0.13 * tl.k;
      const big = tl.kind === "maroon" || tl.kind === "navy" || tl.kind === "chart";
      const w = big ? s * 1.5 : tl.kind === "red" || tl.kind === "blue" ? s * 0.55 : s * 1.05, h = big ? s * 1.15 : tl.kind === "red" || tl.kind === "blue" ? s * 0.42 : s * 0.95;
      c.with({ x: tl.sx, y: tl.sy, scale: pop, alpha: clamp(1.2 - tl.z * 0.5, 0.5, 1) }, () => {
        const fill = { maroon: "#8E2A4E", red: "#E5534B", note: "#FAD06A", navy: "#1C2B4A", black: "#111111", blue: BLUE, chart: "#FFFFFF", card: "#FFFFFF" }[tl.kind] ?? "#FFFFFF";
        const ink = ["maroon", "red", "navy", "black", "blue"].includes(tl.kind) ? "#FFFFFF" : INK;
        card(c, -w / 2, -h / 2, w, h, s * 0.1, fill, 0.4);
        if (tl.kind === "maroon" || tl.kind === "chart") {
          txt(c, tl.label, -w / 2 + s * 0.12, -h / 2 + s * 0.55, sans(s * 0.3), ink);
          if (tl.extra) txt(c, tl.extra.toUpperCase(), -w / 2 + s * 0.12, -h / 2 + s * 0.75, mono(s * 0.07), alpha(ink, 0.7));
          if (tl.kind === "chart") for (let k = 0; k < 8; k++) c.rect(-w / 2 + s * 0.12 + k * s * 0.1, h / 2 - s * 0.1 - s * 0.05 * (1 + k * 0.4), s * 0.06, s * 0.05 * (1 + k * 0.4), BLUE);
        } else if (tl.kind === "red" || tl.kind === "blue") {
          txt(c, tl.label, 0, s * 0.07, sans(s * 0.17, 700), ink, "center");
        } else {
          if (tl.extra === "shield") c.arc(-w / 2 + s * 0.22, -h / 2 + s * 0.25, s * 0.08, 0, 1, BLUE, s * 0.025);
          else if (tl.extra === "grid") for (let k = 0; k < 9; k++) c.circle(-w / 2 + s * (0.17 + (k % 3) * 0.09), -h / 2 + s * (0.18 + Math.floor(k / 3) * 0.09), s * 0.03, ["#E5534B", "#2F5BEA", "#2E9E6A", "#F59E0B", "#7C3AED", "#111111", "#14B8A6", "#E0457B", "#5B6CE0"][k]);
          else if (tl.extra === "/") txt(c, "/", -w / 2 + s * 0.15, -h / 2 + s * 0.4, sans(s * 0.3, 400), INK);
          else if (tl.extra) { c.circle(-w / 2 + s * 0.2, -h / 2 + s * 0.22, s * 0.07, "#F06A24"); txt(c, tl.extra, -w / 2 + s * 0.32, -h / 2 + s * 0.25, ui(s * 0.09, 600), INK); }
          const Lb = c.layout(tl.label, { ...sans(s * 0.13, 600), lineHeight: 1.05 }, { maxWidth: w - s * 0.24 });
          c.drawLayout(Lb, -w / 2 + s * 0.12, h / 2 - s * 0.12 - Lb.height, { color: ink });
        }
      });
    };
    placed.filter((tl) => tl.z >= 0).forEach(drawTile);
    N.words.forEach((w, i) => {
      const u = pr(t, 0.05 + i * 0.08, 0.4 + i * 0.08, E.out);
      wordFx(c, w, nx, ny, { alpha: u, blur: (1 - u) * c.H * 0.01, color: w.text === p.accentWord ? BLUE : INK });
    });
    txt(c, p.url, c.cx, ny + N.height + c.H * 0.035, mono(c.H * 0.011), alpha(MUTE, 0.8 * pr(t, 0.4, 0.6)), "center");
    placed.filter((tl) => tl.z < 0).forEach(drawTile);
    hud(c, p.brand, "03 — TEAMS", p.at);
  },
});

// ── 6. white-label brand swap ───────────────────────────────────────────────────────────────────────
const BRANDS = ["Acme AI|#F06A24|app.acme.ai", "NovaChat|#7C3AED|chat.nova.app", "Orbit Assist|#16A34A|assist.orbit.co", "TypingMind|#E0457B|custom.typingmind.com"];
function brandMark(c: RC, kind: number, x: number, y: number, r: number, col: string) {
  if (kind % 4 === 0) { c.circle(x, y, r, col); c.poly([[x, y - r * 0.5], [x + r * 0.5, y + r * 0.4], [x - r * 0.5, y + r * 0.4]], "#FFFFFF"); }
  else if (kind % 4 === 1) { c.rrect(x - r, y - r, r * 2, r * 2, r * 0.45, col); for (let i = 0; i < 4; i++) c.with({ x, y, rotate: i * 45 }, () => c.rrect(-r * 0.08, -r * 0.55, r * 0.16, r * 1.1, r * 0.08, "#FFFFFF")); }
  else if (kind % 4 === 2) { c.circle(x, y, r, col); c.arc(x, y, r * 0.5, 0.1, 0.9, "#FFFFFF", r * 0.22); c.circle(x + r * 0.15, y - r * 0.15, r * 0.14, "#FFFFFF"); }
  else { c.circle(x, y, r, col); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; c.poly([[x, y], [x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7], [x + Math.cos(a + 1.05) * r * 0.7, y + Math.sin(a + 1.05) * r * 0.7]], alpha("#FFFFFF", 0.35 + (i % 3) * 0.25)); } }
}
/** "Orbit Assist" → ["Orbit", " Assist"], "NovaChat" → ["Nova", "Chat"]: the second part takes the brand colour. */
function splitName(name: string): [string, string] {
  const sp = name.indexOf(" ");
  if (sp > 0) return [name.slice(0, sp), name.slice(sp)];
  const m = name.match(/^(.+?)([A-Z][a-z]+)$/);
  return m ? [m[1], m[2]] : [name, ""];
}
const brandSwap = defineComponent<{ brand: string; at: number; lines: string[]; brands: string[]; tagline: string }>({
  ...base, id: "showreel-brand-swap", name: "White-Label · Your Brand, Domain, Data",
  description: "Three short lines stack on the left ('Your brand. Your domain. Your data.') while a browser window on the right re-skins itself brand after brand — logo, name, colour, URL and buttons — the accent words recolouring with it.",
  tags: ["white label", "branding", "swap", "browser", "customisation"],
  params: { ...HUD, at: P.number(9.6, "Reel time at start (HUD)", { min: 0, max: 60, step: 0.5, unit: "s" }), lines: P.list(["Your brand.", "Your domain.", "Your data."], "Lines (last word recolours)", { min: 1, max: 4 }), brands: P.list(BRANDS, "Brands (name|colour|url)", { min: 2, max: 6 }), tagline: P.text("Your company's AI workspace", "Workspace line", { maxLength: 40 }) },
  duration: 2.4,
  sounds: (p) => (p.brands as string[]).map((_, i) => ({ at: 0.25 + i * 0.55, sound: "ui.click", gain: 0.25, seed: i, role: "swap" })),
  render(c, p) {
    const t = c.t;
    canvas(c);
    const brands = p.brands.map((s) => { const [name, col, url] = s.split("|"); return { name: (name ?? "").trim(), col: (col ?? BLUE).trim(), url: (url ?? "").trim() }; });
    const bi = clamp(Math.floor((t - 0.25) / 0.55) + 1, 0, brands.length - 1);
    const b = brands[bi];
    const flip = bi ? pr(t, 0.25 + (bi - 1) * 0.55, 0.25 + (bi - 1) * 0.55 + 0.18, E.out) : 1;
    c.light(c.W * 0.7, c.H * 0.9, c.H * 0.6, mix("#FFFFFF", b.col, 0.25), 0.5);
    p.lines.forEach((ln, i) => {
      const L = c.layout(ln, sans(c.H * 0.072));
      const u = pr(t, 0.05 + i * 0.4, 0.4 + i * 0.4, E.out);
      const y = c.H * 0.4 + i * c.H * 0.1 - (L.lines[0]?.y ?? 0);
      L.words.forEach((w, k) => wordFx(c, w, c.W * 0.067, y, { alpha: u, blur: (1 - u) * c.H * 0.01, dx: (1 - u) * -c.W * 0.02, color: k === L.words.length - 1 ? b.col : INK }));
    });
    const wx = c.W * 0.375, wy = c.H * 0.17, ww = c.W * 0.572, wh = c.H * 0.66;
    const win = E.out(pr(t, 0, 0.45));
    c.with({ x: (1 - win) * c.W * 0.08, y: 0, alpha: win }, () => {
      card(c, wx, wy, ww, wh, c.H * 0.016, "#FFFFFF", 0.7);
      c.save();
      c.clipRRect(wx, wy, ww, wh, c.H * 0.016);
      c.rect(wx, wy, ww, c.H * 0.035, "#F3F4F6");
      ["#FF5F57", "#FEBC2E", "#28C840"].forEach((col, i) => c.circle(wx + c.H * (0.02 + i * 0.016), wy + c.H * 0.0175, c.H * 0.005, col));
      c.rrect(wx + ww * 0.4, wy + c.H * 0.008, ww * 0.25, c.H * 0.019, c.H * 0.006, "#FFFFFF");
      txt(c, b.url, wx + ww * 0.525, wy + c.H * 0.022, ui(c.H * 0.011, 500), alpha(MUTE, 0.9), "center");
      const sw = ww * 0.17;
      c.rect(wx, wy + c.H * 0.035, sw, wh, "#FAFAFB");
      brandMark(c, bi, wx + c.H * 0.025, wy + c.H * 0.06, c.H * 0.009, b.col);
      txt(c, b.name, wx + c.H * 0.04, wy + c.H * 0.065, ui(c.H * 0.012, 700), INK);
      c.rrect(wx + c.H * 0.015, wy + c.H * 0.085, sw - c.H * 0.03, c.H * 0.024, c.H * 0.005, b.col);
      txt(c, "+ New chat", wx + sw / 2, wy + c.H * 0.101, ui(c.H * 0.01, 600), "#FFFFFF", "center");
      bars(c, wx + c.H * 0.015, wy + c.H * 0.13, sw - c.H * 0.03, 6, c.H * 0.022, alpha(INK, 0.1), 600);
      const mx = wx + sw + (ww - sw) / 2, my = wy + wh * 0.42;
      c.with({ x: mx, y: my, scale: 0.85 + 0.15 * flip, alpha: flip }, () => {
        brandMark(c, bi, 0, -c.H * 0.035, c.H * 0.03, b.col);
        const [a1, a2] = splitName(b.name);
        const N1 = c.layout(a1, sans(c.H * 0.036, 700)), N2 = c.layout(a2 || " ", sans(c.H * 0.036, 700));
        const nw = N1.width + (a2 ? N2.width : 0);
        c.drawLayout(N1, -nw / 2, c.H * 0.04 - (N1.lines[0]?.y ?? 0), { color: INK });
        if (a2) c.drawLayout(N2, -nw / 2 + N1.width, c.H * 0.04 - (N2.lines[0]?.y ?? 0), { color: b.col });
        txt(c, p.tagline, 0, c.H * 0.072, ui(c.H * 0.012, 400), alpha(MUTE, 0.9), "center");
      });
      const iw = (ww - sw) * 0.75, ix = mx - iw / 2, iy = wy + wh - c.H * 0.1;
      c.strokeRRect(ix, iy, iw, c.H * 0.05, c.H * 0.012, alpha(INK, 0.1), 1);
      txt(c, "Press \"/\" to focus input", ix + c.H * 0.015, iy + c.H * 0.022, ui(c.H * 0.01, 400), alpha(MUTE, 0.8));
      c.circle(ix + iw - c.H * 0.02, iy + c.H * 0.032, c.H * 0.009, b.col);
      c.restore();
    });
    hud(c, p.brand, "04 — BRAND", p.at);
  },
});

// ── 7–8. low-poly mark assembly and the end card ────────────────────────────────────────────────────
const NIGHT = (c: RC) => {
  c.clear("#1A1F33");
  c.rect(0, 0, c.W, c.H, c.linear(0, 0, 0, c.H, [[0, "#4A1C2C"], [0.55, "#2A2240"], [1, "#14223B"]]));
  c.light(c.W * 0.55, c.H * 0.2, c.H * 0.7, "#7A2E3E", 0.35, "screen");
};
interface Tri {
  pts: [number, number][];
  col: string;
  cx: number;
  cy: number;
  i: number;
}
let MARK: Tri[] | null = null;
/** A low-poly head-and-stem mark from a jittered grid inside its silhouette (unit coordinates, ±1). */
function markTris(): Tri[] {
  if (MARK) return MARK;
  const inside = (x: number, y: number) => {
    const lump = 0.9 + 0.08 * Math.sin(Math.atan2(y, x) * 5);
    return Math.hypot(x * 1.05, (y + 0.12) * 1.15) < lump || (Math.abs(x + 0.05) < 0.16 && y > 0.6 && y < 1.05);
  };
  const N = 9, pts: [number, number][][] = [];
  for (let j = 0; j <= N; j++) {
    pts.push([]);
    for (let i = 0; i <= N; i++) {
      const x = -1 + (2 * i) / N + (j % 2 ? 1 / N : 0) + (rand(i * 13 + j * 7) - 0.5) * 0.12, y = -1 + (2.1 * j) / N + (rand(i * 5 + j * 17) - 0.5) * 0.12;
      pts[j].push([x, y]);
    }
  }
  const pal = ["#FFFFFF", "#F4EFE8", "#EADFD3", "#F6C9B8", "#EE8F7A", "#D9475A", "#F4D27A", "#FFFFFF", "#C8D3F0", "#7F9BE0", "#F2EEE8", "#E9A0B0"];
  const out: Tri[] = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = pts[j][i], b = pts[j][i + 1], cc = pts[j + 1][i], d = pts[j + 1][i + 1];
    for (const tri of [[a, b, cc], [b, d, cc]] as [number, number][][]) {
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      if (!inside(cx, cy)) continue;
      const hue = clamp((cx + 1) / 2 + (rand(out.length + 40) - 0.5) * 0.35, 0, 0.999);
      const col = rand(out.length + 90) < 0.45 ? pal[Math.floor(rand(out.length) * 3)] : pal[3 + Math.floor(hue * 8)];
      out.push({ pts: tri, col, cx, cy, i: out.length });
    }
  }
  MARK = out;
  return out;
}
function drawMark(c: RC, x: number, y: number, R: number, t: number, assemble: number | null, logo: string | null) {
  const tris = markTris();
  tris.forEach((tr) => {
    const d = rand(tr.i + 300) * 0.45;
    const u = assemble === null ? 1 : E.out(pr(assemble, d, d + 0.55));
    if (u <= 0) return;
    const ang = rand(tr.i + 1) * Math.PI * 2, far = 2.6 + rand(tr.i + 2) * 3;
    const sx = Math.cos(ang) * far * 1.6, sy = Math.sin(ang) * far, rot = (rand(tr.i + 3) - 0.5) * 6 * (1 - u);
    const ox = lerp(sx, tr.cx, u), oy = lerp(sy, tr.cy, u), sc = lerp(3.2, 1, u);
    c.with({ x: x + ox * R, y: y + oy * R, rotate: (rot * 180) / Math.PI, scale: sc }, () => c.poly(tr.pts.map(([px, py]) => [(px - tr.cx) * R * 1.02, (py - tr.cy) * R * 1.02] as [number, number]), alpha(tr.col, 0.6 + 0.4 * u)));
  });
  if (logo) {
    const a = assemble === null ? 1 : pr(assemble, 0.8, 1.1);
    if (a > 0) mediaOr(c, logo, x - R * 1.1, y - R * 1.1, R * 2.2, R * 2.2, "logo", { fit: "contain", alpha: a });
  }
  void t;
}
function drift(c: RC, t: number) {
  for (let i = 0; i < 26; i++) {
    const x = ((rand(i) * 1.2 + t * 0.02 * (0.5 + rand(i + 9))) % 1.2) * c.W - c.W * 0.1, y = rand(i + 50) * c.H;
    const s = c.H * (0.004 + rand(i + 70) * 0.008);
    c.with({ x, y, rotate: t * 40 * (rand(i + 5) - 0.5) + i * 30 }, () => c.poly([[0, -s], [s * 0.9, s * 0.6], [-s * 0.9, s * 0.6]], alpha("#FFFFFF", 0.25 + rand(i + 33) * 0.3)));
  }
}

const assemble = defineComponent<{ logo: string | null }>({
  ...base, id: "showreel-lowpoly-assemble", name: "Low-Poly Mark · Shards Assemble",
  description: "On a deep maroon-to-navy gradient, dozens of coloured triangles fly in from every direction, spinning and shrinking, and lock together into a low-poly mark while small shards drift past.",
  tags: ["logo", "low poly", "assemble", "shards", "reveal"],
  params: { logo: P.media(null, "Logo (optional, fades in over the shards)", "image") },
  duration: 1.2,
  theme: { ...LOOK, mode: "dark" as const, bg: "#1A1F33", fg: "#FFFFFF" },
  sounds: () => [{ at: 0.05, sound: "whoosh.air", gain: 0.35, role: "shards" }, { at: 0.9, sound: "impact.land", gain: 0.3, role: "lock" }],
  render(c, p) {
    NIGHT(c);
    drift(c, c.t);
    drawMark(c, c.cx, c.H * 0.47, c.H * 0.17, c.t, c.t, p.logo);
  },
});

const endCard = defineComponent<{ name: string; accentPart: string; tagline: string; links: string[]; logo: string | null }>({
  ...base, id: "showreel-wordmark-end", name: "End Card · Mark, Typed Wordmark, Link Pills",
  description: "The assembled mark slides left as the wordmark types itself in beside it (second half in a gradient accent), a one-line tagline fades up and two link pills arrive, each with a small label.",
  tags: ["end card", "wordmark", "typing", "links", "logo"],
  params: { name: P.text("TypingMind", "Wordmark", { maxLength: 24 }), accentPart: P.text("Mind", "Accent part (end of the name)", { maxLength: 16 }), tagline: P.text("The best frontend for LLMs", "Tagline", { maxLength: 50 }), links: P.list(["typingmind.com|FOR YOU", "custom.typingmind.com|FOR TEAMS"], "Links (url|label)", { max: 3 }), logo: P.media(null, "Logo (optional)", "image") },
  duration: 1.8,
  theme: { ...LOOK, mode: "dark" as const, bg: "#1A1F33", fg: "#FFFFFF" },
  sounds: () => [{ at: 0.2, sound: "foley.key", gain: 0.2, role: "type" }, { at: 1.1, sound: "tonal.shimmer", gain: 0.2, role: "links" }],
  render(c, p) {
    const t = c.t;
    NIGHT(c);
    drift(c, t + 1.2);
    const size = c.H * 0.125;
    const full = c.layout(p.name, sans(size, 700));
    const R = c.H * 0.17, Rf = c.H * 0.1;
    const gap = c.H * 0.03;
    const total = Rf * 2 + gap + full.width;
    const mxEnd = c.cx - total / 2 + Rf, my = c.H * 0.47;
    const u = clamp(spring(t - 0.05, SPRING.firm), 0, 1.05);
    drawMark(c, lerp(c.cx, mxEnd, u), lerp(my, c.H * 0.44, u), lerp(R, Rf, u), t, null, p.logo);
    const s = typed(p.name, t, 0.3, 16);
    const split = Math.max(0, p.name.length - p.accentPart.length);
    const A = c.layout(s.slice(0, split) || " ", sans(size, 700)), B = c.layout(s.slice(split), sans(size, 700));
    const x = mxEnd + Rf + gap, base = c.H * 0.44 + full.cap / 2;
    if (s.length) c.drawLayout(A, x, base - (A.lines[0]?.y ?? 0), { color: "#FFFFFF" });
    if (s.length > split) c.drawLayout(B, x + A.width, base - (B.lines[0]?.y ?? 0), { color: "#8EA2FF" });
    if (t < 1.2 || caret(t)) c.rect(x + (s.length ? A.width + (s.length > split ? B.width : 0) : 0) + 4, base - full.cap * 1.05, 3, full.cap * 1.25, "#8EA2FF");
    txt(c, p.tagline, c.cx, c.H * 0.61, ui(c.H * 0.03, 400), alpha("#FFFFFF", 0.8 * pr(t, 0.85, 1.15)), "center");
    const links = p.links.map((l) => { const [url, label] = l.split("|"); return { url: (url ?? "").trim(), label: (label ?? "").trim() }; });
    const Ls = links.map((l) => ({ U: c.layout(l.url, ui(c.H * 0.022, 500)), Lb: c.layout(l.label, mono(c.H * 0.01)) }));
    const pw = Ls.map((l) => l.U.width + l.Lb.width + c.H * 0.06);
    let px = c.cx - (pw.reduce((a, b) => a + b, 0) + c.H * 0.015 * (pw.length - 1)) / 2;
    Ls.forEach((l, i) => {
      const a = pr(t, 1.05 + i * 0.12, 1.3 + i * 0.12);
      const h = c.H * 0.052, y = c.H * 0.675;
      c.with({ alpha: a, y: (1 - a) * c.H * 0.01 }, () => {
        c.rrect(px, y, pw[i], h, h / 2, alpha("#FFFFFF", 0.08));
        c.strokeRRect(px, y, pw[i], h, h / 2, alpha("#FFFFFF", 0.12), 1);
        c.circle(px + c.H * 0.018, y + h / 2, c.H * 0.004, "#FFFFFF");
        c.drawLayout(l.U, px + c.H * 0.03, y + h / 2 - l.U.cap / 2 - ((l.U.lines[0]?.y ?? 0) - l.U.cap), { color: "#FFFFFF" });
        c.drawLayout(l.Lb, px + c.H * 0.042 + l.U.width, y + h / 2 - l.Lb.cap / 2 - ((l.Lb.lines[0]?.y ?? 0) - l.Lb.cap), { color: alpha("#FFFFFF", 0.45) });
      });
      px += pw[i] + c.H * 0.015;
    });
  },
});

const components = [chatWith, composer, askAll, teamWall, cloud, brandSwap, assemble, endCard] as unknown as Component[];

const template: PostSpec = {
  id: "kit-product-showreel",
  title: "Product showreel — TypingMind in 15 seconds",
  format: "landscape",
  fps: 60,
  clips: components.map((k) => ({ component: k.id })),
  music: { src: "media/music/library/inspired.mp3", gain: 0.5, offset: 16.505, fadeIn: 0.02, fadeOut: 0.8, credit: "\"Inspired\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Kit template: @ann_nnng's product showreel (15 s). The model read the product's pages and wrote the script; copy kept as in the original.",
};

export const productShowreel: Kit = {
  id: "product-showreel",
  promptId: "2103723183899852885",
  title: "Product showreel, scripted from your site",
  family: "showreel",
  format: "landscape",
  summary: "The showreel prompt pointed at a product: the model reads the pages, writes the story and animates it on a light design-tool canvas — a pill rolling through every model inside a selection box, a composer, three answers streaming at once, a pull-back to the whole team, a cloud of feature tiles, white-label branding re-skinning a window, then a dark low-poly logo assembly and a typed end card.",
  shots: [
    { at: 0, shot: "'Chat with [GPT-5 → Claude → Grok → DeepSeek → every model.]' inside a selection box", component: "showreel-pill-roll" },
    { at: 2.75, shot: "Model chips and a composer typing 'Plan our product launch'", component: "showreel-composer" },
    { at: 4.4, shot: "'Ask them all at once.' — three answers stream side by side", component: "showreel-parallel-answers" },
    { at: 5.9, shot: "Pull back across a wall of team workspaces: 'Now for your whole team.'", component: "showreel-team-wall" },
    { at: 7.6, shot: "'TypingMind Teams' with feature tiles orbiting in 3D", component: "showreel-feature-cloud" },
    { at: 9.6, shot: "'Your brand. Your domain. Your data.' as a window re-skins brand after brand", component: "showreel-brand-swap" },
    { at: 12, shot: "Coloured shards fly in and assemble the low-poly mark", component: "showreel-lowpoly-assemble" },
    { at: 13.2, shot: "Mark slides left, 'TypingMind' types in, tagline and two link pills", component: "showreel-wordmark-end" },
  ],
  rules: [
    "Visit the product's pages first, then write the script yourself; every line is a real capability",
    "A light design-tool canvas for the product story: guides, selection boxes, size readouts, a quiet HUD",
    "Real UI recreated (composer, chips, cards, windows), never stock screenshots",
    "End dark: the logo assembles, the wordmark types, links close it",
  ],
  components,
  template,
};

void alpha;
