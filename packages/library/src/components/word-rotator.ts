import { E, P, alpha, clamp, defineComponent, mix, pr, spring, SPRING, type SoundCue } from "@motioneasy/engine";
import { stage, style } from "../kit";

type Props = { prefix: string; words: string[]; hold: number; variant: "drum" | "slide" | "focus"; box: boolean; size: number; font: string; weight: number };

const START = 0.55;
const SWITCH = 0.5;

export default defineComponent<Props>({
  id: "word-rotator",
  name: "Word Rotator",
  version: "1.0.0",
  group: "elements",
  category: "kinetic-type",
  description: "A fixed line and a rotating word that rolls on a 3D drum. The slot behind it resizes with a spring for every new word.",
  tags: ["rotating", "3d", "headline", "list", "kinetic"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.25 },
  notes: "Great for 'X for Y' value props. Keep words short (one or two words) and 3–6 of them.",
  params: {
    prefix: P.text("Captions for", "Fixed line", { maxLength: 40 }),
    words: P.list(["podcasts.", "reels.", "lessons.", "*everyone.*"], "Rotating words", { min: 2, max: 8, maxLength: 24 }),
    hold: P.number(1, "Time per word", { min: 0.5, max: 2.5, step: 0.05, unit: "s" }),
    variant: P.select("drum", "Motion", [
      { value: "drum", label: "3D drum" },
      { value: "slide", label: "Slide + blur" },
      { value: "focus", label: "Focus swap" },
    ]),
    box: P.bool(true, "Highlight slot", { help: "An ink slot behind the rotating word that resizes to fit." }),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
    weight: P.number(750, "Weight", { min: 300, max: 800, step: 50, group: "style" }),
  },
  duration: (p) => START + p.words.length * p.hold + 0.6,
  poster: 0.4,
  sounds: (p) => {
    const cues: SoundCue[] = [{ at: 0.05, sound: "whoosh.air", gain: 0.45, role: "intro" }];
    for (let i = 1; i < p.words.length; i++) {
      const at = START + i * p.hold - SWITCH * 0.6;
      cues.push({ at, sound: "whoosh.swipe", gain: 0.5, seed: i % 2 + 1, role: "switch" });
      cues.push({ at: at + SWITCH * 0.85, sound: "ui.tick", gain: 0.45, seed: i % 2 + 1, role: "settle" });
    }
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const words = p.words.length ? p.words : ["…"];
    const n = words.length;
    stage(c, { kind: "soft" });
    const base = (c.vertical ? 150 : 130) * p.size;
    const st = style(c, base, { fontParam: p.font, weight: p.weight });
    // One size for prefix and all words: fit the widest.
    const sizes = [p.prefix, ...words].filter(Boolean).map((w) => c.fit(w, st, c.safe.w * (c.landscape ? 0.48 : 0.86), base * 1.2, { maxLines: 1 }).size);
    const size = Math.min(...sizes);
    const S = { ...st, size };
    const pre = p.prefix ? c.layout(p.prefix, S) : null;
    const lays = words.map((w) => c.layout(w, S));
    const padX = size * 0.28, padY = size * 0.2;
    const lh = size * 1.18;

    // Which word, and how far through the switch to the next one.
    const raw = (t - START) / p.hold;
    const idx = clamp(Math.floor(raw), 0, n - 1);
    const local = t - START - idx * p.hold;
    const sw = idx < n - 1 ? pr(local, p.hold - SWITCH, p.hold, E.ramp) : 0;
    const intro = pr(t, 0.05, START + 0.2, E.out);

    // Slot width follows the words with a spring.
    const wA = lays[idx].width, wB = lays[Math.min(n - 1, idx + 1)].width;
    const switchStart = START + idx * p.hold + p.hold - SWITCH;
    const k = idx < n - 1 && t > switchStart ? spring(t - switchStart, SPRING.firm) : 0;
    const slotW = (wA + (wB - wA) * k) + padX * 2;
    const slotH = lays[0].cap + padY * 2.4;

    const row = !!pre && c.landscape;
    const totalW = row && pre ? pre.width + size * 0.3 + slotW : slotW;
    const blockH = row || !pre ? slotH : pre.cap + lh * 0.62 + slotH;
    const top = c.cy - blockH / 2;
    if (pre) {
      const px = row ? c.cx - totalW / 2 : c.cx - pre.width / 2;
      const py = row ? top + padY * 1.2 : top;
      c.drawLayout(pre, px, py + (1 - intro) * 30, { color: T.fg, emColor: T.accent, alpha: intro });
    }
    const sx = row && pre ? c.cx - totalW / 2 + pre.width + size * 0.3 : c.cx - slotW / 2;
    const sy = row || !pre ? top : top + pre.cap + lh * 0.62;
    const ink = p.box ? T.bg : T.fg;
    if (p.box) {
      const a = pr(t, 0.2, START + 0.1, E.out);
      c.save();
      c.shadow(alpha("#000000", T.mode === "dark" ? 0.4 : 0.18), 30, 0, 14);
      c.rrect(sx + (slotW * (1 - a)) / 2, sy, slotW * a, slotH, size * 0.22, T.fg);
      c.restore();
    }
    c.save();
    c.clipRRect(sx, sy - (p.box ? 0 : size * 0.3), slotW, slotH + (p.box ? 0 : size * 0.6), size * 0.22);
    const cx = sx + slotW / 2, cy = sy + slotH / 2;
    const draw = (i: number, phase: number) => {
      // phase: 0 = resting, -1..0 incoming, 0..1 outgoing
      const L = lays[i];
      const a = Math.cos((phase * Math.PI) / 2);
      if (a <= 0.01) return;
      const opts = { color: ink, emColor: p.box ? ink : T.accent };
      if (p.variant === "drum") {
        // A drum of radius r: rotate around the slot's horizontal axis.
        const r = slotH * 0.62;
        const th = (phase * Math.PI) / 2;
        const y = Math.sin(th) * r * -1;
        const sy2 = Math.cos(th);
        c.with({ x: cx, y: cy + y, sy: Math.max(0.02, sy2) }, () => c.drawLayout(L, -L.width / 2, -L.cap / 2, { ...opts, alpha: a * (0.4 + 0.6 * sy2) }));
      } else if (p.variant === "slide") {
        const y = -phase * slotH * 0.9;
        c.with({ x: cx, y: cy + y }, () => c.drawLayout(L, -L.width / 2, -L.cap / 2, { ...opts, alpha: a }));
      } else {
        const s = 1 + phase * 0.25;
        c.with({ x: cx, y: cy, scale: s }, () => c.drawLayout(L, -L.width / 2, -L.cap / 2, { ...opts, alpha: 1 - Math.abs(phase) }));
      }
    };
    if (intro > 0) {
      if (sw > 0) {
        draw(idx, sw);
        draw(idx + 1, sw - 1);
      } else draw(idx, t < START ? -(1 - intro) : 0);
    }
    c.restore();
    void mix;
  },
});
