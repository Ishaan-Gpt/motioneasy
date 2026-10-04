import { E, P, alpha, clamp, defineComponent, pr } from "@motioneasy/engine";
import { style, textFx } from "../kit";
import { clipList } from "../demo";

type Props = { media: string[]; stop: number; slam: string; sub: string; font: string };

const STOP = 1.5;

export default defineComponent<Props>({
  id: "scroll-stop",
  name: "Scroll Stop",
  version: "1.0.0",
  group: "scenes",
  category: "hooks",
  description: "A feed flies past in a motion-blurred blur, brakes hard, and stops dead on your clip. Then one word slams over it. The scroll-stopper, literally.",
  tags: ["hook", "feed", "scroll", "pattern interrupt", "motion blur"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "dark", lighting: 0.4, grain: 0.35, vignette: 0.45 },
  notes: "Put your best frame as the stop card. The slam word should be one or two words.",
  params: {
    media: P.mediaList(clipList(["william", "aisha", "sol", "gereon", "rusita", "mckensie", "jesse", "omar"]), "Feed clips", "any", { min: 3, max: 12 }),
    stop: P.number(8, "Stop on clip #", { min: 1, max: 12, step: 1 }),
    slam: P.text("Wait.", "Slam word", { maxLength: 20 }),
    sub: P.text("Your captions could look like this.", "Subline", { maxLength: 60 }),
    font: P.font("brand", "Typeface"),
  },
  duration: 4.4,
  poster: 0.62,
  sounds: () => [
    { at: 0, sound: "whoosh.whip", gain: 0.6, role: "flick" },
    { at: 0.45, sound: "whoosh.whip", gain: 0.5, seed: 2, role: "flick" },
    { at: 0.9, sound: "whoosh.swipe", gain: 0.45, role: "brake" },
    { at: STOP, sound: "impact.sub", gain: 0.9, role: "stop" },
    { at: STOP + 0.45, sound: "impact.punch", gain: 0.8, role: "slam" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const media = p.media.length ? p.media : clipList(["omar"]);
    const n = media.length;
    const stopIdx = clamp(Math.round(p.stop) - 1, 0, n - 1);
    c.clear("#0e0e0d");
    const cw = c.vertical ? c.W * 0.86 : c.H * 0.56 * (432 / 600) * 1.2;
    const ch = cw * (600 / 432);
    const gap = 36;
    const pitch = ch + gap;
    // Feed position: many cards of travel, braking into the stop card (expo-out = fast, then hard brake).
    const travel = pitch * (n * 2 + stopIdx);
    const u = pr(t, 0, STOP, E.out);
    const pos = travel * u; // px scrolled
    const speed = (travel * (E.out(Math.min(1, (t + 1 / 120) / STOP)) - E.out(Math.max(0, (t - 1 / 120) / STOP)))) * 60; // px/s
    const stopped = t >= STOP;
    const after = Math.max(0, t - STOP);
    const zoom = stopped ? 1 + 0.08 * E.out(Math.min(1, after / 0.6)) : 1;
    const blur = Math.min(pitch * 0.5, Math.abs(speed) * (1 / 60) * 0.5);
    const strip = c.layer(c.W, c.H, (lc) => {
      // Card k sits at y = cy + k*pitch - pos, for k over the looping feed.
      const first = Math.floor((pos - c.H) / pitch) - 1;
      const last = Math.ceil((pos + c.H) / pitch) + 1;
      for (let k = first; k <= last; k++) {
        const y = c.cy + k * pitch - pos - ch / 2;
        if (y > c.H + 20 || y + ch < -20) continue;
        const m = media[((k % n) + n) % n];
        lc.media(m, c.cx - cw / 2, y, cw, ch, { radius: 34, key: `feed${((k % n) + n) % n}` });
      }
    });
    const sm = blur > 1 ? c.smearLayer(strip, 0, blur) : strip;
    c.with({ x: c.cx, y: c.cy, scale: zoom }, () => c.drawLayer(sm, -c.cx, -c.cy));
    // Flash on the stop.
    if (stopped && after < 0.18) c.rect(0, 0, c.W, c.H, alpha("#FFFFEB", (1 - after / 0.18) * 0.35));
    // Slam word + subline.
    const st = style(c, c.vertical ? 240 : 200, { fontParam: p.font, weight: 800 });
    const L = c.fit(p.slam, st, c.safe.w * 0.92, 320, { maxLines: 1 });
    const at = STOP + 0.45;
    if (t > at - 0.09) {
      const k = clamp((t - (at - 0.09)) / 0.09);
      const a2 = Math.max(0, t - at);
      const sc = t < at ? 1.8 - 0.8 * E.in(k) : 1 + 0.05 * Math.exp(-a2 * 12) * Math.cos(a2 * 30) + a2 * 0.012;
      c.rect(0, 0, c.W, c.H, alpha("#000", 0.28 * Math.min(1, k)));
      textFx(c, L, c.cx, c.cy - (p.sub ? 60 : 0), { scale: sc, blur: t < at ? (1 - k) * 14 : 0, alpha: Math.min(1, k * 2), color: "#FFFFEB", emColor: "#FFFFEB", shadow: { color: alpha("#000", 0.5), blur: 30, y: 8 } });
      if (p.sub) {
        const S = c.fit(p.sub, style(c, c.vertical ? 50 : 42, { weight: 650 }), c.safe.w * 0.9, 140, { maxLines: 2, align: "center" });
        const v = pr(t, at + 0.35, at + 1.0, E.out);
        c.drawLayout(S, c.cx - S.width / 2, c.cy - 60 + L.height / 2 + 70 + (1 - v) * 16, { color: "#FFFFEB", alpha: v, shadow: { color: alpha("#000", 0.6), blur: 18, y: 4 } });
      }
    }
    void T;
  },
});
