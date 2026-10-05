// Kit: "Bloom reel" — the craft of a motion designer's 2026 showreel (Nour Aldin Seyam), backtracked shot by
// shot (docs/reference/showreel-nour-aldin.md) and rebuilt for CaptionsEasy at 9:16. Dark shots carry one
// big soft colour bloom each, light shots one colour streak; the frame alternates dark/light every cut;
// every element eases out hard, staggers with jitter and never stops moving; cuts sit on the beat of a
// 125 BPM bed. Copy is the brief's verified facts only; the logo, caption looks, footage and props are the
// real CaptionsEasy assets. Nothing of the original (name, clients, artwork) is reused.

import {
  E, P, SPRING, TAU, advance, alpha, capHeight, clamp, defineComponent, glide, lerp, logLerp, mix, noise1, pr, rand, spring,
  type Component, type FontId, type RC, type SoundCue,
} from "@motioneasy/engine";
import type { PostSpec } from "../sequence";
import type { Kit } from "./types";

// ── palette (CaptionsEasy: the icon's ink / orange / green, the campaign cream, lavender and deep green) ──
const BLACK = "#040605";
const GREEN = "#34D399";
const MINT = "#8DF5CB";
const DEEP = "#034F46";
const ORANGE = "#FFA946";
const LAV = "#F0D7FF";
const VIOLET = "#8B5CF6";
const BLUE = "#2E6BFF";
const CYAN = "#3CC8FF";
const NAVY = "#020817";
const CREAM = "#FFFFEB";
const INK = "#1A1A1A";

export const BLOOM_BPM = 125.03;
const BEAT = 60 / BLOOM_BPM;
const beats = (n: number) => +(n * BEAT).toFixed(4);

const LOOK = { mode: "dark" as const, lighting: 0, grain: 0.12, vignette: 0, backdrop: "plain" as const, camera: "still" as const };
const LOOK_LIGHT = { ...LOOK, mode: "light" as const };

type Pr = Record<string, any>;
const M = {
  icon: "media/brand/captionseasy-icon.svg",
  iconLight: "media/brand/captionseasy-icon-light.svg",
  appIcon: "media/brand/captionseasy-app-icon.svg",
  mic: "media/ceshot/mic.png",
  lock: "media/ceshot/cloud-lock.png",
  watch: "media/ceshot/stopwatch.png",
  me: "media/ceshot/me.png",
  hero: (id: string) => `media/hero/${id}.mp4`,
  look: (id: string) => `media/looks/${id}.webp`,
};
const LOOK_IDS = ["hormozi_box", "beast_bounce", "karaoke_fill", "pop_clean", "gradient_pop", "outline_fill", "bold_pill", "comic_burst", "neon_sign", "luxe_serif", "highlighter_card", "minimal_pro", "film_noir", "gaming_hud", "retro_vhs", "scribble", "chat_bubble", "explainer", "lower_third", "netflix_sub", "read_along", "retro_3d", "storytime", "motivational", "kinetic_mix", "desi_clean", "serif_pop_classic", "staggered_splash", "glow_stack_classic", "cartoon_stack_classic"];

// ── shared drawing ─────────────────────────────────────────────────────────────────────────────────────
const tw = (s: string, font: FontId, size: number, weight = 400, track = 0) => advance(s, font, size, weight, false) + track * size * Math.max(0, [...s].length - 1);

interface TxtO { font: FontId; size: number; weight?: number; color: string | CanvasGradient; align?: "left" | "center" | "right"; track?: number; alpha?: number }
/** One line of text with its baseline at y. Returns its width. */
function txt(c: RC, s: string, x: number, y: number, o: TxtO) {
  const w = tw(s, o.font, o.size, o.weight ?? 400, o.track ?? 0);
  const x0 = o.align === "center" ? x - w / 2 : o.align === "right" ? x - w : x;
  c.save();
  if (o.alpha !== undefined) c.alpha(o.alpha);
  c.setFont(o.font, o.size, o.weight ?? 400, false, (o.track ?? 0) * o.size);
  c.ctx.fillStyle = o.color;
  c.ctx.fillText(s, x0, y);
  c.restore();
  return w;
}

/** Draw `draw` (local coords 0..w, 0..h) at (x, y), blurred by `blur` ref units when it matters. */
function soft(c: RC, x: number, y: number, w: number, h: number, blur: number, a: number, draw: (lc: RC) => void, pad = 0) {
  if (a <= 0.003) return;
  if (blur < 0.5) {
    c.with({ x, y, alpha: a }, () => draw(c));
    return;
  }
  const L = c.layer(w, h, draw, { pad: pad + blur * 0.5, res: blur > 10 ? 0.5 : 1 });
  c.drawLayer(L, x, y, { blur, alpha: a });
}

/** Per-character type-on: each glyph lands from +dy with blur; returns chars shown. */
function typeOn(c: RC, s: string, x: number, y: number, o: TxtO & { t0: number; cps?: number; t: number; rise?: number }) {
  const cps = o.cps ?? 36;
  const total = tw(s, o.font, o.size, o.weight ?? 400, o.track ?? 0);
  const x0 = o.align === "center" ? x - total / 2 : o.align === "right" ? x - total : x;
  const chars = [...s];
  let shown = 0;
  chars.forEach((ch, i) => {
    const at = o.t0 + i / cps;
    const u = pr(o.t, at, at + 0.22, E.out);
    const prefix = chars.slice(0, i).join("");
    const cx = x0 + tw(prefix, o.font, o.size, o.weight ?? 400, o.track ?? 0) + (i > 0 ? (o.track ?? 0) * o.size : 0);
    if (u > 0) {
      shown++;
      const blur = (1 - u) * o.size * 0.18;
      const dy = (1 - u) * (o.rise ?? o.size * 0.35);
      const a = (o.alpha ?? 1) * pr(u, 0, 0.5);
      if (blur > 0.6) soft(c, cx - o.size * 0.2, y - o.size * 1.05 + dy, o.size * 1.4, o.size * 1.4, blur, a, (lc) => txt(lc, ch, o.size * 0.2, o.size * 1.05, { ...o, align: "left", alpha: 1 }));
      else txt(c, ch, cx, y + dy, { ...o, align: "left", alpha: a });
    }
  });
  return shown;
}

function vgrad(c: RC, stops: [number, string][]) {
  c.rect(0, 0, c.W, c.H, c.linear(0, 0, 0, c.H, stops));
}

function dots(c: RC, step: number, color: string, a: number, r = 1.6, ox = 0, oy = 0) {
  c.ctx.fillStyle = alpha(color, a);
  const sx = ((ox % step) + step) % step, sy = ((oy % step) + step) % step;
  for (let y = sy - step; y < c.H + step; y += step) for (let x = sx - step; x < c.W + step; x += step) c.ctx.fillRect(x - r / 2, y - r / 2, r, r);
}

/** Slow dust motes (deterministic). */
function dust(c: RC, n: number, seed: number, color: string, a: number, speed = 16) {
  for (let i = 0; i < n; i++) {
    const r1 = rand(seed * 131 + i * 7), r2 = rand(seed * 977 + i * 13), r3 = rand(seed * 37 + i * 101);
    const x = r1 * c.W + Math.sin(c.t * 0.4 + i) * 14;
    const y = (((r2 * c.H - c.t * speed * (0.4 + r3)) % c.H) + c.H) % c.H;
    const fl = 0.55 + 0.45 * Math.sin(c.t * (1.5 + r3 * 2) + i);
    c.circle(x, y, 1 + r3 * 2.2, alpha(color, a * fl * (0.3 + r3 * 0.7)));
  }
}

/** The reference's signature light: a huge soft crescent bloom, lit on one side, slowly turning. */
function crescent(c: RC, x: number, y: number, R: number, color: string, ang: number, k = 1, core = 0.55) {
  if (k <= 0.003) return;
  const S = R * 2.7;
  const L = c.layer(S, S, (lc) => {
    const cx = S / 2, cy = S / 2;
    lc.ctx.fillStyle = lc.radial(cx, cy, R * 1.12, [[0, alpha(color, 0)], [0.6, alpha(color, 0.02)], [0.8, alpha(color, 0.75)], [0.88, alpha(color, 0.95)], [0.95, alpha(color, 0.35)], [1, alpha(color, 0)]]);
    lc.ctx.fillRect(0, 0, S, S);
    lc.light(cx + Math.cos(ang) * R * 0.55, cy + Math.sin(ang) * R * 0.55, R * 1.1, color, core);
    lc.ctx.globalCompositeOperation = "destination-in";
    const dx = Math.cos(ang), dy = Math.sin(ang);
    lc.ctx.fillStyle = lc.linear(cx - dx * R, cy - dy * R, cx + dx * R * 1.1, cy + dy * R * 1.1, [[0, "rgba(0,0,0,0)"], [0.42, "rgba(0,0,0,0.04)"], [0.75, "rgba(0,0,0,0.7)"], [1, "rgba(0,0,0,1)"]]);
    lc.ctx.fillRect(0, 0, S, S);
    lc.ctx.globalCompositeOperation = "source-over";
  }, { res: 0.22 });
  c.drawLayer(L, x - S / 2, y - S / 2, { blur: R * 0.05, alpha: k });
}

/** A bloom pool (no crescent), drawn soft and big. */
const pool = (c: RC, x: number, y: number, r: number, color: string, k = 1) => c.light(x, y, r, color, k);

/** Vertical metal gradient for display type between y0 (top) and y1 (baseline). */
const metal = (c: RC, y0: number, y1: number) => c.linear(0, y0, 0, y1, [[0, "#FFFFFF"], [0.42, "#F1F3F2"], [0.58, "#BFC4C2"], [1, "#7D8482"]]);

function cursorArrow(c: RC, x: number, y: number, s: number, press = 0) {
  c.with({ x, y, scale: s * (1 - press * 0.12) }, () => {
    c.save();
    c.shadow("rgba(0,0,0,0.45)", 10, 0, 4);
    c.poly([[0, 0], [0, 46], [12, 35], [21, 54], [29, 50], [20, 32], [36, 32]], "#FFFFFF");
    c.restore();
    c.ctx.strokeStyle = "rgba(0,0,0,0.5)";
    c.ctx.lineWidth = 1.5;
    c.ctx.stroke();
  });
}

/** Simple line glyphs used in the UI shots. */
function glyph(c: RC, kind: string, x: number, y: number, r: number, ink: string) {
  const w = Math.max(2, r * 0.14);
  c.save();
  c.ctx.lineJoin = "round";
  switch (kind) {
    case "upload":
      c.line(x, y + r * 0.2, x, y - r * 0.45, ink, w);
      c.polyline([[x - r * 0.28, y - r * 0.18], [x, y - r * 0.46], [x + r * 0.28, y - r * 0.18]], ink, w);
      c.polyline([[x - r * 0.5, y + r * 0.05], [x - r * 0.5, y + r * 0.45], [x + r * 0.5, y + r * 0.45], [x + r * 0.5, y + r * 0.05]], ink, w);
      break;
    case "mic":
      c.rrect(x - r * 0.18, y - r * 0.5, r * 0.36, r * 0.6, r * 0.18, ink);
      c.arc(x, y - r * 0.08, r * 0.34, 0.25, 0.75, ink, w);
      c.line(x, y + r * 0.27, x, y + r * 0.48, ink, w);
      break;
    case "cc":
      c.strokeRRect(x - r * 0.5, y - r * 0.36, r, r * 0.72, r * 0.16, ink, w);
      c.arc(x - r * 0.18, y, r * 0.15, 0.6, 0.9 + 0.5, ink, w * 0.9);
      c.arc(x + r * 0.2, y, r * 0.15, 0.6, 0.9 + 0.5, ink, w * 0.9);
      break;
    case "clock":
      c.arc(x, y, r * 0.46, 0, 1, ink, w);
      c.line(x, y, x, y - r * 0.28, ink, w);
      c.line(x, y, x + r * 0.2, y + r * 0.1, ink, w);
      break;
    case "download":
      c.line(x, y - r * 0.45, x, y + r * 0.15, ink, w);
      c.polyline([[x - r * 0.26, y - r * 0.08], [x, y + r * 0.18], [x + r * 0.26, y - r * 0.08]], ink, w);
      c.line(x - r * 0.45, y + r * 0.42, x + r * 0.45, y + r * 0.42, ink, w);
      break;
    case "play":
      c.poly([[x - r * 0.2, y - r * 0.32], [x - r * 0.2, y + r * 0.32], [x + r * 0.34, y]], ink);
      break;
    case "code":
      c.polyline([[x - r * 0.14, y - r * 0.3], [x - r * 0.44, y], [x - r * 0.14, y + r * 0.3]], ink, w);
      c.polyline([[x + r * 0.14, y - r * 0.3], [x + r * 0.44, y], [x + r * 0.14, y + r * 0.3]], ink, w);
      break;
    case "lock":
      c.strokeRRect(x - r * 0.36, y - r * 0.06, r * 0.72, r * 0.52, r * 0.1, ink, w);
      c.arc(x, y - r * 0.08, r * 0.24, 0.75, 1.25, ink, w);
      break;
    case "home":
      c.polyline([[x - r * 0.42, y + r * 0.4], [x - r * 0.42, y - r * 0.05], [x, y - r * 0.42], [x + r * 0.42, y - r * 0.05], [x + r * 0.42, y + r * 0.4], [x - r * 0.42, y + r * 0.4]], ink, w);
      break;
    case "heart":
      c.arc(x - r * 0.18, y - r * 0.08, r * 0.2, 0.75, 1.5, ink, w);
      c.arc(x + r * 0.18, y - r * 0.08, r * 0.2, 0.5, 1.25, ink, w);
      c.polyline([[x - r * 0.38, y - r * 0.02], [x, y + r * 0.38], [x + r * 0.38, y - r * 0.02]], ink, w);
      break;
    case "sparkle":
      c.poly([[x, y - r * 0.5], [x + r * 0.12, y - r * 0.12], [x + r * 0.5, y], [x + r * 0.12, y + r * 0.12], [x, y + r * 0.5], [x - r * 0.12, y + r * 0.12], [x - r * 0.5, y], [x - r * 0.12, y - r * 0.12]], ink);
      break;
    default:
      c.circle(x, y, r * 0.2, ink);
  }
  c.restore();
}

/** Shot camera: a slow push and drift over the whole shot (already moving on frame 1). */
function shotCam(c: RC, fn: () => void, o: { k0?: number; k1?: number; dx?: number; dy?: number; rot?: number } = {}) {
  const u = glide(c.p);
  const k = logLerp(o.k0 ?? 1, o.k1 ?? 1.05, u);
  c.with({ x: c.cx + (o.dx ?? 0) * (u - 0.5) * 2, y: c.cy + (o.dy ?? 0) * (u - 0.5) * 2, scale: k, rotate: (o.rot ?? 0) * (u - 0.5) }, () => {
    c.translate(-c.cx, -c.cy);
    fn();
  });
}

const dur = (n: number) => P.number(beats(n), "Duration", { min: 0.8, max: 20, step: 0.01, unit: "s" });
const base = { version: "1.0.0", group: "kits" as const, category: "kit-bloom-reel", added: "2026-10-05", formats: ["vertical" as const, "portrait" as const, "square" as const, "landscape" as const], camera: "still" as const };
const def = (d: Omit<Parameters<typeof defineComponent<Pr>>[0], "version" | "group" | "category" | "added" | "formats" | "camera">) => defineComponent<Pr>({ ...base, ...d });
const cue = (at: number, sound: string, gain: number, o: Partial<SoundCue> = {}): SoundCue => ({ at, sound, gain, ...o });

