// Kit: "Purple journey" — a voiced, captioned 9:16 story reel. One accent colour over a grey vignette, a single
// character photographed in that colour, photoreal props, and captions that type on word by word in two voices:
// a small black sans line and a big serif italic accent line. Every scene is one of five reusable stages.
// The template ships with original generated assets (character, props, plates) and an original voiceover.

import { E, P, SPRING, alpha, clamp, defineComponent, lerp, logLerp, mix, pr, rand, spring, type Component, type RC } from "@motioneasy/engine";
import { wordFx } from "../kit";
import { mediaOr } from "../parts";
import type { PostSpec } from "../sequence";
import type { Kit } from "./types";

const PURPLE = "#8B3FD9";
const DEEP = "#6A22C2";
const LILAC = "#D6BEF5";
const INK = "#18161C";
const LOOK = { mode: "light" as const, bg: "#E8E8EB", fg: INK, accent: PURPLE, lighting: 0, grain: 0.18, vignette: 0, backdrop: "plain" as const, camera: "still" as const };
const SMALL = (s: number) => ({ font: "jakarta" as const, size: s, weight: 600, tracking: -0.02, lineHeight: 1.1 });
const ACCENT = (s: number) => ({ font: "fraunces" as const, size: s, weight: 700, italic: true, tracking: -0.02, lineHeight: 1 });

/** Grey studio vignette: bright centre falling to mid grey at the edges. */
function vignette(c: RC, cy = 0.45) {
  c.clear("#8F8F95");
  c.rect(0, 0, c.W, c.H, c.radial(c.cx, c.H * cy, c.H * 0.78, [[0, "#F8F8F9"], [0.42, "#E7E7EA"], [0.78, "#AFAFB4"], [1, "#8C8C92"]]));
}

