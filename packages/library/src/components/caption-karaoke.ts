import { E, P, alpha, clamp, defineComponent, pr, type SoundCue } from "@motioneasy/engine";
import { RAW } from "../demo";
import { paginate, timedWords } from "../captions";

type Props = { media: string | null; transcript: unknown; text: string; position: number; size: number; uppercase: boolean; pill: string; clipAudio: boolean; maxWords: number; font: string };

const dur = (p: Props) => {
  const w = timedWords(p.media, p.transcript, p.text);
  return Math.max(2, (w.at(-1)?.[2] ?? 3) + 0.6);
};

export default defineComponent<Props>({
  id: "caption-karaoke",
  name: "Karaoke Pill",
  version: "1.0.0",
  group: "elements",
  category: "captions",
  description: "Word-timed captions over your clip: short pages rise in, and a pill glides from word to word exactly as it's spoken.",
  tags: ["captions", "karaoke", "talking head", "subtitles", "word timing"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "dark", lighting: 0.2, grain: 0.25, vignette: 0.35 },
  notes: "Paste a Whisper transcript (JSON) for exact timing, or type the text and words are spread evenly.",
  params: {
    media: P.media(RAW.omar.src, "Clip", "video"),
    transcript: P.json("auto", "Transcript (Whisper JSON)", { help: "\"auto\" uses the demo clip's transcript. Paste words as [[text, start, end], …] or Whisper JSON." }),
    text: P.text("Paste your words here if you have no transcript", "Text (no transcript)", { maxLength: 400, multiline: true }),
    position: P.number(0.68, "Vertical position", { min: 0.2, max: 0.85, step: 0.01, group: "style" }),
    size: P.number(1, "Text size", { min: 0.6, max: 1.6, step: 0.05, group: "style" }),
    uppercase: P.bool(false, "Uppercase"),
    pill: P.color("#FFFFEB", "Pill colour", { group: "style" }),
    maxWords: P.number(3, "Words per page", { min: 1, max: 6, step: 1, group: "style" }),
    clipAudio: P.bool(true, "Use the clip's audio", { group: "sound" }),
    font: P.font("brand", "Typeface"),
  },
  duration: dur,
  poster: 0.35,
  sounds: (p) => {
    const cues: SoundCue[] = [];
    if (p.clipAudio && p.media) cues.push({ at: 0, sound: `url:${p.media}`, len: dur(p), gain: 1, role: "clip audio" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    c.media(p.media, 0, 0, c.W, c.H, { focus: [0.5, 0.35], key: "kar", loop: false });
    c.rect(0, 0, c.W, c.H, c.linear(0, c.H * 0.45, 0, c.H, [[0, alpha("#000", 0)], [1, alpha("#000", 0.35)]]));
    const words = timedWords(p.media, p.transcript, p.text);
    const pages = paginate(words, p.maxWords, 18 + p.maxWords * 2);
    const page = pages.find((pg) => t >= pg.s - 0.08 && t < pg.e + 0.05) ?? null;
    if (!page) return;
    const size = (c.vertical ? 82 : 66) * p.size;
    const font = p.font === "brand" ? T.font : (p.font as typeof T.font);
    const txt = page.words.map((w) => (p.uppercase ? w.text.toUpperCase() : w.text)).join(" ");
    const L = c.fit(txt, { font, size, weight: 800, tracking: -0.02, wordSpacing: 0.18 }, c.safe.w, size * 2.6, { maxLines: 2, align: "center" });
    const ox = c.cx - L.width / 2, oy = c.H * p.position - L.height / 2;
    const inU = pr(t, page.s - 0.08, page.s + 0.12, E.out);
    // The active word and the pill's eased position between words.
    let ai = page.words.findIndex((w) => t >= w.s && t < w.e + 0.04);
    if (ai < 0) ai = t < page.words[0].s ? 0 : page.words.length - 1;
    const box = (i: number) => {
      const w = L.words[i];
      const pad = w.size * 0.13;
      return { x: ox + w.x - pad, y: oy + w.y - w.size * 0.82, w: w.w + pad * 2, h: w.size * 1.12 };
    };
    const prev = Math.max(0, ai - 1);
    const k = ai > 0 ? clamp((t - page.words[ai].s) / 0.1) : 1;
    const a = box(prev), b = box(ai);
    const e = E.out(k);
    const pb = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, w: a.w + (b.w - a.w) * e, h: a.h + (b.h - a.h) * e };
    c.with({ x: c.cx, y: oy + L.height / 2 + (1 - inU) * 26, scale: 0.94 + 0.06 * inU, alpha: inU }, () => {
      c.translate(-c.cx, -(oy + L.height / 2));
      c.save();
      c.shadow(alpha("#000", 0.35), 18, 0, 6);
      c.rrect(pb.x, pb.y, pb.w, pb.h, pb.h * 0.22, p.pill);
      c.restore();
      L.words.forEach((w, i) =>
        c.word(w, ox, oy, {
          color: i === ai ? "#141413" : "#FFFFEB",
          shadow: i === ai ? undefined : { color: alpha("#000", 0.55), blur: 12, y: 3 },
        }),
      );
    });
  },
});
