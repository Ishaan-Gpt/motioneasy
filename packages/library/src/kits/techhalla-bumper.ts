// Kit: "Loopable kinetic identity bumper" (@techhalla). A 20 s street poster that moves: black, magenta and
// acid green only; a display scream face, an urban grotesque and a mono for prompt crumbs; per-glyph
// springs on a 1/16-note stagger at 120 BPM, seeded scrambles, print misregistration on impact frames,
// mask wipes through the outgoing word, an L-bracket brand lock, and a loop where frame 0 == last.

import { E, P, SPRING, alpha, clamp, defineComponent, pr, rand, sp, spring, type Component, type RC, type SoundCue, type TextLayout } from "@motioneasy/engine";
import type { PostSpec } from "../sequence";
import { caret, typed } from "./shared";
import type { Kit } from "./types";

const BG = "#0A0A0A";
const MAG = "#FF2BD6";
const ACID = "#B8FF00";
const WHITE = "#F5F5F5";
const BEAT = 0.5, SIXTEENTH = 0.125;
const LOOK = { mode: "dark" as const, bg: BG, fg: WHITE, accent: ACID, lighting: 0, grain: 0.35, vignette: 0, backdrop: "plain" as const, camera: "still" as const };

const scream = (size: number) => ({ font: "archivo" as const, size, weight: 900, tracking: -0.05, lineHeight: 0.92, uppercase: true });
const grotesk = (size: number) => ({ font: "bricolage" as const, size, weight: 800, tracking: -0.03, lineHeight: 0.95, uppercase: true });
const mono = (size: number) => ({ font: "mono" as const, size, weight: 500, tracking: 0.08, lineHeight: 1.3, uppercase: true });

/** Poster chrome: corner ticks, a baseline grid hint, mono timecode crumbs. Same on every shot so cuts read as one piece. */
function chrome(c: RC, t: number, abs: number) {
  c.clear(BG);
  const m = c.W * 0.03, k = c.W * 0.02;
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [c.W - m, m, -1, 1], [m, c.H - m, 1, -1], [c.W - m, c.H - m, -1, -1]] as const) {
    c.line(x, y, x + k * dx, y, alpha(WHITE, 0.35), 2, "butt");
    c.line(x, y, x, y + k * dy, alpha(WHITE, 0.35), 2, "butt");
  }
  const L = c.layout("TH-23/01   120 BPM   1080×1080   60 FPS", mono(c.W * 0.011));
  c.drawLayout(L, m + k * 1.2, c.H - m - L.height * 0.2, { color: alpha(ACID, 0.6) });
  const frame = Math.floor((abs % 20) * 60);
  const R = c.layout(`${(abs % 20).toFixed(3)}s   ${String(frame).padStart(4, "0")}/1200`, mono(c.W * 0.011));
  c.drawLayout(R, c.W - m - k * 1.2 - R.width, c.H - m - R.height * 0.2, { color: alpha(ACID, 0.6) });
  void t;
}

/** Print misregistration: magenta and acid copies offset by a few px, on impact frames only. */
function misregister(c: RC, draw: (dx: number, dy: number, color: string, a: number) => void, impact: number) {
  if (impact <= 0.01) return;
  const off = 2 + 2 * impact;
  draw(-off, 0, MAG, 0.4 * impact);
  draw(off, off * 0.5, ACID, 0.4 * impact);
}

/** Per-glyph spring entrance (y, opacity, blur-ish smear), stagger = one 1/16 note. */
function glyphs(c: RC, L: TextLayout, x: number, y: number, t: number, at: number, color: string, o: { from?: number; skipBelow?: number } = {}) {
  for (const w of L.words) for (let i = 0; i < w.chars.length; i++) {
    const g = w.charStart + i;
    const k = sp(t, at + g * SIXTEENTH * 0.5, SPRING.punchy);
    if (k <= 0.001) continue;
    const ch = w.chars[i];
    const dy = (1 - k) * (o.from ?? w.size * 0.9);
    c.char(w, i, x + w.x + ch.x, y + w.y + dy, { color, alpha: clamp(k * 3) });
  }
}