// ── captions ─────────────────────────────────────────────────────────────────────────────────────────
// A phrase: "at|top|bottom|accent|x|y|align[|pill]". accent = "top" or "bottom" (which line is the serif italic);
// x, y are frame fractions (y = the top line's baseline); align left/center/right. Words type on at `step` s each.
interface Phrase { at: number; top: string; bottom: string; accentTop: boolean; x: number; y: number; align: "left" | "center" | "right"; pill: boolean }
const parsePhrases = (list: string[]): Phrase[] => list.map((s) => {
  const [at, top, bottom, acc, x, y, al, pill] = s.split("|");
  return { at: Number(at) || 0, top: top ?? "", bottom: bottom ?? "", accentTop: (acc ?? "bottom").trim() === "top", x: Number(x ?? 0.5), y: Number(y ?? 0.3), align: ((al ?? "center").trim() as Phrase["align"]), pill: (pill ?? "").trim() === "pill" };
});
const CAPS = (d: string[]) => ({
  captions: P.list(d, "Captions (at|top|bottom|accent top/bottom|x|y|align|pill)", { max: 6 }),
  step: P.number(0.2, "Seconds per word", { min: 0.05, max: 0.6, step: 0.01, unit: "s" }),
  scale: P.number(1, "Caption size", { min: 0.5, max: 2, step: 0.05 }),
});
function captions(c: RC, list: string[], step: number, scale: number, end: number) {
  const ph = parsePhrases(list);
  const t = c.t;
  ph.forEach((p, i) => {
    const until = ph[i + 1]?.at ?? end + 1;
    if (t < p.at || t > until + 0.2) return;
    const out = pr(t, until, until + 0.2);
    const sSize = c.H * 0.026 * scale, aSize = c.H * 0.05 * scale * (p.pill ? 0.82 : 1);
    const T = c.layout(p.top || " ", p.accentTop ? ACCENT(aSize) : SMALL(p.pill ? sSize * 1.05 : sSize));
    const B = c.layout(p.bottom || " ", p.accentTop ? SMALL(sSize) : ACCENT(aSize));
    const w = Math.max(p.top ? T.width : 0, p.bottom ? B.width : 0);
    const ax = (L: { width: number }) => (p.align === "left" ? 0 : p.align === "right" ? w - L.width : (w - L.width) / 2);
    const gap = c.H * 0.006 * scale;
    const h = (p.top ? T.cap : 0) + (p.bottom ? B.cap + gap + (p.accentTop ? 0 : B.size * 0.15) : 0);
    let x0 = c.W * p.x - (p.align === "left" ? 0 : p.align === "right" ? w : w / 2);
    const yTop = c.H * p.y - (p.top ? T.cap : 0);
    if (p.pill) {
      const padX = c.H * 0.022 * scale, padY = c.H * 0.016 * scale;
      const grow = E.out(pr(t, p.at - 0.15, p.at + 0.25));
      const pw = (w + padX * 2) * grow, phh = h + padY * 2 + B.size * 0.2;
      c.save();
      c.alpha(1 - out);
      c.shadow("rgba(60,20,110,0.18)", 18, 0, 6);
      c.rrect(x0 - padX, yTop - padY, pw, phh, c.H * 0.016, alpha(LILAC, 0.94));
      c.restore();
      c.strokeRRect(x0 - padX, yTop - padY, pw, phh, c.H * 0.016, alpha("#FFFFFF", 0.7 * (1 - out)), 1.5);
      if (grow < 0.98) { c.save(); c.clipRect(x0 - padX, 0, pw, c.H); }
      draw();
      if (grow < 0.98) c.restore();
    } else draw();
    function draw() {
      let k = 0;
      const lines: [typeof T, number, boolean][] = [];
      if (p.top) lines.push([T, yTop + T.cap, p.accentTop]);
      if (p.bottom) lines.push([B, yTop + (p.top ? T.cap + gap : 0) + B.cap, !p.accentTop]);
      for (const [L, base, acc] of lines) {
        const ox = x0 + ax(L);
        L.words.forEach((wd) => {
          const u = pr(t, p.at + k * step, p.at + k * step + 0.28, E.out);
          k++;
          if (u <= 0) return;
          wordFx(c, wd, ox, base - (L.lines[0]?.y ?? 0), { alpha: u * (1 - out), blur: (1 - u) * c.H * 0.008 + out * c.H * 0.012, dy: (1 - u) * c.H * 0.012, color: acc ? PURPLE : INK });
        });
      }
    }
  });
}

