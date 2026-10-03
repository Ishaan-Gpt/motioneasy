import { E, P, alpha, defineComponent, logLerp, pr } from "@motioneasy/engine";
import { maskRise, stage, style } from "../kit";
import { CLIPS } from "../demo";

type Props = { text: string; media: string | null; open: boolean; sub: string; font: string; weight: number; hold: number };

const RISE = 0.7;
const OPEN_AT = 2.4;
const OPEN = 1.1;

export default defineComponent<Props>({
  id: "image-type",
  name: "Image Type",
  version: "1.0.0",
  group: "elements",
  category: "kinetic-type",
  description: "One huge word with your footage playing inside the letters. Then the word becomes a window: it opens out until the footage is the whole frame. Type that turns into the next shot.",
  tags: ["mask", "video in text", "match cut", "reveal", "bold"],
  added: "2026-10-04",
  featured: true,
  theme: { mode: "light", lighting: 0.4, grain: 0.3, vignette: 0.2, backdrop: "rings" },
  notes: "Use a short, wide word (4–7 letters) and footage with colour and movement. With Open on, it hands over to the footage: follow it with a cut, not another reveal.",
  params: {
    text: P.text("LOOKS", "Word", { maxLength: 12 }),
    media: P.media(CLIPS.gianna.src, "Footage inside the type", "any"),
    open: P.bool(true, "Open into the footage", { help: "The letters become a window that opens to full frame." }),
    sub: P.text("33 caption styles", "Small line", { maxLength: 40 }),
    font: P.font("brand", "Typeface"),
    weight: P.number(800, "Weight", { min: 600, max: 800, step: 50, group: "style" }),
    hold: P.number(1.2, "Hold", { min: 0.3, max: 4, step: 0.1, unit: "s" }),
  },
  duration: (p) => (p.open ? OPEN_AT + OPEN + p.hold : OPEN_AT + p.hold),
  poster: 0.45,
  sounds: (p) => [
    { at: 0.1, sound: "whoosh.swipe", gain: 0.5, role: "rise" },
    { at: RISE * 0.8, sound: "impact.land", gain: 0.45, role: "lock" },
    ...(p.open ? [{ at: OPEN_AT - 0.1, sound: "riser.reverse", len: OPEN * 0.7, gain: 0.45, role: "open" }, { at: OPEN_AT + OPEN * 0.75, sound: "whoosh.deep", gain: 0.5, role: "through" }] : []),
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { kind: "soft", word: p.text });
    const st = style(c, c.H * 0.4, { fontParam: p.font, weight: p.weight, lineHeight: 0.92, uppercase: true, tracking: -0.05 });
    const L = c.fit(p.text, st, Math.min(c.W * 0.94, c.safe.w * 1.06), c.H * (c.vertical ? 0.3 : 0.5), { maxLines: 1 });
    const ox = c.cx - L.width / 2;
    const oy = c.cy - L.height / 2;
    const rise = pr(t, 0.05, 0.05 + RISE, E.out);
    const open = p.open ? pr(t, OPEN_AT, OPEN_AT + OPEN, E.inOut) : 0;
    // The window: the glyphs plus a rounded box that grows from the word's cap box to the full frame.
    const capTop = oy + L.lines[0].y - L.cap, capH = L.cap;
    const bx0 = ox + L.width / 2, by0 = capTop + capH / 2;
    const s = open > 0 ? logLerp(0.02, 1, open) : 0;
    const bw = (c.W + 40) * s, bh = (c.H + 40) * s;
    const media = c.layer(c.W, c.H, (lc) => {
      // mask
      lc.save();
      lc.clipRect(0, capTop - capH * 0.3, c.W, capH * 1.6); // the word rises out of a slot
      lc.with({ y: (1 - rise) * capH * 1.1 }, () => lc.drawLayout(L, ox, oy, { color: "#000", emColor: "#000" }));
      lc.restore();
      if (bw > 1) lc.rrect(bx0 - bw / 2 + (c.cx - bx0) * open, by0 - bh / 2 + (c.cy - by0) * open, bw, bh, c.short * 0.05 * (1 - open), "#000");
      lc.blend("source-in");
      const zoom = logLerp(1.35, 1.05, pr(t, 0, OPEN_AT + OPEN + p.hold, E.linear));
      lc.media(p.media, 0, 0, c.W, c.H, { zoom, key: "image-type" });
      lc.blend("source-over");
    });
    c.drawLayer(media, 0, 0);
    // a hairline outline keeps the letters readable on light footage, fading as the window opens
    if (rise > 0 && open < 1) {
      c.save();
      c.clipRect(0, capTop - capH * 0.3, c.W, capH * 1.6);
      c.with({ y: (1 - rise) * capH * 1.1 }, () => c.drawLayout(L, ox, oy, { outline: true, stroke: { color: alpha(T.fg, 0.25 * (1 - open)), width: 2 } }));
      c.restore();
    }
    if (p.sub) {
      const S = c.layout(p.sub, style(c, Math.max(30, L.size * 0.12), { fontParam: p.font, weight: 600, tracking: 0.02, uppercase: true }));
      const u = pr(t, RISE * 0.7, RISE * 0.7 + 0.6, E.out) * (1 - pr(t, OPEN_AT, OPEN_AT + 0.3));
      const sy = capTop + capH + L.size * 0.16;
      if (u > 0) maskRise(c, sy - S.size * 0.2, S.height + S.size * 0.4, u, () => c.drawLayout(S, c.cx - S.width / 2, sy, { color: T.fg }));
    }
  },
});
