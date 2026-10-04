import { E, P, clamp, defineComponent, pr, type SoundCue, type TextLayout } from "@motioneasy/engine";
import { beat, heroWord, ladder, stage, style, tint } from "../kit";

type Props = { text: string; bpm: number; uppercase: boolean; looks: "mixed" | "solid" | "outline"; size: number; font: string; weight: number; hold: number };

const START = 0.2;
const TRAVEL = 0.34;

const linesOf = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export default defineComponent<Props>({
  id: "kinetic-stack",
  name: "Kinetic Stack",
  version: "1.0.0",
  group: "elements",
  category: "kinetic-type",
  description: "Poster typography: every line is set to the full width of the frame, so short words go huge. Lines slam in from alternating sides on the beat with real motion blur: solid, outline, then a colour bar.",
  tags: ["poster", "kinetic", "beat", "bold", "fill the frame"],
  added: "2026-10-04",
  featured: true,
  theme: { mode: "light", lighting: 0.45, grain: 0.35, vignette: 0.2, backdrop: "plain" },
  notes: "Fills the frame with type, so it needs no backdrop. 2–5 short lines; one word per line hits hardest. Set the BPM to the track.",
  params: {
    text: P.text("Stop\ntiming\n*captions.*", "Lines", { multiline: true, maxLength: 90, help: "One line per beat. Each line is scaled to the full width." }),
    bpm: P.number(120, "Tempo", { min: 60, max: 180, step: 1, unit: "BPM", help: "Each line lands on a beat." }),
    uppercase: P.bool(true, "Uppercase"),
    looks: P.select("mixed", "Line looks", [
      { value: "mixed", label: "Mixed (solid, outline, bar)" },
      { value: "solid", label: "All solid" },
      { value: "outline", label: "Outline with solid accent" },
    ]),
    size: P.number(1, "Fill", { min: 0.6, max: 1, step: 0.05, group: "style", help: "1 = lines run edge to edge of the safe area." }),
    font: P.font("brand", "Typeface"),
    weight: P.number(800, "Weight", { min: 500, max: 800, step: 50, group: "style" }),
    hold: P.number(1.2, "Hold", { min: 0.3, max: 4, step: 0.1, unit: "s" }),
  },
  duration: (p) => START + linesOf(p.text).length * beat(p.bpm) + TRAVEL + p.hold,
  poster: 0.85,
  sounds: (p) => {
    const n = linesOf(p.text).length;
    const cues: SoundCue[] = [];
    for (let i = 0; i < n; i++) {
      const at = START + i * beat(p.bpm);
      cues.push({ at, sound: "whoosh.whip", gain: 0.35, seed: i, role: "in" });
      cues.push({ at: at + TRAVEL * 0.8, sound: i === n - 1 ? "impact.punch" : "impact.land", gain: ladder(i, n, 0.55, 0.75), role: "slam" });
    }
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const lines = linesOf(p.text);
    stage(c, { word: heroWord(p.text), kind: "soft" });
    const box = c.safe;
    const maxW = box.w * p.size;
    // Size each line to the full width; then scale the whole stack down if it is too tall.
    const ref = 100;
    const fitted: { L: TextLayout; k: number }[] = lines.map((ln) => {
      const L0 = c.layout(ln, { ...style(c, ref, { fontParam: p.font, weight: p.weight, lineHeight: 0.9, uppercase: p.uppercase, tracking: -0.045 }) });
      return { L: L0, k: maxW / Math.max(1, L0.width) };
    });
    const gap = 0.16;
    const total = fitted.reduce((s, f) => s + f.L.cap * f.k, 0) * (1 + gap) - fitted[fitted.length - 1].L.cap * fitted[fitted.length - 1].k * gap;
    const shrink = Math.min(1, (box.h * 0.82) / Math.max(1, total));
    let y = c.cy - (total * shrink) / 2;
    fitted.forEach(({ L, k: k0 }, i) => {
      const k = k0 * shrink;
      const capH = L.cap * k;
      const at = START + i * beat(p.bpm);
      const e = pr(t, at, at + TRAVEL, E.out);
      const top = y;
      y += capH * (1 + gap);
      if (e <= 0) return;
      const dir = i % 2 ? 1 : -1;
      const x = c.cx - (L.width * k) / 2 + dir * (1 - e) * c.W * 1.1;
      // velocity → smear length (the distance travelled while the shutter is open)
      const v = (pr(t, at, at + TRAVEL, E.out) - pr(t - 1 / 60, at, at + TRAVEL, E.out)) * c.W * 1.1;
      const look = p.looks === "solid" ? 0 : p.looks === "outline" ? (i === lines.length - 1 ? 0 : 1) : i % 3;
      // Layer in layout units scaled by k: cap top at 0.15·cap, baseline at 1.15·cap.
      const lay = c.layer(L.width * k, capH * 1.3, (lc) => {
        lc.with({ scale: k }, () => {
          const by = L.cap * 1.15 - L.lines[0].y;
          if (look === 2) {
            lc.rect(-ref * 0.08, L.cap * 0.15 - ref * 0.1, L.width + ref * 0.16, L.cap + ref * 0.2, T.fg);
            lc.drawLayout(L, 0, by, { color: T.bg, emColor: tint(lc, 0.9) });
          } else if (look === 1) {
            lc.drawLayout(L, 0, by, { outline: true, stroke: { color: T.fg, width: 2.6 }, emColor: T.accent });
          } else lc.drawLayout(L, 0, by, { color: T.fg, emColor: T.accent });
        });
      }, { pad: 30 });
      const smear = Math.abs(v) > 2 ? c.smearLayer(lay, -dir * Math.min(Math.abs(v) * 0.5, c.W * 0.4), 0) : lay;
      c.drawLayer(smear, x, top - capH * 0.15, { alpha: clamp(e * 4) });
    });
  },
});