/** A soft purple orb (multiplied over whatever is beneath it). */
function orb(c: RC, x: number, y: number, r: number, a = 1, soft = 0) {
  if (r <= 0 || a <= 0) return;
  c.save();
  c.alpha(a);
  if (soft > 0) { c.light(x, y, r * (1 + soft), "#9B4DE6", 0.9, "multiply"); c.restore(); return; }
  c.blend("multiply");
  c.circle(x, y, r, c.radial(x - r * 0.3, y - r * 0.3, r * 1.4, [[0, "#C79BF5"], [1, "#8B3FD9"]]));
  c.restore();
}
/** Icon badge: purple disc with a white glyph (image, pen, chart, play, brain) or a media thumbnail inside. */
function badge(c: RC, x: number, y: number, r: number, kind: string, media?: string | null) {
  c.save();
  c.shadow("rgba(70,20,120,0.25)", r * 0.6, 0, r * 0.2);
  c.circle(x, y, r, c.radial(x - r * 0.3, y - r * 0.3, r * 1.4, [[0, "#B072F0"], [1, DEEP]]));
  c.restore();
  c.arc(x, y, r * 0.86, 0, 1, alpha("#FFFFFF", 0.35), Math.max(1, r * 0.05));
  const w = Math.max(1.2, r * 0.09), W = "#FFFFFF";
  if (media) { c.save(); c.clipCircle(x, y, r * 0.72); c.circle(x, y, r * 0.72, "#FFFFFF"); c.media(media, x - r * 0.62, y - r * 0.62, r * 1.24, r * 1.24, { fit: "contain" }); c.restore(); return; }
  if (kind === "image") { c.strokeRRect(x - r * 0.42, y - r * 0.32, r * 0.84, r * 0.64, r * 0.12, W, w); c.poly([[x - r * 0.3, y + r * 0.22], [x - r * 0.05, y - r * 0.08], [x + r * 0.3, y + r * 0.22]], W); c.circle(x + r * 0.18, y - r * 0.12, r * 0.08, W); }
  else if (kind === "pen") { c.line(x - r * 0.3, y + r * 0.3, x + r * 0.3, y - r * 0.3, W, w * 1.4); c.circle(x - r * 0.33, y + r * 0.33, r * 0.08, W); }
  else if (kind === "chart") { [0.18, 0.32, 0.5].forEach((hh, i) => c.rect(x - r * 0.38 + i * r * 0.28, y + r * 0.32 - r * hh * 1.3, r * 0.18, r * hh * 1.3, W)); c.polyline([[x - r * 0.4, y - r * 0.05], [x - r * 0.05, y - r * 0.25], [x + r * 0.35, y - r * 0.45]], W, w); }
  else if (kind === "play") { c.poly([[x - r * 0.18, y - r * 0.3], [x - r * 0.18, y + r * 0.3], [x + r * 0.32, y]], W); }
  else { c.arc(x, y, r * 0.35, 0, 1, W, w); c.line(x, y - r * 0.35, x, y + r * 0.35, W, w * 0.8); }
}
function ribbons(c: RC, t: number, a = 1) {
  const d = (pts: number[][], u: number, wdt: number) => {
    if (u <= 0) return;
    const P2 = (s: number) => {
      const [p0, p1, p2, p3] = pts;
      const m = 1 - s;
      return [m * m * m * p0[0] + 3 * m * m * s * p1[0] + 3 * m * s * s * p2[0] + s * s * s * p3[0], m * m * m * p0[1] + 3 * m * m * s * p1[1] + 3 * m * s * s * p2[1] + s * s * s * p3[1]] as [number, number];
    };
    const n = 40, line: [number, number][] = [];
    for (let i = 0; i <= n * u; i++) line.push(P2(i / n));
    c.polyline(line, alpha(PURPLE, 0.85 * a), wdt, 1);
  };
  d([[c.W * 0.15, c.H * 0.14], [c.W * 0.55, c.H * 0.09], [c.W * 0.8, c.H * 0.06], [c.W * 1.05, c.H * 0.0]], E.out(pr(t, 0.05, 0.6)), c.H * 0.012);
  d([[c.W * -0.05, c.H * 0.98], [c.W * 0.3, c.H * 0.9], [c.W * 0.65, c.H * 0.88], [c.W * 1.05, c.H * 0.76]], E.out(pr(t, 0.12, 0.7)), c.H * 0.012);
}

const base = { version: "1.0.0", group: "kits" as const, category: "kit-journey-reel", added: "2026-10-05", formats: ["vertical" as const], theme: LOOK, camera: "still" as const };
const DUR = (d: number) => P.number(d, "Duration", { min: 0.8, max: 12, step: 0.05, unit: "s" });

