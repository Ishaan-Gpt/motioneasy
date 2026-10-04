import { E, P, alpha, defineComponent, pr, tw } from "@motioneasy/engine";
import { blockWindow, maskRise, style } from "../kit";
import { RAW } from "../demo";

type Props = { media: string | null; eyebrow: string; title: string; ratio: number; push: number; panX: number; focusX: number; focusY: number; font: string };

export default defineComponent<Props>({
  id: "cinematic-still",
  name: "Cinematic Still",
  version: "1.0.0",
  group: "elements",
  category: "media",
  description: "Your shot, graded like a film: letterbox bars close in, a slow push and pan drifts across it, and a chapter title rises in the lower third.",
  tags: ["film", "ken burns", "letterbox", "title", "story"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "dark", lighting: 0.5, grain: 0.55, vignette: 0.7 },
  notes: "For story openers and chapter cards. Works with a photo or a slow clip.",
  params: {
    media: P.media(RAW.mckensie.src, "Shot", "any"),
    eyebrow: P.text("Chapter one", "Eyebrow", { maxLength: 30 }),
    title: P.text("Where it *started.*", "Title", { maxLength: 50 }),
    ratio: P.number(2.39, "Letterbox ratio", { min: 1.5, max: 2.76, step: 0.01, group: "style", help: "2.39 is anamorphic widescreen." }),
    push: P.number(1, "Push amount", { min: 0, max: 2, step: 0.05 }),
    panX: P.number(0.4, "Pan", { min: -1, max: 1, step: 0.05 }),
    focusX: P.number(0.5, "Focus X", { min: 0, max: 1, step: 0.01, group: "style" }),
    focusY: P.number(0.35, "Focus Y", { min: 0, max: 1, step: 0.01, group: "style" }),
    font: P.font("instrument", "Typeface"),
  },
  duration: 5.5,
  poster: 0.7,
  sounds: () => [
    { at: 0, sound: "tonal.pad", len: 5.2, gain: 0.45, role: "bed" },
    { at: 0.15, sound: "whoosh.deep", gain: 0.35, role: "bars" },
    { at: 1.5, sound: "tonal.chime", gain: 0.25, role: "title" },
  ],
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    // Picture: slow push + pan, cover-fit around the focus point.
    const zoom = 1.06 + 0.12 * p.push * E.sine(c.p);
    const fx = p.focusX + p.panX * 0.08 * (c.p - 0.5);
    c.media(p.media, 0, 0, c.W, c.H, { zoom, focus: [fx, p.focusY], key: "still" });
    // Grade: lift blacks slightly warm, crush highlights a touch.
    c.rect(0, 0, c.W, c.H, alpha("#2a1d0c", 0.18));
    c.rect(0, 0, c.W, c.H, c.linear(0, 0, 0, c.H, [[0, alpha("#000000", 0.25)], [0.45, alpha("#000000", 0)], [1, alpha("#000000", 0.55)]]));
    // Letterbox bars close in.
    // Wide formats get true anamorphic bars; tall formats get a slimmer cinematic frame.
    const target = c.landscape ? Math.max(0, (c.H - c.W / p.ratio) / 2) : c.H * (0.06 + (p.ratio - 1.5) * 0.04);
    const bars = tw(t, 0.1, 1.1, 0, target, E.cine);
    c.rect(0, 0, c.W, bars, "#050505");
    c.rect(0, c.H - bars, c.W, bars, "#050505");
    // Title: lower third, inside the picture area.
    const base = c.H - bars - (c.vertical ? 90 : 70);
    const x = c.safe.x + (c.vertical ? 0 : 20);
    const eb = p.eyebrow ? c.layout(p.eyebrow, { font: T.mono, size: c.vertical ? 30 : 24, weight: 500, tracking: 0.18, uppercase: true }) : null;
    const L = c.fit(p.title, style(c, c.vertical ? 118 : 96, { fontParam: p.font, weight: p.font === "instrument" ? 400 : 700, lineHeight: 1 }), c.safe.w * 0.9, 260, { maxLines: 2 });
    const u1 = pr(t, 1.0, 1.8, E.out), u2 = pr(t, 1.3, 2.3, E.out);
    if (eb) {
      c.drawLayout(eb, x, base - L.height - eb.height - 34 + (1 - u1) * 16, { color: alpha("#FFFFEB", 0.75), alpha: u1 });
      c.line(x, base - L.height - 46, x + 60 * u1, base - L.height - 46, alpha("#FFFFEB", 0.6), 2, "butt");
    }
    const win = blockWindow(L);
    maskRise(c, base - L.height + win.top, win.h, u2, () => c.drawLayout(L, x, base - L.height, { color: "#FFFFEB", emColor: "#FFFFEB" }));
  },
});
