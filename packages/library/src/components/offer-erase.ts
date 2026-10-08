// "Erase the boring": a 20 s vertical offer for CaptionsEasy, drawn as one component on a 120 BPM bed.
// The clock is the Hinglish voiceover: every on-screen word lands on its spoken word (edge-tts boundaries),
// every cut lands on a beat, and each transition comes from the objects in the shot: a cream brush erases the
// boring subtitle, a keyhole opens from the padlock, a zero grows into the next scene, the logo bars slide across.

import {
  E, P, SPRING, advance, capHeight, defineComponent, lerp, mix, noise1, pr, spring, type Layer, type RC, type SoundCue, type TextStyle,
} from "@motioneasy/engine";

// Campaign palette (cream, ink, lavender, deep green) plus the logo's orange and emerald.
const CREAM = "#FFFFEB";
const INK = "#1A1A1A";
const LAV = "#F0D7FF";
const ORANGE = "#FFA946";
const EMERALD = "#34D399";
const DEEP = "#034F46";
const MINT = "#7CC9B7";
const WHITE = "#FFFFFF";
const MUTE = "#6E6E67";
const OUT = { color: "#000000", width: 9 };

const LOGO = "media/brand/captionseasy-logo.svg";
const HERO_RAW = "media/hero/omar.raw.mp4";
const HERO_CAP = "media/hero/omar.mp4";
const MIC = "media/ceshot/mic.png";
const LOCK = "media/ceshot/cloud-lock.png";
const OVERWHELMED = "media/ceshot/overwhelmed.png";
const FIST = "media/ceshot/fist-pump.png";
const CREATOR_1 = "sources/creators/creator-1.mp4";
const CREATOR_2 = "sources/creators/creator-2.mp4";
const CREATOR_3 = "sources/creators/creator-3.mp4";
const LOOKS_3 = "sources/creators/merged-3looks.mp4";

const SANS = (size: number, weight = 800): TextStyle => ({ font: "jakarta", size, weight, tracking: -0.035, lineHeight: 1.04 });
const SERIF = (size: number): TextStyle => ({ font: "instrument", size, weight: 400, italic: true, tracking: -0.01, lineHeight: 1 });
const PLAIN = (size: number): TextStyle => ({ font: "inter", size, weight: 600, tracking: 0, lineHeight: 1.2 });

// The voiceover on the film clock: file start (s) and each word's offset inside its file.
const VO: Record<string, { at: number; words: number[] }> = {
  "01": { at: 0.04, words: [0.095, 0.414, 0.755, 1.141, 1.402] },
  "02": { at: 2.09, words: [0.095, 0.527, 0.789, 2.364] },
  "03": { at: 4.88, words: [0.095, 0.391, 0.709, 1.886, 2.159, 2.443] },
  "04": { at: 7.5, words: [0.095, 0.63, 1.75, 2.193] },
  "05": { at: 10.06, words: [0.095, 0.516, 1.568, 2.034] },
  "06": { at: 12.49, words: [0.095, 0.561, 2.034, 2.489] },
  "07": { at: 15.35, words: [0.095, 1.284, 1.648] },
  "08": { at: 17.48, words: [0.095] },
};
const T = (id: string, i: number) => VO[id].at + VO[id].words[i];

interface Piece {
  s: string;
  st: TextStyle;
  color: string;
  at: number;
  from?: string;
  stroke?: { color: string; width: number };
}

const bg = (c: RC, color: string) => c.rect(0, 0, c.W, c.H, color);
const tw = (s: string, st: TextStyle) => advance(s, st.font, st.size, st.weight ?? 400, !!st.italic) + (st.tracking ?? 0) * st.size * Math.max(0, [...s].length - 1);
const widthOf = (ps: Piece[]) => ps.reduce((a, p) => a + tw(p.s, p.st), 0);

/** Shrinks a line's type until it fits: no overflow, ever. */
function fitTo(ps: Piece[], maxW: number): Piece[] {
  const k = Math.min(1, maxW / Math.max(1, widthOf(ps)));
  return k < 1 ? ps.map((p) => ({ ...p, st: { ...p.st, size: p.st.size * k } })) : ps;
}