// ── A. photo plate (+ optional cutout) ───────────────────────────────────────────────────────────────
const plate = defineComponent<{ plate: string | null; cutout: string | null; cx: number; cy: number; ch: number; push: number; captions: string[]; step: number; scale: number; dur: number }>({
  ...base, id: "journey-plate", name: "Photo Plate + Cutout + Captions",
  description: "A full-frame photo plate with a slow push-in, an optional cut-out character composited into it with a soft shadow, and word-by-word captions (sans line + serif italic accent, or inside a lilac glass pill).",
  tags: ["plate", "photo", "cutout", "captions", "story"],
  params: { plate: P.media("media/journey/scene-column.jpg", "Plate (full frame)", "image"), cutout: P.media("media/journey/hero-sit.png", "Cut-out (optional)", "image"), cx: P.number(0.3, "Cut-out x", { min: 0, max: 1, step: 0.01 }), cy: P.number(0.82, "Cut-out bottom y", { min: 0, max: 1.2, step: 0.01 }), ch: P.number(0.38, "Cut-out height", { min: 0.1, max: 1.2, step: 0.01 }), push: P.number(1, "Push-in amount", { min: 0, max: 3, step: 0.1 }), ...CAPS(["0.1|When I first opened|an editor,|bottom|0.38|0.2|center", "1.8|it looked|simple.|bottom|0.38|0.2|center"]), dur: DUR(3) },
  duration: (p) => p.dur,
  sounds: () => [],
  render(c, p) {
    const t = c.t;
    const k = logLerp(1.0, 1 + 0.06 * p.push, pr(t, 0, p.dur));
    c.clear("#D9D9DC");
    c.with({ x: c.cx, y: c.cy, scale: k }, () => {
      c.translate(-c.cx, -c.cy);
      mediaOr(c, p.plate, 0, 0, c.W, c.H, "plate", { fit: "cover" });
      if (p.cutout) {
        const info = c.mediaInfo(p.cutout);
        const h = c.H * p.ch, w = info && info.h ? (h * info.w) / info.h : h * 0.75;
        const x = c.W * p.cx - w / 2, y = c.H * p.cy - h + (1 - E.out(pr(t, 0, 0.6))) * c.H * 0.02;
        c.lightEllipse(c.W * p.cx, c.H * p.cy - h * 0.01, w * 0.45, h * 0.035, "#000000", 0.25);
        c.media(p.cutout, x, y, w, h, { fit: "contain" });
      }
    });
    captions(c, p.captions, p.step, p.scale, p.dur);
  },
});

// ── B. stage: one prop or character on the vignette, with orb / orbit / ribbons ──────────────────────
const stage = defineComponent<{ subject: string | null; sx: number; sy: number; sh: number; motion: string; orbMode: string; orbit: boolean; badges: string[]; ribbonsOn: boolean; captions: string[]; step: number; scale: number; dur: number }>({
  ...base, id: "journey-stage", name: "Stage · Subject, Orb, Orbit, Ribbons",
  description: "The grey studio vignette with one cut-out subject (a prop or the character) moving one of four ways — float, fall, settle or tilt — plus a purple orb beside or behind it, an optional dashed orbit of icon badges, sweeping ribbons and word-by-word captions.",
  tags: ["stage", "prop", "orb", "orbit", "badges", "ribbons", "captions"],
  params: {
    subject: P.media("media/journey/brain.png", "Subject (cut-out)", "image"),
    sx: P.number(0.52, "Subject x", { min: 0, max: 1, step: 0.01 }), sy: P.number(0.5, "Subject centre y", { min: 0, max: 1, step: 0.01 }), sh: P.number(0.2, "Subject height", { min: 0.05, max: 1.2, step: 0.01 }),
    motion: P.select("float", "Motion", ["float", "fall", "settle", "tilt"]),
    orbMode: P.select("beside", "Orb", ["none", "beside", "halo", "blur"]),
    orbit: P.bool(false, "Dashed orbit of badges"),
    badges: P.list(["image", "pen", "chart", "play", "image"], "Orbit badges (image/pen/chart/play/brain)", { max: 8 }),
    ribbonsOn: P.bool(false, "Ribbons"),
    ...CAPS(["0.05|But|the more I learned,|top|0.08|0.18|left"]),
    dur: DUR(2.4),
  },
  duration: (p) => p.dur,
  sounds: () => [],
  render(c, p) {
    const t = c.t;
    vignette(c);
    if (p.ribbonsOn) ribbons(c, t);
    const info = c.mediaInfo(p.subject);
    const h = c.H * p.sh, w = info && info.h ? (h * info.w) / info.h : h;
    let x = c.W * p.sx, y = c.H * p.sy, rot = 0, s = 1;
    const e = E.out(pr(t, 0, 0.7));
    if (p.motion === "float") { y += Math.sin(t * 2) * c.H * 0.006 + (1 - e) * c.H * 0.03; s = 0.92 + 0.08 * e; }
    else if (p.motion === "fall") { y += lerp(-c.H * 0.06, c.H * 0.05, t / p.dur); rot = lerp(-8, 10, t / p.dur); x += Math.sin(t * 1.5) * c.W * 0.02; }
    else if (p.motion === "settle") { s = logLerp(1.12, 1, E.out(pr(t, 0, 1.2))); y += (1 - e) * c.H * 0.02; }
    else { rot = lerp(-14, 6, E.out(pr(t, 0, 1.4))); y += Math.sin(t * 1.6) * c.H * 0.006; }
    const ob = clamp(spring(t - 0.25, SPRING.pop), 0, 1.15);
    if (p.orbMode === "halo") orb(c, x, y - h * 0.36, c.H * 0.075 * ob, 0.95, 0.8);
    if (p.orbit) {
      const R1 = c.H * 0.2, R2 = c.H * 0.27, a = pr(t, 0.2, 0.6);
      c.save();
      c.ctx.setLineDash([c.H * 0.006, c.H * 0.008]);
      c.arc(x, y, R1, 0, pr(t, 0.15, 0.8, E.out), alpha(INK, 0.55 * a), 1.4, "butt");
      c.arc(x, y, R2, 0.5, 0.5 + pr(t, 0.25, 0.9, E.out), alpha(INK, 0.4 * a), 1.2, "butt");
      c.restore();
      p.badges.forEach((b, i) => {
        const u = clamp(spring(t - 0.35 - i * 0.08, SPRING.pop), 0, 1.15);
        const ang = (i / p.badges.length) * Math.PI * 2 - 1.2 + t * 0.35;
        const R = i % 2 ? R2 : R1;
        if (u > 0.01) badge(c, x + Math.cos(ang) * R, y + Math.sin(ang) * R, c.H * 0.022 * u, b.trim());
      });
    }
    c.with({ x, y, rotate: rot, scale: s }, () => {
      c.lightEllipse(0, h * 0.52, w * 0.32, h * 0.04, "#000000", 0.18);
      mediaOr(c, p.subject, -w / 2, -h / 2, w, h, "subject", { fit: "contain" });
    });
    if (p.orbMode === "beside") orb(c, x + w * 0.28, y - h * 0.12, c.H * 0.055 * ob, 0.92);
    if (p.orbMode === "blur") orb(c, x - w * 0.15, y - h * 0.25, c.H * 0.08 * ob, 0.7, 0.6);
    captions(c, p.captions, p.step, p.scale, p.dur);
  },
});

