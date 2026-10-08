import { E, P, SPRING, breathe, defineComponent, jitterStagger, logLerp, mix, pr, sp, wordWidth, type FontId, type RC } from "@motioneasy/engine";

// Style 1: a whole VO-led explainer Short drawn from one plan (styles/style-1, skill "style-1").
// Every value here was measured in the reference Shorts; see .claude/skills/style-1/SKILL.md §2–4.

type Word = { w: string; t: number; s?: string }; // s flags: k key (1.7×, 800) · s small · i italic · u uppercase · a accent colour
type Text = { lines: Word[][]; y: number; size?: number };
type Item = { text: string; t: number; words?: { w: string; t: number }[] };
type List = { items: Item[]; y: number; size?: number; x?: number };
type Obj = {
  kind: "card" | "phone" | "icon" | "cutout" | "prop" | "bubble" | "cascade" | "burst";
  src?: string; t: number; out?: number; x?: number; y?: number; w?: number; rot?: number;
  text?: string; count?: number; cols?: number; bw?: boolean;
};
type Beat = { t: number; end: number; bg?: string; texts?: Text[]; list?: List; objects?: Obj[] };
type Plan = { duration: number; beats: Beat[]; accent?: string; watermark?: string; font?: FontId };
type Props = { plan: Plan };

const INK = "#111111";
const GREY = "#8A8A8A"; // a word's first frame (measured ~#555–#9A9A9A at 30 fps)
const TONES: Record<string, string> = { white: "#FFFFFF", offwhite: "#F6F6F6", grey: "#F2F2F2" };
const REVEAL = 7 / 30; // grey → black in 6–8 frames
const SETTLE = 9 / 30; // slide into the slot / re-centre
const EXIT = 0.16;

const DEMO: Plan = {
  duration: 7,
  accent: "#E8735A",
  watermark: "yourbrand.com",
  beats: [
    { t: 0, end: 3.4, bg: "offwhite", texts: [{ y: 0.16, lines: [
      [{ w: "Most", t: 0.1 }, { w: "people", t: 0.35 }, { w: "think", t: 0.6 }],
      [{ w: "great", t: 0.9, s: "k" }, { w: "design", t: 1.15, s: "k" }],
      [{ w: "takes", t: 1.5, s: "s" }, { w: "years.", t: 1.75, s: "i" }],
    ] }], objects: [{ kind: "burst", t: 1.2, x: 0.5, y: 0.58, w: 0.36 }, { kind: "bubble", t: 2.2, x: 0.5, y: 0.74, text: "It doesn't." }] },
    { t: 3.4, end: 7, bg: "white-plus", texts: [{ y: 0.14, lines: [[{ w: "you", t: 3.5 }, { w: "need", t: 3.7 }]] }],
      list: { y: 0.33, items: [{ text: "a grid", t: 4.1 }, { text: "one accent colour", t: 4.7 }, { text: "patience", t: 5.4 }] },
      objects: [{ kind: "cascade", t: 5.8, x: 0.5, y: 0.7, w: 0.7, count: 12, cols: 6 }] },
  ],
};