/** A line of words. Each word rises and fades in on its spoken time; coloured words fill in as they are said. */
function line(c: RC, t: number, ps: Piece[], x: number, y: number, o: { center?: boolean; rise?: number } = {}) {
  const total = widthOf(ps);
  let x0 = o.center ? x - total / 2 : x;
  for (const p of ps) {
    const u = pr(t, p.at, p.at + 0.24, E.out);
    if (u > 0) {
      const color = p.from ? mix(p.from, p.color, pr(t, p.at, p.at + 0.42, E.inOut)) : p.color;
      c.text(p.s, x0, y + (1 - u) * (o.rise ?? 26), { ...p.st, align: "left", valign: "baseline" }, { color, alpha: u, stroke: p.stroke });
    }
    x0 += tw(p.s, p.st);
  }
  return total;
}

/** A strike through a line of type; `u` draws it on. */
function strike(c: RC, x: number, y: number, w: number, u: number, color = INK, width = 16) {
  if (u > 0) c.line(x, y, x + w * E.inOut(u), y, color, width);
}

/** A phone-style card of footage, scaled about its centre. `inside` draws in the card's own centred space. */
function cardAt(c: RC, ref: string, cx: number, cy: number, w: number, h: number, t: number, key: string, scale = 1, inside?: () => void) {
  c.with({ x: cx, y: cy, scale }, () => {
    c.cardShadow(-w / 2, -h / 2, w, h, 48, 0.8, 1.1);
    c.media(ref, -w / 2, -h / 2, w, h, { t, fit: "cover", radius: 48, key });
    inside?.();
  });
}

/** A cut-out prop or character, centred on (cx, cy) at height h. */
function cut(c: RC, ref: string, cx: number, cy: number, h: number, rot = 0, s = 1) {
  const info = c.mediaInfo(ref);
  const w = info && info.h ? (h * info.w) / info.h : h * 0.9;
  c.with({ x: cx, y: cy, rotate: rot, scale: Math.max(0.001, s) }, () => {
    c.shadow("rgba(26,26,26,0.2)", 40, 0, 24);
    c.media(ref, -w / 2, -h / 2, w, h, { fit: "contain", key: ref });
    c.noShadow();
  });
}

const pop = (t: number, t0: number) => spring(t - t0, SPRING.pop);

// ── the scenes: each draws a full frame at absolute film time t ──────────────────────────────────────

function scene1(c: RC, t: number) {
  bg(c, CREAM);
  c.light(c.W * 0.95, c.H * 0.06, c.W * 0.7, LAV, 0.95);
  c.light(c.W * 0.02, c.H * 0.98, c.W * 0.5, ORANGE, 0.2);
  const li = c.mediaInfo(LOGO);
  const lh = 70, lw = li ? (lh * li.w) / li.h : 400;
  c.media(LOGO, c.cx - lw / 2, 150, lw, lh, { fit: "contain", alpha: pr(t, 0, 0.5, E.out), key: "logo1" });
  // The raw clip, with the plain white subtitle every default caption renders as: the boring version.
  // The card slams in on the first beat, then drifts.
  const slam = (1 + 0.05 * pr(t, 0, 2.2, E.sine)) * (1 + 0.14 * (1 - E.out(pr(t, 0, 0.34))));
  cardAt(c, HERO_RAW, c.cx, c.H * 0.5, 760, 1055, t, "raw", slam, () => {
    const a = fitTo([
      { s: "Video ", st: PLAIN(60), color: WHITE, at: T("01", 0), stroke: OUT },
      { s: "ready ", st: PLAIN(60), color: WHITE, at: T("01", 1), stroke: OUT },
      { s: "hai…", st: PLAIN(60), color: WHITE, at: T("01", 2), stroke: OUT },
    ], 700);
    const b = fitTo([
      { s: "par ", st: PLAIN(60), color: WHITE, at: T("01", 3), stroke: OUT },
      { s: "captions?", st: PLAIN(60), color: WHITE, at: T("01", 4), stroke: OUT },
    ], 700);
    line(c, t, a, 0, 380, { center: true, rise: 14 });
    line(c, t, b, 0, 452, { center: true, rise: 14 });
  });
  cut(c, OVERWHELMED, 170, 1600, 640, -3, pop(t, 0.2));
}