// ── C. eye pill ──────────────────────────────────────────────────────────────────────────────────────
const eyePill = defineComponent<{ eye: string | null; captions: string[]; step: number; scale: number; dur: number }>({
  ...base, id: "journey-eye-pill", name: "Eye Orb on a Sliding Pill",
  description: "A lilac bar slides in from the left edge and ends in a purple orb holding a close-up eye that blinks open; the orb then swells to fill the frame while captions type on beside it.",
  tags: ["eye", "pill", "orb", "look back", "transition"],
  params: { eye: P.media("media/journey/eye.jpg", "Eye close-up", "image"), ...CAPS(["0.05|Then one day|you turn around|bottom|0.08|0.36|left"]), dur: DUR(1.5) },
  duration: (p) => p.dur,
  sounds: () => [],
  render(c, p) {
    const t = c.t;
    vignette(c);
    const y = c.H * 0.5, r = c.H * 0.07;
    const u = E.out(pr(t, 0, 0.45));
    const ex = lerp(-r, c.W * 0.7, u);
    c.save();
    c.shadow("rgba(70,20,120,0.2)", 20, 0, 6);
    c.rrect(-r, y - r * 0.55, ex + r, r * 1.1, r * 0.55, alpha(LILAC, 0.95));
    c.restore();
    const grow = logLerp(1, 9, E.in(pr(t, p.dur - 0.4, p.dur)));
    const R = r * grow;
    c.circle(ex, y, R * 1.12, c.radial(ex - R * 0.3, y - R * 0.3, R * 1.5, [[0, "#B98AF2"], [1, DEEP]]));
    c.save();
    c.clipCircle(ex, y, R * 0.78);
    const open = E.out(pr(t, 0.35, 0.6));
    c.with({ x: ex, y, sy: Math.max(0.05, open) }, () => mediaOr(c, p.eye, -R * 0.9, -R * 0.9, R * 1.8, R * 1.8, "eye", { fit: "cover" }));
    c.restore();
    captions(c, p.captions, p.step, p.scale, p.dur - 0.35);
  },
});

