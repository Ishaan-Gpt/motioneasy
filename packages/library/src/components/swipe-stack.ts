import { E, P, alpha, clamp, defineComponent, mix, pr, type SoundCue } from "@motioneasy/engine";
import { stage, style } from "../kit";
import { clipList, lookList } from "../demo";

type Props = { media: string[]; labels: string[]; title: string; step: number; radius: number; size: number; font: string };

const START = 0.7;
const FLICK = 0.42;

export default defineComponent<Props>({
  id: "swipe-stack",
  name: "Swipe Stack",
  version: "1.0.0",
  group: "elements",
  category: "media",
  description: "A deck of cards: the top one flicks off-screen with a real motion-blur smear and a twist, the next lifts into place. Like swiping through options, but cinematic.",
  tags: ["cards", "swipe", "deck", "showcase", "motion blur"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.3 },
  notes: "Show variations of one idea (looks, templates, results). 3–6 cards.",
  params: {
    media: P.mediaList(clipList(["gianna", "aisha", "rusita", "william", "sam"]), "Cards", "any", { min: 2, max: 10 }),
    labels: P.list(lookList(["gianna", "aisha", "rusita", "william", "sam"]), "Labels", { max: 10 }),
    title: P.text("Swipe through *every look.*", "Title", { maxLength: 50 }),
    step: P.number(0.95, "Time per card", { min: 0.5, max: 2.5, step: 0.05, unit: "s" }),
    radius: P.number(44, "Corner radius", { min: 0, max: 90, step: 1, group: "style" }),
    size: P.number(1, "Card size", { min: 0.6, max: 1.3, step: 0.05, group: "style" }),
    font: P.font("brand", "Typeface"),
  },
  duration: (p) => START + (p.media.length - 1) * p.step + 1.2,
  poster: 0.3,
  sounds: (p) => {
    const cues: SoundCue[] = [{ at: 0.05, sound: "impact.land", gain: 0.45, role: "deal" }];
    for (let i = 0; i < p.media.length - 1; i++) cues.push({ at: START + i * p.step, sound: "whoosh.swipe", gain: 0.6, seed: (i % 2) + 1, role: "flick" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const media = p.media.length ? p.media : clipList(["gianna"]);
    const n = media.length;
    const V = c.vertical;
    const cw = (V ? 640 : c.landscape ? 420 : 500) * p.size, ch = cw * (600 / 432);
    const cy = c.cy + (p.title ? (V ? 120 : 60) : 0);
    stage(c, { kind: "studio", focus: [c.cx, cy] });
    if (p.title) {
      const L = c.fit(p.title, style(c, V ? 92 : 76, { fontParam: p.font, weight: 750 }), c.safe.w * 0.92, 130, { maxLines: 1 });
      const u = pr(t, 0.1, 0.8, E.out);
      c.drawLayout(L, c.cx - L.width / 2, cy - ch / 2 - L.height - (V ? 80 : 50) + (1 - u) * 20, { color: T.fg, emColor: T.accent, alpha: u });
    }
    const intro = pr(t, 0, 0.6, E.out);
    // How many cards have been flicked away (continuous).
    let gone = 0;
    for (let i = 0; i < n - 1; i++) gone += pr(t, START + i * p.step, START + i * p.step + FLICK, E.in);
    for (let i = n - 1; i >= Math.floor(gone); i--) {
      const depth = i - gone; // 0 = top card
      if (depth > 3.2) continue;
      const flick = clamp(gone - i); // 0..1 for the card leaving
      const dir = i % 2 ? 1 : -1;
      const lift = clamp(1 - depth);
      const k = Math.max(0, depth);
      let x = c.cx + (i % 3 - 1) * 10 * k;
      let y = cy + k * 34 + (1 - intro) * 300;
      let rot = (i % 2 ? 1 : -1) * k * 2.5;
      let scale = 1 - k * 0.05;
      if (flick > 0) {
        x += dir * flick * c.W * 1.05;
        y -= flick * 120;
        rot += dir * flick * 22;
        scale *= 1 + flick * 0.05;
      }
      const card = c.layer(cw, ch, (lc) => {
        lc.media(media[i], 0, 0, cw, ch, { radius: p.radius, key: `ss${i}` });
        lc.save();
        lc.clipRRect(0, 0, cw, ch, p.radius);
        lc.rect(0, 0, cw, ch, lc.linear(0, 0, 0, ch, [[0, alpha("#FFFFFF", 0.1)], [0.4, alpha("#FFFFFF", 0)], [1, alpha("#000000", 0.12)]]));
        if (k > 0.05) lc.rect(0, 0, cw, ch, alpha(T.bg, Math.min(0.35, k * 0.14)));
        lc.restore();
        lc.strokeRRect(0.75, 0.75, cw - 1.5, ch - 1.5, p.radius, alpha("#FFFFFF", 0.45), 1.5);
      }, { pad: 4 });
      // Motion blur proportional to flick speed.
      const v = Math.sin(Math.PI * flick);
      const sm = flick > 0 ? c.smearLayer(card, dir * v * 180, -v * 30) : card;
      c.with({ x, y, rotate: rot, scale }, () => {
        if (flick < 0.6) c.cardShadow(-cw / 2, -ch / 2, cw, ch, p.radius, 0.3 + lift * 0.5, 0.9 * (1 - flick));
        c.drawLayer(sm, -cw / 2, -ch / 2);
      });
    }
    if (p.labels.length) {
      for (let i = 0; i < n; i++) {
        const d = i - gone;
        const a = clamp(1 - Math.abs(d) * 2.4) * intro;
        if (a <= 0 || !p.labels[i]) continue;
        const L = c.layout(p.labels[i], { font: T.mono, size: V ? 34 : 28, weight: 500, tracking: 0.12, uppercase: true });
        c.drawLayout(L, c.cx - L.width / 2 + d * 60, cy + ch / 2 + (V ? 110 : 70), { color: T.soft, alpha: a });
      }
    }
    void mix;
  },
});