function scene2(c: RC, t: number) {
  bg(c, CREAM);
  c.light(c.W * 0.06, c.H * 0.08, c.W * 0.8, LAV, 0.9);
  // The same clip, captioned by the product: the look it should have had.
  cardAt(c, HERO_CAP, c.cx, c.H * 0.665, 640, 890, Math.max(0, t - 2.0), "cap", 1 + 0.035 * pr(t, 2.0, 5.0, E.linear));
  const h1: Piece[] = [
    { s: "Boring ", st: SANS(112), color: INK, at: T("02", 0) },
    { s: "white", st: SANS(112), color: INK, at: T("02", 1) },
  ];
  const h2: Piece[] = [{ s: "subtitles?", st: SANS(112), color: INK, at: T("02", 2) }];
  const cap = capHeight("jakarta", 112, 800);
  const w1 = widthOf(h1), w2 = widthOf(h2);
  line(c, t, h1, c.cx, 380, { center: true });
  line(c, t, h2, c.cx, 500, { center: true });
  strike(c, c.cx - w1 / 2, 380 - cap / 2, w1, pr(t, 3.0, 3.35));
  strike(c, c.cx - w2 / 2, 500 - cap / 2, w2, pr(t, 3.4, 3.8));
  // "Nahi." lands on an orange highlighter stroke.
  const nahi: Piece[] = [{ s: "Nahi.", st: SERIF(250), color: INK, at: T("02", 3) }];
  const k = pr(t, T("02", 3), T("02", 3) + 0.22, E.outBack);
  const wn = widthOf(nahi);
  c.rrect(c.cx - ((wn + 70) * k) / 2, 618, (wn + 70) * k, 150, 75, ORANGE);
  line(c, t, nahi, c.cx, 770, { center: true, rise: 44 });
}

// The looks montage: one beat per shot, each cut a whip. Real footage, real captions.
const SEG = [
  { t0: 5.0, ref: CREATOR_1, m0: 1.0 },
  { t0: 5.5, ref: CREATOR_2, m0: 2.2 },
  { t0: 6.0, ref: LOOKS_3, m0: 0.6 },
  { t0: 6.5, ref: CREATOR_3, m0: 3.0 },
  { t0: 7.0, ref: LOOKS_3, m0: 4.4 },
];

function segFrame(c: RC, t: number, k: number) {
  const s = SEG[k];
  c.media(s.ref, 0, 0, c.W, c.H, { t: s.m0 + (t - s.t0), fit: "cover", key: `seg${k}` });
}

function scene3(c: RC, t: number) {
  let k = 0;
  for (let i = 0; i < SEG.length; i++) if (t >= SEG[i].t0) k = i;
  const since = t - SEG[k].t0;
  if (k > 0 && since < 0.14) {
    const A = c.layer(c.W, c.H, (lc) => segFrame(lc, t, k - 1));
    const B = c.layer(c.W, c.H, (lc) => segFrame(lc, t, k));
    whip(c, A, B, since / 0.14);
  } else {
    segFrame(c, t, k);
  }
  // The pill: "30+ looks", then "One click." rolls in on the word.
  const u = pr(t, 5.0, 5.14, E.outBack);
  const roll = pr(t, 6.75, 6.92, E.out);
  const pw = Math.max(tw("30+ looks", SANS(86)), tw("One click.", SANS(86))) + 110;
  const py = 250;
  c.rrect(c.cx - (pw * u) / 2, py - 66, pw * u, 132, 66, CREAM);
  if (u > 0.5) {
    c.save();
    c.ctx.beginPath();
    c.ctx.rect(c.cx - pw / 2, py - 66, pw, 132);
    c.ctx.clip();
    c.text("30+ looks", c.cx, py + 30 - roll * 70, { ...SANS(86), align: "center", valign: "baseline" }, { color: INK, alpha: 1 - roll });
    c.text("One click.", c.cx, py + 30 + (1 - roll) * 70, { ...SANS(86), align: "center", valign: "baseline" }, { color: INK, alpha: roll });
    c.restore();
  }
}