// ── D. badges ────────────────────────────────────────────────────────────────────────────────────────
const badges = defineComponent<{ items: string[]; captions: string[]; step: number; scale: number; dur: number }>({
  ...base, id: "journey-badges", name: "Icon Badges with Labels",
  description: "Purple icon badges pop in one after another, each with a word beneath in the accent colour, the earlier ones drifting up and away as the next arrives.",
  tags: ["badges", "icons", "list", "progress"],
  params: { items: P.list(["0.05|learning|media/journey/brain.png", "1.25|improving|chart"], "Badges (at|label|icon or media)", { min: 1, max: 4 }), ...CAPS(["0.05|Still||top|0.5|0.2|center"]), dur: DUR(2.5) },
  duration: (p) => p.dur,
  sounds: () => [],
  render(c, p) {
    const t = c.t;
    vignette(c);
    const its = p.items.map((s) => { const [at, label, icon] = s.split("|"); return { at: Number(at) || 0, label: label ?? "", icon: (icon ?? "chart").trim() }; });
    its.forEach((it, i) => {
      const u = clamp(spring(t - it.at, SPRING.pop), 0, 1.15);
      if (u <= 0.01) return;
      const next = its[i + 1]?.at;
      const away = next !== undefined ? E.inOut(pr(t, next - 0.1, next + 0.5)) : 0;
      const x = lerp(c.cx, c.W * 0.15, away), y = lerp(c.H * 0.48, c.H * 0.28, away);
      const r = c.H * 0.06 * u * (1 - away * 0.25);
      badge(c, x, y, r, it.icon, it.icon.includes("/") ? it.icon : null);
      const L = c.layout(it.label, { ...SMALL(c.H * 0.034), weight: 700 });
      c.drawLayout(L, x - L.width / 2, y + r + c.H * 0.035 - (L.lines[0]?.y ?? 0), { color: alpha(PURPLE, pr(t, it.at + 0.1, it.at + 0.3) * (1 - away * 0.3)) });
    });
    captions(c, p.captions, p.step, p.scale, p.dur);
  },
});