// ══ 1 · Bookend: metal word slams in letter by letter, script word writes on, pill + lines type in ═════════
const bookend = def({
  id: "bloom-bookend", name: "Bloom · Bookend Lockup",
  theme: LOOK,
  description: "The showreel's intro and outro: black frame, a huge green crescent bloom turning behind, a heavy condensed word in metal slamming in letter by letter (tilted, blurred, a crack of light on landing), a script word writing on across its baseline, a year pill sliding in and two lines typing on. Outro mode adds a beat of black before it and credit lines under it, then fades out.",
  tags: ["bookend", "intro", "outro", "logo", "kinetic type", "showreel", "metal", "script"],
  params: {
    word: P.text("CAPTIONS", "Big word", { maxLength: 12 }),
    script: P.text("Easy", "Script word", { maxLength: 12 }),
    pill: P.text("2026", "Pill", { maxLength: 8 }),
    line1: P.text("Local-first AI captions", "Line 1 (accent)", { maxLength: 32 }),
    line2: P.text("Free · Open source", "Line 2", { maxLength: 32 }),
    credits: P.list([], "Credit lines (outro)", { max: 4, maxLength: 140 }),
    lead: P.number(0, "Black before (s)", { min: 0, max: 2, step: 0.05, unit: "s" }),
    fadeOut: P.number(0, "Fade to black (s)", { min: 0, max: 2, step: 0.05, unit: "s" }),
    duration: dur(9),
  },
  duration: (p) => p.duration,
  poster: 0.7,
  sounds: (p) => {
    const L = p.lead as number;
    const word = String(p.word);
    const out: SoundCue[] = [cue(L, "whoosh.deep", 0.5, { role: "open" })];
    [...word].forEach((_, i) => out.push(cue(L + 0.12 + i * 0.1 + 0.2, i === word.length - 1 ? "fs.impact.punch2" : "impact.land", i === word.length - 1 ? 0.42 : 0.26, { seed: i, rate: 1 + (i % 3) * 0.06, role: "slam" })));
    out.push(cue(L + 1.0, "whoosh.air", 0.32, { role: "write" }));
    out.push(cue(L + 1.32, "fs.ui.pop-4", 0.35, { role: "pill" }));
    const t1 = L + 1.62;
    for (let i = 0; i < String(p.line1).length; i += 3) out.push(cue(t1 + i / 38, `viral.key-${(i % 6) + 1}`, 0.16, { role: "type" }));
    if (L > 0) out.push(cue(L + 2.4, "tonal.shimmer", 0.25, { role: "glint" }));
    return out;
  },
  render(c, p) {
    const L = p.lead as number;
    const t = c.t - L;
    c.clear(BLACK);
    if (t < 0) return;
    const fadeIn = pr(t, 0, 0.9, E.outSoft);
    // the light: one crescent bloom right of centre + a deep haze
    const bx = c.cx + c.W * 0.16, by = c.cy + c.H * 0.02;
    const R = c.short * 0.62;
    pool(c, bx, by, R * 1.5, "#0B2A1E", 0.9 * fadeIn);
    crescent(c, bx, by, R, GREEN, -0.9 + t * 0.32, 0.95 * fadeIn);
    crescent(c, bx - R * 0.15, by + R * 0.1, R * 0.82, "#10B981", 2.2 + t * 0.2, 0.35 * fadeIn);
    dust(c, 46, 3, MINT, 0.55 * fadeIn);

    const word = String(p.word), script = String(p.script);
    let S = c.short * 0.235;
    const fit = c.W - c.short * 0.16;
    const w0 = tw(word, "anton", S, 400, -0.005);
    if (w0 > fit) S *= fit / w0;
    const ww = tw(word, "anton", S, 400, -0.005);
    const cap = capHeight("anton", S);
    const u = glide(clamp(c.t / c.dur));
    // lockup drifts left and pushes in the whole time; each landing kicks it a touch
    let kick = 0;
    [...word].forEach((_, i) => {
      const land = 0.12 + i * 0.1 + 0.26;
      if (t > land) kick += Math.exp(-(t - land) * 16) * 0.012;
    });
    const k = logLerp(0.97, 1.035, u) * (1 + kick);
    const lockY = c.cy - c.short * 0.06;
    c.with({ x: c.cx + lerp(c.short * 0.02, -c.short * 0.02, u), y: lockY, scale: k }, () => {
      const left = -ww / 2, base = cap / 2;
      // metal word, letter by letter
      let x = left;
      [...word].forEach((ch, i) => {
        const cw = tw(ch, "anton", S, 400, 0);
        const t0 = 0.12 + i * 0.1;
        const v = pr(t, t0, t0 + 0.34);
        if (v > 0) {
          const e = E.out(v);
          const dir = i % 2 ? 1 : -1;
          const sc = logLerp(2.3, 1, e);
          const rot = dir * 30 * (1 - e);
          const blur = (1 - e) * S * 0.07;
          const a = pr(t, t0, t0 + 0.07);
          const cx = x + cw / 2, cy = base - cap / 2;
          const draw = (lc: RC, ox: number, oy: number) => {
            lc.save();
            lc.shadow("rgba(0,0,0,0.55)", S * 0.05, 0, S * 0.02);
            lc.setFont("anton", S, 400, false, 0);
            lc.ctx.fillStyle = metal(lc, oy - cap, oy);
            lc.ctx.fillText(ch, ox, oy);
            lc.restore();
          };
          c.with({ x: cx, y: cy - (1 - e) * S * 0.25, rotate: rot, scale: sc }, () => {
            if (blur > 0.6) soft(c, -cw / 2 - S * 0.1, -cap / 2 - S * 0.2, cw + S * 0.2, cap + S * 0.4, blur, a, (lc) => draw(lc, S * 0.1, cap + S * 0.2));
            else c.with({ alpha: a }, () => draw(c, -cw / 2, cap / 2));
          });
          // a crack of light across the letter on impact
          const land = t0 + 0.26;
          const cr = pr(t, land, land + 0.22);
          if (cr > 0 && cr < 1) {
            const ang = (rand(i * 17 + 3) - 0.5) * 1.2 + Math.PI / 2.6;
            const r0 = cap * 0.55;
            const pts: [number, number][] = [];
            for (let j = 0; j <= 5; j++) {
              const s0 = -1 + j / 2.5;
              pts.push([cx + Math.cos(ang) * r0 * s0 + (rand(i * 9 + j) - 0.5) * S * 0.06, cy + Math.sin(ang) * r0 * s0 + (rand(i * 5 + j * 3) - 0.5) * S * 0.04]);
            }
            c.polyline(pts, alpha("#FFFFFF", 0.9 * (1 - cr)), Math.max(1.5, S * 0.012), E.out(clamp(cr * 3)));
          }
        }
        x += cw + -0.005 * S;
      });
      // script word writes on across the baseline
      const SS = S * 0.86;
      const sw = tw(script, "pacifico", SS, 400, 0);
      let sx = left + ww * 0.34;
      if (sx + sw > c.W / 2 - c.short * 0.05) sx = c.W / 2 - c.short * 0.05 - sw;
      const sy = base + SS * 0.42;
      const wr = pr(t, 1.02, 1.62, E.inOut);
      if (wr > 0) {
        const padS = SS * 0.5;
        const Lw = c.layer(sw + padS * 2, SS * 1.9, (lc) => {
          lc.save();
          lc.shadow("rgba(0,0,0,0.6)", SS * 0.06, 0, SS * 0.03);
          lc.setFont("pacifico", SS, 400, false, 0);
          lc.ctx.fillStyle = lc.linear(0, SS * 0.2, 0, SS * 1.35, [[0, "#E4F5EC"], [0.45, "#9FD8BD"], [0.7, "#3FAF84"], [1, "#2C6F57"]]);
          lc.ctx.fillText(script, padS, SS * 1.18);
          lc.restore();
          lc.ctx.globalCompositeOperation = "destination-in";
          const edge = padS + (sw + padS) * wr;
          lc.ctx.fillStyle = lc.linear(edge - SS * 0.35, 0, edge, 0, [[0, "rgba(0,0,0,1)"], [1, "rgba(0,0,0,0)"]]);
          lc.ctx.fillRect(0, 0, sw + padS * 2, SS * 1.9);
          lc.ctx.globalCompositeOperation = "source-over";
        });
        c.drawLayer(Lw, sx - padS + (1 - E.out(wr)) * -SS * 0.15, sy - SS * 1.18);
      }
      // year pill slides in from the left, above the first letter
      const pv = pr(t, 1.3, 1.75, E.out);
      if (pv > 0) {
        const ps = S * 0.17;
        const pw = tw(String(p.pill), "jakarta", ps, 800, 0) + ps * 1.4, ph = ps * 1.75;
        const px = left + (1 - pv) * -S * 0.6, py = -cap / 2 - ph - S * 0.12;
        c.with({ alpha: pr(t, 1.3, 1.45) }, () => {
          c.light(px + pw / 2, py + ph / 2, pw * 0.9, GREEN, 0.35);
          c.rrect(px, py, pw, ph, ph / 2, c.linear(px, py, px + pw, py + ph, [[0, "#22C38A"], [1, "#7FF0C2"]]));
          c.strokeRRect(px + 1.5, py + 1.5, pw - 3, ph - 3, ph / 2, "rgba(255,255,255,0.45)", 1.5);
          txt(c, String(p.pill), px + pw / 2, py + ph / 2 + ps * 0.36, { font: "jakarta", size: ps, weight: 800, color: "#05261B", align: "center" });
        });
      }
      // two lines type on under the lockup
      const ly = sy + SS * 0.95;
      const l1 = S * 0.205, l2 = S * 0.18;
      typeOn(c, String(p.line1), 0, ly, { font: "jakarta", size: l1, weight: 800, color: GREEN, align: "center", t0: 1.62, cps: 38, t });
      typeOn(c, String(p.line2), 0, ly + l1 * 1.35, { font: "jakarta", size: l2, weight: 700, color: "#F4F7F5", align: "center", t0: 1.95, cps: 40, t });
      const credits = (p.credits as string[]) ?? [];
      credits.forEach((line, i) => {
        const a = pr(t, 2.3 + i * 0.15, 2.8 + i * 0.15, E.out);
        const sz = i === 0 ? S * 0.15 : S * 0.085;
        txt(c, line, 0, ly + l1 * 1.35 + l2 * 2.3 + (i === 0 ? 0 : S * 0.06 + i * sz * 1.5) + (1 - a) * 12, { font: "jakarta", size: sz, weight: i === 0 ? 600 : 500, color: "#FFFFFF", align: "center", alpha: a * (i === 0 ? 0.9 : 0.5) });
      });
    });
    const fo = p.fadeOut as number;
    if (fo > 0) c.rect(0, 0, c.W, c.H, alpha(BLACK, pr(c.t, c.dur - fo, c.dur, E.inOut)));
  },
});

// ══ 2 · Glass keycap with the real icon, text orbiting on a tilted ring ══════════════════════════════════
const keycap = def({
  id: "bloom-keycap-ring", name: "Bloom · Glass Key + Orbit Text",
  theme: LOOK,
  description: "A green glass keycap carrying the logo tumbles slowly in 3D while a sentence orbits it on a tilted ring (letters face the camera, the back half dims and sits behind the key). Green bloom, dust.",
  tags: ["3d", "keycap", "glass", "orbit", "ring text", "logo", "showreel"],
  params: {
    ring: P.text("Stop timing captions. Start posting. ", "Ring text", { maxLength: 60 }),
    icon: P.media(M.appIcon, "Icon on the key", "image"),
    duration: dur(6),
  },
  duration: (p) => p.duration,
  sounds: () => [cue(0.02, "tonal.chime", 0.22, { role: "glass" }), cue(0.05, "riser.air", 0.25, { len: 1.6, role: "air" })],
  render(c, p) {
    const t = c.t;
    c.clear(BLACK);
    pool(c, c.cx, c.cy, c.short * 0.9, "#062218", 1);
    crescent(c, c.cx + c.short * 0.05, c.cy, c.short * 0.5, GREEN, -0.4 + t * 0.45, 0.9);
    dust(c, 40, 7, MINT, 0.5);
    const enter = pr(t, 0, 0.55, E.out);
    shotCam(c, () => {
      const cam = c.camera({ fov: 32 });
      const ry = lerp(-38, 24, glide(c.p)) + Math.sin(t * 1.3) * 4;
      const rx = 22 + Math.sin(t * 0.9) * 6;
      const rz = -8 + Math.sin(t * 0.7) * 5;
      const S = c.short * 0.4 * logLerp(0.6, 1, enter);
      const yb = Math.sin(t * 1.6) * 10;
      // ring behind (back half)
      const ring = String(p.ring);
      const RR = c.short * 0.43 * logLerp(0.7, 1, enter);
      const pitch = (64 * Math.PI) / 180, roll = (-18 * Math.PI) / 180;
      const ringPt = (th: number) => {
        const px = Math.cos(th) * RR, pz = Math.sin(th) * RR;
        const y1 = -pz * Math.sin(pitch), z1 = pz * Math.cos(pitch);
        return { x: px * Math.cos(roll) - y1 * Math.sin(roll), y: px * Math.sin(roll) + y1 * Math.cos(roll), z: z1 };
      };
      const fsR = c.short * 0.068;
      const unit = tw(ring, "jakarta", fsR, 600, 0.02);
      const reps = Math.max(1, Math.round((TAU * RR * 0.92) / unit));
      const full = ring.repeat(reps);
      const fullW = tw(full, "jakarta", fsR, 600, 0.02);
      const pos: number[] = [];
      [...full].reduce((acc, ch) => { pos.push(acc + tw(ch, "jakarta", fsR, 600, 0) / 2); return acc + tw(ch, "jakarta", fsR, 600, 0) + 0.02 * fsR; }, 0);
      const drawRing = (front: boolean) => {
        [...full].forEach((ch, i) => {
          const th = (pos[i] / fullW) * TAU + t * 0.6;
          const q = ringPt(th);
          if ((q.z < 0) !== front) return;
          const a0 = cam.project(q.x, q.y + yb, q.z), q2 = ringPt(th + 0.02), a1 = cam.project(q2.x, q2.y + yb, q2.z);
          const sz = fsR * a0.scale;
          const ang = (Math.atan2(a1.y - a0.y, a1.x - a0.x) * 180) / Math.PI;
          c.with({ x: a0.x, y: a0.y, rotate: ang, alpha: (front ? 0.95 : 0.3) * enter }, () => txt(c, ch, 0, sz * 0.35, { font: "jakarta", size: sz, weight: 600, color: front ? "#F2FFF8" : "#9FD8BD", align: "center" }));
        });
      };
      drawRing(false);
      // the keycap: stacked slices for depth, then the face
      const face = (lc: RC, shade: number) => {
        const r = S * 0.22;
        lc.rrect(0, 0, S, S, r, mix("#0F7A55", "#03140D", shade));
        if (shade === 0) {
          lc.rrect(0, 0, S, S, r, lc.linear(0, 0, S, S, [[0, "#7FF3C4"], [0.5, "#2BC488"], [1, "#0D7E57"]]));
          lc.rrect(S * 0.1, S * 0.08, S * 0.8, S * 0.8, r * 0.8, lc.linear(0, 0, 0, S, [[0, "rgba(255,255,255,0.55)"], [0.5, "rgba(255,255,255,0.12)"], [1, "rgba(255,255,255,0.05)"]]));
          lc.save();
          lc.clipRRect(S * 0.2, S * 0.18, S * 0.6, S * 0.6, r * 0.6);
          lc.media(p.icon as string, S * 0.2, S * 0.18, S * 0.6, S * 0.6, { fit: "contain" });
          lc.restore();
          lc.strokeRRect(1, 1, S - 2, S - 2, r, "rgba(220,255,240,0.65)", 2);
          lc.sweep(S * (0.2 + 0.6 * ((t * 0.35) % 1)), 25, S * 0.25, "#FFFFFF", 0.35, "source-atop");
        }
      };
      const slices = 16;
      for (let i = slices; i >= 0; i--) {
        const dz = i * S * 0.018;
        cam.layerPlane(S, S, (lc) => face(lc, i === 0 ? 0 : 0.35 + (i / slices) * 0.4), { x: 0, y: yb, z: dz, rx, ry, rz, res: 1.2 });
      }
      drawRing(true);
    }, { k0: 1.0, k1: 1.08 });
  },
});