function scene4(c: RC, t: number) {
  bg(c, DEEP);
  c.light(c.W * 0.1, c.H * 0.1, c.W * 0.95, EMERALD, 0.5);
  const hi = fitTo([
    { s: "Hinglish ", st: SANS(150), color: CREAM, at: T("04", 0), from: MINT },
    { s: "bhi?", st: SERIF(170), color: LAV, at: T("04", 1), from: MINT },
  ], 900);
  line(c, t, hi, 96, 860, { rise: 30 });
  const bil = fitTo([
    { s: "Bilkul ", st: SANS(150), color: CREAM, at: T("04", 2), from: MINT },
    { s: "sahi.", st: SERIF(170), color: ORANGE, at: T("04", 3), from: MINT },
  ], 900);
  line(c, t, bil, 96, 1060, { rise: 30 });
  // A check badge pops after "sahi."
  const bx = 96 + widthOf(bil) + 74;
  const bu = pop(t, T("04", 3) + 0.22);
  c.with({ x: bx, y: 1000, scale: Math.max(0.001, bu) }, () => {
    c.circle(0, 0, 72, EMERALD);
    c.polyline([[-30, 2], [-8, 26], [32, -22]], CREAM, 14);
  });
  cut(c, MIC, 790, 1440, 640, 8, pop(t, 7.55));
}

// The keyhole in the padlock (where the next scene opens from). Set in the cut-out's own proportions.
const KEY = { cx: 553, cy: 1108 };

function scene5(c: RC, t: number) {
  bg(c, CREAM);
  c.light(c.cx, 880, c.W * 0.75, LAV, 0.85);
  const k = t >= 11.0 ? Math.exp(-(t - 11.0) * 6) : 0;
  const rot = t >= 11.0 ? Math.sin((t - 11.0) * 64) * 7 * k : 0;
  const lift = 8 * Math.sin(t * 1.7);
  cut(c, LOCK, c.cx, 880 + lift, 760, rot, pop(t, 0.0) * (1 + 0.06 * k));
  const a: Piece[] = [
    { s: "CapCut ", st: SANS(120), color: INK, at: T("05", 0) },
    { s: "Pro?", st: SANS(120), color: INK, at: T("05", 1) },
  ];
  const cap = capHeight("jakarta", 120, 800);
  line(c, t, a, c.cx, 1400, { center: true });
  strike(c, c.cx - widthOf(a) / 2, 1400 - cap / 2, widthOf(a), pr(t, 10.9, 11.2), ORANGE, 22);
  line(c, t, [
    { s: "Zaroorat ", st: SERIF(160), color: DEEP, at: T("05", 2) },
    { s: "nahi.", st: SERIF(160), color: DEEP, at: T("05", 3) },
  ], c.cx, 1580, { center: true });
}

function scene6(c: RC, t: number) {
  bg(c, CREAM);
  // A watermark stamp sits on the frame until the brush paints it out.
  c.with({ x: c.cx, y: 760, rotate: -12 }, () => {
    c.rrect(-740, -86, 1480, 172, 22, INK);
    c.text("WATERMARK", 0, 0, { ...SANS(128), align: "center", valign: "middle" }, { color: CREAM });
  });
  paintOver(c, pr(t, 12.95, 13.45, E.ramp), CREAM, 4);
  const head: Piece[] = [
    { s: "Zero ", st: SANS(150), color: INK, at: T("06", 0) },
    { s: "watermark.", st: SERIF(170), color: DEEP, at: T("06", 1) },
  ];
  line(c, t, fitTo(head, 960), c.cx, 470, { center: true });
  // The zero: an orange sticker with a hard ink shadow.
  const zu = pop(t, T("06", 2) - 0.05);
  c.with({ x: c.cx, y: 1110, scale: Math.max(0.001, zu) }, () => {
    c.text("0", 16, 16, { ...SANS(900), align: "center", valign: "middle" }, { color: INK });
    c.text("0", 0, 0, { ...SANS(900), align: "center", valign: "middle" }, { color: ORANGE });
  });
  line(c, t, [{ s: "rupaye", st: SERIF(200), color: DEEP, at: T("06", 3) }], c.cx, 1640, { center: true, rise: 40 });
}

