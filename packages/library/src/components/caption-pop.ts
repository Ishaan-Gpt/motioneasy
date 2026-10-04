import { E, P, alpha, defineComponent, mix, pr, type SoundCue } from "@motioneasy/engine";
import { RAW } from "../demo";
import { paginate, timedWords } from "../captions";

type Props = { media: string | null; transcript: unknown; text: string; keywords: string; position: number; size: number; clipAudio: boolean; font: string };

const dur = (p: Props) => Math.max(2, (timedWords(p.media, p.transcript, p.text).at(-1)?.[2] ?? 3) + 0.6);

export default defineComponent<Props>({
  id: "caption-pop",
  name: "Pop Words",
  version: "1.0.0",
  group: "elements",
  category: "captions",
  description: "Big two-word captions that pop on every word with a spring. Keywords land in a serif accent, larger. Built for retention.",
  tags: ["captions", "hormozi", "bold", "talking head", "retention"],
  added: "2026-10-03",
  featured: true,
  theme: { mode: "dark", lighting: 0.2, grain: 0.25, vignette: 0.4 },
  notes: "List keywords to emphasise (comma separated). Keep it to one or two per sentence.",
  params: {
    media: P.media(RAW.sam.src, "Clip", "video"),
    transcript: P.json("auto", "Transcript (Whisper JSON)", { help: "\"auto\" uses the demo clip's transcript." }),
    text: P.text("Paste your words here if you have no transcript", "Text (no transcript)", { maxLength: 400, multiline: true }),
    keywords: P.text("books, libraries, knowledge", "Keywords", { maxLength: 120, help: "Comma separated. These land big, in the serif accent." }),
    position: P.number(0.62, "Vertical position", { min: 0.2, max: 0.85, step: 0.01, group: "style" }),
    size: P.number(1, "Text size", { min: 0.6, max: 1.6, step: 0.05, group: "style" }),
    clipAudio: P.bool(true, "Use the clip's audio", { group: "sound" }),
    font: P.font("brand", "Typeface"),
  },
  duration: dur,
  poster: 0.3,
  sounds: (p) => {
    const cues: SoundCue[] = [];
    if (p.clipAudio && p.media) cues.push({ at: 0, sound: `url:${p.media}`, len: dur(p), gain: 1, role: "clip audio" });
    const keys = p.keywords.toLowerCase().split(",").map((k) => k.trim()).filter(Boolean);
    for (const [w, s] of timedWords(p.media, p.transcript, p.text)) if (keys.includes(w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, ""))) cues.push({ at: s, sound: "ui.pop", gain: 0.35, role: "keyword" });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    c.media(p.media, 0, 0, c.W, c.H, { focus: [0.5, 0.35], key: "pop", loop: false });
    c.rect(0, 0, c.W, c.H, alpha("#000", 0.12));
    const keys = p.keywords.toLowerCase().split(",").map((k) => k.trim()).filter(Boolean);
    const words = timedWords(p.media, p.transcript, p.text);
    const pages = paginate(words, 2, 14);
    const page = pages.find((pg) => t >= pg.s - 0.05 && t < pg.e + 0.05);
    if (!page) return;
    const size = (c.vertical ? 104 : 84) * p.size;
    const font = p.font === "brand" ? T.font : (p.font as typeof T.font);
    const isKey = (w: string) => keys.includes(w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, ""));
    const rich = page.words.map((w) => (isKey(w.text) ? `*${w.text}*` : w.text.toUpperCase())).join(" ");
    const L = c.fit(rich, { font, size, weight: 900, tracking: -0.03, lineHeight: 1.0, em: { font: T.accentFont, italic: true, weight: 400, scale: 1.35 } }, c.safe.w, size * 2.6, { maxLines: 2, align: "center" });
    const ox = c.cx - L.width / 2, oy = c.H * p.position - L.height / 2;
    L.words.forEach((w, i) => {
      const pw = page.words[i];
      if (!pw || t < pw.s - 0.04) return;
      const s = pr(t, pw.s - 0.04, pw.s + 0.16, E.outBackBig);
      const cx = ox + w.x + w.w / 2, cy = oy + w.y - w.size * 0.35;
      c.with({ x: cx, y: cy, scale: 0.6 + 0.4 * s }, () =>
        c.word(w, -(w.x + w.w / 2), -(w.y - w.size * 0.35), {
          color: "#FFFFEB",
          emColor: mix("#FFFFEB", T.glow, 0.15),
          stroke: { color: alpha("#000", 0.85), width: w.size * 0.09 },
          shadow: { color: alpha("#000", 0.45), blur: 16, y: 6 },
          alpha: Math.min(1, s * 1.5),
        }),
      );
    });
  },
});