// ── backgrounds (same values as styles/style-1/backgrounds/spec.json) ─────────────
function background(c: RC, bg: string) {
  const [tone, ...pat] = bg.split("-");
  c.rect(0, 0, c.W, c.H, TONES[tone] ?? TONES.offwhite);
  const kind = pat.join("-");
  const drift = c.t * 3; // patterns never freeze
  if (kind === "grid-panel" || kind === "grid-full") {
    const full = kind === "grid-full";
    const cols = full ? 10 : 8, rows = full ? Math.ceil(c.H / 92) + 1 : 9;
    const x0 = c.W / 2 - (cols * 108) / 2, y0 = full ? -46 + (drift % 92) : 640 - (rows * 92) / 2;
    c.save();
    if (!full) c.alpha(0.95);
    for (let j = 0; j <= rows; j++) for (let x = x0 - 110; x < x0 + cols * 108 + 110; x += 11) {
      const y = y0 + j * 92, a = full ? 1 : edgeFade(x, y, x0, y0, cols * 108, rows * 92);
      if (a > 0.02) c.line(x, y, x + 6, y, `rgba(217,217,217,${a})`, 2, "butt");
    }
    for (let i = 0; i <= cols; i++) for (let y = y0 - 110; y < y0 + rows * 92 + 110; y += 11) {
      const x = x0 + i * 108, a = full ? 1 : edgeFade(x, y, x0, y0, cols * 108, rows * 92);
      if (a > 0.02) c.line(x, y, x, y + 6, `rgba(217,217,217,${a})`, 2, "butt");
    }
    for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) {
      const x = x0 + i * 108, y = y0 + j * 92, a = full ? 1 : edgeFade(x, y, x0, y0, cols * 108, rows * 92);
      c.circle(x, y, 5.5, `rgba(215,215,215,${a})`);
    }
    c.restore();
  } else if (kind === "dots") {
    for (let y = -46 + (drift % 92); y < c.H; y += 92) for (let x = c.W / 2 - 540; x <= c.W; x += 108) c.circle(x, y, 3, "#E2E2E2");
  } else if (kind === "plus") {
    for (let y = 45; y < c.H; y += 90) {
      const a = Math.min(1, Math.min(y, c.H - y) / 300);
      for (let x = c.W / 2 % 90; x < c.W; x += 90) {
        c.line(x - 10, y, x + 10, y, `rgba(202,202,202,${a})`, 2, "butt");
        c.line(x, y - 10, x, y + 10, `rgba(202,202,202,${a})`, 2, "butt");
      }
    }
  }
}
const edgeFade = (x: number, y: number, x0: number, y0: number, w: number, h: number) => {
  const d = Math.max(x0 - x, x - (x0 + w), y0 - y, y - (y0 + h), 0);
  return Math.max(0, 1 - d / 110);
};

// ── word-by-word type ──────────────────────────────────────────────────────────
function wordStyle(wd: Word, base: number, font: FontId) {
  const f = wd.s ?? "";
  const size = base * (f.includes("k") ? 1.7 : f.includes("s") ? 0.62 : 1);
  const weight = f.includes("k") ? 800 : f.includes("s") ? 500 : 700;
  const text = f.includes("u") ? wd.w.toUpperCase() : wd.w;
  return { text, size, weight, italic: f.includes("i"), font, w: wordWidth(text, font, size, weight, f.includes("i"), -0.015 * size) };
}

function drawText(c: RC, T: Text, font: FontId, accent: string, exitK: number) {
  let base = T.size ?? 92; // ref 1: "you get" ≈ 95 px
  // never overflow: shrink the whole block until its widest line fits the safe width
  const widest = Math.max(...T.lines.map((l) => l.reduce((a, wd, i) => a + wordStyle(wd, base, font).w + (i ? base * 0.26 : 0), 0)));
  if (widest > c.W - 150) base *= (c.W - 150) / widest;
  let y = T.y * c.H;
  for (const line of T.lines) {
    const st = line.map((wd) => ({ wd, ...wordStyle(wd, base, font), p: pr(c.t, wd.t, wd.t + SETTLE, E.out) }));
    const vis = st.filter((s) => c.t >= s.wd.t);
    if (!vis.length) break; // later lines wait for their first word
    const lh = Math.max(...st.map((s) => s.size)) * 1.12;
    y += lh * 0.85;
    const gap = base * 0.26;
    const total = vis.reduce((a, s, i) => a + (s.w + (i ? gap : 0)) * s.p, 0); // growing words re-centre the line smoothly
    // centre on the settling width, but keep the line (incoming words at full width) inside the safe area
    const full = vis.reduce((a, s, i) => a + s.w + (i ? gap : 0), 0) + base * 0.22;
    let x = Math.max(75, Math.min(c.cx - total / 2, c.W - 75 - full));
    vis.forEach((s, i) => {
      if (i) x += gap * s.p;
      const u = pr(c.t, s.wd.t, s.wd.t + REVEAL, E.out);
      const col = mix(GREY, s.wd.s?.includes("a") ? accent : INK, u);
      c.text(s.text, x + (1 - s.p) * base * 0.22, y, { font, size: s.size, weight: s.weight, italic: s.italic, align: "left", valign: "baseline" }, { color: col, alpha: exitK });
      x += s.w * s.p;
    });
    y += lh * 0.15;
  }
}

function sparkle(c: RC, x: number, y: number, r: number, color: string) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.18 : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  c.poly(pts, color);
}

