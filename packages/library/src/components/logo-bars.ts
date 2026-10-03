import { E, P, alpha, defineComponent, kf, pr, spring, SPRING, type Key } from "@motioneasy/engine";
import { stage, style } from "../kit";
import { BRAND } from "../demo";

type Props = { wordmark: string | null; bars: number; colors: string[]; tagline: string; font: string };

// Real CaptionsEasy mark geometry (sources/brand/captionseasy-logo.svg): three rounded bars.
const BAR_W = 15.63, BAR_GAP = 25.68 - 15.63;
const HEIGHTS = [53.6, 89.33, 71.46];

export default defineComponent<Props>({
  id: "logo-bars",
  name: "Equalizer Sting",
  version: "1.0.0",
  group: "elements",
  category: "logos",
  description: "The mark's bars bounce like a voice meter, settle into the logo shape, then slide left as the wordmark wipes out from behind them.",
  tags: ["logo", "audio", "bars", "sting", "captionseasy"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.25 },
  notes: "Built on the CaptionsEasy mark (three bars). Swap the wordmark file for another bar-based mark.",
  params: {
    wordmark: P.media(BRAND.wordmark, "Wordmark", "image"),
    bars: P.number(3, "Bars", { min: 3, max: 3, step: 1, advanced: true }),
    colors: P.list(["#1A1A1A", "#1A1A1A", "#1A1A1A"], "Bar colours", { min: 3, max: 3, help: "Hex colours for the three bars." }),
    tagline: P.text("Stop timing captions.", "Tagline", { maxLength: 60 }),
    font: P.font("brand", "Typeface"),
  },
  duration: 4.4,
  poster: 0.75,
  sounds: () => [
    { at: 0.1, sound: "ui.pop", gain: 0.4, role: "bar" },
    { at: 0.22, sound: "ui.pop", gain: 0.37, seed: 2, role: "bar" },
    { at: 0.34, sound: "ui.pop", gain: 0.34, role: "bar" },
    { at: 1.55, sound: "whoosh.swipe", gain: 0.5, role: "slide" },
    { at: 1.95, sound: "impact.land", gain: 0.5, role: "lock" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { kind: "soft" });
    const k = c.vertical ? 6.2 : 5.2; // scale of the mark
    const markW = (BAR_W * 3 + BAR_GAP * 2) * k;
    const wmInfo = c.mediaInfo(p.wordmark);
    const wmH = 96 * k * 0.62;
    const wmW = wmInfo ? (wmH * wmInfo.w) / wmInfo.h : wmH * 5;
    const slide = pr(t, 1.5, 2.1, E.ramp);
    const totalW = markW + 40 + wmW;
    const markX = c.cx - markW / 2 + slide * (-(totalW / 2) + markW / 2);
    const base = c.cy + 45 * k;
    for (let i = 0; i < 3; i++) {
      const s = Math.max(0, spring(t - 0.1 - i * 0.12, SPRING.pop));
      // Voice-meter bounce before settling to the logo heights.
      const keys: Key[] = [[0, 0.2], [0.3, 1.25 - i * 0.2], [0.55, 0.55 + i * 0.1], [0.8, 1.1], [1.05, 0.7], [1.35, 1, E.out]];
      const h = HEIGHTS[i] * k * kf(t - i * 0.06, keys) * Math.min(1, s * 1.2);
      const x = markX + i * (BAR_W + BAR_GAP) * k;
      if (h > 0.5) c.rrect(x, base - h, BAR_W * k, h, (BAR_W * k) / 2, p.colors[i] ?? T.fg);
    }
    if (p.wordmark && slide > 0) {
      const wx = markX + markW + 40;
      c.save();
      c.clipRect(wx - 10, base - wmH * 1.6, wmW * slide + 20, wmH * 2.2);
      c.media(p.wordmark, wx - (1 - slide) * 60, base - wmH * 1.05, wmW, wmH, { fit: "contain", key: "wm" });
      c.restore();
    }
    if (p.tagline) {
      const L = c.fit(p.tagline, style(c, c.vertical ? 60 : 50, { fontParam: p.font, weight: 600 }), c.safe.w * 0.9, 150, { maxLines: 2, align: "center" });
      const u = pr(t, 2.2, 3.0, E.out);
      c.drawLayout(L, c.cx - L.width / 2, base + 90 + (1 - u) * 20, { color: alpha(T.fg, 0.75), emColor: T.accent, alpha: u });
    }
  },
});