// ── E. flight + flood ending ─────────────────────────────────────────────────────────────────────────
const flight = defineComponent<{ plane: string | null; floodAt: number; captions: string[]; step: number; scale: number; dur: number }>({
  ...base, id: "journey-flight-flood", name: "Flight Trail → Purple Flood",
  description: "A plane climbs from the bottom of the frame drawing a widening purple trail; the trail swells until purple floods the whole frame and the closing line types on in white.",
  tags: ["ending", "plane", "trail", "flood", "outro"],
  params: { plane: P.media("media/journey/plane.png", "Plane (cut-out)", "image"), floodAt: P.number(1.4, "Flood starts", { min: 0.2, max: 6, step: 0.05, unit: "s" }), ...CAPS(["0.05|The road|keeps going,|bottom|0.5|0.22|center", "1.15|and so do the|late-night renders.|bottom|0.5|0.47|center"]), dur: DUR(4.6) },
  duration: (p) => p.dur,
  sounds: () => [],
  render(c, p) {
    const t = c.t;
    vignette(c);
    const rise = E.out(pr(t, 0, 1.3));
    const px = c.cx, py = lerp(c.H * 1.05, c.H * 0.68, rise) - Math.max(0, t - 1.3) * c.H * 0.05;
    const flood = E.inOut(pr(t, p.floodAt, p.floodAt + 0.8));
    const tw = lerp(c.W * 0.06, c.W * 1.6, flood);
    c.poly([[px - c.W * 0.015, py + c.H * 0.03], [px + c.W * 0.015, py + c.H * 0.03], [px + tw, c.H * 1.02], [px - tw, c.H * 1.02]], c.linear(0, py, 0, c.H, [[0, "#C68CF5"], [1, DEEP]]));
    if (flood > 0) c.rect(0, lerp(c.H, 0, flood), c.W, c.H, c.linear(0, 0, 0, c.H, [[0, "#C47BF2"], [0.6, "#A855EE"], [1, "#7A2ED0"]]));
    if (flood < 0.95) {
      const info = c.mediaInfo(p.plane);
      const h = c.H * 0.1, w = info && info.h ? (h * info.w) / info.h : h;
      mediaOr(c, p.plane, px - w / 2, py - h * 0.55 - flood * c.H * 0.4, w, h, "plane", { fit: "contain" });
    }
    const ph = parsePhrases(p.captions);
    // captions turn white over the flood
    const darkUntil = ph[1]?.at ?? p.dur;
    if (t < darkUntil + 0.2) captions(c.at(t), [p.captions[0]], p.step, p.scale, darkUntil);
    if (ph[1]) {
      c.save();
      const cc = c;
      // white copy of the closing line
      const L1 = c.layout(ph[1].top, SMALL(c.H * 0.026 * p.scale)), L2 = c.layout(ph[1].bottom, { ...SMALL(c.H * 0.034 * p.scale), weight: 700 });
      let k = 0;
      [[L1, c.H * ph[1].y], [L2, c.H * ph[1].y + c.H * 0.045 * p.scale]].forEach(([L, b]) => {
        const LL = L as typeof L1;
        LL.words.forEach((wd) => {
          const u = pr(t, ph[1].at + k * p.step, ph[1].at + k * p.step + 0.28, E.out);
          k++;
          if (u > 0) wordFx(cc, wd, c.cx - LL.width / 2, (b as number) - (LL.lines[0]?.y ?? 0), { alpha: u, blur: (1 - u) * c.H * 0.008, color: "#FFFFFF" });
        });
      });
      c.restore();
    }
  },
});

const components = [plate, stage, eyePill, badges, flight] as unknown as Component[];