const BAR_H = [520, 760, 640];

function scene7(c: RC, t: number) {
  bg(c, DEEP);
  c.light(c.W * 0.92, c.H * 0.08, c.W * 0.85, LAV, 0.4);
  // The logo's three bars, bouncing on the beat (120 BPM: one beat every 0.5 s).
  const ph = (t % 0.5) / 0.5;
  const bounce = Math.exp(-7 * ph);
  const cols = [ORANGE, EMERALD, CREAM];
  cols.forEach((col, i) => {
    const h = BAR_H[i] * 0.6 + 80 * bounce * (i === 1 ? 1 : 0.7);
    c.rrect(96 + i * 150, 760 - h, 112, h, 56, col);
  });
  const free: Piece[] = [{ s: "Free.", st: SANS(300), color: CREAM, at: T("07", 0) }];
  line(c, t, free, 96, 1120, { rise: 60 });
  const open: Piece[] = [
    { s: "Open ", st: SERIF(200), color: LAV, at: T("07", 1) },
    { s: "source.", st: SERIF(200), color: LAV, at: T("07", 2) },
  ];
  line(c, t, fitTo(open, 900), 96, 1310, { rise: 40 });
  c.line(96, 1372, 96 + widthOf(fitTo(open, 900)) * pr(t, 17.15, 17.5, E.inOut), 1372, ORANGE, 18);
}

function scene8(c: RC, t: number) {
  bg(c, CREAM);
  c.light(c.W * 0.95, c.H * 0.05, c.W * 0.7, LAV, 0.8);
  c.light(c.W * 0.02, c.H * 0.96, c.W * 0.5, ORANGE, 0.22);
  const li = c.mediaInfo(LOGO);
  const lw = 780, lh = li ? (lw * li.h) / li.w : 134;
  const k = spring(t - 17.5, SPRING.firm);
  c.with({ x: c.cx, y: 610, scale: lerp(1.25, 1, Math.min(1.04, k)) }, () => {
    c.media(LOGO, -lw / 2, -lh / 2, lw, lh, { fit: "contain", alpha: pr(t, 17.5, 17.75, E.out), key: "logo8" });
  });
  const tag1: Piece[] = [
    { s: "Viral ", st: SANS(112), color: INK, at: 18.45 },
    { s: "captions.", st: SANS(112), color: INK, at: 18.7 },
  ];
  line(c, t, fitTo(tag1, 960), c.cx, 1010, { center: true });
  const tag2: Piece[] = [
    { s: "Zero ", st: SERIF(150), color: DEEP, at: 18.95 },
    { s: "watermark.", st: SERIF(150), color: DEEP, at: 19.2 },
  ];
  line(c, t, fitTo(tag2, 960), c.cx, 1170, { center: true });
  const pu = pr(t, 19.45, 19.62, E.outBack);
  const url = "captionseasy.com";
  const uw = tw(url, SANS(64, 700)) + 84;
  c.rrect(c.cx - (uw * pu) / 2, 1280, uw * pu, 112, 56, LAV);
  if (pu > 0.5) c.text(url, c.cx, 1336, { ...SANS(64, 700), align: "center", valign: "middle" }, { color: INK });
  cut(c, FIST, 858, 1600, 400, 4, pop(t, 18.1));
}

/** The credit line for the bed (CC-BY), small and quiet at the foot of the end card. */
function credit(c: RC, t: number, text: string) {
  const a = pr(t, 19.6, 20.0, E.out);
  if (a > 0) c.text(text, c.cx, 1880, { ...PLAIN(26), align: "center", valign: "middle" }, { color: MUTE, alpha: a });
}

// ── transitions: each takes two full frames and draws the blend ─────────────────────────────────────

/** Ragged, painted edge: the brush's x at height y around `base`. */
const edgeX = (y: number, base: number, seed: number) => base + 26 * noise1(y * 0.009, seed) + 12 * noise1(y * 0.034, seed + 7.3);