// ══ 3 · Glass pill: a word types in, a cursor clicks, the pill morphs into an app icon + menu ════════════
const pillMenu = def({
  id: "bloom-pill-menu", name: "Bloom · Glass Pill → Icon Menu",
  theme: LOOK,
  description: "A dark glass pill on a dotted navy field with a cyan bloom under it: a phrase types in letter by letter (each blurs in), a cursor glides in and clicks, the text backspaces, and the pill morphs into a rounded app icon while a vertical menu staggers in beside it and a dot walks down the items.",
  tags: ["ui", "pill", "typing", "cursor", "morph", "menu", "glass", "showreel"],
  params: {
    phrase: P.text("Drop in a clip", "Typed phrase", { maxLength: 22 }),
    items: P.list(["Upload", "Transcribe", "Style", "Export"], "Menu items", { min: 2, max: 5, maxLength: 14 }),
    duration: dur(8),
  },
  duration: (p) => p.duration,
  sounds: (p) => {
    const out: SoundCue[] = [];
    const s = String(p.phrase);
    for (let i = 0; i < s.length; i++) if (s[i] !== " ") out.push(cue(0.15 + i / 16, `viral.key-${(i % 6) + 1}`, 0.22, { role: "type" }));
    out.push(cue(1.32, "kenney.mouse", 0.6, { role: "click" }));
    for (let i = 0; i < s.length; i += 2) out.push(cue(1.55 + i / 34, `viral.key-${((i + 3) % 6) + 1}`, 0.13, { role: "delete" }));
    out.push(cue(1.95, "whoosh.swipe", 0.45, { role: "morph" }));
    (p.items as string[]).forEach((_, i) => out.push(cue(2.25 + i * 0.09, "kenney.select", 0.28, { role: "item" })));
    return out;
  },
  render(c, p) {
    const t = c.t;
    c.clear(NAVY);
    vgrad(c, [[0, "#01040D"], [1, "#04102A"]]);
    dots(c, c.short * 0.033, "#6E9BFF", 0.3 + 0.08 * Math.sin(t * 2), 2.6, 0, -t * 8);
    const phrase = String(p.phrase);
    const morph = pr(t, 1.92, 2.5, E.inOut);
    const S = c.short;
    shotCam(c, () => {
      // pill → icon box
      const pw = lerp(S * 0.86, S * 0.3, morph), ph = lerp(S * 0.26, S * 0.3, morph);
      const px = lerp(c.cx, c.cx - S * 0.22, morph), py = c.cy;
      const r = lerp(ph / 2, S * 0.06, morph);
      const click = pr(t, 1.28, 1.34) * (1 - pr(t, 1.36, 1.6, E.out));
      const sq = 1 - click * 0.04;
      // bloom under the pill, becoming a wave beneath the icon
      c.lightEllipse(px, py + ph * 0.4, pw * 0.75, ph * 0.9, CYAN, 0.85);
      c.lightEllipse(px - pw * 0.1, py + ph * 0.55, pw * 0.5, ph * 0.45, BLUE, 0.9);
      c.lightEllipse(px + Math.sin(t * 1.4) * 20, py + ph * 0.75, pw * (0.9 + morph * 0.5), ph * 0.35, "#1E90FF", 0.55);
      c.with({ x: px, y: py, scale: sq }, () => {
        c.save();
        c.shadow("rgba(0,0,0,0.6)", 40, 0, 16);
        c.rrect(-pw / 2, -ph / 2, pw, ph, r, "rgba(6,12,28,0.82)");
        c.restore();
        c.rrect(-pw / 2, -ph / 2, pw, ph, r, c.linear(0, -ph / 2, 0, ph / 2, [[0, "rgba(120,170,255,0.14)"], [0.5, "rgba(20,40,90,0.05)"], [1, "rgba(60,200,255,0.18)"]]));
        c.strokeRRect(-pw / 2, -ph / 2, pw, ph, r, c.linear(-pw / 2, 0, pw / 2, 0, [[0, "rgba(140,190,255,0.15)"], [0.5, "rgba(190,225,255,0.55)"], [1, "rgba(140,190,255,0.15)"]]), 2);
        if (morph < 0.4) {
          // typed phrase with per-letter blur, then backspace
          const del = pr(t, 1.55, 1.55 + phrase.length / 34);
          const keep = Math.ceil(phrase.length * (1 - del));
          const shown = phrase.slice(0, keep);
          const fs = S * 0.1;
          const a = 1 - pr(morph, 0, 0.3);
          const total = tw(phrase, "jakarta", fs, 700, -0.02);
          typeOn(c, shown, -total / 2, fs * 0.36, { font: "jakarta", size: fs, weight: 700, color: c.linear(0, -fs, 0, fs * 0.4, [[0, "#FFFFFF"], [1, "#BFD9FF"]]), track: -0.02, t0: 0.15, cps: 16, t, rise: 0, alpha: a });
          void total;
        }
        if (morph > 0.3) {
          const a = pr(morph, 0.3, 1);
          c.with({ alpha: a, scale: logLerp(0.6, 1, a) }, () => {
            c.light(0, 0, S * 0.12, CYAN, 0.25);
            glyph(c, "upload", 0, 0, S * 0.13, "#FFFFFF");
          });
        }
      });
      // menu
      const items = p.items as string[];
      const mx = c.cx - S * 0.0, fs = S * 0.064;
      const gap = fs * 1.7;
      const y0 = c.cy - ((items.length - 1) * gap) / 2;
      const active = Math.min(items.length - 1, Math.floor(Math.max(0, t - 2.75) / (BEAT * 1.1)));
      items.forEach((it, i) => {
        const a = pr(t, 2.2 + i * 0.09, 2.6 + i * 0.09, E.out);
        if (a <= 0) return;
        const on = t > 2.7 && i === active;
        const y = y0 + i * gap;
        soft(c, mx + (1 - a) * S * 0.08 - fs * 0.2, y - fs * 1.1, fs * 9, fs * 1.6, (1 - a) * 10, a, (lc) => txt(lc, it, fs * 0.2, fs * 1.1, { font: "jakarta", size: fs, weight: on ? 700 : 500, color: on ? "#FFFFFF" : "rgba(190,210,255,0.5)" }));
      });
      if (t > 2.7) {
        const yy = y0 + springTo(t, 2.75, items.length) * gap - fs * 0.35;
        c.circle(mx - fs * 0.6, yy, fs * 0.13, CYAN);
        c.light(mx - fs * 0.6, yy, fs * 0.6, CYAN, 0.5);
      }
      // cursor glides in, clicks
      const cu = pr(t, 0.85, 1.28, E.out);
      const leave = pr(t, 1.6, 2.0, E.in);
      if (cu > 0 && leave < 1) {
        const cx2 = lerp(c.cx + S * 0.38, c.cx + S * 0.2, cu) + leave * S * 0.3;
        const cy2 = lerp(c.cy + S * 0.35, c.cy + S * 0.04, cu) + leave * S * 0.2;
        cursorArrow(c, cx2, cy2, S / 1080 * 1.4, click);
        const rp = pr(t, 1.3, 1.7, E.out);
        if (rp > 0 && rp < 1) c.arc(cx2, cy2, S * 0.05 * rp, 0, 1, alpha("#FFFFFF", 0.6 * (1 - rp)), 2);
      }
    }, { k0: 1.02, k1: 1.08, dy: -10 });
  },
});
/** The menu dot walks down one item per beat-ish with a firm spring. */
function springTo(t: number, t0: number, n: number) {
  let v = 0;
  for (let i = 1; i < n; i++) v += spring(t - (t0 + i * BEAT * 1.1), SPRING.firm);
  return v;
}

// ══ 4 · Light headline: highlighter wipes under the accent line, a 3D prop drifts in front ═══════════════
const highlight = def({
  id: "bloom-highlight-headline", name: "Bloom · Highlighter Headline + Prop",
  theme: LOOK_LIGHT,
  description: "A white frame with a lavender bloom floor: a bold two-line headline reveals through a soft mask while a lavender highlighter bar wipes in under the accent line, and a 3D prop (the lilac mic) floats up beside it, turning slowly.",
  tags: ["light", "headline", "highlighter", "prop", "3d object", "showreel"],
  params: {
    top: P.text("Every word,", "Line 1", { maxLength: 22 }),
    line2: P.text("perfectly timed.", "Accent line", { maxLength: 22 }),
    prop: P.media(M.mic, "Prop image", "image"),
    duration: dur(5),
  },
  duration: (p) => p.duration,
  sounds: () => [cue(0.02, "whoosh.air", 0.4, { role: "in" }), cue(0.45, "fs.foley.fh-paper-swipe-surface2-shor", 0.45, { role: "marker" }), cue(0.3, "fs.ui.bubble-pop", 0.3, { role: "prop" })],
  render(c, p) {
    const t = c.t, S = c.short;
    vgrad(c, [[0, "#FFFFFF"], [0.6, "#FDF8FF"], [1, "#F3E4FF"]]);
    c.lightEllipse(c.cx, c.H * 0.98, c.W * 0.9, c.H * 0.3, LAV, 1);
    c.lightEllipse(c.cx - c.W * 0.2, c.H * 0.9, c.W * 0.5, c.H * 0.2, "#E9B8FF", 0.6);
    c.light(c.W * 0.85, c.H * 0.2, S * 0.5, "#FBEFFF", 0.8);
    shotCam(c, () => {
      const fs = S * 0.112;
      const l1 = String(p.top), l2 = String(p.line2);
      const y1 = c.cy + S * 0.22, y2 = y1 + fs * 1.2;
      const w2 = tw(l2, "jakarta", fs, 800, -0.035);
      // highlighter bar
      const hb = pr(t, 0.4, 0.85, E.inOut);
      if (hb > 0) {
        const bx = c.cx - w2 / 2 - fs * 0.25, bw = (w2 + fs * 0.5) * hb;
        c.rrect(bx, y2 - fs * 0.62, bw, fs * 0.72, fs * 0.12, c.linear(bx, 0, bx + w2, 0, [[0, "#E9D5FF"], [1, "#D8B4FE"]]));
      }
      const mask = (u: number, y: number, s: string, color: string) => {
        const w = tw(s, "jakarta", fs, 800, -0.035);
        const pad = fs * 0.4;
        const Lr = c.layer(w + pad * 2, fs * 1.6, (lc) => {
          txt(lc, s, pad, fs * 1.15, { font: "jakarta", size: fs, weight: 800, color, track: -0.035 });
          lc.ctx.globalCompositeOperation = "destination-in";
          const edge = pad + (w + pad) * u;
          lc.ctx.fillStyle = lc.linear(edge - fs * 0.8, 0, edge, 0, [[0, "rgba(0,0,0,1)"], [1, "rgba(0,0,0,0)"]]);
          lc.ctx.fillRect(0, 0, w + pad * 2, fs * 1.6);
        });
        c.drawLayer(Lr, c.cx - w / 2 - pad + (1 - u) * fs * 0.3, y - fs * 1.15);
      };
      mask(pr(t, 0.05, 0.55, E.out), y1, l1, INK);
      mask(pr(t, 0.3, 0.8, E.out), y2, l2, "#2A1446");
      // the prop: floats up from below with blur, keeps turning
      const pu = pr(t, 0.15, 0.85, E.out);
      const ph = S * 0.88;
      const info = c.mediaInfo(p.prop as string);
      const pw = info && info.w ? (ph * info.w) / info.h : ph * 0.6;
      const px = c.cx + S * 0.06, py = y1 - fs * 1.0 - ph * 0.5 + (1 - pu) * S * 0.35 + Math.sin(t * 1.5) * 10;
      const rot = lerp(-10, 6, glide(c.p)) + (1 - pu) * -20;
      c.lightEllipse(px, y1 - fs * 0.85, pw * 0.5, S * 0.03, "rgba(80,40,120,0.5)", 0.25 * pu);
      c.with({ x: px, y: py, rotate: rot, alpha: pr(pu, 0, 0.4) }, () => {
        const blur = (1 - pu) * 18;
        if (blur > 0.6) soft(c, -pw / 2, -ph / 2, pw, ph, blur, 1, (lc) => lc.media(p.prop as string, 0, 0, pw, ph, { fit: "contain" }));
        else c.media(p.prop as string, -pw / 2, -ph / 2, pw, ph, { fit: "contain" });
      });
    }, { k0: 1.0, k1: 1.06, dx: -20 });
  },
});

// ══ 5 · Neon island: a glowing waveform "landmass" tilted in 3D, keywords orbiting; flash → title ════════
const neonOrbit = def({
  id: "bloom-neon-orbit", name: "Bloom · Neon Island + Orbiting Words",
  theme: LOOK,
  description: "A neon-edged waveform island with contour lines tilts and turns in 3D under a green bloom while six keywords orbit it (scaling and dimming with depth). A white flash on the beat, the island lifts and shrinks, and a two-line title pops in letter by letter out of order.",
  tags: ["neon", "3d", "orbit", "keywords", "flash", "title", "showreel"],
  params: {
    words: P.list(["Whisper", "Your machine", "No cloud", "Every word", "Free", "Open source"], "Orbiting words", { min: 3, max: 8, maxLength: 16 }),
    title1: P.text("Never leaves", "Title line 1", { maxLength: 18 }),
    title2: P.text("your machine.", "Title line 2 (accent)", { maxLength: 18 }),
    flashAt: P.number(beats(4), "Flash at (s)", { min: 0.5, max: 10, step: 0.01, unit: "s" }),
    duration: dur(8),
  },
  duration: (p) => p.duration,
  sounds: (p) => [cue(0.02, "riser.air", 0.3, { len: (p.flashAt as number) - 0.1, role: "build" }), cue(p.flashAt as number, "fs.impact.sound-design-elements-impact", 0.5, { role: "flash" }), cue((p.flashAt as number) + 0.12, "tonal.shimmer", 0.25, { role: "title" })],
  render(c, p) {
    const t = c.t, S = c.short;
    const fA = p.flashAt as number;
    const after = pr(t, fA, fA + 0.6, E.out);
    c.clear(BLACK);
    pool(c, c.cx, c.cy, S, "#05241A", 1);
    crescent(c, c.cx - S * 0.05, c.cy - S * 0.05 - after * S * 0.25, S * 0.55, GREEN, 0.6 + t * 0.4, 0.85);
    dots(c, S * 0.04, MINT, 0.07, 2);
    dust(c, 36, 11, MINT, 0.5);
    shotCam(c, () => {
      const cam = c.camera({ fov: 34 });
      const iy = lerp(0, -S * 0.42, after), isc = logLerp(1, 0.62, after);
      const IW = S * 0.8, IH = S * 0.62;
      const words = p.words as string[];
      const orbit = (front: boolean) => words.forEach((w, i) => {
        const th = (i / words.length) * TAU + t * 0.55;
        const d = Math.sin(th);
        if ((d > 0) !== front) return;
        const ox = c.cx + Math.cos(th) * S * 0.33 * isc;
        const oy = c.cy + iy + d * S * 0.2 * isc - S * 0.02;
        const sz = S * 0.042 * (0.82 + 0.28 * (d + 1) / 2) * lerp(1, 0.85, after);
        const a = (0.4 + 0.6 * (d + 1) / 2) * pr(t, 0.1 + i * 0.06, 0.5 + i * 0.06);
        txt(c, w, ox, oy, { font: "jakarta", size: sz, weight: 600, color: "#E9FFF5", align: "center", alpha: a });
      });
      orbit(false);
      const island = (lc: RC) => {
        const n = 96;
        const env = (x: number) => {
          const h = Math.pow(Math.sin(Math.PI * x), 0.7);
          return h * (0.35 + 0.65 * Math.abs(noise1(x * 7 + 3, 2) * 0.7 + noise1(x * 19 - t * 0.6, 5) * 0.3));
        };
        const shape = (k: number) => {
          const pts: [number, number][] = [];
          for (let i = 0; i <= n; i++) pts.push([IW * (0.5 + (i / n - 0.5) * (0.4 + 0.6 * k)), IH / 2 - env(i / n) * IH * 0.46 * k]);
          for (let i = n; i >= 0; i--) pts.push([IW * (0.5 + (i / n - 0.5) * (0.4 + 0.6 * k)), IH / 2 + env(i / n) * IH * 0.4 * k]);
          return pts;
        };
        const outer = shape(1);
        lc.poly(outer, lc.radial(IW / 2, IH / 2, IW * 0.5, [[0, "#0E5A3E"], [0.6, "#073523"], [1, "#03170F"]]));
        for (const k of [0.82, 0.64, 0.46, 0.28]) {
          const pts = shape(k);
          pts.push(pts[0]);
          lc.polyline(pts, alpha(MINT, 0.18 + (1 - k) * 0.2), 1.6);
        }
        lc.save();
        lc.ctx.shadowColor = GREEN;
        for (const [wd, bl] of [[7, 26], [3.5, 10], [2, 0]] as const) {
          lc.ctx.shadowBlur = bl * lc.deviceScale;
          const pts = [...outer, outer[0]];
          lc.polyline(pts, bl ? alpha(GREEN, 0.9) : "#D9FFF0", wd);
        }
        lc.restore();
      };
      cam.layerPlane(IW, IH, island, { x: 0, y: iy, z: 0, rx: 38 + Math.sin(t * 0.8) * 4, ry: Math.sin(t * 0.5) * 10, rz: -10 + t * 3, scale: isc, res: 1.1, pad: 30 });
      orbit(true);
      // title pops letter by letter, out of order
      if (t >= fA) {
        const fs = S * 0.1;
        [[String(p.title1), "#FFFFFF", 0], [String(p.title2), GREEN, 1]].forEach(([s, col, li]) => {
          const str = s as string, w = tw(str, "jakarta", fs, 800, -0.03);
          let x = c.cx - w / 2;
          const y = c.cy + S * 0.18 + (li as number) * fs * 1.15;
          [...str].forEach((ch, i) => {
            const cw = tw(ch, "jakarta", fs, 800, 0);
            const at = fA + 0.06 + rand(i * 13 + (li as number) * 101) * 0.42;
            const u = pr(t, at, at + 0.3, E.out);
            if (u > 0) c.with({ x: x + cw / 2, y: y - fs * 0.35, scale: logLerp(1.7, 1, u), alpha: pr(u, 0, 0.3) }, () => txt(c, ch, 0, fs * 0.35, { font: "jakarta", size: fs, weight: 800, color: col as string, align: "center" }));
            x += cw - 0.03 * fs;
          });
        });
      }
    }, { k0: 1.0, k1: 1.07 });
    const fl = Math.exp(-Math.max(0, t - fA) * 14) * (t >= fA ? 1 : 0);
    if (fl > 0.01) c.rect(0, 0, c.W, c.H, alpha("#F4FFF9", fl));
  },
});