const J = (f: string) => `media/journey/${f}`;
const template: PostSpec = {
  id: "kit-journey-reel",
  title: "Purple journey — a voiced 9:16 story reel",
  format: "vertical",
  fps: 30,
  clips: [
    { component: "journey-plate", props: { plate: J("scene-column.jpg"), cutout: J("hero-sit.png"), cx: 0.3, cy: 0.83, ch: 0.36, scale: 1.15, captions: ["0.4|When I first opened|an editor,|bottom|0.38|0.2|center", "2.1|it looked|simple.|bottom|0.38|0.2|center"], dur: 3.25 } },
    { component: "journey-stage", props: { subject: J("brain.png"), sh: 0.27, sy: 0.5, orbMode: "beside", orbit: false, scale: 1.15, captions: ["0.04|But|the more I learned,|top|0.08|0.17|left", "1.25|the bigger|it got.|bottom|0.5|0.8|center"], dur: 1.2 } },
    { component: "journey-stage", props: { subject: J("brain.png"), sh: 0.17, sy: 0.47, orbMode: "beside", orbit: true, badges: ["image", "pen", "chart", "play", "image"], scale: 1.15, captions: ["0.0|the bigger|it got.|bottom|0.5|0.8|center"], dur: 1.15 }, transition: "cut" },
    { component: "journey-stage", props: { subject: J("hero-fall.png"), sh: 0.5, sx: 0.48, sy: 0.48, motion: "fall", orbMode: "blur", scale: 1.15, captions: ["0.08|Some nights I|almost quit.|bottom|0.92|0.22|right"], dur: 1.75 }, transition: { type: "blur", duration: 0.2 } },
    { component: "journey-stage", props: { subject: J("hourglass.png"), sh: 0.42, scale: 1.2, sx: 0.6, sy: 0.5, motion: "tilt", orbMode: "none", ribbonsOn: true, captions: ["0.05|But|I didn't.|top|0.1|0.36|left"], dur: 1.2 }, transition: "cut" },
    { component: "journey-plate", props: { plate: J("scene-stairs.jpg"), cutout: null, push: 0.8, captions: ["0.05|Growth is like|climbing stairs|bottom|0.5|0.36|left|pill", "2.12|one step never feels|like much.|bottom|0.5|0.36|left|pill"], dur: 4.3 }, transition: { type: "push", duration: 0.25 } },
    { component: "journey-eye-pill", props: { eye: J("eye.jpg"), scale: 1.15, captions: ["0.07|Then one day|you turn around|bottom|0.06|0.36|left"], dur: 1.45 }, transition: "cut" },
    { component: "journey-stage", props: { subject: J("hero-stand.png"), sh: 0.62, sx: 0.5, sy: 0.66, motion: "settle", orbMode: "halo", scale: 1.15, captions: ["0.0|and see how high|you've climbed.|bottom|0.5|0.14|center"], dur: 1.85 }, transition: "cut" },
    { component: "journey-badges", props: { items: ["0.05|learning|" + J("brain.png"), "1.32|improving|chart"], captions: ["0.05|Still||top|0.5|0.25|center", "1.27|Still||top|0.5|0.25|center"], dur: 2.55 }, transition: { type: "blur", duration: 0.2 } },
    { component: "journey-flight-flood", props: { plane: J("plane.png"), floodAt: 1.3, captions: ["0.07|The road|keeps going,|bottom|0.5|0.2|center", "1.18|and so do the|late-night renders.|bottom|0.5|0.46|center"], dur: 4.6 }, transition: "cut" },
  ],
  music: { src: J("mix.mp3"), gain: 1, offset: 0, fadeIn: 0, fadeOut: 0.6, credit: "Voice: Microsoft Edge neural TTS (Ava). Bed: \"Dreamer\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Original script, voice and generated assets (Cloudflare FLUX.2 dev, cut out with rembg) in the purple-journey style.",
};

export const journeyReel: Kit = {
  id: "journey-reel",
  promptId: "",
  title: "Purple journey story reel",
  family: "social",
  format: "vertical",
  summary: "A voiced 9:16 story reel in one accent colour: a single character photographed in that colour and photoreal props on a grey studio vignette, with captions typing on word by word in a small sans line and a big serif italic accent line. Five reusable stages — photo plate, subject stage with orb / orbit / ribbons, eye pill, icon badges, flight-and-flood ending — carry any short voiced story.",
  shots: [
    { at: 0, shot: "Cloud plate: column and marble block, the character typing on a laptop", component: "journey-plate" },
    { at: 3.25, shot: "Engraved brain with a purple orb, then a dashed orbit of icon badges", component: "journey-stage" },
    { at: 5.6, shot: "The character falling, a soft orb blooming", component: "journey-stage" },
    { at: 7.35, shot: "A purple hourglass tilting between sweeping ribbons", component: "journey-stage" },
    { at: 8.55, shot: "Spiral stairs plate with lilac glass caption pills", component: "journey-plate" },
    { at: 12.85, shot: "A lilac bar ending in an eye orb that swells to fill the frame", component: "journey-eye-pill" },
    { at: 14.3, shot: "The character standing with a purple halo", component: "journey-stage" },
    { at: 16.15, shot: "Icon badges: learning, improving", component: "journey-badges" },
    { at: 18.7, shot: "A plane climbs on a purple trail that floods the frame; the closing line in white", component: "journey-flight-flood" },
  ],
  rules: [
    "One accent colour for everything: the character's clothes, the props, orbs, pills and accent words",
    "Grey studio vignette behind every stage; photo plates only for the big scenes",
    "Captions follow the voice word by word; each phrase pairs a small sans line with a serif italic accent line",
    "Cut on the voice: a new stage starts with the phrase it illustrates",
  ],
  components,
  template,
};

void mix; void rand;