function drawList(c: RC, L: List, font: FontId, exitK: number) {
  const size = L.size ?? 80, x0 = (L.x ?? 0.1) * c.W; // ref 1 list items ≈ 82 px
  L.items.forEach((it, i) => {
    if (c.t < it.t) return;
    const y = L.y * c.H + i * size * 2.5; // ref 1: rows ≈ 205 px apart
    const k = sp(c.t, it.t, SPRING.punchy);
    c.with({ x: x0 + size * 0.45, y: y - size * 0.34, scale: k, rotate: (1 - k) * 40, alpha: exitK }, () => sparkle(c, 0, 0, size * 0.55, INK));
    // the item fills in word by word on the VO, like the main text (ref 1: "trigger based" black, "hooks" still grey)
    let x = x0 + size * 1.3;
    for (const wd of it.words ?? [{ w: it.text, t: it.t }]) {
      if (c.t < wd.t) break;
      const u = pr(c.t, wd.t, wd.t + REVEAL, E.out), p = pr(c.t, wd.t, wd.t + SETTLE, E.out);
      c.text(wd.w, x + (1 - p) * size * 0.22, y, { font, size, weight: 700, align: "left", valign: "baseline" }, { color: mix(GREY, INK, u), alpha: exitK * pr(c.t, wd.t, wd.t + 0.05) });
      x += wordWidth(wd.w, font, size, 700, false, -0.015 * size) + size * 0.26;
    }
  });
}

// ── objects ────────────────────────────────────────────────────────────────────
function burst(c: RC, x: number, y: number, r: number, color: string, spin: number) {
  c.save(); c.translate(x, y); c.rotate(spin);
  for (let i = 0; i < 12; i++) {
    c.rotate(30);
    c.rrect(-r * 0.09, -r, r * 0.18, r, r * 0.09, color);
  }
  c.restore();
}

function drawObj(c: RC, o: Obj, i: number, accent: string, beatEnd: number) {
  if (c.t < o.t) return;
  const out = o.out ?? beatEnd;
  const xk = 1 - pr(c.t, out - EXIT, out, E.in);
  if (xk <= 0) return;
  const W = (o.w ?? 0.6) * c.W, x = (o.x ?? 0.5) * c.W, y0 = (o.y ?? 0.55) * c.H;
  const seed = i * 13 + 7;
  // idle life after landing: nothing fully stops (drift, tilt, breathe)
  const dy = breathe(c.t, seed, 6), rot = (o.rot ?? 0) + breathe(c.t, seed + 3, 1.2);
  const k = sp(c.t, o.t, o.kind === "card" || o.kind === "phone" ? SPRING.firm : SPRING.punchy);
  const y = y0 + dy + (o.kind === "card" || o.kind === "phone" ? (1 - k) * 90 : 0);
  const sc = (o.kind === "card" || o.kind === "phone" ? 0.92 + 0.08 * k : k) * (0.96 + 0.04 * xk);
  const info = o.src ? c.mediaInfo(o.src) : null;
  const ar = info && info.w > 0 ? info.h / info.w : 0.62;
  c.with({ x, y, scale: sc, rotate: rot, alpha: xk * pr(c.t, o.t, o.t + 0.1) }, () => {
    switch (o.kind) {
      case "card": {
        const h = Math.min(W * ar, c.H * 0.5), r = 26;
        c.cardShadow(-W / 2, -h / 2, W, h, r, 0.9, 1.4);
        if (o.src) c.media(o.src, -W / 2, -h / 2, W, h, { fit: "cover", focus: [0.5, 0], radius: r, zoom: 1 + 0.04 * pr(c.t, o.t, out) });
        else c.rrect(-W / 2, -h / 2, W, h, r, "#14161A");
        break;
      }
      case "phone": {
        const h = W * 2.05, r = W * 0.15, b = W * 0.035;
        c.cardShadow(-W / 2, -h / 2, W, h, r, 1, 1.5);
        c.rrect(-W / 2, -h / 2, W, h, r, "#0D0D0F");
        if (o.src) c.media(o.src, -W / 2 + b, -h / 2 + b, W - 2 * b, h - 2 * b, { fit: "cover", focus: [0.5, 0], radius: r - b });
        c.rrect(-W * 0.12, -h / 2 + b * 2, W * 0.24, b * 1.6, b, "#0D0D0F");
        break;
      }
      case "icon": case "prop": case "cutout": {
        if (o.kind === "cutout") burst(c, 0, W * 0.05, W * 0.62, accent, c.t * 8);
        const h = W * ar;
        c.save();
        c.shadow("rgba(20,20,20,0.22)", 40, 14, 24);
        if (o.bw ?? o.kind === "cutout") c.ctx.filter = "grayscale(1) contrast(1.08)";
        if (o.src) c.media(o.src, -W / 2, -h / 2, W, h, { fit: "contain" });
        else c.rrect(-W / 2, -W / 2, W, W, W * 0.22, INK);
        c.ctx.filter = "none";
        c.restore();
        break;
      }
      case "bubble": {
        const size = 44, tw = wordWidth(o.text ?? "", "roboto", size, 600, false, 0);
        const w = tw + size * 1.4, h = size * 2;
        c.save(); c.shadow("rgba(0,0,0,0.25)", 30, 0, 14); c.rrect(-w / 2, -h / 2, w, h, h / 2, INK); c.restore();
        c.poly([[w * 0.28, h / 2 - 2], [w * 0.4, h / 2 - 2], [w * 0.42, h / 2 + 18]], INK);
        c.text(o.text ?? "", 0, 0, { font: "roboto", size, weight: 600, align: "center", valign: "middle" }, { color: "#FFFFFF" });
        break;
      }
      case "burst":
        burst(c, 0, 0, W / 2, accent, c.t * 10);
        break;
      case "cascade": {
        const n = o.count ?? 8, cols = o.cols ?? 4, cell = W / cols, rows = Math.ceil(n / cols);
        for (let j = 0; j < n; j++) {
          const at = o.t + jitterStagger(j, 1.6 / 30, seed);
          if (c.t < at) continue;
          const kk = sp(c.t, at, SPRING.punchy) * (0.85 + 0.3 * c.rnd(seed + j));
          const cx = -W / 2 + cell * ((j % cols) + 0.5), cy = -(rows * cell) / 2 + cell * (Math.floor(j / cols) + 0.5);
          c.with({ x: cx, y: cy + breathe(c.t, seed + j, 3), scale: kk }, () => {
            if (o.src) c.media(o.src, -cell * 0.4, -cell * 0.4, cell * 0.8, cell * 0.8, { fit: "contain" });
            else c.rrect(-cell * 0.36, -cell * 0.36, cell * 0.72, cell * 0.72, cell * 0.16, accent);
          });
        }
        break;
      }
    }
  });
}