// ══ 6 · Chrome extruded word flying in over a gold→green horizon ═══════════════════════════════════════
const chrome = def({
  id: "bloom-chrome-word", name: "Bloom · Chrome Extruded Word",
  theme: LOOK,
  description: "Extruded chrome letters fly in from the camera one by one (turning as they come), settle over a gold-to-green horizon glow with drifting bokeh, then sway gently; a tagline rises under them.",
  tags: ["chrome", "3d type", "extrude", "logo reveal", "horizon", "bokeh", "showreel"],
  params: {
    word: P.text("MP4", "Word", { maxLength: 6 }),
    tagline: P.text("Exported right in your browser.", "Tagline", { maxLength: 40 }),
    duration: dur(5),
  },
  duration: (p) => p.duration,
  sounds: (p) => {
    const out: SoundCue[] = [];
    [...String(p.word)].forEach((_, i) => out.push(cue(0.02 + i * 0.09, "whoosh.whip", 0.35, { seed: i, role: "fly" })));
    out.push(cue(0.5 + (String(p.word).length - 1) * 0.09, "fs.impact.plasma-impact-one", 0.38, { role: "land" }));
    return out;
  },
  render(c, p) {
    const t = c.t, S = c.short;
    vgrad(c, [[0, "#030304"], [0.5, "#07080A"], [1, "#0B0E0C"]]);
    const hy = c.cy + S * 0.36;
    // a planet-edge horizon: lit rim, gold into green beneath it
    const PR = c.long * 1.6;
    c.lightEllipse(c.cx, hy + S * 0.05, c.W * 1.2, S * 0.4, "#1FBF7E", 0.7);
    c.circle(c.cx, hy + PR, PR, c.linear(0, hy, 0, hy + S * 0.9, [[0, "#E9BE5E"], [0.05, "#35B884"], [0.22, "#0A4434"], [0.6, "#03130D"], [1, "#020806"]]));
    c.lightEllipse(c.cx + S * 0.1, hy, c.W * 0.8, S * 0.07, "#FFE7A6", 0.85);
    c.lightEllipse(c.cx, hy - S * 0.01, c.W * 0.6, S * 0.012, "#FFFFFF", 0.9);
    for (let i = 0; i < 22; i++) {
      const r1 = rand(i * 7 + 1), r2 = rand(i * 13 + 5), r3 = rand(i * 29 + 9);
      const x = r1 * c.W + Math.sin(t * 0.5 + i) * 20, y = ((r2 * c.H - t * (20 + r3 * 30)) % c.H + c.H) % c.H;
      c.light(x, y, 8 + r3 * 26, r3 > 0.5 ? "#F7D58A" : "#BFF5DC", 0.25 + 0.2 * Math.sin(t * 2 + i));
    }
    const word = String(p.word);
    let fs = S * 0.42;
    const w0 = tw(word, "anton", fs, 400, 0.02);
    if (w0 > c.W * 0.8) fs *= (c.W * 0.8) / w0;
    const ww = tw(word, "anton", fs, 400, 0.02);
    const cap = capHeight("anton", fs);
    shotCam(c, () => {
      const cam = c.camera({ fov: 36 });
      let x = -ww / 2;
      [...word].forEach((ch, i) => {
        const cw = tw(ch, "anton", fs, 400, 0);
        const u = pr(t, 0.02 + i * 0.09, 0.62 + i * 0.09, E.out);
        if (u > 0) {
          const ext = Math.round(fs * 0.07);
          const LW = cw + ext + fs * 0.3, LH = cap + ext + fs * 0.3;
          const letter = (lc: RC) => {
            lc.setFont("anton", fs, 400, false, 0);
            const ox = fs * 0.15, oy = fs * 0.15 + cap;
            for (let k = ext; k >= 1; k--) {
              lc.ctx.fillStyle = lc.linear(0, oy - cap, 0, oy + ext, [[0, mix("#B9C2BF", "#2B3230", k / ext)], [0.7, mix("#6F8F80", "#16211C", k / ext)], [1, mix("#C9A35A", "#1B1A12", k / ext)]]);
              lc.ctx.fillText(ch, ox + k * 0.45, oy + k * 0.9);
            }
            lc.ctx.fillStyle = lc.linear(0, oy - cap, 0, oy, [[0, "#FDFDFD"], [0.22, "#E4E8EA"], [0.42, "#9AA2A6"], [0.49, "#4A5154"], [0.53, "#D8C186"], [0.64, "#F7F1DC"], [0.8, "#B6EAD3"], [1, "#6E8F82"]]);
            lc.ctx.fillText(ch, ox, oy);
            lc.ctx.strokeStyle = "rgba(255,255,255,0.55)";
            lc.ctx.lineWidth = 1.2;
            lc.ctx.strokeText(ch, ox, oy);
            lc.sweep(((t * 0.7 + i * 0.2) % 1.6) * LW * 1.4 - LW * 0.2, 20, LW * 0.25, "#FFFFFF", 0.45, "source-atop");
          };
          const dir = i % 2 ? 1 : -1;
          cam.layerPlane(LW, LH, letter, {
            x: x + cw / 2 + (1 - u) * dir * S * 0.15, y: -cap * 0.15 + (1 - u) * -S * 0.05, z: lerp(-S * 1.4, 0, u),
            ry: dir * 70 * (1 - u) + Math.sin(t * 1.2 + i) * 5 * u, rx: (1 - u) * -20 + Math.sin(t * 0.9) * 3, rz: dir * (1 - u) * 12,
            alpha: pr(u, 0, 0.25), res: 1.4,
          });
        }
        x += cw + 0.02 * fs;
      });
      const tu = pr(t, 1.05, 1.6, E.out);
      typeOn(c, String(p.tagline), c.cx, c.cy + cap * 0.62 + S * 0.08, { font: "jakarta", size: S * 0.05, weight: 600, color: "#F2F6F4", align: "center", t0: 1.05, cps: 55, t, alpha: 0.9 * pr(tu, 0, 0.2) });
    }, { k0: 1.0, k1: 1.06 });
  },
});

// ══ 7 · Neon-rim dashboard dollying from steep perspective to frontal ══════════════════════════════════
const dashboard = def({
  id: "bloom-rim-dashboard", name: "Bloom · Neon-Rim Dashboard Dolly",
  theme: LOOK,
  description: "A dark app panel with an orange rim light tracing its edge dollies from a steep 3D angle to almost frontal; sidebar icons and four feature rows (coloured icon tiles, titles, sub-lines) stagger in, and a heading types on above it.",
  tags: ["ui", "dashboard", "3d", "dolly", "rim light", "neon", "showreel"],
  params: {
    heading: P.text("Style the frame.", "Heading", { maxLength: 24 }),
    rows: P.list(["Whisper|Runs on your machine", "33 looks|One click each", "Every word|Timed for you", "Export MP4|Right in the browser"], "Rows (title|sub-line)", { min: 2, max: 5, maxLength: 40 }),
    duration: dur(7),
  },
  duration: (p) => p.duration,
  sounds: (p) => {
    const out: SoundCue[] = [cue(0, "whoosh.deep", 0.4, { role: "dolly" }), cue(0.1, "foley.marker", 0.12, { len: 0.9, role: "rim" })];
    (p.rows as string[]).forEach((_, i) => out.push(cue(0.55 + i * 0.13, "fs.ui.pop-9", 0.22, { seed: i, role: "row" })));
    for (let i = 0; i < String(p.heading).length; i += 2) out.push(cue(1.2 + i / 28, `viral.key-${(i % 6) + 1}`, 0.15, { role: "type" }));
    return out;
  },
  render(c, p) {
    const t = c.t, S = c.short;
    c.clear("#030303");
    c.light(c.W * 0.05, c.H * 0.3, S * 0.9, "#3A1A02", 0.9);
    c.light(c.W * 0.1, c.H * 0.15, S * 0.4, ORANGE, 0.18);
    const u = glide(c.p);
    const PW = S * 0.9, PH = S * 1.2;
    const rows = (p.rows as string[]).map((r) => r.split("|"));
    const tones = [ORANGE, "#3B82F6", "#A855F7", GREEN, "#F43F5E"];
    const glyphs = ["mic", "cc", "clock", "download", "lock"];
    const rim = pr(t, 0.05, 1.3, E.inOut);
    const panel = (lc: RC) => {
      const r = S * 0.05;
      lc.save();
      lc.shadow("rgba(0,0,0,0.8)", 60, 0, 30);
      lc.rrect(0, 0, PW, PH, r, "#0B0B0D");
      lc.restore();
      lc.rrect(0, 0, PW, PH, r, lc.linear(0, 0, PW, PH, [[0, "rgba(255,170,70,0.07)"], [0.4, "rgba(255,255,255,0.015)"], [1, "rgba(0,0,0,0)"]]));
      lc.strokeRRect(0.5, 0.5, PW - 1, PH - 1, r, "rgba(255,255,255,0.07)", 1.5);
      // rim light tracing up the left edge and across the top
      const per = PH + PW;
      const L1 = Math.min(PH, rim * per), L2 = Math.max(0, rim * per - PH);
      lc.save();
      lc.ctx.shadowColor = ORANGE;
      for (const [wd, bl, col] of [[10, 34, alpha(ORANGE, 0.7)], [4, 12, ORANGE], [1.6, 0, "#FFE3BF"]] as const) {
        lc.ctx.shadowBlur = bl * lc.deviceScale;
        lc.polyline([[0, PH - r], [0, Math.max(r, PH - L1)]], col, wd);
        if (L2 > 0) {
          lc.ctx.beginPath();
          lc.ctx.arc(r, r, r, Math.PI, Math.PI * 1.5);
          lc.ctx.strokeStyle = col;
          lc.ctx.lineWidth = wd;
          lc.ctx.stroke();
          lc.polyline([[r, 0], [Math.min(PW * 0.75, r + L2), 0]], col, wd);
        }
      }
      lc.restore();
      // sidebar
      const sx = S * 0.075;
      ["home", "sparkle", "heart", "play", "lock", "code", "download"].forEach((g, i) => {
        const a = pr(t, 0.3 + i * 0.05, 0.6 + i * 0.05);
        const y = S * 0.12 + i * S * 0.1;
        if (i === 0) lc.rrect(sx - S * 0.032, y - S * 0.032, S * 0.064, S * 0.064, S * 0.016, ORANGE);
        lc.with({ alpha: a }, () => glyph(lc, g, sx, y, S * 0.04, i === 0 ? "#FFFFFF" : "rgba(255,255,255,0.45)"));
      });
      lc.rect(S * 0.15, S * 0.06, 1, PH - S * 0.12, "rgba(255,255,255,0.06)");
      const cx0 = S * 0.2;
      txt(lc, "Overview", cx0, S * 0.13, { font: "jakarta", size: S * 0.03, weight: 700, color: "rgba(255,255,255,0.85)", alpha: pr(t, 0.4, 0.7) });
      lc.rrect(PW - S * 0.25, S * 0.095, S * 0.19, S * 0.05, S * 0.025, "rgba(255,255,255,0.05)");
      txt(lc, "Search", PW - S * 0.2, S * 0.128, { font: "jakarta", size: S * 0.022, weight: 500, color: "rgba(255,255,255,0.35)" });
      rows.forEach(([title, sub], i) => {
        const a = pr(t, 0.55 + i * 0.13, 0.95 + i * 0.13, E.out);
        if (a <= 0) return;
        const y = S * 0.22 + i * S * 0.17;
        lc.with({ x: (1 - a) * S * 0.06, alpha: a }, () => {
          const tz = S * 0.09, tone = tones[i % tones.length];
          lc.save();
          lc.shadow(alpha(tone, 0.6), 22, 0, 4);
          lc.rrect(cx0, y, tz, tz, tz * 0.28, lc.linear(cx0, y, cx0 + tz, y + tz, [[0, mix(tone, "#FFFFFF", 0.25)], [1, tone]]));
          lc.restore();
          glyph(lc, glyphs[i % glyphs.length], cx0 + tz / 2, y + tz / 2, tz * 0.55, "#FFFFFF");
          txt(lc, title ?? "", cx0 + tz + S * 0.035, y + tz * 0.42, { font: "jakarta", size: S * 0.038, weight: 700, color: "#FFFFFF" });
          txt(lc, sub ?? "", cx0 + tz + S * 0.035, y + tz * 0.84, { font: "jakarta", size: S * 0.025, weight: 500, color: "rgba(255,255,255,0.45)" });
          lc.rect(cx0, y + tz + S * 0.04, PW - cx0 - S * 0.06, 1, "rgba(255,255,255,0.06)");
        });
      });
    };
    const cam = c.camera({ fov: 34 });
    cam.layerPlane(PW, PH, panel, { x: lerp(S * 0.14, S * 0.02, u), y: S * 0.08, z: lerp(S * 0.5, -S * 0.05, u), ry: lerp(40, 9, u), rx: lerp(16, 5, u), rz: lerp(-4, 0, u), res: 1.3, pad: 60 });
    typeOn(c, String(p.heading), c.W - S * 0.09, c.cy - PH * 0.52, { font: "jakarta", size: S * 0.07, weight: 800, color: c.linear(0, c.cy - PH * 0.6, 0, c.cy - PH * 0.5, [[0, "#FFFFFF"], [1, "#FFD6A3"]]), align: "right", track: -0.03, t0: 1.2, cps: 28, t });
  },
});

