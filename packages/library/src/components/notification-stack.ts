import { E, P, alpha, defineComponent, pr, spring, SPRING, type SoundCue } from "@motioneasy/engine";
import { stage, style, heroWord } from "../kit";
import { BRAND } from "../demo";
import { drawGlassCard } from "../parts";

type Props = { app: string; icon: string | null; items: string[]; times: string[]; headline: string; step: number; font: string };

const START = 0.6;

export default defineComponent<Props>({
  id: "notification-stack",
  name: "Notification Stack",
  version: "1.0.0",
  group: "elements",
  category: "overlays",
  description: "Lock-screen notifications drop in one after another, each pushing the stack down with a spring. Frosted cards, real shadows, a soft ping for each.",
  tags: ["notifications", "ios", "social proof", "updates", "ui"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.3 },
  notes: "Use real events only (exports, sign-ups you actually had). 3–5 items.",
  params: {
    app: P.text("CaptionsEasy", "App name", { maxLength: 24 }),
    icon: P.media(BRAND.icon, "App icon", "image"),
    items: P.list(["Your captions are ready", "214 words, every one timed", "Exported: MP4 + SRT"], "Notifications", { min: 1, max: 6, maxLength: 60 }),
    times: P.list(["now", "now", "now"], "Time labels", { max: 6, maxLength: 10 }),
    headline: P.text("Done *before your coffee.*", "Headline", { maxLength: 50 }),
    step: P.number(0.75, "Time between", { min: 0.3, max: 2, step: 0.05, unit: "s" }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => START + p.items.length * p.step + 1.4,
  poster: 0.8,
  sounds: (p) => {
    const cues: SoundCue[] = [];
    p.items.forEach((_, i) => cues.push({ at: START + i * p.step, sound: "tonal.notify", gain: 0.45 - i * 0.03, role: "ping" }));
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const V = c.vertical;
    stage(c, { word: heroWord(p.headline), kind: "soft" });
    const w = Math.min(c.safe.w, V ? 900 : 780), h = V ? 176 : 140;
    const gap = 18;
    const n = p.items.length;
    const L = p.headline ? c.fit(p.headline, style(c, V ? 96 : 76, { fontParam: p.font, weight: 750 }), c.safe.w * 0.92, 220, { maxLines: 2, align: "center" }) : null;
    const headGap = V ? 90 : 60;
    const blockH = (L ? L.height + headGap : 0) + n * h + (n - 1) * gap;
    const top = c.cy - blockH / 2 + (L ? L.height + headGap : 0);
    if (L) {
      const u = pr(t, 0.05, 0.7, E.out);
      c.drawLayout(L, c.cx - L.width / 2, top - L.height - (V ? 90 : 60) + (1 - u) * 20, { color: T.fg, emColor: T.accent, alpha: u });
    }
    // Newest on top: card i arrives at START + i*step; older ones move down one slot.
    for (let i = 0; i < n; i++) {
      const at = START + i * p.step;
      const s = spring(t - at, SPRING.firm);
      if (t < at) continue;
      // How many newer cards arrived after this one (continuous, with springs).
      let slot = 0;
      for (let j = i + 1; j < n; j++) slot += Math.max(0, Math.min(1.05, spring(t - (START + j * p.step), SPRING.firm)));
      const y = top + slot * (h + gap) - (1 - Math.min(1, s)) * (h + 60);
      const scale = (1 - Math.min(slot, 3) * 0.02) * (0.94 + 0.06 * Math.min(1, s));
      const x = c.cx - w / 2;
      c.with({ x: c.cx, y: y + h / 2, scale, alpha: Math.min(1, s * 1.4) * (1 - Math.max(0, slot - 3)) }, () => {
        c.translate(-c.cx, -(y + h / 2));
        drawGlassCard(c, x, y, w, h, 34, { lift: 0.35, dark: T.mode === "dark" });
        const ic = h * 0.42;
        c.save();
        c.clipRRect(x + 24, y + (h - ic) / 2, ic, ic, ic * 0.24);
        c.rect(x + 24, y + (h - ic) / 2, ic, ic, "#FFFFEB");
        c.media(p.icon, x + 24 + ic * 0.12, y + (h - ic) / 2 + ic * 0.12, ic * 0.76, ic * 0.76, { fit: "contain", key: "icon" });
        c.restore();
        c.strokeRRect(x + 24, y + (h - ic) / 2, ic, ic, ic * 0.24, alpha(T.fg, 0.1), 1);
        const tx = x + 24 + ic + 22;
        const A = c.layout(p.app.toUpperCase(), { font: T.font, size: V ? 26 : 21, weight: 600, tracking: 0.06 });
        const B = c.fit(p.items[i], { font: T.font, size: V ? 40 : 32, weight: 650, tracking: -0.015 }, w - (tx - x) - 120, 70, { maxLines: 1 });
        const Tm = c.layout(p.times[i] ?? "now", { font: T.font, size: V ? 26 : 21, weight: 500, tracking: 0 });
        c.drawLayout(A, tx, y + h * 0.27, { color: alpha(T.fg, 0.5) });
        c.drawLayout(B, tx, y + h * 0.27 + A.cap + 16, { color: T.fg });
        c.drawLayout(Tm, x + w - 28 - Tm.width, y + h * 0.27, { color: alpha(T.fg, 0.45) });
      });
    }
  },
});