function whip(c: RC, A: Layer, B: Layer, u: number) {
  const e = E.hard(u), v = Math.sin(Math.PI * u);
  const sm = v * c.W * 0.16;
  c.drawLayer(c.smearLayer(A, -sm, 0), -e * c.W, 0);
  c.drawLayer(c.smearLayer(B, sm, 0), (1 - e) * c.W, 0);
}

/** The brush erases the frame left to right: the revealed frame sits behind a cream band. */
function brushWipe(c: RC, A: Layer, B: Layer, u: number, seed: number) {
  const base = lerp(-140, c.W + 140, E.inOut(u));
  c.drawLayer(A, 0, 0);
  c.save();
  c.ctx.beginPath();
  c.ctx.moveTo(-40, -40);
  for (let y = -40; y <= c.H + 40; y += 14) c.ctx.lineTo(edgeX(y, base, seed), y);
  c.ctx.lineTo(-40, c.H + 40);
  c.ctx.closePath();
  c.ctx.clip();
  c.drawLayer(B, 0, 0);
  c.restore();
  c.ctx.beginPath();
  for (let y = -40; y <= c.H + 40; y += 14) c.ctx.lineTo(edgeX(y, base, seed), y);
  for (let y = c.H + 40; y >= -40; y -= 14) c.ctx.lineTo(edgeX(y, base, seed) + 46 + 26 * noise1(y * 0.02, seed + 3), y);
  c.ctx.closePath();
  c.ctx.fillStyle = CREAM;
  c.ctx.fill();
}

/** Paints a colour over everything left of a ragged edge (used to erase on the spot). */
function paintOver(c: RC, u: number, color: string, seed: number) {
  if (u <= 0) return;
  const base = lerp(-140, c.W + 140, E.inOut(u));
  c.ctx.beginPath();
  c.ctx.moveTo(-40, -40);
  for (let y = -40; y <= c.H + 40; y += 14) c.ctx.lineTo(edgeX(y, base, seed), y);
  c.ctx.lineTo(-40, c.H + 40);
  c.ctx.closePath();
  c.ctx.fillStyle = color;
  c.ctx.fill();
}

/** A playhead, like the timeline in an editor, scrubs across and reveals the next shot. */
function playhead(c: RC, A: Layer, B: Layer, u: number) {
  const x = lerp(-20, c.W + 20, E.inOut(u));
  c.drawLayer(A, 0, 0);
  c.save();
  c.ctx.beginPath();
  c.ctx.rect(-10, -10, x + 10, c.H + 20);
  c.ctx.clip();
  c.drawLayer(B, 0, 0);
  c.restore();
  c.rect(x - 4, 0, 8, c.H, DEEP);
  c.circle(x, 300, 22, ORANGE);
}

/** The logo's three bars rise across the frame, then slide off downward. */
function bars(c: RC, A: Layer, B: Layer, u: number, cols: string[]) {
  const n = cols.length, bw = c.W / n;
  if (u < 0.5) {
    c.drawLayer(A, 0, 0);
    const v = u / 0.5;
    cols.forEach((col, i) => {
      const k = pr(v, i * 0.1, 0.9, E.ramp);
      const top = c.H * (1 - k);
      c.rect(i * bw, top, bw + 1, c.H - top, col);
    });
  } else {
    c.drawLayer(B, 0, 0);
    const v = (u - 0.5) / 0.5;
    cols.forEach((col, i) => {
      const top = c.H * pr(v, i * 0.08, 0.95, E.ramp);
      if (top < c.H) c.rect(i * bw, top, bw + 1, c.H - top, col);
    });
  }
}

/** A keyhole: the next shot opens from the padlock's keyhole. */
function keyhole(c: RC, A: Layer, B: Layer, u: number) {
  c.drawLayer(A, 0, 0);
  const r = E.ramp(u) * Math.hypot(c.W, c.H) * 0.62;
  if (r < 1) return;
  c.save();
  c.ctx.beginPath();
  c.ctx.arc(KEY.cx, KEY.cy, r, 0, Math.PI * 2);
  c.ctx.clip();
  c.drawLayer(B, 0, 0);
  c.restore();
  c.ctx.beginPath();
  c.ctx.arc(KEY.cx, KEY.cy, r, 0, Math.PI * 2);
  c.ctx.strokeStyle = LAV;
  c.ctx.lineWidth = 18;
  c.ctx.stroke();
}

