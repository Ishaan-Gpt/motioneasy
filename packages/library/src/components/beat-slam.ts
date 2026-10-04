import { E, P, alpha, clamp, defineComponent, mix, tw, type RC, type SoundCue } from "@motioneasy/engine";
import { beat, ladder, richWords, stage, style, textFx, heroWord } from "../kit";

type Props = { text: string; variant: "punch" | "stack" | "impact"; bpm: number; hold: number; size: number; font: string; weight: number; invert: boolean };

const LEAD = 0.25; // first word lands here
const IN = 0.085; // slam-in length

const landAt = (p: Props, k: number) => LEAD + k * beat(p.bpm);

export default defineComponent<Props>({
  id: "beat-slam",
  name: "Beat Slam",
  version: "1.0.0",
  group: "elements",
  category: "kinetic-type",
  description: "One word per beat, slammed into frame from the camera with a light flare and a micro kick. Accent words land in serif italic.",
  tags: ["punchy", "beat", "hook", "typography", "bold"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "dark", lighting: 0.75, grain: 0.4, vignette: 0.55 },
  notes: "Best as a hook in the first 2 seconds. Don't follow it with another slam; cut to media.",
  params: {
    text: P.text("Stop timing *captions.*", "Words", { maxLength: 80, help: "One word per beat. Wrap words in *asterisks* for the serif accent." }),
    variant: P.select("punch", "Style", [
      { value: "punch", label: "Punch: one word at a time" },
      { value: "stack", label: "Stack: builds the sentence" },
      { value: "impact", label: "Impact: full width, solid/outline" },
    ]),
    bpm: P.number(120, "Tempo", { min: 60, max: 180, step: 1, unit: "BPM", help: "Words land on the beat of your track." }),
    hold: P.number(1.1, "Hold at end", { min: 0.3, max: 3, step: 0.1, unit: "s" }),
    size: P.number(1, "Type size", { min: 0.6, max: 1.4, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
    weight: P.number(800, "Weight", { min: 300, max: 800, step: 50, group: "style" }),
    invert: P.bool(true, "Invert on impact", { help: "Impact style: alternate ink and cream each word." }),
  },
  duration: (p) => LEAD + richWords(p.text).length * beat(p.bpm) + p.hold,
  poster: 0.62,
  sounds: (p) => {
    const words = richWords(p.text);
    const n = words.length;
    const cues: SoundCue[] = words.map((w, k) => ({
      at: landAt(p, k),
      sound: k === n - 1 ? "impact.sub" : p.variant === "stack" ? "impact.land" : "impact.punch",
      gain: k === n - 1 ? 1 : ladder(k, n, 0.85, 0.65),
      seed: (k % 2) + 1,
      role: k === n - 1 ? "final hit" : "word hit",
    }));
    cues.unshift({ at: 0, sound: "riser.reverse", gain: 0.55, len: LEAD, role: "lead-in" });
    if (words[n - 1]?.startsWith("*")) cues.push({ at: landAt(p, n - 1) + 0.04, sound: "tonal.shimmer", gain: 0.3, role: "accent" });
    return cues;
  },
  render(c, p) {
    const words = richWords(p.text);
    if (!words.length) return;
    const n = words.length;
    const t = c.t;
    // Which word is landing / landed, and how hard the last impact was.
    let k = -1;
    for (let i = 0; i < n; i++) if (t >= landAt(p, i) - IN) k = i;
    const since = k >= 0 ? t - landAt(p, k) : -1;
    const flare = since >= 0 ? Math.exp(-since * 5.5) : 0;
    const kick = since >= 0 ? Math.exp(-since * 11) : 0;

    if (p.variant === "impact") return impact(c, p, words, k, since, flare);

    stage(c, { word: heroWord(p.text), kind: "spot", flare, focus: [c.cx, c.cy] });
    const T = c.theme;
    c.with({ x: c.cx, y: c.cy, scale: 1 + kick * 0.012 }, () => {
      c.translate(-c.cx, -c.cy);
      if (p.variant === "stack") return stack(c, p, words, k, since);
      const base = (c.vertical ? 230 : 200) * p.size;
      const st = style(c, base, { fontParam: p.font, weight: p.weight });
      // One size for every word: the largest at which the longest word still fits.
      const size = Math.min(...words.map((w) => c.fit(w, st, c.safe.w * 0.94, c.safe.h * 0.5, { maxLines: 1 }).size));
      for (let i = Math.max(0, k - 1); i <= k; i++) {
        const land = landAt(p, i);
        const next = i < n - 1 ? landAt(p, i + 1) : Infinity;
        if (t < land - IN || t > next) continue;
        const L = c.layout(words[i], { ...st, size });
        // Slam: from the lens (big, soft, transparent) down onto the glass.
        const u = clamp((t - (land - IN)) / IN);
        let scale = tw(u, 0, 1, 1.9, 1, E.in);
        let blur = (1 - u) * 14;
        let a = Math.min(1, u * 2.2);
        if (t >= land) {
          const s = t - land;
          scale = 1 + 0.05 * Math.exp(-s * 13) * Math.cos(s * 34) - 0.05 * Math.exp(-s * 13) + s * 0.018;
          blur = 0;
          a = 1;
        }
        // Exit: pushed past the camera as the next word lands.
        if (t > next - IN) {
          const v = clamp((t - (next - IN)) / IN);
          scale *= 1 + v * 0.45;
          a *= 1 - v;
          blur = v * 10;
        }
        textFx(c, L, c.cx, c.cy, {
          scale, blur, alpha: a,
          color: T.fg, emColor: T.accent === T.fg ? T.fg : T.accent,
          glow: T.mode === "dark" ? { color: mix(T.glow, T.bg, 0.2), blur: 38 * (0.35 + flare * 0.65), strength: 0.6 } : undefined,
        });
      }
    });
  },
});

function stack(c: RC, p: Props, words: string[], k: number, since: number) {
  const T = c.theme;
  const n = words.length;
  const t = c.t;
  const box = c.safe;
  const size = Math.min((box.h * 0.82) / (n * 1.0), (c.vertical ? 190 : 150) * p.size);
  const st = style(c, size, { fontParam: p.font, weight: p.weight, lineHeight: 1.0 });
  // Fit each line to the safe width, keep one size for the stack (the smallest that fits).
  const fitted = words.map((w) => c.fit(w, st, box.w, size * 1.2, { maxLines: 1 }));
  const sz = Math.min(...fitted.map((l) => l.size));
  const lines = words.map((w) => c.layout(w, { ...st, size: sz }));
  const lh = sz * 1.02;
  const top = c.cy - (n * lh) / 2 + lines[0].cap * 0.2;
  const allOn = t - (landAt(p, n - 1) + 0.38);
  for (let i = 0; i <= Math.min(k, n - 1); i++) {
    const land = landAt(p, i);
    const u = clamp((t - (land - IN)) / IN);
    const settle = t >= land ? 1 - Math.exp(-(t - land) * 12) : 0;
    const scale = t < land ? tw(u, 0, 1, 1.35, 1, E.in) : 1 + 0.04 * (1 - settle) * Math.cos((t - land) * 30);
    const isLast = i === k;
    let a = t < land ? u : isLast ? 1 : 0.28;
    if (allOn > 0) a = Math.max(a, Math.min(1, allOn * 4));
    const L = lines[i];
    textFx(c, L, box.x, top + i * lh, {
      anchor: [0, 0], scale, blur: t < land ? (1 - u) * 10 : 0, alpha: a,
      color: T.fg, emColor: T.accent,
      glow: T.mode === "dark" && (isLast || allOn > 0) ? { color: mix(T.glow, T.bg, 0.25), blur: 30, strength: 0.5 } : undefined,
    });
  }
  void since;
}

function impact(c: RC, p: Props, words: string[], k: number, since: number, flare: number) {
  const T = c.theme;
  const idx = Math.max(0, k);
  const inv = p.invert && idx % 2 === 1;
  const bg = inv ? T.fg : T.bg;
  const fg = inv ? T.bg : T.fg;
  c.clear(bg);
  stage(c, { word: heroWord(p.text), kind: "soft", flare: flare * 0.6 });
  if (k < 0) return;
  const t = c.t;
  const land = landAt(p, idx);
  const L = c.fit(words[idx], style(c, 520 * p.size, { fontParam: p.font, weight: p.weight, uppercase: true, tracking: -0.04 }), c.safe.w, c.safe.h * 0.6, { maxLines: 1 });
  const u = clamp((t - (land - IN)) / IN);
  const scale = t < land ? tw(u, 0, 1, 1.25, 1, E.in) : 1 + Math.max(0, t - land) * 0.03;
  const outline = idx % 2 === 1 && !p.invert ? true : idx % 3 === 2;
  textFx(c, L, c.cx, c.cy, {
    scale, blur: t < land ? (1 - u) * 12 : 0, alpha: Math.min(1, u * 2),
    color: fg, emColor: fg,
    outline, stroke: outline ? { color: fg, width: 4 } : undefined,
  });
  // Impact flash: a short bloom of light over the whole frame.
  if (since >= 0 && since < 0.12) c.rect(0, 0, c.W, c.H, alpha(mix(fg, bg, 0.5), (1 - since / 0.12) * 0.18));
}
