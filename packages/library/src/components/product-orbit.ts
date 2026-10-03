import { E, P, alpha, defineComponent, pr, spring, SPRING, tw, type SoundCue } from "@motioneasy/engine";
import { blockWindow, maskRise, stage, style } from "../kit";
import { CLIPS } from "../demo";
import { PHONE, drawGlassCard, drawPhone, phoneIn3D, phoneSlab } from "../parts";

type Props = { media: string | null; headline: string; features: string[]; body: string; font: string };

const CHIPS_AT = 1.5;

export default defineComponent<Props>({
  id: "product-orbit",
  name: "Product Orbit",
  version: "1.0.0",
  group: "scenes",
  category: "reveals",
  description: "The product reveal: the phone rises into a slow orbit while feature chips pop out around it on hairline leaders, each pinned to the device.",
  tags: ["product", "features", "phone", "reveal", "3d"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.7, grain: 0.3, vignette: 0.3 },
  notes: "Three short, true features. The clip on screen should show the product doing them.",
  params: {
    media: P.media(CLIPS.jesse.src, "Screen clip", "any"),
    headline: P.text("Meet *CaptionsEasy.*", "Headline", { maxLength: 50 }),
    features: P.list(["Whisper on your device", "33 caption looks", "MP4 + SRT export"], "Feature chips", { min: 1, max: 4, maxLength: 32 }),
    body: P.color("#141413", "Phone colour", { group: "style" }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => CHIPS_AT + p.features.length * 0.45 + 2,
  poster: 0.85,
  sounds: (p) => {
    const cues: SoundCue[] = [{ at: 0.05, sound: "whoosh.deep", gain: 0.55, role: "rise" }, { at: 1.15, sound: "impact.land", gain: 0.5, role: "settle" }];
    p.features.forEach((_, i) => cues.push({ at: CHIPS_AT + i * 0.45, sound: "ui.pop", gain: 0.45 - i * 0.03, seed: i + 1, role: "chip" }));
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const V = c.vertical;
    const intro = pr(t, 0, 1.3, E.cine);
    const scale = V ? 0.95 : 0.72;
    const py = V ? 120 : 40;
    stage(c, { kind: "studio", focus: [c.cx, c.cy + py] });
    if (p.headline) {
      const L = c.fit(p.headline, style(c, V ? 100 : 82, { fontParam: p.font, weight: 750 }), c.safe.w, 160, { maxLines: 1 });
      const u = pr(t, 0.7, 1.5, E.out);
      const top = c.cy + py - (PHONE.h * scale) / 2 - L.height - (V ? 90 : 50);
      const win = blockWindow(L);
      maskRise(c, top + win.top, win.h, u, () => c.drawLayout(L, c.cx - L.width / 2, top, { color: T.fg, emColor: T.accent }));
    }
    const ry = tw(t, 0, 1.3, 50, 0, E.cine) + Math.sin(t * 0.5) * 9 * intro;
    const rx = tw(t, 0, 1.3, 18, 2, E.cine);
    const y = py + tw(t, 0, 1.3, 600, 0, E.cine);
    const cam = c.camera({ fov: 30 });
    c.lightEllipse(c.cx, c.cy + py + (PHONE.h * scale) * 0.53, PHONE.w * scale * 0.5, 30, alpha(T.fg, 1), 0.18 * intro);
    const L = c.layer(PHONE.w, PHONE.h, (lc) => drawPhone(lc, (sc, w, h) => sc.media(p.media, 0, 0, w, h, { key: "orbit" }), { body: p.body }), { res: 1.15 });
    phoneIn3D(cam, L, phoneSlab(c, p.body), { x: 0, y, z: 0, rx, ry, scale, depth: 22 });
    // Feature chips around the phone, each with a leader to an anchor on the device.
    const n = p.features.length;
    const left = (i: number) => i % 2 === 0;
    p.features.forEach((f, i) => {
      const at = CHIPS_AT + i * 0.45;
      const k = Math.max(0, spring(t - at, SPRING.pop));
      if (k <= 0) return;
      // Chips sit around the top half of the phone and below the caption band, never over the captions.
      const frac = n === 1 ? 0.3 : n >= 3 && i === n - 1 ? 0.95 : 0.12 + (i / Math.max(1, n >= 3 ? n - 2 : n - 1)) * 0.36;
      const anchorY = c.cy + py - (PHONE.h * scale) / 2 + frac * PHONE.h * scale;
      const side = left(i) ? -1 : 1;
      const anchorX = c.cx + side * (PHONE.w * scale) * 0.32;
      const F = c.layout(f, { font: T.font, size: V ? 44 : 34, weight: 650, tracking: -0.01 });
      const cw = F.width + 68, ch = F.cap + 62;
      const chipX = c.cx + side * ((PHONE.w * scale) / 2 + (V ? 30 : 80)) - (side < 0 ? cw : 0);
      const cx = Math.max(c.safe.x - 30, Math.min(c.safe.x + c.safe.w + 30 - cw, chipX));
      const cy = anchorY - ch / 2 - 40;
      const lineU = pr(t, at - 0.1, at + 0.3, E.out);
      const endX = side < 0 ? cx + cw : cx;
      c.line(anchorX, anchorY, anchorX + (endX - anchorX) * lineU, anchorY + (cy + ch / 2 - anchorY) * lineU, alpha(T.fg, 0.35), 2, "round");
      c.circle(anchorX, anchorY, 7 * Math.min(1, k), T.fg);
      c.with({ x: cx + cw / 2, y: cy + ch / 2, scale: Math.min(1.2, k), alpha: Math.min(1, k * 1.5) }, () => {
        drawGlassCard(c, -cw / 2, -ch / 2, cw, ch, ch / 2, { lift: 0.4, dark: T.mode === "dark" });
        c.drawLayout(F, -F.width / 2, -F.cap / 2, { color: T.fg });
      });
    });
  },
});