/** A display line sized so it runs exactly `width` wide. */
function fitLine(c: RC, s: string, width: number, k = 1) {
  const L0 = c.layout(s, scream(100));
  return c.layout(s, scream((100 * width * k) / Math.max(1, L0.width)));
}

/** Seeded Fisher–Yates scramble of a line's letters, resolving glyph by glyph. */
function scrambled(s: string, k: number, seed: number) {
  const chars = s.split("");
  const pool = chars.filter((ch) => ch.trim());
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand(seed * 31 + i) * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let p = 0;
  return chars.map((ch, i) => (ch.trim() ? (i / chars.length < k ? ch : pool[p++ % pool.length]) : ch)).join("");
}

const base = { version: "1.0.0", group: "kits" as const, category: "kit-techhalla-bumper", added: "2026-10-04", formats: ["square" as const], theme: LOOK, camera: "still" as const };

// 0.0–2.5 cold open
const stop = defineComponent<{ line1: string; line2: string }>({
  ...base, id: "techhalla-stop-scrolling", name: "Cold Open Slam",
  description: "0.0–2.5 s. STOP SCROLLING slams in from below glyph by glyph on spring overshoot, a magenta smear trailing; an acid-green baseline ticks across like a waveform.",
  tags: ["slam", "kinetic type", "spring", "waveform"],
  params: { line1: P.text("STOP", "Scream", { maxLength: 12 }), line2: P.text("SCROLLING", "Second line", { maxLength: 14 }) },
  duration: 2.5,
  sounds: () => [{ at: 0, sound: "impact.sub", gain: 0.5, role: "downbeat" }, { at: 0.5, sound: "impact.punch", gain: 0.45, role: "slam" }, { at: 1.0, sound: "impact.punch", gain: 0.4, role: "slam" }, { at: 1.5, sound: "ui.tick", gain: 0.3, role: "tick" }],
  render(c, p) {
    const t = c.t;
    chrome(c, t, t);
    // each line is fitted edge to edge, poster style
    const A = fitLine(c, p.line1, c.W * 0.92), B = fitLine(c, p.line2, c.W * 0.92);
    const x = c.W * 0.04, y = c.H * 0.1;
    const impact = Math.max(0, 1 - Math.abs(t - 0.55) / 0.12) + Math.max(0, 1 - Math.abs(t - 1.05) / 0.12);
    misregister(c, (dx, dy, col, a) => { c.save(); c.alpha(a); c.drawLayout(A, x + dx, y + dy, { color: col }); c.restore(); }, impact * (t > 0.5 ? 1 : 0));
    glyphs(c, A, x, y, t, 0.05, WHITE);
    glyphs(c, B, x, y + A.size * 0.86, t, 0.55, WHITE);
    // magenta smear: the last glyph's trail, fading fast
    const tr = pr(t, 0.1, 0.6);
    if (tr > 0 && tr < 1) c.rect(c.W * 0.8, c.H * (0.6 + 0.3 * tr), c.W * 0.08, c.H * 0.3 * (1 - tr), alpha(MAG, 0.55 * (1 - tr)));
    // acid baseline waveform
    const by = y + A.size * 0.86 + B.size * 0.9, w = c.W * 0.92 * pr(t, 0.2, 2.0, E.out);
    c.line(x, by, x + w, by, ACID, 2, "butt");
    for (let i = 0; i * 12 < w; i++) {
      const h = (i % 5 === 0 ? 14 : 7) * (1 + 0.6 * Math.abs(Math.sin(i * 1.7 + t * 6)));
      c.line(x + i * 12, by, x + i * 12, by + h, alpha(ACID, 0.8), 1.5, "butt");
    }
    c.line(x + w, by - 18, x + w, by + 18, MAG, 3, "butt");
  },
});