// ══ 8 · Rack focus into a card carousel of real captioned clips ════════════════════════════════════════
const carousel = def({
  id: "bloom-card-carousel", name: "Bloom · Rack-Focus Card Carousel",
  theme: LOOK_LIGHT,
  description: "A blurred full-frame clip racks into focus, shrinks into a rounded card, and becomes the centre of a carousel (side cards smaller and soft) that slides one card per beat. Pale lavender-sky frame.",
  tags: ["carousel", "cards", "rack focus", "video", "light", "showreel"],
  params: {
    clips: P.mediaList(["sam", "omar", "mckensie", "gereon", "william"].map(M.hero), "Clips", "video", { min: 3, max: 8 }),
    duration: dur(6),
  },
  duration: (p) => p.duration,
  sounds: () => [cue(0, "riser.reverse", 0.3, { len: 0.5, role: "focus" }), cue(0.6, "whoosh.air", 0.35, { role: "shrink" }), ...[1, 2, 3].map((k) => cue(0.75 + k * BEAT * 1.5 - 0.1, "whoosh.swipe", 0.38, { seed: k, role: "slide" }))],
  render(c, p) {
    const t = c.t, S = c.short;
    const clips = p.clips as string[];
    vgrad(c, [[0, "#EAF2FF"], [0.55, "#F7F3FF"], [1, "#FFFFFF"]]);
    c.light(c.W * 0.8, c.H * 0.25, S * 0.7, "#CFE3FF", 0.9);
    c.light(c.W * 0.15, c.H * 0.8, S * 0.6, LAV, 0.8);
    const shrink = pr(t, 0.55, 1.05, E.inOut);
    const focus = pr(t, 0, 0.55, E.out);
    const CW = S * 0.68, CH = CW * (600 / 432);
    // carousel offset: one card per 1.5 beats after the shrink
    let off = 0;
    for (let k = 1; k <= 3; k++) off += spring(t - (0.75 + k * BEAT * 1.5), SPRING.firm);
    const gap = CW * 1.12;
    const order = clips.map((_, i) => i).sort((a, b) => Math.abs(b - off) - Math.abs(a - off));
    for (const i of order) {
      const d = i - off;
      const isHero = i === 0;
      if (!isHero && shrink <= 0) continue;
      const side = Math.min(1, Math.abs(d));
      const sc = lerp(1, 0.8, side);
      let x = c.cx + d * gap * lerp(0.95, 1, side) * (isHero ? 1 : shrink), y = c.cy;
      let w = CW * sc, h = CH * sc, r = S * 0.045;
      if (isHero) {
        w = lerp(c.W, w, shrink);
        h = lerp(c.H, h, shrink);
        r = lerp(0, r, shrink);
        x = lerp(c.cx, x, shrink);
        y = lerp(c.cy, y, shrink);
      }
      const blur = isHero && shrink < 1 ? (1 - focus) * 40 : side * 7;
      const a = isHero ? 1 : pr(shrink, 0.3, 1) * lerp(1, 0.75, side);
      const card = (lc: RC) => {
        lc.save();
        lc.clipRRect(0, 0, w, h, r);
        lc.media(clips[i], 0, 0, w, h, { fit: "cover", t: t + i * 0.8 });
        lc.restore();
        if (r > 2) lc.strokeRRect(0.5, 0.5, w - 1, h - 1, r, "rgba(255,255,255,0.6)", 2);
      };
      if (r > 2) c.with({ alpha: a * 0.9 }, () => c.cardShadow(x - w / 2, y - h / 2, w, h, r, 0.7, 0.8, "#2B2550"));
      soft(c, x - w / 2, y - h / 2, w, h, blur, a, card);
    }
  },
});

// ══ 9 · The real icon breathing on navy, a context menu drops in, a chrome glint sweeps the icon ═════════
const iconMenu = def({
  id: "bloom-icon-menu", name: "Bloom · Icon + Context Menu",
  theme: LOOK,
  description: "On deep navy with fine arc lines and a blue bloom, the logo mark breathes inside its own glow; a small glass context menu drops in beside it, a highlight pill slides to the first item, and a chrome glint sweeps across the mark.",
  tags: ["logo", "icon", "menu", "ui", "glint", "navy", "showreel"],
  params: {
    icon: P.media(M.iconLight, "Icon", "image"),
    items: P.list(["EXPORT MP4", "ALPHA OVERLAY", "RESTYLE", "RETIME"], "Menu items", { min: 2, max: 5, maxLength: 16 }),
    duration: dur(5),
  },
  duration: (p) => p.duration,
  sounds: (p) => [cue(0.02, "tonal.pad", 0.2, { len: 1.6, role: "bed" }), cue(0.85, "kenney.open", 0.45, { role: "menu" }), ...(p.items as string[]).map((_, i) => cue(0.95 + i * 0.07, "kenney.tick", 0.25, { role: "item" })), cue(1.45, "kenney.click", 0.5, { role: "select" }), cue(1.7, "kenney.glass", 0.4, { role: "glint" })],
  render(c, p) {
    const t = c.t, S = c.short;
    c.clear("#01030C");
    c.light(c.W * 0.1, c.H * 0.85, S * 1.1, "#0A2AA8", 0.9);
    c.light(c.W * 0.05, c.H * 0.95, S * 0.5, "#2C5BFF", 0.7);
    for (let i = 0; i < 4; i++) c.arc(c.cx + S * 0.1, c.cy + S * 0.2, S * (0.5 + i * 0.28) + Math.sin(t * 0.6 + i) * 6, 0, 1, "rgba(120,150,255,0.07)", 1.5);
    c.line(c.W * 0.62, 0, c.W * 0.62, c.H, "rgba(120,150,255,0.05)", 1);
    c.line(0, c.H * 0.62, c.W, c.H * 0.62, "rgba(120,150,255,0.05)", 1);
    shotCam(c, () => {
      const breath = 1 + Math.sin(t * Math.PI / BEAT) * 0.025;
      const enter = pr(t, 0, 0.45, E.out);
      const ix = lerp(c.cx, c.cx + S * 0.2, pr(t, 0.75, 1.2, E.inOut)), iy = c.cy;
      const IS = S * 0.5 * logLerp(0.7, 1, enter) * breath;
      c.light(ix, iy, IS * 1.1, "#3B5BFF", 0.6);
      c.light(ix + IS * 0.15, iy - IS * 0.1, IS * 0.6, ORANGE, 0.22);
      c.light(ix - IS * 0.1, iy + IS * 0.15, IS * 0.6, GREEN, 0.2);
      const glint = pr(t, 1.7, 2.3, E.inOut);
      const L = c.layer(IS, IS, (lc) => {
        lc.media(p.icon as string, 0, 0, IS, IS, { fit: "contain" });
        if (glint > 0 && glint < 1) {
          lc.sweep(-IS * 0.3 + glint * IS * 1.6, 25, IS * 0.35, "#FFFFFF", 0.9, "source-atop");
        }
      });
      c.drawLayer(L, ix - IS / 2, iy - IS / 2, { alpha: pr(t, 0, 0.2), blur: (1 - enter) * 10 });
      // the menu
      const items = p.items as string[];
      const mu = pr(t, 0.85, 1.25, E.out);
      if (mu > 0) {
        const fs = S * 0.038, rowH = fs * 2.3;
        const mw = S * 0.48, mh = rowH * items.length + fs * 1.2;
        const mx = c.cx - S * 0.45, my = iy - mh / 2 - (1 - mu) * S * 0.06;
        c.with({ alpha: mu }, () => {
          c.save();
          c.shadow("rgba(0,0,0,0.6)", 40, 0, 18);
          c.rrect(mx, my, mw, mh, fs * 0.8, "rgba(14,20,44,0.85)");
          c.restore();
          c.strokeRRect(mx, my, mw, mh, fs * 0.8, "rgba(140,170,255,0.2)", 1.5);
          const sel = pr(t, 1.3, 1.55, E.out);
          if (sel > 0) {
            const hy = my + fs * 0.6;
            c.rrect(mx + fs * 0.4, hy, (mw - fs * 0.8) * sel, rowH - fs * 0.2, fs * 0.5, c.linear(mx, 0, mx + mw, 0, [[0, "#2E6BFF"], [1, "#5B8CFF"]]));
          }
          items.forEach((it, i) => {
            const a = pr(t, 0.95 + i * 0.07, 1.25 + i * 0.07);
            txt(c, it, mx + fs * 1.2, my + fs * 0.6 + i * rowH + rowH * 0.62, { font: "jakarta", size: fs, weight: 700, color: i === 0 && sel > 0.5 ? "#FFFFFF" : "rgba(200,215,255,0.6)", track: 0.08, alpha: a });
            if (i === 0) glyph(c, "play", mx + mw - fs * 1.4, my + fs * 0.6 + rowH * 0.48, fs * 0.9, alpha("#FFFFFF", a * 0.8));
          });
        });
      }
    }, { k0: 1.0, k1: 1.06 });
  },
});

// ══ 10 · Electric-blue phone: rises with data streaks, real clip on screen, icons pop, collapses to a beam
const phonePop = def({
  id: "bloom-phone-pop", name: "Bloom · Phone Pop → Light Beam",
  theme: LOOK,
  description: "Electric blue with falling data streaks: a phone rises from below playing a real captioned clip, the app icon pops on its screen and four glyph chips stagger under it; on the last beat the phone collapses into a vertical beam of light.",
  tags: ["phone", "mockup", "pop", "icons", "beam", "electric blue", "showreel"],
  params: {
    clip: P.media(M.hero("omar"), "Screen clip", "video"),
    icon: P.media(M.appIcon, "App icon", "image"),
    duration: dur(6),
  },
  duration: (p) => p.duration,
  sounds: (p) => [cue(0, "whoosh.deep", 0.4, { role: "rise" }), cue(0.75, "fs.ui.bubble-pop", 0.4, { role: "icon" }), ...[0, 1, 2, 3].map((i) => cue(1.0 + i * 0.1, "fs.ui.pop-9", 0.22, { seed: i, role: "chip" })), cue((p.duration as number) - 0.45, "riser.reverse", 0.35, { len: 0.4, role: "beam" })],
  render(c, p) {
    const t = c.t, S = c.short, D = c.dur;
    c.rect(0, 0, c.W, c.H, c.radial(c.cx, c.cy, c.long * 0.75, [[0, "#1B48F2"], [0.55, "#0C2BC4"], [1, "#05157A"]]));
    for (let i = 0; i < 6; i++) c.rect(c.W * (0.08 + i * 0.17), 0, c.W * 0.06, c.H, "rgba(140,180,255,0.035)");
    for (let i = 0; i < 30; i++) {
      const r1 = rand(i * 3 + 1), r2 = rand(i * 7 + 2), r3 = rand(i * 11 + 4);
      const len = S * (0.15 + r2 * 0.5), x = Math.round(r1 * 24) / 24 * c.W;
      const y = ((r3 * c.H * 2 + t * S * (0.6 + r2)) % (c.H + len)) - len;
      c.rect(x, y, 2 + r2 * 2, len, c.linear(0, y, 0, y + len, [[0, "rgba(160,220,255,0)"], [1, `rgba(190,235,255,${0.25 + r3 * 0.4})`]]));
    }
    const col = pr(t, D - 0.42, D - 0.05, E.in);
    shotCam(c, () => {
      const rise = pr(t, 0, 0.7, E.out);
      const PW = S * 0.52, PH = PW * 2.05;
      const py = c.cy + (1 - rise) * S * 1.1 + Math.sin(t * 1.4) * 6;
      const sx = lerp(1, 0.02, col), sy = lerp(1, 1.4, col);
      c.with({ x: c.cx, y: py, sx, sy, rotate: (1 - rise) * -8 }, () => {
        c.light(0, PH * 0.45, PW * 0.8, "#38E1A0", 0.35);
        c.save();
        c.shadow("rgba(0,0,30,0.6)", 60, 0, 30);
        c.rrect(-PW / 2, -PH / 2, PW, PH, PW * 0.16, "#070B16");
        c.restore();
        c.strokeRRect(-PW / 2 + 1, -PH / 2 + 1, PW - 2, PH - 2, PW * 0.16, "rgba(150,190,255,0.45)", 2);
        const ins = PW * 0.035;
        c.save();
        c.clipRRect(-PW / 2 + ins, -PH / 2 + ins, PW - ins * 2, PH - ins * 2, PW * 0.13);
        c.media(p.clip as string, -PW / 2 + ins, -PH / 2 + ins, PW - ins * 2, PH - ins * 2, { fit: "cover", t });
        c.rect(-PW / 2, -PH / 2, PW, PH, `rgba(4,14,70,${lerp(0.15, 0.62, pr(t, 0.6, 1.0, E.out))})`);
        c.restore();
        c.rrect(-PW * 0.14, -PH / 2 + ins * 1.6, PW * 0.28, PW * 0.07, PW * 0.035, "#070B16");
        // icon + chips
        const ic = clamp(spring(t - 0.75, SPRING.pop), 0, 1.3);
        if (ic > 0.01) c.with({ x: 0, y: -PH * 0.2, scale: ic }, () => {
          c.light(0, 0, PW * 0.4, GREEN, 0.5);
          c.save();
          c.shadow("rgba(0,0,0,0.45)", 24, 0, 8);
          c.media(p.icon as string, -PW * 0.17, -PW * 0.17, PW * 0.34, PW * 0.34, { fit: "contain" });
          c.restore();
        });
        ["mic", "cc", "clock", "download"].forEach((g, i) => {
          const k = clamp(spring(t - (1.0 + i * 0.1), SPRING.pop), 0, 1.3);
          if (k < 0.01) return;
          const x = (i - 1.5) * PW * 0.23, y = -PH * 0.02;
          c.with({ x, y, scale: k }, () => {
            c.rrect(-PW * 0.1, -PW * 0.1, PW * 0.2, PW * 0.2, PW * 0.06, "rgba(10,30,90,0.75)");
            c.strokeRRect(-PW * 0.1, -PW * 0.1, PW * 0.2, PW * 0.2, PW * 0.06, alpha(MINT, 0.6), 1.5);
            glyph(c, g, 0, 0, PW * 0.11, MINT);
          });
        });
      });
      if (col > 0) {
        const bw = lerp(PW, S * 0.012, col);
        c.with({ alpha: pr(col, 0.3, 1) }, () => {
          c.rect(c.cx - bw / 2, 0, bw, c.H, c.linear(0, 0, 0, c.H, [[0, "rgba(180,240,255,0)"], [0.5, "#E8FBFF"], [1, "rgba(180,240,255,0)"]]));
          c.light(c.cx, c.cy, S * 0.3, CYAN, 0.6 * col);
        });
      }
    }, { k0: 1.0, k1: 1.05 });
  },
});

