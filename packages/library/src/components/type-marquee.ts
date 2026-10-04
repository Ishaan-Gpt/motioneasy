import { E, P, alpha, clamp, defineComponent, floatIn, pr } from "@motioneasy/engine";
import { heroWord, stage, style } from "../kit";

type Props = { text: string; echo: string; rows: number; speed: number; band: boolean; font: string; weight: number; hold: number };

const LAND = 1.3;

export default defineComponent<Props>({
  id: "type-marquee",
  name: "Type Marquee",
  version: "1.0.0",
  group: "elements",
  category: "kinetic-type",
  description: "The whole frame is type: rows of outlined words scroll against each other while the message flies in on the middle row, lands dead centre and gets a colour band behind it.",
  tags: ["marquee", "full frame", "kinetic", "bold", "loop"],
  added: "2026-10-04",
  featured: true,
  theme: { mode: "dark", lighting: 0.4, grain: 0.4, vignette: 0.35, backdrop: "plain" },
  notes: "A loud opener or chapter card. The echo rows repeat a word (the product, the topic); keep the message to 1–3 words.",
  params: {
    text: P.text("Post *more.*", "Message", { maxLength: 28 }),
    echo: P.text("CAPTIONS", "Echo word", { maxLength: 20, help: "Repeated in the scrolling rows. Empty = the message itself." }),
    rows: P.number(5, "Rows", { min: 3, max: 7, step: 1, group: "style" }),
    speed: P.number(1, "Scroll speed", { min: 0.3, max: 2.5, step: 0.05 }),
    band: P.bool(true, "Colour band", { help: "A band of the accent colour wipes in behind the message when it lands." }),
    font: P.font("brand", "Typeface"),
    weight: P.number(800, "Weight", { min: 500, max: 800, step: 50, group: "style" }),
    hold: P.number(1.8, "Hold", { min: 0.5, max: 4, step: 0.1, unit: "s" }),
  },
  duration: (p) => LAND + 0.8 + p.hold,
  poster: 0.75,
  sounds: () => [
    { at: 0, sound: "whoosh.air", gain: 0.5, role: "scroll" },
    { at: LAND - 0.45, sound: "whoosh.whip", gain: 0.45, role: "message" },
    { at: LAND, sound: "impact.punch", gain: 0.65, role: "land" },
    { at: LAND + 0.15, sound: "tonal.shimmer", gain: 0.2, role: "band" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    stage(c, { word: heroWord(p.text), kind: "soft" });
    const rows = Math.round(p.rows);
    const rowH = c.H / rows;
    const size = rowH * 0.86;
    const st = style(c, size, { fontParam: p.font, weight: p.weight, lineHeight: 1, uppercase: true, tracking: -0.045 });
    const echo = (p.echo || p.text.replace(/\*/g, "")).trim();
    const unitL = c.layout(`${echo} — `, st);
    const unit = Math.max(1, unitL.width);
    const mid = Math.floor(rows / 2);
    const landed = pr(t, LAND, LAND + 0.5, E.out);
    for (let r = 0; r < rows; r++) {
      if (r === mid) continue;
      const dir = r % 2 ? 1 : -1;
      // rows keep moving the whole shot, a little slower once the message has landed
      const travel = (t * 0.55 + (1 - Math.exp(-t * 1.6)) * 0.4) * size * p.speed * (1 + 0.15 * r);
      const off = (((dir * travel) % unit) + unit) % unit;
      const y = r * rowH + (rowH - unitL.height) / 2;
      const fade = 1 - landed * 0.55;
      for (let x = -off - unit; x < c.W + unit; x += unit) c.drawLayout(unitL, x, y, { outline: true, stroke: { color: alpha(T.fg, 0.32 * fade), width: 2.5 } });
    }
    // the message row
    const ML = c.fit(p.text, { ...st }, c.safe.w * 0.94, rowH * 0.98, { maxLines: 1 });
    const my = mid * rowH + (rowH - ML.height) / 2;
    const fromX = c.W * 1.05;
    const x = c.cx - ML.width / 2 + floatIn(t, LAND - 0.55, 0.16, fromX, 0);
    if (p.band && landed > 0) {
      const bw = (c.W + 40) * E.out(landed);
      c.rect(-20, mid * rowH + rowH * 0.06, bw, rowH * 0.88, T.accent);
    }
    if (t >= LAND - 0.55) c.drawLayout(ML, x, my, { color: landed > 0.4 && p.band ? T.bg : T.fg, emColor: landed > 0.4 && p.band ? T.bg : T.accent, alpha: clamp((t - (LAND - 0.55)) * 6) });
  },
});