// 2.5–6.5 thesis A: scramble on a poster grid
const thesisA = defineComponent<{ lines: string[] }>({
  ...base, id: "techhalla-scramble-thesis", name: "Scramble Thesis on a Poster Grid",
  description: "2.5–6.5 s. 'AI VIDEO ISN'T EXPENSIVE' locks to an 8 px baseline poster grid in staggered alignments; each line scrambles (seeded Fisher–Yates per glyph) and snaps into place on the beat, the last word underlined in acid green.",
  tags: ["scramble", "decode", "poster grid", "beat"],
  params: { lines: P.list(["AI VIDEO", "ISN'T", "EXPENSIVE"], "Lines", { min: 2, max: 4 }) },
  duration: 4,
  sounds: (p) => p.lines.map((_, i) => ({ at: 0.5 + i * BEAT * 2, sound: "fx.glitch", gain: 0.25, seed: i, role: "scramble" }) as SoundCue).concat([{ at: 3.0, sound: "impact.punch", gain: 0.45, role: "snap" }]),
  render(c, p) {
    const t = c.t;
    chrome(c, t, t + 2.5);
    const n = p.lines.length;
    // the last line runs edge to edge; the others are set at its size, alternating left and right
    const size = fitLine(c, p.lines[n - 1], c.W * 0.92).size;
    p.lines.forEach((ln, i) => {
      const at = 0.2 + i * BEAT * 2;
      if (t < at) return;
      const k = pr(t, at, at + 0.6);
      const last = i === n - 1;
      const txt = scrambled(ln, k, 7 + i);
      const L = c.layout(txt, scream(last ? size : size * 0.72));
      const sx = 1;
      const y = c.H * 0.3 + i * size * 0.78;
      const x = i % 2 === 1 ? c.W * 0.96 - L.width : c.W * 0.04;
      c.with({ x, y, scale: sx }, () => {
        c.drawLayout(L, 0, 0, { color: last && k < 1 ? ACID : WHITE });
        if (k >= 1 && t - (at + 0.6) < 0.15) misregister(c, (dx, dy, col, a) => { c.save(); c.alpha(a); c.drawLayout(L, dx, dy, { color: col }); c.restore(); }, 1 - (t - at - 0.6) / 0.15);
      });
      if (last && k >= 1) c.rect(x, y + L.height * sx * 0.95, L.width * sx * pr(t, at + 0.6, at + 0.9, E.out), 4, ACID);
    });
    ["JSON", "H3"].forEach((s, i) => crumb(c, s, c.W * (0.06 + i * 0.3), c.H * 0.08, t, 0.3 + i * 0.5));
  },
});

function crumb(c: RC, s: string, x: number, y: number, t: number, at: number) {
  const a = pr(t, at, at + 0.15);
  if (a <= 0) return;
  c.rect(x, y - c.W * 0.006, c.W * 0.006, c.W * 0.006, alpha(MAG, a));
  c.drawLayout(c.layout(typed(s, t, at, 30), mono(c.W * 0.013)), x + c.W * 0.012, y - c.W * 0.012, { color: alpha(ACID, a) });
}

