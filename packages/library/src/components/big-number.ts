import { E, P, alpha, clamp, defineComponent, pr, type RC, type SoundCue } from "@motioneasy/engine";
import { stage, style } from "../kit";

type Props = { value: number; from: number; decimals: number; prefix: string; suffix: string; label: string; count: number; hold: number; size: number; font: string; weight: number; separator: boolean };

const START = 0.35;

function format(v: number, p: Props) {
  const fixed = v.toFixed(p.decimals);
  if (!p.separator) return fixed;
  const [i, d] = fixed.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? "." + d : "");
}

/** Value at time t: an expo-out count so it races, then settles on the number. */
const valueAt = (p: Props, t: number) => p.from + (p.value - p.from) * pr(t, START, START + p.count, E.out);

export default defineComponent<Props>({
  id: "big-number",
  name: "Big Number",
  version: "1.0.0",
  group: "elements",
  category: "numbers",
  description: "A huge stat on odometer wheels: digits roll with motion blur, decelerate onto the number, then the unit and the line underneath land.",
  tags: ["stat", "counter", "odometer", "proof", "data"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.25 },
  notes: "One number per shot, and only real numbers (honesty rule).",
  params: {
    value: P.number(33, "Value", { min: -1e9, max: 1e9, step: 1, group: "content" }),
    from: P.number(0, "Count from", { min: -1e9, max: 1e9, step: 1, group: "content" }),
    decimals: P.number(0, "Decimals", { min: 0, max: 2, step: 1, group: "content" }),
    prefix: P.text("", "Prefix", { maxLength: 3, help: "e.g. $ or +" }),
    suffix: P.text("looks", "Unit", { maxLength: 12, help: "Set in the serif accent next to the number." }),
    label: P.text("caption styles, one click each", "Label", { maxLength: 70 }),
    count: P.number(1.8, "Count time", { min: 0.5, max: 4, step: 0.1, unit: "s" }),
    hold: P.number(1.5, "Hold", { min: 0.3, max: 4, step: 0.1, unit: "s" }),
    size: P.number(1, "Size", { min: 0.5, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
    weight: P.number(700, "Weight", { min: 200, max: 800, step: 50, group: "style" }),
    separator: P.bool(true, "Thousands separator"),
  },
  duration: (p) => START + p.count + 0.6 + p.hold,
  poster: 0.9,
  sounds: (p) => {
    // Ticks follow the deceleration: dense at first, sparse as the wheels settle.
    const cues: SoundCue[] = [];
    const N = 14;
    for (let i = 1; i < N; i++) {
      const target = i / N;
      // invert expo-out numerically
      let lo = 0, hi = 1;
      for (let k = 0; k < 24; k++) {
        const m = (lo + hi) / 2;
        if (E.out(m) < target) lo = m;
        else hi = m;
      }
      cues.push({ at: START + lo * p.count, sound: "ui.tick", gain: 0.5 - i * 0.015, seed: (i % 2) + 1, role: "tick" });
    }
    cues.push({ at: START + p.count * 0.82, sound: "tonal.chime", gain: 0.4, role: "land" });
    cues.push({ at: START + p.count * 0.82, sound: "impact.land", gain: 0.5, role: "land" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const v = valueAt(p, t);
    const finalStr = format(p.value, p);
    const size = (c.vertical ? 330 : c.landscape ? 300 : 300) * p.size;
    const st = style(c, size, { fontParam: p.font, weight: p.weight, tracking: -0.045 });
    // Fixed digit cell (tabular): widest digit of the face.
    const digitW = Math.max(...[..."0123456789"].map((d) => c.layout(d, st).width)) * 0.98;
    const cell = (ch: string) => (/\d/.test(ch) ? digitW : c.layout(ch, st).width + size * 0.02);
    const chars = [...(p.prefix + finalStr)];
    let numW = chars.reduce((a, ch) => a + cell(ch), 0);
    const suf = p.suffix ? c.layout(`*${p.suffix}*`, { ...st, size: size * 0.42 }) : null;
    const gapS = size * 0.12;
    let totalW = numW + (suf ? gapS + suf.width : 0);
    const maxW = c.safe.w * 0.94;
    const k = totalW > maxW ? maxW / totalW : 1;
    numW *= k;
    totalW *= k;
    const sz = size * k;
    const capH = c.layout("0", { ...st, size: sz }).cap;
    const label = p.label ? c.fit(p.label, style(c, Math.max(34, sz * 0.15), { fontParam: p.font, weight: 500, tracking: -0.01, lineHeight: 1.25 }), Math.min(c.safe.w * 0.85, Math.max(totalW, 500)), sz * 0.6, { align: "center" }) : null;
    const blockH = capH + (label ? sz * 0.42 + label.height : 0);
    const top = c.cy - blockH / 2;
    const base = top + capH;
    const x0 = c.cx - totalW / 2;

    const landed = pr(t, START + p.count * 0.8, START + p.count * 0.8 + 0.6, E.out);
    stage(c, { kind: "soft", focus: [c.cx, top + capH / 2], flare: landed * (1 - landed) * 2 });
    const intro = pr(t, 0.05, START + 0.3, E.out);

    // Odometer: each digit column is a wheel at (v / 10^place) mod 10.
    const decimals = p.decimals;
    const scaled = Math.abs(v) * Math.pow(10, decimals);
    const speed = Math.abs(valueAt(p, t + 1 / 120) - valueAt(p, t - 1 / 120)) * 60 * Math.pow(10, decimals);
    let x = x0;
    let place = finalStr.replace(/[^\d]/g, "").length - 1;
    const pre = [...p.prefix];
    for (const ch of chars) {
      const w = cell(ch) * k;
      if (!/\d/.test(ch) || pre.length) {
        if (pre.length && pre[0] === ch) pre.shift();
        c.drawLayout(c.layout(ch, { ...st, size: sz }), x + (w - c.layout(ch, { ...st, size: sz }).width) / 2, top, { color: T.fg, alpha: intro });
        x += w;
        continue;
      }
      // Real odometer: the units wheel turns continuously, every higher wheel only turns while
      // the wheel below it rolls from 9 to 0.
      const magnitude = Math.pow(10, place);
      const xw = scaled / magnitude;
      const wheel = place === 0 ? xw % 10 : (Math.floor(xw) % 10) + Math.min(1, Math.max(0, (xw - Math.floor(xw)) * 10 - 9));
      const shown = t > START + p.count ? 1 : clamp((scaled + 0.5) / magnitude - 0.6);
      const wheelSpeed = place === 0 ? speed : speed / magnitude * (wheel % 1 > 0.001 ? 10 : 0);
      drawWheel(c, x, top, w, capH, sz, st, wheel, wheelSpeed, intro * (place === 0 ? 1 : shown), T.fg);
      x += w;
      place--;
    }
    // Unit lands after the count.
    if (suf) {
      const u = pr(t, START + p.count * 0.75, START + p.count * 0.75 + 0.7, E.out);
      c.drawLayout(suf, x0 + numW + gapS * k + (1 - u) * 30, base - suf.height - capH * 0.02, { color: T.fg, emColor: T.accent, alpha: u });
    }
    if (label) {
      const u = pr(t, START + p.count * 0.85, START + p.count * 0.85 + 0.8, E.out);
      const ly = base + sz * 0.42;
      const lw = Math.min(totalW, label.width + 120);
      c.line(c.cx - (lw * u) / 2, ly - sz * 0.2, c.cx + (lw * u) / 2, ly - sz * 0.2, alpha(T.fg, 0.18), 2, "butt");
      c.drawLayout(label, c.cx - label.width / 2, ly + (1 - u) * 16, { color: T.soft, emColor: T.fg, alpha: u });
    }
  },
});

function drawWheel(c: RC, x: number, top: number, w: number, capH: number, size: number, st: ReturnType<typeof style>, wheel: number, speed: number, a: number, color: string) {
  if (a <= 0.01) return;
  const step = size * 0.95; // distance between digits on the wheel
  const m = size * 0.26; // soft margin above and below the window
  const blur = Math.min(step * 0.5, speed * step * 0.011); // ~1/90 s shutter
  const base = Math.floor(wheel);
  const frac = wheel - base;
  const extra = blur + size * 0.1;
  // 1. The strip of digits, taller than the window so the smear has material to pull in.
  const strip = c.layer(w, capH + (m + extra) * 2, (lc) => {
    for (let k = -1; k <= 1; k++) {
      const d = (((base + k) % 10) + 10) % 10;
      const D = lc.layout(String(d), { ...st, size });
      lc.drawLayout(D, (w - D.width) / 2, m + extra + (k - frac) * step, { color });
    }
  });
  // 2. Motion blur along the roll.
  const S = blur > 0.8 ? c.smearLayer(strip, 0, blur) : strip;
  // 3. The window: digits fade into the soft edges, like a curved wheel.
  const H = capH + m * 2;
  const win = c.layer(w, H, (lc) => {
    lc.drawLayer(S, 0, -extra);
    lc.blend("destination-in");
    const e = (m / H) * 1.1;
    lc.rect(-w, 0, w * 3, H, lc.linear(0, 0, 0, H, [[0, "rgba(0,0,0,0)"], [e, "#000"], [1 - e, "#000"], [1, "rgba(0,0,0,0)"]]));
  }, { pad: 4 });
  c.drawLayer(win, x, top - m, { alpha: a });
}
