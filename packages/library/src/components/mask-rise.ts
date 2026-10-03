import { E, P, alpha, clamp, defineComponent, mix, pr, type SoundCue } from "@motioneasy/engine";
import { lineWindow, stage, style } from "../kit";
import { drawMarker, drawScribble } from "../parts";

type Props = { text: string; align: "left" | "center"; stagger: number; mark: "marker" | "box" | "underline" | "none"; markColor: string; size: number; font: string; weight: number; hold: number };

const START = 0.25;
const RISE = 0.75;

export default defineComponent<Props>({
  id: "mask-rise",
  name: "Masked Rise",
  version: "1.0.0",
  group: "elements",
  category: "text-reveals",
  description: "Lines climb out of invisible slots with a slight tilt, then a felt marker swipes behind the accent words. The launch-film reveal, refined.",
  tags: ["editorial", "reveal", "marker", "highlight", "clean"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.55, grain: 0.3, vignette: 0.25 },
  notes: "Each line is its own beat. Mark one idea per frame: the *accent* words get the marker.",
  params: {
    text: P.text("Upload the clip.\nPick a look.\n*Post it.*", "Lines", { multiline: true, maxLength: 120 }),
    align: P.select("left", "Align", ["left", "center"]),
    stagger: P.number(0.32, "Line stagger", { min: 0.08, max: 0.8, step: 0.02, unit: "s" }),
    mark: P.select("box", "Accent mark", [
      { value: "marker", label: "Marker" },
      { value: "box", label: "Ink box" },
      { value: "underline", label: "Underline" },
      { value: "none", label: "None" },
    ]),
    markColor: P.color("#E4E4D0", "Marker colour", { group: "style" }),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
    weight: P.number(750, "Weight", { min: 300, max: 800, step: 50, group: "style" }),
    hold: P.number(1.4, "Hold", { min: 0.3, max: 4, step: 0.1, unit: "s" }),
  },
  duration: (p) => START + (p.text.split("\n").length - 1) * p.stagger + RISE + 0.7 + p.hold,
  poster: 0.85,
  sounds: (p) => {
    const n = p.text.split("\n").length;
    const cues: SoundCue[] = [];
    for (let i = 0; i < n; i++) cues.push({ at: START + i * p.stagger, sound: "whoosh.swipe", gain: 0.45 - i * 0.03, seed: i % 2 + 1, role: "line" });
    if (p.mark !== "none" && p.text.includes("*")) cues.push({ at: START + (n - 1) * p.stagger + RISE * 0.8, sound: p.mark === "box" ? "impact.land" : "foley.marker", len: 0.45, gain: 0.6, role: "mark" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const center = p.align === "center";
    stage(c, { kind: "soft" });
    const st = style(c, (c.vertical ? 140 : 130) * p.size, { fontParam: p.font, weight: p.weight, lineHeight: 1.08 });
    // Every written line stays one line: shrink rather than wrap.
    const L = c.fit(p.text, st, c.safe.w * 0.94, c.safe.h * 0.62, { align: center ? "center" : "left", maxLines: p.text.split("\n").length });
    const ox = center ? c.cx - L.width / 2 : c.safe.x;
    const oy = c.cy - L.height / 2;
    const n = L.lines.length;
    const markStart = START + (n - 1) * p.stagger + RISE * 0.8;
    const mk = pr(t, markStart, markStart + 0.45, E.inOut);
    // Accent runs: consecutive *accent* words on the same line share one mark.
    const runs: { x: number; y: number; w: number; size: number; i: number }[] = [];
    for (const w of L.words) {
      if (!w.em) continue;
      const last = runs[runs.length - 1];
      const prev = L.words[w.index - 1];
      if (last && prev?.em && prev.line === w.line) last.w = ox + w.x + w.w - last.x;
      else runs.push({ x: ox + w.x, y: oy + w.y, w: w.w, size: w.size, i: runs.length });
    }
    const runAmount = (i: number) => clamp(mk * 1.6 - i * 0.3);
    const boxRect = (r: (typeof runs)[number]) => {
      const pad = r.size * 0.14;
      return { x: r.x - pad, y: r.y - r.size * 0.84, w: (r.w + pad * 2) * E.out(runAmount(r.i)), h: r.size * 1.06 };
    };
    if (p.mark === "marker") for (const r of runs) drawMarker(c, r.x - r.size * 0.06, r.y - r.size * 0.7, r.w + r.size * 0.12, r.size * 0.78, runAmount(r.i), T.mode === "dark" ? alpha(p.markColor, 0.35) : p.markColor, r.i + 1);
    if (p.mark === "box") for (const r of runs) {
      const b = boxRect(r);
      if (b.w > 0.5) c.rrect(b.x, b.y, b.w, b.h, r.size * 0.12, T.fg);
    }
    for (const line of L.lines) {
      const at = START + line.index * p.stagger;
      const u = pr(t, at, at + RISE, E.out);
      if (u <= 0) continue;
      const last = line.words[line.words.length - 1];
      const lx = ox + line.x - 20, lw = line.w + 40 + (last ? last.size * 0.3 : 0);
      const win = lineWindow(line, L.size);
      const top = oy + win.top, h = win.h;
      c.save();
      c.clipRect(lx, top, lw, h);
      const dy = (1 - u) * h * 1.05;
      const rot = (1 - u) * 3.5;
      c.with({ x: ox + line.x, y: oy + line.y + dy, rotate: rot }, () => {
        for (const w of line.words) c.word(w, -line.x, -line.y, { color: T.fg, emColor: T.accent });
      });
      c.restore();
    }
    // Inside an ink box the accent text inverts, revealed by the same wipe.
    if (p.mark === "box")
      for (const r of runs) {
        const b = boxRect(r);
        if (b.w <= 0.5) continue;
        c.save();
        c.clipRRect(b.x, b.y, b.w, b.h, r.size * 0.12);
        for (const w of L.words) if (w.em) c.word(w, ox, oy, { color: T.bg, emColor: T.bg });
        c.restore();
      }
    if (p.mark === "underline") {
      let mi = 0;
      for (const w of L.words) {
        if (!w.em) continue;
        drawScribble(c, ox + w.x, oy + w.y + w.size * 0.14, ox + w.x + w.w, oy + w.y + w.size * 0.1, clamp(mk * 1.6 - mi * 0.3), T.fg, w.size * 0.07, mi + 1);
        mi++;
      }
    }
    void mix;
  },
});