// 6.5–10.5 thesis B: mask wipe through the outgoing letterforms
const thesisB = defineComponent<{ outgoing: string; lines: string[] }>({
  ...base, id: "techhalla-mask-wipe", name: "Mask Wipe Through the Letters",
  description: "6.5–10.5 s. 'BAD PROMPTING IS' replaces the thesis through a mask cut from the outgoing line's own letterforms, with a magenta/green channel split on the cut; IS lands huge in acid green.",
  tags: ["mask", "type transition", "channel split", "kinetic"],
  params: { outgoing: P.text("EXPENSIVE", "Outgoing word (the mask)", { maxLength: 14 }), lines: P.list(["BAD", "PROMPTING", "IS"], "Lines", { min: 2, max: 4 }) },
  duration: 4,
  sounds: () => [{ at: 0, sound: "whoosh.whip", gain: 0.45, role: "cut" }, { at: 0.5, sound: "impact.punch", gain: 0.4, role: "bad" }, { at: 1.5, sound: "impact.punch", gain: 0.4, role: "prompting" }, { at: 2.5, sound: "impact.sub", gain: 0.5, role: "is" }],
  render(c, p) {
    const t = c.t;
    chrome(c, t, t + 6.5);
    // the middle line runs edge to edge; the first is set larger, the last word largest, right-aligned
    const size = fitLine(c, p.lines[1] ?? p.lines[0], c.W * 0.92).size;
    const draw = () => {
      p.lines.forEach((ln, i) => {
        const at = 0.4 + i * 1.0;
        const big = i === p.lines.length - 1;
        const L = c.layout(ln, scream(big ? size * 2.0 : i === 0 ? size * 1.45 : size));
        const sx = 1;
        const x = big ? c.W * 0.96 - L.width : c.W * 0.04;
        const y = c.H * 0.2 + (i === 0 ? 0 : i === 1 ? size * 1.3 : size * 2.2);
        if (t < at) return;
        c.with({ x, y, scale: sx }, () => glyphs(c, L, 0, 0, t, at, big ? ACID : WHITE));
        if (big && t > at + 0.6) c.rect(x, y + L.height * sx * 0.92, L.width * sx * pr(t, at + 0.6, at + 0.9, E.out), 5, ACID);
      });
    };
    // the outgoing word becomes the mask through which the new composition is first seen
    const open = pr(t, 0, 0.45, E.in);
    if (open < 1) {
      const O = c.layout(p.outgoing, scream(c.W * 0.15));
      const s = Math.min(1, (c.W * 0.9) / O.width) * (1 + open * 6);
      const lay = c.layer(c.W, c.H, (lc) => {
        lc.with({ x: c.cx, y: c.cy, scale: s }, () => lc.drawLayout(O, -O.width / 2, -O.height / 2, { color: "#000" }));
        lc.blend("source-in");
        lc.rect(0, 0, c.W, c.H, WHITE);
      });
      c.drawLayer(lay, -4, 0, { alpha: 0.5, blend: "screen" });
      c.drawLayer(lay, 0, 0);
      misregister(c, (dx) => c.drawLayer(lay, dx, 0, { alpha: 0.3 }), 1 - open);
    }
    if (t > 0.3) draw();
    ["JSON", "H3", "SEEDANCE"].forEach((s, i) => crumb(c, s, c.W * (0.06 + i * 0.3), c.H * 0.08, t + 2, 0));
  },
});