export default defineComponent<Props>({
  id: "style1-video",
  name: "Style 1 video",
  version: "0.1.0",
  group: "scenes",
  category: "explainer",
  description: "A whole VO-led explainer Short from one plan: off-white stage with a living grid, word-by-word type that greys in and settles, pop-in cards, phones, icons, cut-outs and lists.",
  tags: ["style-1", "explainer", "voiceover", "short", "words"],
  added: "2026-10-08",
  formats: ["vertical"],
  theme: false,
  camera: "still",
  notes: "Built by the Style 1 pipeline (styles/tools/plan.py); sound is mixed outside the engine (sfx_mix.py).",
  params: { plan: P.json(DEMO, "Plan") },
  duration: (p) => Math.max(1, p.plan?.duration ?? DEMO.duration),
  media: (p) => (p.plan?.beats ?? []).flatMap((b) => (b.objects ?? []).map((o) => o.src).filter((s): s is string => !!s)),
  render(c, p) {
    const plan = p.plan ?? DEMO, font = plan.font ?? "roboto", accent = plan.accent ?? "#E8735A";
    const beat = plan.beats.find((b) => c.t >= b.t && c.t < b.end) ?? plan.beats[plan.beats.length - 1];
    // slow push over the whole video, scale in log space (motion rule)
    const k = logLerp(1, 1.045, c.t / Math.max(1, plan.duration));
    background(c, beat.bg ?? "offwhite");
    if (plan.watermark) c.text(plan.watermark, c.cx, 1645, { font, size: 74, weight: 700, align: "center", valign: "middle" }, { color: "#E0E0E0" });
    c.with({ x: c.cx, y: c.cy, scale: k }, () => {
      c.translate(-c.cx, -c.cy);
      const exitK = 1 - pr(c.t, beat.end - EXIT, beat.end, E.in);
      (beat.objects ?? []).forEach((o, i) => drawObj(c, o, i, accent, beat.end));
      for (const T of beat.texts ?? []) drawText(c, T, font, accent, exitK);
      if (beat.list) drawList(c, beat.list, font, exitK);
    });
  },
});