/** The zero grows: an orange ring opens onto the next shot inside its counter. */
function zeroIris(c: RC, A: Layer, B: Layer, u: number) {
  c.drawLayer(A, 0, 0);
  const rx = lerp(40, c.W * 1.1, E.ramp(u));
  const ry = rx * 1.62;
  c.save();
  c.ctx.beginPath();
  c.ctx.ellipse(c.cx, c.cy, rx, ry, 0, 0, Math.PI * 2);
  c.ctx.clip();
  c.drawLayer(B, 0, 0);
  c.restore();
  c.ctx.beginPath();
  c.ctx.ellipse(c.cx, c.cy, rx, ry, 0, 0, Math.PI * 2);
  c.ctx.strokeStyle = ORANGE;
  c.ctx.lineWidth = 34 * (1 - u * 0.6) + 6;
  c.ctx.stroke();
}

function pushUp(c: RC, A: Layer, B: Layer, u: number) {
  const e = E.ramp(u), v = Math.sin(Math.PI * u);
  c.rect(0, 0, c.W, c.H, CREAM);
  c.drawLayer(c.smearLayer(A, 0, -v * c.H * 0.06), 0, -e * c.H);
  c.drawLayer(c.smearLayer(B, 0, -v * c.H * 0.06), 0, (1 - e) * c.H);
}

// ── the timeline ────────────────────────────────────────────────────────────────────────────────────

type Scene = (c: RC, t: number) => void;
const SCENES: Scene[] = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8];

/** Transitions: the boundary they start on, their length, and how they blend. */
const TRANS: { at: number; d: number; blend: (c: RC, A: Layer, B: Layer, u: number) => void }[] = [
  { at: 2.0, d: 0.45, blend: (c, A, B, u) => brushWipe(c, A, B, u, 3) },
  { at: 5.0, d: 0.35, blend: (c, A, B, u) => playhead(c, A, B, u) },
  { at: 7.5, d: 0.5, blend: (c, A, B, u) => bars(c, A, B, u, [ORANGE, EMERALD, DEEP]) },
  { at: 10.0, d: 0.4, blend: (c, A, B, u) => pushUp(c, A, B, u) },
  { at: 12.5, d: 0.45, blend: (c, A, B, u) => keyhole(c, A, B, u) },
  { at: 15.5, d: 0.6, blend: (c, A, B, u) => zeroIris(c, A, B, u) },
  { at: 17.5, d: 0.5, blend: (c, A, B, u) => bars(c, A, B, u, [EMERALD, ORANGE, LAV]) },
];

function frame(c: RC, t: number, text: string) {
  const k = TRANS.findIndex((x) => t >= x.at && t < x.at + x.d);
  if (k >= 0) {
    const tr = TRANS[k];
    const A = c.layer(c.W, c.H, (lc) => SCENES[k](lc, t));
    const B = c.layer(c.W, c.H, (lc) => SCENES[k + 1](lc, t));
    tr.blend(c, A, B, (t - tr.at) / tr.d);
    return;
  }
  let i = 0;
  for (let j = 0; j < TRANS.length; j++) if (t >= TRANS[j].at + TRANS[j].d) i = j + 1;
  SCENES[i](c, t);
  if (i === 7) credit(c, t, text);
}

type Props = { url: string; credit: string; vo: boolean };

