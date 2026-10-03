import { E, P, alpha, defineComponent, mix, pr, rand, type SoundCue } from "@motioneasy/engine";
import { heroWord, stage } from "../kit";

type Props = { text: string; flips: number; stagger: number; flip: number; tile: string; hold: number };

const START = 0.2;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const rowsOf = (s: string) => s.toUpperCase().split("\n").map((r) => r.replace(/\*/g, ""));

export default defineComponent<Props>({
  id: "split-flap",
  name: "Split-Flap Board",
  version: "1.0.0",
  group: "elements",
  category: "text-reveals",
  description: "A departure board: every tile flutters through letters and lands on yours, left to right, with real flap halves and a click per landing.",
  tags: ["retro", "board", "letters", "mechanical", "announcement"],
  added: "2026-10-04",
  featured: true,
  theme: { mode: "dark", lighting: 0.45, grain: 0.35, vignette: 0.35 },
  notes: "Short uppercase lines (up to ~12 characters a row). Good for dates, destinations, launches, 'now boarding' moments.",
  params: {
    text: P.text("NOW\nBOARDING", "Board text", { multiline: true, maxLength: 40 }),
    flips: P.number(7, "Flips per tile", { min: 2, max: 16, step: 1 }),
    stagger: P.number(0.05, "Tile stagger", { min: 0.01, max: 0.2, step: 0.005, unit: "s" }),
    flip: P.number(0.07, "Flip time", { min: 0.04, max: 0.15, step: 0.005, unit: "s" }),
    tile: P.color("#33322E", "Tile colour", { group: "style" }),
    hold: P.number(1.6, "Hold", { min: 0.3, max: 4, step: 0.1, unit: "s" }),
  },
  duration: (p) => {
    const n = rowsOf(p.text).reduce((s, r) => s + r.length, 0);
    return START + n * p.stagger + p.flips * p.flip + 0.3 + p.hold;
  },
  poster: 0.85,
  sounds: (p) => {
    const cues: SoundCue[] = [];
    let i = 0;
    for (const r of rowsOf(p.text)) for (const ch of r) {
      if (ch.trim()) cues.push({ at: START + i * p.stagger + p.flips * p.flip, sound: "ui.tick", gain: 0.3, seed: i, role: "land" });
      i++;
    }
    cues.push({ at: START, sound: "foley.shutter", gain: 0.25, role: "flutter" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { word: heroWord(p.text), kind: "spot" });
    const rows = rowsOf(p.text);
    const cols = Math.max(...rows.map((r) => r.length), 1);
    const gap = 0.08;
    const tw = Math.min((c.safe.w * 0.96) / (cols + (cols - 1) * gap), (c.safe.h * 0.6) / (rows.length * 1.45 + (rows.length - 1) * 0.15));
    const th = tw * 1.4;
    const font = T.mono;
    const totalH = rows.length * th + (rows.length - 1) * th * 0.12;
    const y0 = c.cy - totalH / 2;
    const ink = T.mode === "dark" ? "#F4F1E6" : "#FFFFF6";
    const glyphL = (ch: string) => c.layout(ch === " " ? " " : ch, { font, size: th * 0.72, weight: 700, tracking: 0 });
    const drawHalf = (ch: string, x: number, y: number, top: boolean, sy = 1) => {
      // one half of a tile with a character, squashed vertically by sy about the hinge
      c.save();
      c.clipRect(x, top ? y : y + th / 2, tw, th / 2);
      c.with({ x: x + tw / 2, y: y + th / 2, sy }, () => {
        c.rrect(-tw / 2, -th / 2, tw, th, tw * 0.1, mix(p.tile, top ? "#ffffff" : "#000000", top ? 0.05 : 0.08));
        const G = glyphL(ch);
        c.drawLayout(G, -G.width / 2, -G.height / 2 + G.size * 0.02, { color: ink });
      });
      c.restore();
    };
    let idx = 0;
    rows.forEach((row, r) => {
      const xr = c.cx - (row.length * tw + (row.length - 1) * tw * gap) / 2;
      for (let k = 0; k < row.length; k++, idx++) {
        const x = xr + k * tw * (1 + gap), y = y0 + r * th * 1.12;
        const target = row[k];
        const begin = START + idx * p.stagger;
        const appear = pr(t, begin - 0.15, begin, E.out);
        if (appear <= 0) continue;
        c.save();
        c.alpha(appear);
        c.cardShadow(x, y, tw, th, tw * 0.1, 0.3, 0.9, "#000000");
        const n = target === " " ? 0 : p.flips;
        const f = (t - begin) / p.flip; // flips elapsed
        const charAt = (i: number) => (i >= n ? target : GLYPHS[Math.floor(rand(c.env.seed + idx * 97 + i * 13) * GLYPHS.length)]);
        if (f >= n) {
          drawHalf(target, x, y, true);
          drawHalf(target, x, y, false);
        } else {
          const i = Math.max(0, Math.floor(f));
          const u = Math.max(0, f - i);
          const cur = charAt(i), next = charAt(i + 1);
          // static: next char's top half behind, current char's bottom half
          drawHalf(next, x, y, true);
          drawHalf(cur, x, y, false);
          // the flap: current top folds down (first half), then next bottom unfolds (second half)
          if (u < 0.5) drawHalf(cur, x, y, true, 1 - u * 2);
          else drawHalf(next, x, y, false, (u - 0.5) * 2);
        }
        // hinge line and a lit top edge, so tiles read as objects on any stage
        c.rect(x, y + th / 2 - 1, tw, 2, alpha("#000000", 0.55));
        c.strokeRRect(x + 0.75, y + 0.75, tw - 1.5, th - 1.5, tw * 0.1, alpha("#FFFFFF", 0.12), 1.5);
        c.restore();
      }
    });
  },
});
