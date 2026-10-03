import { E, P, alpha, defineComponent, pr, spring, SPRING, tw } from "@motioneasy/engine";
import { stage, style, heroWord } from "../kit";
import { drawClick, drawCursor, drawPill } from "../parts";

type Props = { headline: string; label: string; done: string; url: string; font: string };

const CLICK = 2.0;

export default defineComponent<Props>({
  id: "click-cta",
  name: "Click CTA",
  version: "1.0.0",
  group: "elements",
  category: "overlays",
  description: "The call to action, performed: a button springs in, the cursor glides over with a speed ramp, presses it, and it turns into a confirmation.",
  tags: ["cta", "button", "cursor", "end card", "conversion"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.65, grain: 0.3, vignette: 0.25 },
  notes: "Close a post with it. The URL line is what people will remember: keep it short.",
  params: {
    headline: P.text("Your next video, *captioned.*", "Headline", { maxLength: 50 }),
    label: P.text("Try it free", "Button", { maxLength: 24 }),
    done: P.text("Link in bio", "After click", { maxLength: 24 }),
    url: P.text("captionseasy.com", "URL line", { maxLength: 40 }),
    font: P.font("brand", "Typeface"),
  },
  duration: 4.4,
  poster: 0.62,
  sounds: () => [
    { at: 0.5, sound: "ui.pop", gain: 0.45, role: "button" },
    { at: CLICK - 0.8, sound: "whoosh.air", gain: 0.35, role: "cursor" },
    { at: CLICK, sound: "ui.click", gain: 0.9, role: "click" },
    { at: CLICK + 0.25, sound: "tonal.chime", gain: 0.35, role: "done" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const V = c.vertical;
    stage(c, { word: heroWord(p.headline), kind: "soft" });
    const L = p.headline ? c.fit(p.headline, style(c, V ? 108 : 88, { fontParam: p.font, weight: 750 }), c.safe.w * 0.9, 260, { maxLines: 2, align: "center" }) : null;
    const by = c.cy + (L ? 60 : 0);
    if (L) {
      const u = pr(t, 0.05, 0.75, E.out);
      c.drawLayout(L, c.cx - L.width / 2, by - L.height - (V ? 110 : 80) + (1 - u) * 24, { color: T.fg, emColor: T.accent, alpha: u });
    }
    const s = spring(t - 0.45, SPRING.pop);
    const pressed = t > CLICK - 0.03 && t < CLICK + 0.16;
    const doneU = pr(t, CLICK + 0.12, CLICK + 0.5, E.out);
    const size = V ? 46 : 40;
    c.with({ x: c.cx, y: by, scale: Math.max(0, s) }, () => {
      if (doneU < 1) c.with({ alpha: 1 - doneU }, () => drawPill(c, 0, 0, p.label, { size, arrow: true, press: pressed ? 1 : 0 }));
      if (doneU > 0) {
        c.with({ alpha: doneU, scale: 0.9 + 0.1 * doneU }, () => drawPill(c, 0, 0, p.done, { size, fill: T.bg, color: T.fg, outline: T.fg, check: doneU }));
      }
    });
    drawClick(c, c.cx + 30, by + 8, pr(t, CLICK, CLICK + 0.55), T.fg);
    if (t > CLICK - 1.0) {
      const m = pr(t, CLICK - 1.0, CLICK - 0.06, E.ramp);
      const leave = pr(t, CLICK + 0.7, CLICK + 1.4, E.in);
      const x = tw(m, 0, 1, c.cx + c.W * 0.45, c.cx + 30) + leave * 160;
      const y = tw(m, 0, 1, by + c.H * 0.3, by + 8) + Math.sin(m * Math.PI) * -80 + leave * 120;
      drawCursor(c, x, y, { scale: 1.35, press: pressed ? 1 : 0, dark: T.mode === "dark" });
    }
    if (p.url) {
      const u = pr(t, CLICK + 0.3, CLICK + 1.0, E.out);
      const U = c.layout(p.url, { font: T.mono, size: V ? 34 : 28, weight: 500, tracking: 0.04 });
      c.drawLayout(U, c.cx - U.width / 2, by + size * 2.2 + (1 - u) * 14, { color: alpha(T.fg, 0.6), alpha: u });
    }
  },
});