// 10.5–14.5 proof flash
const proof = defineComponent<{ left: string; right: string; crumbs: string[]; code: string[]; steal: string; the: string }>({
  ...base, id: "techhalla-proof-flash", name: "Proof Flash: Stack, Crumbs, Prompt Block",
  description: "10.5–14.5 s. A rapid kinetic stack (WORKFLOWS > WISHES), then mono crumbs orbit a central prompt block like a terminal; it types three lines and gets crossed by an acid-green strikethrough that becomes the underline of STEAL THE PROMPT.",
  tags: ["terminal", "typing", "orbit", "strikethrough", "kinetic"],
  params: { left: P.text("WORKFLOWS", "Stack line 1", { maxLength: 14 }), right: P.text("WISHES", "Stack line 2", { maxLength: 14 }), crumbs: P.list(["JSON", "H3", "SEEDANCE", "0 KEYFRAMES", "MAGNIFIC", "COPY/PASTE"], "Crumbs (≤18 chars)", { max: 8 }), code: P.list(['{"keyframes": 0,', ' "model": "H3",', ' "up": "MAGNIFIC"}'], "Prompt block (3 lines)", { max: 3 }), steal: P.text("STEAL", "Scream", { maxLength: 10 }), the: P.text("THE PROMPT", "Second line", { maxLength: 14 }) },
  duration: 4,
  sounds: () => [{ at: 0, sound: "whoosh.whip", gain: 0.4, role: "stack" }, { at: 0.5, sound: "impact.punch", gain: 0.35, role: "wishes" }, { at: 1.4, sound: "foley.key", gain: 0.2, role: "type" }, { at: 2.4, sound: "foley.marker", len: 0.3, gain: 0.35, role: "strike" }, { at: 3.0, sound: "impact.sub", gain: 0.5, role: "steal" }],
  render(c, p) {
    const t = c.t;
    chrome(c, t, t + 10.5);
    // stack, then it shrinks to the top-left corner
    const up = pr(t, 1.0, 1.4, E.inOut);
    const sz = c.W * 0.11 * (1 - up * 0.72);
    const sx = c.W * (0.06 + 0.0 * up), sy = c.H * (0.42 - 0.34 * up);
    if (t < 2.9) {
      const A = c.layout(p.left, grotesk(sz)), B = c.layout(`> ${p.right}`, grotesk(sz));
      glyphs(c, A, sx, sy, t, 0, WHITE);
      glyphs(c, B, sx, sy + A.height, t, 0.5, MAG);
    }
    // prompt block + orbiting crumbs
    if (t > 1.2 && t < 3.0) {
      const bw = c.W * 0.3, bh = c.H * 0.14, bx = c.cx - bw / 2, by = c.cy - bh / 2 + c.H * 0.05;
      c.strokeRRect(bx, by, bw, bh, 2, alpha(ACID, 0.8), 1.5);
      c.rect(bx, by - c.W * 0.022, c.W * 0.1, c.W * 0.022, MAG);
      c.drawLayout(c.layout("prompt.json", { font: "mono", size: c.W * 0.012, weight: 600 }), bx + 6, by - c.W * 0.018, { color: BG });
      let shown = 0;
      p.code.forEach((ln, i) => {
        const at = 1.4 + i * 0.3;
        const s = typed(ln, t, at, 40);
        shown += s.length;
        c.drawLayout(c.layout(s, { font: "mono", size: c.W * 0.016, weight: 500 }), bx + 10, by + 10 + i * c.W * 0.024, { color: WHITE });
      });
      if (caret(t) && shown < p.code.join("").length) c.rect(bx + 12, by + bh - 18, 8, 12, ACID);
      p.crumbs.forEach((s, i) => {
        const a = (i / p.crumbs.length) * Math.PI * 2 + t * 0.6;
        const x = c.cx + Math.cos(a) * c.W * 0.27, y = by + bh / 2 + Math.sin(a) * c.H * 0.17;
        const L = c.layout(s, mono(c.W * 0.011));
        c.strokeRRect(x - L.width / 2 - 5, y - 9, L.width + 10, 18, 1, alpha(ACID, 0.6), 1);
        c.drawLayout(L, x - L.width / 2, y - L.height / 2, { color: alpha(ACID, 0.9) });
      });
      const strike = pr(t, 2.4, 2.65, E.out);
      if (strike > 0) c.rect(bx - 10, by + bh * 0.48, (bw + 20) * strike, 4, ACID);
    }
    // the strikethrough drops and becomes STEAL THE PROMPT's underline
    if (t >= 2.9) {
      const S = fitLine(c, p.steal, c.W * 0.85), T2 = fitLine(c, p.the, c.W * 0.85);
      const s = 1;
      const x = c.W * 0.08, y = c.H * 0.3;
      c.with({ x, y, scale: s }, () => {
        glyphs(c, S, 0, 0, t, 2.95, WHITE);
        glyphs(c, T2, 0, S.height * 0.9, t, 3.2, WHITE);
      });
      const uy = y + (S.height * 0.9 + T2.height) * s + 6;
      c.rect(x, uy, Math.max(S.width, T2.width) * s * pr(t, 2.9, 3.3, E.out), 6, ACID);
    }
  },
});

