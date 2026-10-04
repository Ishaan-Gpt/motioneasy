import { E, P, defineComponent, jitterStagger, pr, type SoundCue } from "@motioneasy/engine";
import { heroWord, lineWindow, stage, style, tint } from "../kit";

type Props = { text: string; align: "left" | "center"; bar: "accent" | "ink" | "tint"; stagger: number; size: number; font: string; weight: number; hold: number };

const START = 0.15;
const LINE = 0.72;

const lineCount = (s: string) => s.split("\n").length;

export default defineComponent<Props>({
  id: "bar-wipe",
  name: "Bar Wipe",
  version: "1.0.0",
  group: "elements",
  category: "text-reveals",
  description: "A solid bar shoots across each line, then pulls away to the far side and leaves the words behind. Editorial and fast; every line on its own beat.",
  tags: ["editorial", "wipe", "reveal", "bar", "clean"],
  added: "2026-10-04",
  featured: true,
  theme: { mode: "light", lighting: 0.5, grain: 0.3, vignette: 0.2 },
  notes: "Great for lists of claims or a three-line hook. The bar uses the accent colour; on a busy backdrop use Ink.",
  params: {
    text: P.text("Upload.\nPick a look.\n*Post.*", "Lines", { multiline: true, maxLength: 120 }),
    align: P.select("left", "Align", ["left", "center"]),
    bar: P.select("accent", "Bar colour", [
      { value: "accent", label: "Accent" },
      { value: "ink", label: "Ink" },
      { value: "tint", label: "Brand tint" },
    ]),
    stagger: P.number(0.2, "Line stagger", { min: 0.08, max: 0.6, step: 0.02, unit: "s" }),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
    weight: P.number(780, "Weight", { min: 300, max: 800, step: 10, group: "style" }),
    hold: P.number(1.4, "Hold", { min: 0.3, max: 4, step: 0.1, unit: "s" }),
  },
  duration: (p) => START + (lineCount(p.text) - 1) * p.stagger + LINE + p.hold,
  poster: 0.85,
  sounds: (p) => {
    const cues: SoundCue[] = [];
    const n = lineCount(p.text);
    for (let i = 0; i < n; i++) cues.push({ at: START + i * p.stagger, sound: "whoosh.swipe", gain: 0.42 - i * 0.03, seed: i + 3, role: "bar" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const center = p.align === "center";
    stage(c, { word: heroWord(p.text), kind: "soft" });
    const st = style(c, (c.vertical ? 178 : 150) * p.size, { fontParam: p.font, weight: p.weight, lineHeight: 1.12 });
    const L = c.fit(p.text, st, c.safe.w * 0.92, c.safe.h * 0.6, { align: center ? "center" : "left", maxLines: lineCount(p.text) });
    const ox = center ? c.cx - L.width / 2 : c.safe.x;
    const oy = c.cy - L.height / 2;
    const barCol = p.bar === "ink" ? T.fg : p.bar === "tint" ? tint(c, 0.9) : T.accent;
    for (const line of L.lines) {
      const at = START + jitterStagger(line.index, p.stagger, c.env.seed, 0.2);
      // bar grows from the leading edge, then retracts toward the far edge
      const grow = pr(t, at, at + LINE * 0.45, E.out);
      const leave = pr(t, at + LINE * 0.42, at + LINE, E.inOut);
      if (grow <= 0) continue;
      const win = lineWindow(line, L.size);
      const top = oy + win.top + win.h * 0.12, h = win.h * 0.8;
      const lx = ox + line.x - L.size * 0.08, lw = line.w + L.size * 0.16;
      if (leave > 0) {
        c.save();
        c.clipRect(lx, top - h, lw * leave, h * 3);
        for (const w of line.words) c.word(w, ox, oy, { color: T.fg, emColor: T.accent });
        c.restore();
      }
      const x0 = lx + lw * leave, x1 = lx + lw * grow;
      if (x1 - x0 > 0.5) c.rect(x0, top, x1 - x0, h, barCol);
    }
  },
});
