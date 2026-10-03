import { E, P, alpha, clamp, defineComponent, pr, type SoundCue } from "@motioneasy/engine";
import { stage, style } from "../kit";

type Props = { title: string; steps: string[]; step: number; font: string };

const START = 1.0;

export default defineComponent<Props>({
  id: "four-steps",
  name: "Four Steps",
  version: "1.0.0",
  group: "scenes",
  category: "lists",
  description: "A how-it-works beat: a big odometer rolls 01 → 04 while each step's title and detail swap in, and a progress rail fills underneath.",
  tags: ["steps", "how it works", "odometer", "tutorial", "process"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.25 },
  notes: "Write steps as 'Title|detail'. 3–5 steps.",
  params: {
    title: P.text("From camera roll to *captioned* in four moves.", "Title", { maxLength: 70 }),
    steps: P.list(["Upload the take|Drop any clip into your browser.", "Every word gets a timestamp|Whisper runs on your machine.", "Pick a look, direct the frame|33 looks, one click each.", "Export and post|MP4 + SRT, no watermark."], "Steps (title|detail)", { min: 2, max: 6, maxLength: 80 }),
    step: P.number(1.25, "Time per step", { min: 0.6, max: 3, step: 0.05, unit: "s" }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => START + p.steps.length * p.step + 1,
  poster: 0.5,
  sounds: (p) => {
    const cues: SoundCue[] = [{ at: 0.1, sound: "whoosh.air", gain: 0.4, role: "title" }];
    p.steps.forEach((_, i) => {
      cues.push({ at: START + i * p.step, sound: "whoosh.swipe", gain: 0.4, seed: (i % 2) + 1, role: "roll" });
      cues.push({ at: START + i * p.step + 0.3, sound: "ui.tick", gain: 0.5, role: "lock" });
    });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { kind: "studio" });
    const V = c.vertical;
    const n = p.steps.length;
    const steps = p.steps.map((s) => {
      const [a, ...b] = s.split("|");
      return { title: a.trim(), detail: b.join("|").trim() };
    });
    const H = c.fit(p.title, style(c, V ? 84 : 70, { fontParam: p.font, weight: 750 }), c.safe.w, 260, { maxLines: 3 });
    const tu = pr(t, 0.1, 0.8, E.out);
    const top = c.safe.y + (V ? 60 : 0);
    c.drawLayout(H, c.safe.x, top + (1 - tu) * 20, { color: T.fg, emColor: T.accent, alpha: tu });
    // Step index: continuous, eased between steps.
    let pos = 0;
    for (let i = 1; i < n; i++) pos += pr(t, START + i * p.step, START + i * p.step + 0.45, E.ramp);
    const intro = pr(t, START - 0.4, START + 0.2, E.out);
    const numSize = V ? 400 : 300;
    const ny = V ? c.cy - 40 : c.cy + 20;
    // Odometer digits: the "0" stays, the units digit rolls.
    const z = c.layout("0", { font: T.font, size: numSize, weight: 750, tracking: -0.05 });
    const dw = z.width * 0.98;
    const nx = c.safe.x;
    c.drawLayout(z, nx, ny - z.cap / 2, { color: T.fg, alpha: intro });
    c.save();
    c.clipRect(nx + dw - 10, ny - z.cap / 2 - numSize * 0.18, dw + 40, z.cap + numSize * 0.36);
    for (let i = 0; i < n; i++) {
      const d = i - pos;
      if (Math.abs(d) > 1.2) continue;
      const D = c.layout(String(i + 1), { font: T.font, size: numSize, weight: 750, tracking: -0.05 });
      c.drawLayout(D, nx + dw + (dw - D.width) / 2, ny - z.cap / 2 + d * numSize * 0.95, { color: T.fg, alpha: intro * clamp(1 - Math.abs(d) * 0.8) });
    }
    c.restore();
    // Step copy: swaps with a short rise.
    const tx = V ? c.safe.x : nx + dw * 2 + 80;
    const ty = V ? ny + z.cap / 2 + 90 : ny - 60;
    const tw = V ? c.safe.w : c.safe.w - (tx - c.safe.x);
    const idx = Math.round(pos);
    const local = t - (START + idx * p.step);
    const ku = idx === 0 ? pr(t, START, START + 0.5, E.out) : pr(local, 0.15, 0.6, E.out);
    const s = steps[Math.min(n - 1, idx)];
    const Tt = c.fit(s.title, style(c, V ? 64 : 54, { fontParam: p.font, weight: 700 }), tw, 160, { maxLines: 2 });
    const Td = c.fit(s.detail, style(c, V ? 40 : 34, { fontParam: p.font, weight: 500, lineHeight: 1.3 }), tw, 140, { maxLines: 2 });
    c.save();
    c.clipRect(tx - 10, ty - 20, tw + 20, Tt.height + Td.height + 140);
    c.drawLayout(Tt, tx, ty + (1 - ku) * 60, { color: T.fg, alpha: ku });
    c.drawLayout(Td, tx, ty + Tt.height + 30 + (1 - ku) * 80, { color: T.soft, alpha: ku });
    c.restore();
    // Progress rail.
    const ry = V ? c.safe.y + c.safe.h - 40 : c.safe.y + c.safe.h - 20;
    const prog = intro * (pos + 1) / n;
    c.line(c.safe.x, ry, c.safe.x + c.safe.w, ry, alpha(T.fg, 0.1), 6);
    c.line(c.safe.x, ry, c.safe.x + c.safe.w * prog, ry, T.fg, 6);
    for (let i = 0; i < n; i++) c.circle(c.safe.x + (c.safe.w * (i + 1)) / n, ry, 9, i <= pos + 0.01 ? T.fg : alpha(T.fg, 0.15));
  },
});
