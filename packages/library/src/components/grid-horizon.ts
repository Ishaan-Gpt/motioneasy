import { E, P, alpha, defineComponent, mix, pr } from "@motioneasy/engine";
import { style } from "../kit";

type Props = { headline: string; speed: number; density: number; horizon: number; length: number; font: string };

export default defineComponent<Props>({
  id: "grid-horizon",
  name: "Grid Horizon",
  version: "1.0.0",
  group: "elements",
  category: "backgrounds",
  description: "A fine perspective grid glides toward a glowing horizon. Minimal lines, real 3D, a headline that floats above the floor.",
  tags: ["grid", "3d", "background", "tech", "loop"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "dark", lighting: 0.7, grain: 0.35, vignette: 0.55 },
  notes: "Tech and launch moods. Keep the headline short and centred.",
  params: {
    headline: P.text("The future of *captions.*", "Headline", { maxLength: 50 }),
    speed: P.number(1, "Glide speed", { min: 0, max: 3, step: 0.05 }),
    density: P.number(1, "Grid density", { min: 0.5, max: 2, step: 0.05, group: "style" }),
    horizon: P.number(0.58, "Horizon height", { min: 0.35, max: 0.8, step: 0.01, group: "style" }),
    length: P.number(5, "Length", { min: 2, max: 30, step: 0.5, unit: "s" }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => p.length,
  poster: 0.5,
  sounds: (p) => [
    { at: 0, sound: "whoosh.deep", gain: 0.5, role: "glide" },
    { at: 0.1, sound: "tonal.pad", len: Math.max(1, p.length - 0.6), gain: 0.35, role: "bed" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const hy = c.H * p.horizon;
    const cam = c.camera({ fov: 50, y: -260, rx: -8, z: 0 });
    // Floor: lines in world space on the plane y = +260 (below camera), receding in z.
    const step = 140 / p.density;
    const floorY = 260;
    const off = (t * 260 * p.speed) % step;
    const intro = pr(t, 0, 1.2, E.cine);
    c.rect(0, 0, c.W, c.H, c.linear(0, 0, 0, c.H, [[0, mix(T.bg, "#000", 0.2)], [p.horizon, mix(T.bg, T.fg, 0.05)], [1, T.bg]]));
    c.lightEllipse(c.cx, hy, c.W * 0.85, c.H * 0.08, T.glow, 0.35 * T.lighting * intro, "screen");
    const far = 9000;
    c.save();
    c.clipRect(0, hy - 2, c.W, c.H);
    const lineA = (z: number) => alpha(T.fg, Math.max(0, 0.32 * (1 - z / far)) * intro);
    for (let z = step - off; z < far; z += step) {
      const a = cam.project(-6000, floorY, z), b = cam.project(6000, floorY, z);
      if (a.z <= 5) continue;
      c.line(a.x, a.y, b.x, b.y, lineA(z), Math.max(0.6, 2.2 * a.scale), "butt");
    }
    for (let x = -6000; x <= 6000; x += step * 1.4) {
      const a = cam.project(x, floorY, 30), b = cam.project(x, floorY, far);
      c.line(a.x, a.y, b.x, b.y, alpha(T.fg, 0.16 * intro), 1.4, "butt");
    }
    c.restore();
    // Horizon fade so lines melt into the light.
    c.rect(0, hy - 40, c.W, 220, c.linear(0, hy - 40, 0, hy + 180, [[0, alpha(mix(T.bg, T.fg, 0.05), 1)], [1, alpha(mix(T.bg, T.fg, 0.05), 0)]]));
    if (p.headline) {
      const L = c.fit(p.headline, style(c, c.vertical ? 130 : 110, { fontParam: p.font, weight: 750 }), c.safe.w * 0.9, 300, { maxLines: 2, align: "center" });
      const u = pr(t, 0.6, 1.8, E.cine);
      c.drawLayout(L, c.cx - L.width / 2, hy - L.height - 140 + (1 - u) * 30, { color: T.fg, emColor: T.accent, alpha: u, glow: T.mode === "dark" ? { color: mix(T.glow, T.bg, 0.3), blur: 30, strength: 0.5 } : undefined });
    }
  },
});