export default defineComponent<Props>({
  id: "offer-erase",
  name: "Erase the Boring (offer film)",
  version: "1.0.0",
  group: "scenes",
  category: "launch",
  description: "A 20-second vertical offer: a plain white subtitle is erased, a viral look takes its place, the looks run in beat cuts, the padlock opens onto a zero, and the logo lands. Hinglish voiceover, word-timed.",
  tags: ["offer", "launch", "captions", "hinglish", "vertical", "20 s", "transitions"],
  added: "2026-10-08",
  camera: "still",
  featured: true,
  theme: { mode: "light", lighting: 0, grain: 0, vignette: 0, backdrop: "plain", bg: CREAM, fg: INK, accent: DEEP },
  notes: "Built for 9:16 at 60 fps on the 120 BPM bed (Delightful D, offset 0.124 s, so beat 0 lands on frame 0). The voiceover is a scratch edge-tts take in films/captionseasy-offer-9x16/vo; swap the files and keep the timings.",
  params: {
    url: P.text("captionseasy.com", "URL", { maxLength: 40 }),
    credit: P.text("\"Delightful D\" by Kevin MacLeod (incompetech.com), CC-BY 4.0", "Credit line", { maxLength: 120 }),
    vo: P.bool(true, "Voiceover", { help: "The Hinglish narration (scratch take in films/captionseasy-offer-9x16/vo)." }),
  },
  duration: 20,
  media: () => [LOGO, HERO_RAW, HERO_CAP, MIC, LOCK, OVERWHELMED, FIST, CREATOR_1, CREATOR_2, CREATOR_3, LOOKS_3],
  sounds: (p): SoundCue[] => {
    const out: SoundCue[] = [
      { at: 0, sound: "impact.land", gain: 0.5, role: "open" },
      { at: 2.0, sound: "whoosh.swipe", gain: 0.6, role: "erase" },
      { at: 2.42, sound: "ui.pop", gain: 0.35, role: "landed" },
      { at: 3.0, sound: "ui.tick", gain: 0.4, role: "strike" },
      { at: 3.4, sound: "ui.tick", gain: 0.4, role: "strike" },
      { at: 4.45, sound: "impact.punch", gain: 0.55, role: "nahi" },
      { at: 5.0, sound: "whoosh.air", gain: 0.5, role: "playhead" },
      { at: 5.5, sound: "ui.tick", gain: 0.35, role: "cut" },
      { at: 6.0, sound: "ui.tick", gain: 0.35, role: "cut" },
      { at: 6.5, sound: "ui.tick", gain: 0.35, role: "cut" },
      { at: 7.0, sound: "ui.tick", gain: 0.35, role: "cut" },
      { at: 7.5, sound: "whoosh.whip", gain: 0.6, role: "bars" },
      { at: 7.8, sound: "impact.land", gain: 0.5, role: "land" },
      { at: 9.95, sound: "tonal.chime", gain: 0.4, role: "check" },
      { at: 10.0, sound: "whoosh.swipe", gain: 0.5, role: "push" },
      { at: 11.0, sound: "ui.click", gain: 0.5, role: "rattle" },
      { at: 11.12, sound: "ui.click", gain: 0.45, role: "rattle" },
      { at: 11.35, sound: "tonal.chime", gain: 0.45, role: "unlock" },
      { at: 12.5, sound: "whoosh.deep", gain: 0.5, role: "keyhole" },
      { at: 12.95, sound: "whoosh.swipe", gain: 0.45, role: "erase" },
      { at: 14.45, sound: "impact.sub", gain: 0.6, role: "zero" },
      { at: 15.45, sound: "impact.punch", gain: 0.5, role: "free" },
      { at: 15.5, sound: "riser.build", len: 0.5, gain: 0.45, role: "zero" },
      { at: 16.0, sound: "impact.land", gain: 0.5, role: "zero" },
      { at: 17.5, sound: "whoosh.whip", gain: 0.55, role: "bars" },
      { at: 17.55, sound: "impact.land", gain: 0.6, role: "slam" },
      { at: 18.45, sound: "ui.tick", gain: 0.3, role: "type" },
      { at: 18.95, sound: "ui.tick", gain: 0.3, role: "type" },
      { at: 19.45, sound: "ui.pop", gain: 0.45, role: "url" },
    ];
    if (p.vo) for (const id of Object.keys(VO)) out.push({ at: VO[id].at, sound: `url:films/captionseasy-offer-9x16/vo/${id}.mp3`, gain: 1, role: "vo" });
    return out;
  },
  render(c, p) {
    frame(c, c.t, p.credit);
  },
});