// ══ 11 · A beam opens into the prop; outlines pulse outward on the beat ═══════════════════════════════
const shield = def({
  id: "bloom-shield-pulse", name: "Bloom · Prop + Pulse Rings",
  theme: LOOK,
  description: "On electric blue, a beam of light opens into a 3D prop (the lilac cloud lock) that lands with a bounce, while shield outlines pulse outward from it on every beat; a line of copy rises under it.",
  tags: ["shield", "security", "pulse", "beat", "prop", "electric blue", "showreel"],
  params: {
    prop: P.media(M.lock, "Prop image", "image"),
    line: P.text("Your clips stay yours.", "Line", { maxLength: 30 }),
    duration: dur(4),
  },
  duration: (p) => p.duration,
  sounds: (p) => [cue(0.05, "impact.land", 0.4, { role: "land" }), ...Array.from({ length: Math.ceil((p.duration as number) / BEAT) }, (_, i) => cue(0.1 + i * BEAT, "fx.heartbeat", 0.12, { seed: i, role: "pulse" })), cue(0.5, "tonal.notify", 0.2, { role: "line" })],
  render(c, p) {
    const t = c.t, S = c.short;
    c.rect(0, 0, c.W, c.H, c.radial(c.cx, c.cy, c.long * 0.75, [[0, "#1D4CF5"], [0.55, "#0C2BC4"], [1, "#04126E"]]));
    const shieldPath = (s: number) => {
      const w = S * 0.36 * s, h = S * 0.44 * s, y0 = c.cy - h * 0.5;
      c.ctx.beginPath();
      c.ctx.moveTo(c.cx, y0);
      c.ctx.quadraticCurveTo(c.cx + w * 0.55, y0 + h * 0.12, c.cx + w, y0 + h * 0.1);
      c.ctx.quadraticCurveTo(c.cx + w * 1.02, y0 + h * 0.75, c.cx, y0 + h * 1.1);
      c.ctx.quadraticCurveTo(c.cx - w * 1.02, y0 + h * 0.75, c.cx - w, y0 + h * 0.1);
      c.ctx.quadraticCurveTo(c.cx - w * 0.55, y0 + h * 0.12, c.cx, y0);
      c.ctx.closePath();
    };
    shotCam(c, () => {
      c.light(c.cx, c.cy, S * 0.6, "#4D7BFF", 0.6);
      for (let k = 0; k < 4; k++) {
        const ph = ((t - 0.1) / BEAT - k * 0.25);
        const f = ((ph % 1) + 1) % 1;
        if (t < 0.1 + k * BEAT * 0.25) continue;
        shieldPath(lerp(1.05, 2.6, E.out(f)));
        c.ctx.strokeStyle = `rgba(160,200,255,${0.35 * (1 - f)})`;
        c.ctx.lineWidth = 3 + 6 * (1 - f);
        c.ctx.stroke();
      }
      shieldPath(1);
      c.ctx.fillStyle = "rgba(20,60,220,0.55)";
      c.ctx.fill();
      c.ctx.strokeStyle = "rgba(170,210,255,0.55)";
      c.ctx.lineWidth = 3;
      c.ctx.stroke();
      const k = clamp(spring(t - 0.02, SPRING.pop), 0, 1.25);
      const info = c.mediaInfo(p.prop as string);
      const PH = S * 0.42 * k, PW = info && info.w ? (PH * info.w) / info.h : PH;
      c.with({ y: Math.sin(t * 2) * 6 }, () => c.media(p.prop as string, c.cx - PW / 2, c.cy - PH / 2 - S * 0.02, PW, PH, { fit: "contain" }));
      const lu = pr(t, 0.45, 0.9, E.out);
      txt(c, String(p.line), c.cx, c.cy + S * 0.42 + (1 - lu) * 30, { font: "jakarta", size: S * 0.062, weight: 800, color: "#FFFFFF", align: "center", alpha: lu, track: -0.02 });
    }, { k0: 1.02, k1: 1.07 });
    const beam = 1 - pr(t, 0, 0.25, E.out);
    if (beam > 0) {
      const bw = lerp(S * 0.4, S * 0.012, beam);
      c.rect(c.cx - bw / 2, 0, bw, c.H, c.linear(0, 0, 0, c.H, [[0, "rgba(200,245,255,0)"], [0.5, `rgba(235,252,255,${beam})`], [1, "rgba(200,245,255,0)"]]));
      c.rect(0, 0, c.W, c.H, `rgba(220,245,255,${beam * 0.35})`);
    }
  },
});

// ══ 12 · Counter title on white, hard cut to a diagonal staircase of the real caption looks ════════════
const stream = def({
  id: "bloom-card-stream", name: "Bloom · Counter → Diagonal Card Stream",
  theme: LOOK,
  description: "A white title beat where a big number counts up beside its label, then a hard cut to black: a diagonal staircase of cards (the real caption looks) flows up and to the right in 3D, each card turned toward the camera, nearest ones larger.",
  tags: ["counter", "stream", "cards", "3d", "staircase", "looks", "showreel"],
  params: {
    count: P.number(33, "Count to", { min: 1, max: 999, step: 1 }),
    label: P.text("caption looks", "Label", { maxLength: 22 }),
    stills: P.mediaList(LOOK_IDS.map(M.look), "Card images", "image", { min: 4, max: 40 }),
    cutAt: P.number(beats(2), "Cut to stream at (s)", { min: 0.3, max: 5, step: 0.01, unit: "s" }),
    duration: dur(8),
  },
  duration: (p) => p.duration,
  sounds: (p) => {
    const out: SoundCue[] = [];
    const n = 12;
    for (let i = 0; i < n; i++) out.push(cue(0.05 + (i / n) * ((p.cutAt as number) - 0.25), "kenney.tick", 0.22, { seed: i, rate: 1 + i * 0.03, role: "count" }));
    out.push(cue(p.cutAt as number, "fs.impact.hit", 0.4, { role: "cut" }), cue((p.cutAt as number) + 0.05, "whoosh.deep", 0.35, { role: "stream" }));
    return out;
  },
  render(c, p) {
    const t = c.t, S = c.short;
    const cutAt = p.cutAt as number;
    if (t < cutAt) {
      c.clear("#FFFFFF");
      c.light(c.W * 0.85, c.H * 0.2, S * 0.6, "#EEF0FF", 1);
      shotCam(c, () => {
        const n = Math.round(lerp(1, p.count as number, E.out(pr(t, 0.05, cutAt - 0.15))));
        const fs = S * 0.5;
        const nw = tw(String(p.count), "anton", fs, 400, 0);
        const cap = capHeight("anton", fs);
        const ext = Math.round(fs * 0.05);
        const x = c.cx - nw / 2, y = c.cy + cap * 0.35;
        c.setFont("anton", fs, 400, false, 0);
        for (let k = ext; k >= 1; k--) {
          c.ctx.fillStyle = mix("#C9CDD3", "#9097A0", k / ext);
          c.ctx.fillText(String(n), x + k * 0.6, y + k * 0.9);
        }
        c.ctx.fillStyle = c.linear(0, y - cap, 0, y, [[0, "#FFFFFF"], [0.5, "#E6E8EC"], [1, "#B5BAC2"]]);
        c.ctx.fillText(String(n), x, y);
        const lu = pr(t, 0.12, 0.5, E.out);
        txt(c, String(p.label), c.cx, y + S * 0.12 + (1 - lu) * 20, { font: "jakarta", size: S * 0.07, weight: 800, color: INK, align: "center", track: -0.03, alpha: lu });
      }, { k0: 1.0, k1: 1.04 });
      return;
    }
    const lt = t - cutAt;
    c.clear("#020202");
    c.light(c.W * 0.85, c.H * 0.12, S * 0.9, "#2A2440", 0.8);
    c.light(c.W * 0.95, c.H * 0.02, S * 0.5, "#FFFFFF", 0.18);
    const stills = p.stills as string[];
    const cam = c.camera({ fov: 40 });
    const CW = S * 0.64, CH = CW * (240 / 640);
    const flow = lt * 1.9 + 2;
    const cards: { i: number; s: number }[] = [];
    for (let k = -11; k <= 11; k++) {
      const s = Math.floor(flow) + k;
      cards.push({ i: ((s % stills.length) + stills.length) % stills.length, s });
    }
    // far first: further up the diagonal = further away
    cards.sort((a, b) => b.s - a.s);
    for (const { i, s } of cards) {
      const d = s - flow;
      const x = -S * 0.04 + d * S * 0.15, y = S * 0.1 - d * S * 0.2, z = d * S * 0.2;
      cam.layerPlane(CW, CH, (lc) => {
        lc.rrect(0, 0, CW, CH, S * 0.012, CREAM);
        lc.save();
        lc.clipRRect(0, 0, CW, CH, S * 0.012);
        lc.media(stills[i], 0, 0, CW, CH, { fit: "cover" });
        lc.restore();
        lc.rect(0, 0, CW, CH, `rgba(0,0,0,${clamp(d * 0.08)})`);
      }, { x, y, z, ry: -34, rx: 6, rz: -4, res: 0.9, alpha: clamp(1.4 - Math.abs(d) / 9) * pr(lt, 0, 0.12) });
    }
  },
});

// ══ 13 · Glass icon row; a bubble lands and opens into a glass card with a portrait ═════════════════════
const glassPortrait = def({
  id: "bloom-glass-portrait", name: "Bloom · Glass Icons → Portrait Card",
  theme: LOOK_LIGHT,
  description: "On white with a blue-violet light streak, a row of glass app icons slides past; a glass bubble drops into the centre and opens into a rounded glass card holding a portrait, while a short line rises under it.",
  tags: ["glass", "icons", "portrait", "bubble", "light", "showreel"],
  params: {
    portrait: P.media(M.me, "Portrait", "image"),
    line: P.text("Free and open source.", "Line", { maxLength: 30 }),
    duration: dur(5),
  },
  duration: (p) => p.duration,
  sounds: () => [cue(0, "whoosh.air", 0.35, { role: "row" }), cue(0.42, "fs.ui.bubble-pop", 0.45, { role: "bubble" }), cue(0.62, "kenney.expand", 0.35, { role: "open" }), cue(1.0, "tonal.notify", 0.18, { role: "line" })],
  render(c, p) {
    const t = c.t, S = c.short;
    c.clear("#FFFFFF");
    c.with({}, () => {
      c.sweep(c.cx + Math.sin(t * 0.6) * 40, -38, S * 0.5, "#7C8CFF", 0.45);
      c.sweep(c.cx + S * 0.15, -38, S * 0.18, "#B07CFF", 0.35);
      c.sweep(c.cx - S * 0.25, -38, S * 0.12, "#5AA8FF", 0.3);
    });
    c.rect(0, 0, c.W, c.H, "rgba(255,255,255,0.35)");
    const tints: [string, string, string][] = [["#C9B8FF", "#8E7CFF", "cc"], ["#A9D2FF", "#4D8DFF", "mic"], ["#FFB3CF", "#F2557F", "play"], ["#B8C6FF", "#6B7FFF", "clock"], ["#FFE1A8", "#FFB547", "download"], ["#C4F5E0", "#34D399", "code"]];
    const IS = S * 0.2, gap = IS * 1.35;
    const open = pr(t, 0.6, 1.1, E.inOut);
    shotCam(c, () => {
      const off = t * S * 0.32;
      for (let i = -3; i < 10; i++) {
        const x = c.cx + i * gap - off + gap * 2;
        if (x < -IS || x > c.W + IS) continue;
        const dc = Math.abs(x - c.cx) / (c.W * 0.5);
        const [lt, dk, g] = tints[((i % tints.length) + tints.length) % tints.length];
        const sc = lerp(1.08, 0.82, clamp(dc)) * (1 - open * 0.15 * (1 - clamp(dc)));
        const blur = clamp(dc) * 6 + open * 4;
        soft(c, x - IS * sc / 2 - 20, c.cy - IS * sc / 2 - 20, IS * sc + 40, IS * sc + 40, blur, 1 - open * 0.35, (lc) => {
          const s = IS * sc, r = s * 0.28;
          lc.save();
          lc.shadow(alpha(dk, 0.35), 30, 0, 14);
          lc.rrect(20, 20, s, s, r, lc.linear(20, 20, 20 + s, 20 + s, [[0, lt], [1, dk]]));
          lc.restore();
          lc.rrect(20 + s * 0.06, 20 + s * 0.05, s * 0.88, s * 0.45, r * 0.8, "rgba(255,255,255,0.35)");
          lc.strokeRRect(20.5, 20.5, s - 1, s - 1, r, "rgba(255,255,255,0.8)", 1.5);
          glyph(lc, g, 20 + s / 2, 20 + s / 2, s * 0.5, "#FFFFFF");
        });
      }
      // bubble → card
      const drop = pr(t, 0.25, 0.6, E.out);
      if (drop > 0) {
        const bub = S * 0.26;
        const CW = lerp(bub, S * 0.56, open), CH = lerp(bub, S * 0.7, open), r = lerp(bub / 2, S * 0.07, open);
        const cy = lerp(c.cy - S * 0.5, c.cy - S * 0.02, drop);
        c.cardShadow(c.cx - CW / 2, cy - CH / 2, CW, CH, r, 0.6, 0.9, "#2A2470");
        c.save();
        c.clipRRect(c.cx - CW / 2, cy - CH / 2, CW, CH, r);
        c.rect(c.cx - CW / 2, cy - CH / 2, CW, CH, c.linear(0, cy - CH / 2, 0, cy + CH / 2, [[0, "#DCE6FF"], [1, "#B9C8FF"]]));
        c.media(p.portrait as string, c.cx - CW / 2, cy - CH / 2, CW, CH, { fit: "cover", focus: [0.5, 0.25] });
        c.rect(c.cx - CW / 2, cy - CH / 2, CW, CH, c.radial(c.cx - CW * 0.25, cy - CH * 0.3, CW * 0.7, [[0, "rgba(255,255,255,0.35)"], [0.5, "rgba(255,255,255,0)"]]));
        c.restore();
        c.strokeRRect(c.cx - CW / 2, cy - CH / 2, CW, CH, r, "rgba(255,255,255,0.9)", 4);
        c.strokeRRect(c.cx - CW / 2 + 6, cy - CH / 2 + 6, CW - 12, CH - 12, Math.max(0, r - 6), "rgba(140,150,255,0.35)", 1.5);
        const lu = pr(t, 1.0, 1.45, E.out);
        txt(c, String(p.line), c.cx, cy + CH / 2 + S * 0.11 + (1 - lu) * 24, { font: "jakarta", size: S * 0.055, weight: 800, color: "#1C1A3A", align: "center", alpha: lu, track: -0.02 });
      }
    }, { k0: 1.0, k1: 1.05 });
  },
});

// ══ 14 · Glass feature cards, each with its own colour bloom, panning ═════════════════════════════════
const glowCards = def({
  id: "bloom-glow-cards", name: "Bloom · Glass Feature Cards",
  theme: LOOK,
  description: "Dark frame with fine dust: four glass feature cards (glowing icon, title, sub-line), each carrying its own colour bloom, stagger in and pan slowly through the frame.",
  tags: ["cards", "features", "glass", "glow", "dark", "showreel"],
  params: {
    cards: P.list(["Whisper|On your machine", "33 looks|One click each", "MP4|Right in the browser", "$0|Free, open source"], "Cards (title|sub-line)", { min: 2, max: 5, maxLength: 36 }),
    duration: dur(4),
  },
  duration: (p) => p.duration,
  sounds: (p) => (p.cards as string[]).map((_, i) => cue(0.02 + i * 0.1, "fs.ui.pop-4", 0.22, { seed: i, rate: 1 + i * 0.05, role: "card" })),
  render(c, p) {
    const t = c.t, S = c.short;
    c.clear("#030406");
    dust(c, 50, 21, "#FFFFFF", 0.35, 10);
    const cards = (p.cards as string[]).map((s) => s.split("|"));
    const tones = [GREEN, ORANGE, VIOLET, BLUE, "#F43F5E"];
    const glyphs = ["mic", "cc", "download", "code", "lock"];
    const CW = S * 0.8, CH = S * 0.26, gap = S * 0.05;
    const total = cards.length * CH + (cards.length - 1) * gap;
    const pan = lerp(S * 0.12, -S * 0.12, glide(c.p));
    cards.forEach(([title, sub], i) => {
      const a = pr(t, 0.02 + i * 0.1, 0.42 + i * 0.1, E.out);
      if (a <= 0) return;
      const x = c.cx - CW / 2 + (i % 2 ? 1 : -1) * S * 0.03, y = c.cy - total / 2 + i * (CH + gap) + pan + (1 - a) * S * 0.08;
      const tone = tones[i % tones.length];
      c.with({ alpha: a }, () => {
        c.light(x + CW * 0.2, y + CH * 0.5, CH * 1.3, tone, 0.45);
        c.rrect(x, y, CW, CH, S * 0.04, "rgba(16,18,24,0.72)");
        c.rrect(x, y, CW, CH, S * 0.04, c.linear(x, y, x, y + CH, [[0, "rgba(255,255,255,0.07)"], [1, "rgba(255,255,255,0.01)"]]));
        c.strokeRRect(x + 0.5, y + 0.5, CW - 1, CH - 1, S * 0.04, "rgba(255,255,255,0.1)", 1.5);
        const ix = x + CH * 0.5, iy = y + CH * 0.5;
        c.light(ix, iy, CH * 0.45, tone, 0.8);
        c.circle(ix, iy, CH * 0.2, c.radial(ix - CH * 0.05, iy - CH * 0.05, CH * 0.25, [[0, "#FFFFFF"], [0.35, mix(tone, "#FFFFFF", 0.4)], [1, tone]]));
        glyph(c, glyphs[i % glyphs.length], ix, iy, CH * 0.2, "#0A0A0A");
        txt(c, title ?? "", x + CH * 0.98, y + CH * 0.47, { font: "jakarta", size: S * 0.06, weight: 800, color: "#FFFFFF", track: -0.02 });
        txt(c, sub ?? "", x + CH * 0.98, y + CH * 0.74, { font: "jakarta", size: S * 0.034, weight: 500, color: "rgba(255,255,255,0.55)" });
      });
    });
  },
});

