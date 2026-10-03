import { E, P, alpha, defineComponent, fbm1, mix, pr } from "@motioneasy/engine";
import { stage, style, type StageKind } from "../kit";

type Props = { kind: StageKind; headline: string; sub: string; length: number; font: string };

export default defineComponent<Props>({
  id: "light-stage",
  name: "Light Stage",
  version: "1.0.0",
  group: "elements",
  category: "backgrounds",
  description: "A lit stage to put anything on: drifting light pools on cream, or a volumetric spotlight in the dark. Seamless enough to loop behind any line.",
  tags: ["background", "light", "loop", "spotlight", "plate"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "dark", lighting: 0.8, grain: 0.4, vignette: 0.55 },
  notes: "Use as the bed under captions or a single statement. The headline is optional.",
  params: {
    kind: P.select("spot", "Light", [
      { value: "spot", label: "Spotlight" },
      { value: "soft", label: "Soft pools" },
      { value: "horizon", label: "Horizon glow" },
      { value: "studio", label: "Studio cyc" },
    ]),
    headline: P.text("Lights on.", "Headline", { maxLength: 40 }),
    sub: P.text("", "Subline", { maxLength: 80 }),
    length: P.number(5, "Length", { min: 2, max: 30, step: 0.5, unit: "s" }),
    font: P.font("instrument", "Typeface"),
  },
  duration: (p) => p.length,
  poster: 0.5,
  sounds: (p) => [{ at: 0, sound: "tonal.pad", len: Math.max(1, p.length - 0.5), gain: 0.35, role: "bed" }],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const fy = c.cy + fbm1(t * 0.2, 3) * 20;
    stage(c, { kind: p.kind, focus: [c.cx, fy], flare: 0.15 + 0.1 * Math.sin(t * 0.8) });
    // Dust-free haze: a very soft second pool that breathes.
    c.light(c.cx + fbm1(t * 0.15, 9) * 80, fy - 120, c.short * 0.6, T.glow, 0.05 * T.lighting, T.mode === "dark" ? "screen" : "source-over");
    if (p.headline) {
      const L = c.fit(p.headline, style(c, c.vertical ? 170 : 150, { fontParam: p.font, weight: p.font === "instrument" ? 400 : 750, lineHeight: 1 }), c.safe.w * 0.9, 400, { align: "center" });
      const u = pr(t, 0.3, 1.6, E.cine);
      c.drawLayout(L, c.cx - L.width / 2, fy - L.height / 2 + (1 - u) * 20, { color: T.fg, emColor: T.accent, alpha: u, glow: T.mode === "dark" ? { color: mix(T.glow, T.bg, 0.3), blur: 34, strength: 0.6 } : undefined });
      if (p.sub) {
        const S = c.fit(p.sub, style(c, 36, { weight: 500 }), c.safe.w * 0.8, 120, { align: "center" });
        c.drawLayout(S, c.cx - S.width / 2, fy + L.height / 2 + 50, { color: alpha(T.fg, 0.6), alpha: pr(t, 1, 2, E.out) });
      }
    }
  },
});
