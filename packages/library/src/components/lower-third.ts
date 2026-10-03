import { E, P, alpha, defineComponent, mix, pr } from "@motioneasy/engine";
import { RAW } from "../demo";

type Props = { media: string | null; name: string; role: string; align: "left" | "center"; glass: boolean; hold: number; font: string };

const IN = 0.4;

export default defineComponent<Props>({
  id: "lower-third",
  name: "Lower Third",
  version: "1.0.0",
  group: "elements",
  category: "overlays",
  description: "A frosted-glass name plate over your footage: the panel blurs what's behind it, a hairline draws, the name rises and the role follows. Animates out on its own.",
  tags: ["name", "title", "interview", "glass", "overlay"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "dark", lighting: 0.3, grain: 0.3, vignette: 0.35 },
  notes: "For talking heads and interviews. Keep the name short; the role can be longer.",
  params: {
    media: P.media(RAW.sam.src, "Footage", "any"),
    name: P.text("Ishaan", "Name", { maxLength: 32 }),
    role: P.text("Founder, CaptionsEasy", "Role", { maxLength: 48 }),
    align: P.select("left", "Position", ["left", "center"]),
    glass: P.bool(true, "Frosted glass panel"),
    hold: P.number(2.8, "Hold", { min: 1, max: 8, step: 0.1, unit: "s" }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => IN + 1.2 + p.hold + 0.6,
  poster: 0.5,
  sounds: (p) => [
    { at: IN, sound: "whoosh.swipe", gain: 0.45, role: "in" },
    { at: IN + 0.5, sound: "ui.click", gain: 0.35, role: "line" },
    { at: IN + 1.2 + p.hold, sound: "whoosh.swipe", gain: 0.35, seed: 2, role: "out" },
  ],
  render(c, p) {
    const t = c.t;
    const end = IN + 1.2 + p.hold;
    c.media(p.media, 0, 0, c.W, c.H, { zoom: 1.04 + 0.03 * c.p, focus: [0.5, 0.35], key: "lt" });
    c.rect(0, 0, c.W, c.H, c.linear(0, c.H * 0.55, 0, c.H, [[0, alpha("#000", 0)], [1, alpha("#000", 0.45)]]));
    const V = c.vertical;
    const nameSize = V ? 76 : 60, roleSize = V ? 40 : 32;
    const N = c.layout(p.name, { font: c.theme.font, size: nameSize, weight: 750, tracking: -0.025 });
    const R = c.layout(p.role, { font: c.theme.font, size: roleSize, weight: 500, tracking: -0.005 });
    const padX = 36, padY = 30;
    const w = Math.max(N.width, R.width) + padX * 2 + 24;
    const h = N.cap + R.cap + padY * 2 + 30;
    const x = p.align === "center" ? c.cx - w / 2 : c.safe.x;
    const y = c.safe.y + c.safe.h - h - (V ? 40 : 10);
    const open = pr(t, IN, IN + 0.55, E.out) * (1 - pr(t, end, end + 0.45, E.in));
    if (open <= 0.001) return;
    const pw = w * open;
    c.save();
    c.clipRRect(x, y, pw, h, 22);
    if (p.glass) {
      // Real frosted glass: the footage behind the panel, blurred and lifted.
      const behind = c.layer(c.W, c.H, (lc) => lc.media(p.media, 0, 0, c.W, c.H, { zoom: 1.04 + 0.03 * c.p, focus: [0.5, 0.35], key: "lt" }), { res: 0.25 });
      c.drawLayer(behind, 0, 0, { blur: 26 });
      c.rect(x, y, w, h, alpha("#121211", 0.5));
      c.rect(x, y, w, h, c.linear(x, y, x, y + h, [[0, alpha("#FFFFFF", 0.1)], [1, alpha("#FFFFFF", 0)]]));
    } else c.rect(x, y, w, h, alpha("#111110", 0.82));
    c.restore();
    c.strokeRRect(x + 0.75, y + 0.75, pw - 1.5, h - 1.5, 22, alpha("#FFFFFF", 0.22 * open), 1.5);
    // accent hairline
    const lineU = pr(t, IN + 0.35, IN + 0.95, E.out) * (1 - pr(t, end - 0.1, end + 0.2));
    c.line(x + padX, y + padY + N.cap + 16, x + padX + (w - padX * 2) * lineU, y + padY + N.cap + 16, alpha("#FFFFEB", 0.35), 2, "butt");
    c.save();
    c.clipRect(x, y, pw, h);
    const nu = pr(t, IN + 0.25, IN + 0.9, E.out) * (1 - pr(t, end - 0.15, end + 0.15, E.in));
    const ru = pr(t, IN + 0.45, IN + 1.1, E.out) * (1 - pr(t, end - 0.2, end + 0.1, E.in));
    c.drawLayout(N, x + padX, y + padY + (1 - nu) * 30, { color: "#FFFFEB", alpha: nu });
    c.drawLayout(R, x + padX, y + padY + N.cap + 32 + (1 - ru) * 20, { color: mix("#FFFFEB", "#000", 0.25), alpha: ru });
    c.restore();
  },
});