// ══ 15 · Flat top-down desk: props pop in staggered, then a striped cloth wipes the frame ═══════════════
const desk = def({
  id: "bloom-flat-desk", name: "Bloom · Flat Top-Down Desk Pops",
  theme: LOOK_LIGHT,
  description: "A warm, flat, top-down illustration built in code: a laptop showing a caption look, a phone playing a captioned clip, a coffee, a notebook and pencil, headphones, a sticky note and caption chips pop onto a striped tablecloth one after another with a little overshoot; on the last beat a lavender cloth sweeps diagonally across the frame.",
  tags: ["flat", "illustration", "top-down", "pop", "stagger", "warm", "wipe", "showreel"],
  params: {
    screen: P.media(M.look("karaoke_fill"), "Laptop screen", "image"),
    phone: P.media(M.hero("mckensie"), "Phone clip", "video"),
    note: P.text("Stop timing captions.", "Sticky note", { maxLength: 26 }),
    chips: P.list(["every", "word", "timed"], "Caption chips", { max: 4, maxLength: 10 }),
    duration: dur(7),
  },
  duration: (p) => p.duration,
  sounds: (p) => {
    const out: SoundCue[] = [];
    for (let i = 0; i < 9; i++) out.push(cue(0.05 + i * 0.13, i % 3 === 2 ? "fs.ui.pop-4" : "kenney.drop", 0.3, { seed: i, rate: 0.95 + (i % 4) * 0.06, role: "pop" }));
    out.push(cue((p.duration as number) - 0.6, "fs.foley.fh-paper-swipe-surface2-shor", 0.5, { role: "cloth" }), cue((p.duration as number) - 0.55, "whoosh.air", 0.4, { role: "cloth" }));
    return out;
  },
  render(c, p) {
    const t = c.t, S = c.short, D = c.dur;
    c.clear("#FFE5C4");
    shotCam(c, () => {
      // striped tablecloth across the lower-left
      c.with({ x: c.cx, y: c.cy, rotate: -32 }, () => {
        c.rect(-c.long, S * 0.25, c.long * 2, c.long, "#7EC8B8");
        for (let i = 0; i < 40; i++) c.rect(-c.long + i * S * 0.08, S * 0.25, S * 0.03, c.long, "rgba(255,255,255,0.28)");
        c.rect(-c.long, -c.long - S * 0.35, c.long * 2, c.long, "#F6B661");
        for (let i = 0; i < 80; i++) c.rect(-c.long, -S * 0.35 - i * S * 0.022, c.long * 2, S * 0.008, "rgba(160,90,20,0.18)");
      });
      const pop = (i: number, x: number, y: number, rot: number, draw: () => void) => {
        const k = clamp(spring(t - (0.05 + i * 0.13), SPRING.pop), 0, 1.3);
        if (k < 0.01) return;
        c.with({ x, y, scale: k, rotate: rot + (1 - Math.min(1, k)) * -25 }, () => {
          c.save();
          c.shadow("rgba(90,50,10,0.25)", 0, S * 0.012, S * 0.016);
          draw();
          c.restore();
        });
      };
      const U = S;
      // laptop
      pop(0, c.cx - U * 0.04, c.cy - U * 0.1, -6, () => {
        const w = U * 0.62, h = U * 0.4;
        c.rrect(-w / 2, -h, w, h, U * 0.025, "#2B2B31");
        c.noShadow();
        c.rrect(-w / 2 + U * 0.02, -h + U * 0.02, w - U * 0.04, h - U * 0.04, U * 0.012, "#FFFFEB");
        c.media(p.screen as string, -w / 2 + U * 0.03, -h + U * 0.06, w - U * 0.06, h - U * 0.12, { fit: "contain" });
        c.rrect(-w / 2 - U * 0.03, 0, w + U * 0.06, h * 0.75, U * 0.025, "#C9CCD4");
        for (let r = 0; r < 4; r++) for (let k = 0; k < 11; k++) c.rrect(-w / 2 + U * 0.02 + k * (w - U * 0.04) / 11, U * 0.03 + r * U * 0.045, (w - U * 0.04) / 11 - U * 0.008, U * 0.035, U * 0.006, "#A9ADB8");
        c.rrect(-U * 0.09, h * 0.52, U * 0.18, U * 0.06, U * 0.01, "#B4B8C2");
      });
      // phone
      pop(1, c.cx + U * 0.3, c.cy + U * 0.36, 10, () => {
        const w = U * 0.21, h = w * 2.05;
        c.rrect(-w / 2, -h / 2, w, h, w * 0.16, "#15161A");
        c.noShadow();
        c.save();
        c.clipRRect(-w / 2 + U * 0.008, -h / 2 + U * 0.008, w - U * 0.016, h - U * 0.016, w * 0.13);
        c.media(p.phone as string, -w / 2, -h / 2, w, h, { fit: "cover", t });
        c.restore();
      });
      // coffee
      pop(2, c.cx - U * 0.32, c.cy - U * 0.58, 0, () => {
        c.circle(0, 0, U * 0.11, "#FFFFFF");
        c.noShadow();
        c.circle(0, 0, U * 0.075, "#EDEDED");
        c.circle(0, 0, U * 0.062, c.radial(-U * 0.015, -U * 0.015, U * 0.07, [[0, "#C98B5A"], [1, "#6B3B1F"]]));
        c.circle(-U * 0.012, -U * 0.012, U * 0.022, "rgba(255,240,220,0.6)");
        c.rrect(U * 0.07, -U * 0.02, U * 0.06, U * 0.04, U * 0.02, "#FFFFFF");
      });
      // notebook + pencil
      pop(3, c.cx - U * 0.3, c.cy + U * 0.42, -14, () => {
        c.rrect(-U * 0.15, -U * 0.2, U * 0.3, U * 0.4, U * 0.02, "#C9A8F5");
        c.noShadow();
        c.rrect(-U * 0.13, -U * 0.18, U * 0.26, U * 0.36, U * 0.012, "#FFFFFF");
        for (let i = 0; i < 7; i++) c.rect(-U * 0.11, -U * 0.13 + i * U * 0.045, U * 0.22, 2, "#D9CFF0");
      });
      pop(4, c.cx - U * 0.1, c.cy + U * 0.55, 38, () => {
        c.rrect(-U * 0.16, -U * 0.013, U * 0.27, U * 0.026, U * 0.006, ORANGE);
        c.poly([[U * 0.11, -U * 0.013], [U * 0.16, 0], [U * 0.11, U * 0.013]], "#F5D6AE");
        c.rect(-U * 0.17, -U * 0.013, U * 0.03, U * 0.026, "#F28AA8");
      });
      // headphones
      pop(5, c.cx + U * 0.32, c.cy - U * 0.55, 20, () => {
        c.arc(0, U * 0.02, U * 0.12, 0.72, 1.28, "#1F2A2A", U * 0.03);
        c.noShadow();
        c.rrect(-U * 0.15, U * 0.01, U * 0.07, U * 0.1, U * 0.03, GREEN);
        c.rrect(U * 0.08, U * 0.01, U * 0.07, U * 0.1, U * 0.03, GREEN);
      });
      // sticky note
      pop(6, c.cx + U * 0.25, c.cy - U * 0.28, 7, () => {
        c.rect(-U * 0.15, -U * 0.12, U * 0.3, U * 0.24, "#FFE77A");
        c.noShadow();
        c.rect(-U * 0.15, -U * 0.12, U * 0.3, U * 0.03, "rgba(0,0,0,0.05)");
        const words = String(p.note).split(" ");
        const half = Math.ceil(words.length / 2);
        txt(c, words.slice(0, half).join(" "), 0, -U * 0.01, { font: "pacifico", size: U * 0.032, color: INK, align: "center" });
        txt(c, words.slice(half).join(" "), 0, U * 0.05, { font: "pacifico", size: U * 0.032, color: INK, align: "center" });
      });
      // caption chips
      (p.chips as string[]).forEach((w, i) => pop(7 + i, c.cx - U * 0.36 + i * U * 0.2, c.cy + U * 0.17 + (i % 2) * U * 0.05, (i - 1) * 6, () => {
        const fs = U * 0.04, cw = tw(w, "jakarta", fs, 800, 0) + fs * 1.1;
        c.rrect(-cw / 2, -fs * 0.9, cw, fs * 1.8, fs * 0.4, i === (p.chips as string[]).length - 1 ? GREEN : INK);
        c.noShadow();
        txt(c, w, 0, fs * 0.35, { font: "jakarta", size: fs, weight: 800, color: "#FFFFFF", align: "center" });
      }));
    }, { k0: 1.0, k1: 1.06, rot: 3 });
    // lavender cloth wipe
    const w = pr(t, D - 0.6, D, E.in);
    if (w > 0) {
      c.with({ x: c.cx, y: c.cy, rotate: -32 }, () => {
        const y = lerp(c.long * 0.9, -c.long * 0.05, w);
        c.rect(-c.long, y, c.long * 2, c.long * 1.5, LAV);
        for (let i = 0; i < 50; i++) c.rect(-c.long + i * S * 0.07, y, S * 0.025, c.long * 1.5, "rgba(139,92,246,0.12)");
        c.rect(-c.long, y, c.long * 2, S * 0.03, "rgba(80,40,140,0.15)");
      });
    }
  },
});

// ══ 16 · A prop swinging on a chain in a soft sky, inside a torn-paper frame ════════════════════════════
const pendulum = def({
  id: "bloom-pendulum", name: "Bloom · Pendulum in the Sky",
  theme: LOOK_LIGHT,
  description: "A soft lavender sky with drifting clouds and a sun, framed by a torn white paper edge: a 3D stopwatch drops in on a chain and swings like a pendulum (one swing per beat), and a two-line message rises under it.",
  tags: ["pendulum", "swing", "clock", "sky", "torn paper", "flat", "showreel"],
  params: {
    prop: P.media(M.watch, "Swinging prop", "image"),
    top: P.text("Stop timing", "Line 1", { maxLength: 20 }),
    line2: P.text("captions.", "Line 2 (script)", { maxLength: 20 }),
    duration: dur(5),
  },
  duration: (p) => p.duration,
  sounds: (p) => [cue(0.02, "fs.foley.fh-paper-swipe-surface2-shor", 0.3, { role: "paper" }), cue(0.1, "foley.shutter", 0.12, { role: "chain" }), ...Array.from({ length: Math.floor((p.duration as number) / BEAT) }, (_, i) => cue(0.3 + i * BEAT, "kenney.tick", 0.3, { seed: i, rate: i % 2 ? 1.12 : 1, role: "tick" }))],
  render(c, p) {
    const t = c.t, S = c.short;
    vgrad(c, [[0, "#E9D5FF"], [0.6, "#F4E9FF"], [1, "#FFF6E8"]]);
    c.light(c.W * 0.78, c.H * 0.3, S * 0.35, "#FFF2B8", 0.9);
    c.circle(c.W * 0.78, c.H * 0.3, S * 0.07, "#FFE58A");
    const cloud = (x: number, y: number, s: number, a = 1) => c.with({ x, y, scale: s, alpha: a }, () => {
      c.save();
      c.shadow("rgba(120,80,170,0.15)", 30, 0, 10);
      for (const [cx, cy, r] of [[-60, 10, 50], [0, -20, 70], [70, 0, 55], [130, 20, 40], [-110, 25, 35]] as const) c.circle(cx, cy, r, "#FFFFFF");
      c.restore();
      c.rect(-145, 20, 290, 40, "#FFFFFF");
    });
    shotCam(c, () => {
      cloud(c.W * 0.2 + t * 18, c.H * 0.22, S / 1080 * 1.1, 0.9);
      cloud(c.W * 0.85 - t * 12, c.H * 0.55, S / 1080 * 0.8, 0.8);
      cloud(c.W * 0.1 - t * 8, c.H * 0.7, S / 1080 * 1.3, 0.95);
      // pendulum: pivot above the frame; drops in on a spring, then swings one arc per beat
      const drop = spring(t - 0.02, SPRING.punchy);
      const len = S * 0.62 * drop;
      const ang = (Math.sin(((t - 0.3) * Math.PI) / BEAT) * 16 + 4 * (1 - Math.min(1, t * 2))) * Math.PI / 180;
      const px = c.cx, py = c.cy - S * 0.75;
      const bx = px + Math.sin(ang) * len, by = py + Math.cos(ang) * len;
      const lk = S * 0.026, links = Math.max(1, Math.floor(len / (lk * 0.8)));
      for (let i = 0; i < links; i++) {
        const u = (i + 0.5) / links;
        const flat = i % 2 === 1;
        c.with({ x: lerp(px, bx, u), y: lerp(py, by, u), rotate: (ang * -180) / Math.PI }, () => {
          if (flat) c.rrect(-lk * 0.08, -lk * 0.5, lk * 0.16, lk, lk * 0.08, "#9C7A26");
          else c.strokeRRect(-lk * 0.28, -lk * 0.5, lk * 0.56, lk, lk * 0.28, c.linear(-lk * 0.3, 0, lk * 0.3, 0, [[0, "#E9CF7A"], [1, "#9C7A26"]]), lk * 0.13);
        });
      }
      const info = c.mediaInfo(p.prop as string);
      const PH = S * 0.42, PW = info && info.w ? (PH * info.w) / info.h : PH * 0.8;
      c.with({ x: bx, y: by + PH * 0.42, rotate: (ang * -180) / Math.PI }, () => {
        c.save();
        c.shadow("rgba(90,50,140,0.3)", 40, 0, 20);
        c.media(p.prop as string, -PW / 2, -PH * 0.48, PW, PH, { fit: "contain" });
        c.restore();
      });
      const lu = pr(t, 0.4, 0.9, E.out);
      const y = c.cy + S * 0.52;
      txt(c, String(p.top), c.cx, y + (1 - lu) * 30, { font: "jakarta", size: S * 0.085, weight: 800, color: "#2A1446", align: "center", track: -0.03, alpha: lu });
      const l2 = pr(t, 0.6, 1.1, E.out);
      txt(c, String(p.line2), c.cx, y + S * 0.13 + (1 - l2) * 30, { font: "pacifico", size: S * 0.095, color: VIOLET, align: "center", alpha: l2 });
    }, { k0: 1.0, k1: 1.05 });
    // torn-paper frame
    const m = S * 0.045;
    c.save();
    c.ctx.beginPath();
    c.ctx.rect(-10, -10, c.W + 20, c.H + 20);
    const edge: [number, number][] = [];
    const n = 120, per = 2 * (c.W + c.H);
    for (let i = 0; i < n; i++) {
      const d = (i / n) * per;
      const j = (rand(i * 7 + 3) - 0.5) * m * 0.5 + noise1(i * 0.3, 4) * m * 0.3;
      if (d < c.W) edge.push([d, m + j]);
      else if (d < c.W + c.H) edge.push([c.W - m - j, d - c.W]);
      else if (d < 2 * c.W + c.H) edge.push([c.W - (d - c.W - c.H), c.H - m - j]);
      else edge.push([m + j, c.H - (d - 2 * c.W - c.H)]);
    }
    c.ctx.moveTo(edge[0][0], edge[0][1]);
    for (const [x, y] of edge) c.ctx.lineTo(x, y);
    c.ctx.closePath();
    c.shadow("rgba(60,30,90,0.25)", 14, 0, 0);
    c.ctx.fillStyle = "#FFFFFF";
    c.ctx.fill("evenodd");
    c.restore();
  },
});