// 14.5–20 brand lock, settle, loop
const brand = defineComponent<{ handle: string; crumb: string; hold: number }>({
  ...base, id: "techhalla-brand-lock", name: "Brand Lock + Loop Settle",
  description: "14.5–20 s. The handle types in, centred in display weight; a thick magenta bar and a thin acid-green rule form a custom L-bracket mark; a mono crumb types beneath; the lockup breathes (1.000 → 1.012 → 1.000) and the last frame is ready to loop.",
  tags: ["brand lock", "logo", "loop", "breath"],
  params: { handle: P.text("@TECHHALLA", "Handle", { maxLength: 16 }), crumb: P.text("COPY/PASTE", "Crumb", { maxLength: 18 }), hold: P.number(3.0, "Settle", { min: 1, max: 5, step: 0.1, unit: "s" }) },
  duration: (p) => 2.5 + p.hold,
  sounds: (p) => [...Array.from(p.handle).map((_, i) => ({ at: 0.1 + i * SIXTEENTH, sound: "foley.key", gain: 0.2, seed: i, role: "type" }) as SoundCue), { at: 1.5, sound: "impact.land", gain: 0.4, role: "lock" }],
  render(c, p) {
    const t = c.t;
    chrome(c, t, t + 14.5);
    const H = c.layout(p.handle, scream(c.W * 0.1));
    const s = Math.min(1, (c.W * 0.8) / H.width);
    const breathe = 1 + 0.012 * Math.sin(Math.PI * pr(t, 2.5, 2.5 + p.hold));
    const x = c.cx - (H.width * s) / 2 + c.W * 0.015, y = c.cy - (H.height * s) / 2;
    c.with({ x: c.cx, y: c.cy, scale: breathe }, () => {
      c.translate(-c.cx, -c.cy);
      const bar = pr(t, 0, 0.3, E.out);
      c.rect(x - c.W * 0.04, y - H.height * s * 0.05, c.W * 0.014, H.height * s * 1.05 * bar, MAG);
      const shown = typed(p.handle, t, 0.1, 8);
      const L = c.layout(shown || " ", scream(c.W * 0.1));
      c.with({ x, y, scale: s }, () => c.drawLayout(L, 0, 0, { color: WHITE }));
      c.rect(x - c.W * 0.04, y + H.height * s * 1.02, (H.width * s + c.W * 0.04) * pr(t, 1.2, 1.6, E.out), 3, ACID);
      c.drawLayout(c.layout(typed(p.crumb, t, 1.7, 14), mono(c.W * 0.013)), x, y + H.height * s * 1.1, { color: alpha(WHITE, 0.7) });
    });
  },
});

const components = [stop, thesisA, thesisB, proof, brand] as unknown as Component[];

const template: PostSpec = {
  id: "kit-techhalla-bumper",
  title: "TechHalla — kinetic identity bumper",
  format: "square",
  fps: 60,
  clips: components.map((k) => ({ component: k.id })),
  music: { src: "media/music/library/raving-energy.mp3", gain: 0.5, offset: 0.036, fadeIn: 0.02, fadeOut: 1.0, credit: "\"Raving Energy\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Kit template: @techhalla's 20 s kinetic identity bumper, 120 BPM, locked message and palette.",
};

export const techhallaBumper: Kit = {
  id: "techhalla-bumper",
  promptId: "2103411244468498547",
  title: "Kinetic identity bumper",
  family: "intro",
  format: "square",
  summary: "A 20-second loopable street poster that moves: a locked six-beat message in black, magenta and acid green, three typefaces with jobs, per-glyph springs on 1/16 notes, seeded scrambles, print misregistration on impacts, a mask cut from the outgoing word and an L-bracket brand lock that breathes.",
  shots: [
    { at: 0, shot: "Cold open: STOP SCROLLING slams in from below; magenta smear; acid baseline ticks like a waveform", component: "techhalla-stop-scrolling" },
    { at: 2.5, shot: "Thesis A: AI VIDEO ISN'T EXPENSIVE on a poster grid, letters scramble then snap on the beat", component: "techhalla-scramble-thesis" },
    { at: 6.5, shot: "Thesis B: BAD PROMPTING IS replaces it through a mask of the outgoing letterforms; channel split on the cut", component: "techhalla-mask-wipe" },
    { at: 10.5, shot: "Proof flash: WORKFLOWS > WISHES, crumbs orbit a prompt block that types and is struck through; the strike becomes STEAL THE PROMPT's underline", component: "techhalla-proof-flash" },
    { at: 14.5, shot: "Brand lock: @TECHHALLA with a magenta bar + acid rule L-bracket; micro-breath; loop", component: "techhalla-brand-lock" },
  ],
  rules: [
    "Palette strict: bg #0A0A0A, magenta #FF2BD6, acid green #B8FF00, white #F5F5F5 for primary type only; no other hues, no gradients",
    "Three faces with jobs: display scream (ultra black), urban grotesque for stacked lines, mono for prompt crumbs; tight display tracking, open mono",
    "Locked message, exact order; crumbs are mono and ≤ 18 characters",
    "Per-glyph springs, stagger = 1/16 note at 120 BPM; misregistration (±2–4 px) on impact frames only",
    "One orthographic camera: only punch-ins and beat-timed smash pans, never drift",
    "Banned: AI clichés, soft gradients, bouncy cartoon easing, particles, HUDs, extra slogans, purple/blue neon, glassmorphism",
  ],
  components,
  template,
};

void spring;
