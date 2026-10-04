import { E, P, SPRING, alpha, clamp, defineComponent, jitterStagger, pr, rand, sp, type SoundCue } from "@motioneasy/engine";
import { heroWord, stage, style } from "../kit";

type Props = { text: string; variant: "rise" | "drop" | "scatter"; align: "center" | "left"; stagger: number; size: number; font: string; weight: number; rule: boolean; hold: number };

const START = 0.12;
const CHAR = 0.62;

const charCount = (s: string) => s.replace(/[*\s]/g, "").length;

export default defineComponent<Props>({
  id: "char-cascade",
  name: "Char Cascade",
  version: "1.0.0",
  group: "elements",
  category: "kinetic-type",
  description: "Every letter arrives on its own spring, a couple of frames after the last, never in lockstep. Accent words pop a little bigger, then a hairline draws underneath.",
  tags: ["kinetic", "letters", "stagger", "spring", "headline"],
  added: "2026-10-04",
  featured: true,
  theme: { mode: "light", lighting: 0.55, grain: 0.3, vignette: 0.25 },
  notes: "The per-character stagger that makes type feel hand-animated. Rise for calm lines, Drop for punch, Scatter for a playful hook. Don't follow it with another per-letter reveal.",
  params: {
    text: P.text("Captions that *move.*", "Text", { multiline: true, maxLength: 80 }),
    variant: P.select("rise", "Motion", [
      { value: "rise", label: "Rise (from the baseline)" },
      { value: "drop", label: "Drop (from above, bouncy)" },
      { value: "scatter", label: "Scatter (letters converge)" },
    ]),
    align: P.select("center", "Align", ["center", "left"]),
    stagger: P.number(0.03, "Letter stagger", { min: 0.01, max: 0.1, step: 0.005, unit: "s" }),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
    weight: P.number(750, "Weight", { min: 300, max: 800, step: 50, group: "style" }),
    rule: P.bool(true, "Hairline", { help: "A thin line draws under the block once the last letter lands." }),
    hold: P.number(1.3, "Hold", { min: 0.3, max: 4, step: 0.1, unit: "s" }),
  },
  duration: (p) => START + charCount(p.text) * p.stagger + CHAR + 0.5 + p.hold,
  poster: 0.8,
  sounds: (p) => {
    const n = charCount(p.text);
    const cues: SoundCue[] = [{ at: START, sound: p.variant === "drop" ? "whoosh.whip" : "whoosh.swipe", gain: 0.5, role: "in" }];
    for (let i = 0; i < n; i += 3) cues.push({ at: START + i * p.stagger + CHAR * 0.4, sound: "ui.tick", gain: 0.16 + 0.1 * (i / Math.max(1, n)), seed: i, role: "letters" });
    cues.push({ at: START + n * p.stagger + CHAR * 0.6, sound: "impact.land", gain: 0.45, role: "lock" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const center = p.align === "center";
    const st = style(c, (c.vertical ? 190 : c.landscape ? 165 : 170) * p.size, { fontParam: p.font, weight: p.weight, lineHeight: 1.04 });
    const L = c.fit(p.text, st, c.safe.w * 0.92, c.safe.h * 0.5, { align: center ? "center" : "left" });
    const ox = center ? c.cx - L.width / 2 : c.safe.x;
    const oy = c.cy - L.height / 2;
    stage(c, { word: heroWord(p.text), kind: "soft", focus: [c.cx, oy + L.height / 2] });

    const seed = c.env.seed;
    for (const w of L.words) {
      const cfg = w.em ? SPRING.pop : p.variant === "drop" ? SPRING.punchy : SPRING.firm;
      for (let i = 0; i < w.chars.length; i++) {
        const ch = w.chars[i];
        if (!ch.ch.trim()) continue;
        const gi = w.charStart + i;
        const at = START + jitterStagger(gi, p.stagger, seed);
        if (t < at) continue;
        const y = sp(t, at, cfg); // 0 → 1 with overshoot
        const a = clamp(pr(t, at, at + CHAR * 0.35));
        const r = 1 - y;
        let dx = 0, dy = 0, rot = 0, sc = 1;
        if (p.variant === "rise") { dy = r * w.size * 0.75; rot = r * 9; }
        else if (p.variant === "drop") { dy = -r * w.size * 1.1; rot = -r * 6; }
        else {
          const ang = rand(seed + gi * 13) * Math.PI * 2;
          dx = Math.cos(ang) * r * w.size * 2.4;
          dy = Math.sin(ang) * r * w.size * 1.6;
          rot = (rand(seed + gi * 7) - 0.5) * 80 * r;
        }
        if (w.em) sc = 0.55 + 0.45 * y;
        const cx = ox + w.x + ch.x + ch.w / 2, cy = oy + w.y - w.size * 0.34;
        c.with({ x: cx + dx, y: cy + dy, rotate: rot, scale: sc }, () => c.char(w, i, -ch.w / 2, w.size * 0.34, { color: T.fg, emColor: T.accent, alpha: a }));
      }
    }
    if (p.rule) {
      const last = START + charCount(p.text) * p.stagger + CHAR * 0.5;
      const u = pr(t, last, last + 0.7, E.out);
      if (u > 0) {
        const rw = Math.min(L.width * 0.42, 300) * u;
        const ry = oy + L.height + L.size * 0.32;
        const rx = center ? c.cx - rw / 2 : ox;
        c.line(rx, ry, rx + rw, ry, alpha(T.fg, 0.35), 3, "butt");
      }
    }
  },
});