// ══ 17 · Nested arches on deep green: fly back out through them; words enter with a stretch stroke ══════
const arches = def({
  id: "bloom-arch-type", name: "Bloom · Arches + Stretch Type",
  theme: LOOK,
  description: "Deep green: the camera flies backward out through nested golden arches; then short words enter one per beat, each led by a stroke that stretches out from the word and settles under it (the calligraphic kashida, in Latin type).",
  tags: ["arches", "fly through", "kinetic type", "stretch", "steps", "showreel"],
  params: {
    words: P.list(["Upload.", "Transcribe.", "Style.", "Post."], "Words", { min: 2, max: 5, maxLength: 14 }),
    duration: dur(6),
  },
  duration: (p) => p.duration,
  sounds: (p) => [cue(0, "whoosh.deep", 0.5, { role: "fly" }), ...(p.words as string[]).map((_, i) => cue(0.55 + i * BEAT, "whoosh.swipe", 0.3, { seed: i, role: "word" })), cue(0.55 + ((p.words as string[]).length - 1) * BEAT + 0.15, "fs.tonal.chime-ping", 0.25, { role: "last" })],
  render(c, p) {
    const t = c.t, S = c.short;
    c.clear(DEEP);
    c.light(c.cx, c.cy + S * 0.4, S * 1.1, "#0B6E5F", 0.8);
    const fly = pr(t, 0, 0.9, E.out);
    const k = logLerp(7, 1, fly);
    const ax = c.cx, ay = c.cy + S * 0.8;
    const arch = (w: number, h: number, col: string, lw: number) => {
      c.ctx.beginPath();
      c.ctx.moveTo(-w / 2, 0);
      c.ctx.lineTo(-w / 2, -h + w * 0.55);
      c.ctx.bezierCurveTo(-w / 2, -h + w * 0.12, -w * 0.12, -h + w * 0.02, 0, -h - w * 0.08);
      c.ctx.bezierCurveTo(w * 0.12, -h + w * 0.02, w / 2, -h + w * 0.12, w / 2, -h + w * 0.55);
      c.ctx.lineTo(w / 2, 0);
      c.ctx.strokeStyle = col;
      c.ctx.lineWidth = lw;
      c.ctx.lineJoin = "round";
      c.ctx.stroke();
    };
    c.with({ x: ax, y: ay - (k - 1) * S * 0.12, scale: k }, () => {
      for (let i = 6; i >= 0; i--) {
        const s = Math.pow(0.78, i);
        c.with({ y: -i * S * 0.015, scale: s }, () => {
          arch(S * 0.56, S * 0.86, mix(ORANGE, "#7A4A12", i / 8), S * 0.042);
          arch(S * 0.56, S * 0.86, alpha("#FFE2B0", 0.5), S * 0.008);
        });
      }
      c.rrect(-S * 0.42, -S * 0.005, S * 0.84, S * 0.04, S * 0.01, "#E8962E");
    });
    const words = p.words as string[];
    const fs = S * 0.105;
    words.forEach((w, i) => {
      const at = 0.55 + i * BEAT;
      const u = pr(t, at, at + 0.45, E.out);
      if (u <= 0) return;
      const y = c.H * 0.17 + fs + i * fs * 1.25;
      const x = S * 0.09;
      const ww = tw(w, "jakarta", fs, 800, -0.02);
      const last = i === words.length - 1;
      // the stroke shoots out to the right edge, then pulls back to sit under the word
      const out = pr(t, at, at + 0.22, E.out), back = pr(t, at + 0.2, at + 0.6, E.inOut);
      const x1 = lerp(x, c.W - S * 0.08, out), x2 = lerp(x1, x + ww, back);
      c.rrect(x, y + fs * 0.18, Math.max(0, x2 - x), fs * 0.07, fs * 0.035, last ? ORANGE : alpha(CREAM, 0.6));
      const track = lerp(0.35, -0.02, u);
      txt(c, w, x, y, { font: "jakarta", size: fs, weight: 800, color: last ? ORANGE : CREAM, track, alpha: pr(u, 0, 0.35) });
    });
  },
});

// ══ 18 · Pixel-built title, a mosaic image resolving to sharp, then an info card typing in ═════════════
const pixelCard = def({
  id: "bloom-pixel-card", name: "Bloom · Pixel Title + Mosaic → Info Card",
  theme: LOOK_LIGHT,
  description: "Pale blue: a title builds from square blocks; an image card arrives as a coarse mosaic and resolves to sharp in steps, then settles as an info card whose labelled rows type in beneath it.",
  tags: ["pixel", "mosaic", "depixelate", "info card", "spec sheet", "light", "showreel"],
  params: {
    title: P.text("CaptionsEasy · Studio", "Title", { maxLength: 30 }),
    image: P.media(M.hero("sam"), "Image / clip", "any"),
    rows: P.list(["Engine|Whisper, on your machine", "Looks|33 caption looks", "Export|MP4, in the browser", "Price|Free and open source"], "Rows (label|value)", { min: 1, max: 5, maxLength: 44 }),
    duration: dur(7),
  },
  duration: (p) => p.duration,
  sounds: (p) => {
    const out: SoundCue[] = [cue(0, "fs.fx.gritch-glitch-snippets-fx-pe", 0.25, { role: "build" })];
    for (let i = 0; i < 5; i++) out.push(cue(0.65 + i * 0.1, "kenney.tick", 0.3, { rate: 1 + i * 0.1, role: "resolve" }));
    (p.rows as string[]).forEach((_, i) => out.push(cue(1.45 + i * 0.22, "kenney.select", 0.25, { role: "row" })));
    return out;
  },
  render(c, p) {
    const t = c.t, S = c.short;
    c.clear("#EAF3FD");
    dots(c, S * 0.05, "#7AA7E6", 0.18, 2);
    shotCam(c, () => {
      // title from blocks
      const title = String(p.title);
      const fs = S * 0.06;
      const tw0 = tw(title, "jakarta", fs, 600, -0.01);
      const tx = c.cx - tw0 / 2, ty = c.cy - S * 0.55;
      const cell = fs * 0.36;
      const cols = Math.ceil(tw0 / cell) + 1, rows = Math.ceil((fs * 1.2) / cell) + 1;
      const build = pr(t, 0.05, 0.6);
      const Lt = c.layer(tw0 + cell, fs * 1.4, (lc) => {
        txt(lc, title, 0, fs * 1.05, { font: "jakarta", size: fs, weight: 600, color: "#2C4A6E", track: -0.01 });
        lc.ctx.globalCompositeOperation = "destination-in";
        lc.ctx.beginPath();
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (rand(i * 31 + j * 7) * 0.7 + (i / cols) * 0.3 < build) lc.ctx.rect(i * cell, j * cell, cell + 0.5, cell + 0.5);
        lc.ctx.fillStyle = "#000";
        lc.ctx.fill();
        lc.ctx.globalCompositeOperation = "source-over";
      });
      c.drawLayer(Lt, tx, ty - fs * 1.05);
      for (let i = 0; i < 9; i++) {
        const at = 0.05 + rand(i * 5) * 0.5;
        const a = pr(t, at, at + 0.05) * (1 - pr(t, at + 0.15, at + 0.3));
        if (a > 0) c.rect(tx + rand(i * 9) * tw0, ty - fs * (0.2 + rand(i * 3) * 0.9), cell * 1.6, cell * 1.6, alpha(i % 3 ? "#5B9BF0" : "#A8D1FF", a));
      }
      // mosaic image → sharp, then it shrinks up into the card
      const iu = pr(t, 0.3, 0.55, E.out);
      if (iu > 0) {
        const settle = pr(t, 1.15, 1.6, E.inOut);
        const IW = lerp(S * 0.92, S * 0.84, settle), IH = IW * 0.72;
        const ix = c.cx - IW / 2, iy = lerp(c.cy - S * 0.4, c.cy - S * 0.44, settle);
        const steps = [64, 32, 16, 8, 4, 1];
        const si = Math.min(steps.length - 1, Math.floor(pr(t, 0.6, 1.15) * steps.length));
        const px = steps[si];
        c.with({ alpha: iu }, () => {
          c.cardShadow(ix, iy, IW, IH, S * 0.02, 0.4, 0.6, "#1D3557");
          c.save();
          c.clipRRect(ix, iy, IW, IH, S * 0.02);
          if (px > 1) {
            const n = Math.max(2, Math.round(IW / (px * 1.6)));
            const Lm = c.layer(IW, IH, (lc) => lc.media(p.image as string, 0, 0, IW, IH, { fit: "cover", t: 1.2, focus: [0.5, 0.35] }), { res: n / (IW * c.s) });
            const prev = c.ctx.imageSmoothingEnabled;
            c.ctx.imageSmoothingEnabled = false;
            c.drawLayer(Lm, ix, iy);
            c.ctx.imageSmoothingEnabled = prev;
          } else c.media(p.image as string, ix, iy, IW, IH, { fit: "cover", t: 1.2 + Math.max(0, t - 1.15), focus: [0.5, 0.35] });
          c.restore();
        });
        // info rows
        const rows = (p.rows as string[]).map((r) => r.split("|"));
        const ry = iy + IH + S * 0.1;
        rows.forEach(([label, value], i) => {
          const at = 1.45 + i * 0.22;
          const y = ry + i * S * 0.1;
          const a = pr(t, at, at + 0.2);
          if (a <= 0) return;
          txt(c, `${label}:`, ix, y, { font: "mono", size: S * 0.036, weight: 600, color: "#2E6BFF", alpha: a });
          const vs = (value ?? "").slice(0, Math.floor(Math.max(0, t - at) * 45));
          txt(c, vs, ix + S * 0.22, y, { font: "jakarta", size: S * 0.043, weight: 700, color: "#14243A" });
        });
        c.rect(ix - S * 0.035, iy + IH * 0.5 - S * 0.01, S * 0.02, S * 0.02, alpha("#4C7FD0", pr(t, 1.6, 1.8)));
      }
    }, { k0: 1.0, k1: 1.04 });
  },
});

// ── template: CaptionsEasy · Showreel 2026 (9:16), on the beat of "Realizer" (125 BPM) ─────────────────
const T = (component: string, n: number, props: Record<string, unknown> = {}, transition?: "pixel" | "flash" | "cut") => ({ component, n, props, transition });
const PLAN = [
  T("bloom-bookend", 9, { lead: 0 }),
  T("bloom-keycap-ring", 6, {}, "pixel"),
  T("bloom-pill-menu", 8, {}, "flash"),
  T("bloom-highlight-headline", 5),
  T("bloom-neon-orbit", 8),
  T("bloom-chrome-word", 5),
  T("bloom-rim-dashboard", 7),
  T("bloom-card-carousel", 6),
  T("bloom-icon-menu", 5),
  T("bloom-phone-pop", 6),
  T("bloom-shield-pulse", 4),
  T("bloom-card-stream", 8),
  T("bloom-glass-portrait", 5),
  T("bloom-glow-cards", 4),
  T("bloom-flat-desk", 7),
  T("bloom-pendulum", 5),
  T("bloom-arch-type", 6, {}, "flash"),
  T("bloom-pixel-card", 7),
  T("bloom-bookend", 14, {
    word: "START", script: "posting.", pill: "Free", line1: "captionseasy.com", line2: "Stop timing captions.", lead: beats(1), fadeOut: 0.9,
    credits: ["CaptionsEasy © 2026", "Music: \"Realizer\" by Kevin MacLeod (incompetech.com), CC BY 4.0", "Footage: Wikitongues via Wikimedia Commons, CC BY / CC BY-SA"],
  }, "pixel"),
];
const PIXEL = 0.32, FLASH = 0.3;
/** Durations so every cut (or the middle of every pixel dissolve) lands on a beat. */
const template: PostSpec = {
  id: "kit-bloom-reel",
  title: "CaptionsEasy — Showreel 2026 (bloom reel, 9:16)",
  format: "vertical",
  fps: 60,
  clips: PLAN.map((s, i) => {
    const len = (tr?: string) => (tr === "pixel" ? PIXEL : tr === "flash" ? FLASH : 0);
    const tin = len(s.transition), tout = len(PLAN[i + 1]?.transition);
    return { component: s.component, props: { ...s.props, duration: +(beats(s.n) + tin / 2 + tout / 2).toFixed(4) }, ...(tin ? { transition: { type: s.transition as "pixel" | "flash", duration: tin } } : {}) };
  }),
  music: { src: "media/music/library/realizer.mp3", gain: 0.62, offset: 0.453, fadeIn: 0.05, fadeOut: 1.2, credit: "\"Realizer\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Backtracked from a 2026 motion-design showreel (docs/reference/showreel-nour-aldin.md) and rebuilt for CaptionsEasy at 9:16: bookends, one bloom per dark shot, dark/light alternation, cuts on the beat of a 125 BPM bed. Facts from BRIEF.md only. Footage: Wikitongues via Wikimedia Commons (CC BY 3.0 / CC BY-SA 4.0).",
};

export const bloomReelKit: Kit = {
  id: "bloom-reel",
  promptId: "",
  title: "Bloom reel (showreel 2026)",
  family: "showreel",
  format: "vertical",
  summary: "A motion designer's showreel structure rebuilt as components: a metal-and-script bookend lockup under a turning green crescent bloom, then one fast snippet per beat-group, alternating dark shots (one big colour bloom each) and light shots (one colour streak), joined by pixel-block dissolves, white flashes, morphs and object wipes, closing on the bookend again. The template tells CaptionsEasy's verified story at 9:16 with the real logo, caption looks, footage and props.",
  shots: [
    { at: 0, shot: "Bookend: heavy metal word slams in letter by letter, script word writes on, year pill, two lines type on", component: "bloom-bookend" },
    { at: 4.4, shot: "Glass keycap tumbling with text orbiting on a tilted ring", component: "bloom-keycap-ring" },
    { at: 7.4, shot: "Glass pill: typed word, cursor click, backspace; morph to app icon + vertical menu", component: "bloom-pill-menu" },
    { at: 11.0, shot: "Light headline with highlighter bar and a 3D object", component: "bloom-highlight-headline" },
    { at: 13.5, shot: "Neon object with orbiting keywords, white flash, title pops in", component: "bloom-neon-orbit" },
    { at: 16.5, shot: "Chrome extruded wordmark over a gold/green horizon", component: "bloom-chrome-word" },
    { at: 18.6, shot: "Neon-rim dashboard dolly from 3D angle to frontal", component: "bloom-rim-dashboard" },
    { at: 21.7, shot: "Rack focus into a card carousel", component: "bloom-card-carousel" },
    { at: 24.6, shot: "Logo mark + context menu", component: "bloom-icon-menu" },
    { at: 27.4, shot: "Phone with popping icons collapsing into a light beam", component: "bloom-phone-pop" },
    { at: 31.1, shot: "Shield with pulse rings on the beat", component: "bloom-shield-pulse" },
    { at: 32.9, shot: "Title beat, then diagonal photo-card stream", component: "bloom-card-stream" },
    { at: 34.9, shot: "Glass icon row revealing a portrait in a glass card", component: "bloom-glass-portrait" },
    { at: 36.6, shot: "Glass feature cards with per-card blooms", component: "bloom-glow-cards" },
    { at: 50.3, shot: "Flat top-down scene, items pop in, cloth wipe", component: "bloom-flat-desk" },
    { at: 61.3, shot: "Pendulum swinging in a soft sky, torn-paper frame", component: "bloom-pendulum" },
    { at: 54.5, shot: "Zoom through nested arches, stretched type", component: "bloom-arch-type" },
    { at: 65.2, shot: "Pixel-built title, mosaic image resolves, info card", component: "bloom-pixel-card" },
    { at: 68.0, shot: "Bookend outro after a beat of black, credits, fade", component: "bloom-bookend" },
  ],
  rules: [
    "Dark and light shots alternate; every dark shot has exactly one big soft colour bloom, every light shot one colour streak",
    "Entries ease out hard (0.25–0.45 s); pops overshoot; staggers 40–130 ms; nothing ever stops dead",
    "Cuts land on the beat; joins are only hard cuts, pixel-block dissolves, white flashes, morphs and object wipes; no crossfades",
    "Bookends: heavy condensed metal word + connected script word + pill + two typed lines, under a turning crescent bloom",
    "Real product only: the logo files, the caption looks, captioned footage and the owner's props; verified facts only",
  ],
  components: [bookend, keycap, pillMenu, highlight, neonOrbit, chrome, dashboard, carousel, iconMenu, phonePop, shield, stream, glassPortrait, glowCards, desk, pendulum, arches, pixelCard] as unknown as Component[],
  template,
};
