import { E, P, alpha, defineComponent, pr, rand, type SoundCue } from "@motioneasy/engine";
import { stage } from "../kit";

type Props = { lines: string; cps: number; window: boolean; title: string; caret: "block" | "bar"; size: number; mistake: boolean; hold: number };

interface Key {
  t: number;
  line: number;
  text: string; // text of that line after this key
  kind: "char" | "back" | "enter";
}

/** Deterministic typing timeline: human rhythm from a seeded generator, pauses on punctuation. */
function plan(p: Props): { keys: Key[]; end: number } {
  const lines = p.lines.replace(/\r/g, "").split("\n");
  const keys: Key[] = [];
  let t = 0.6;
  const base = 1 / Math.max(4, p.cps);
  let seed = 11;
  lines.forEach((line, li) => {
    let cur = "";
    const isCmd = line.startsWith(">") || line.startsWith("$");
    const typed = isCmd ? line : line;
    // Output lines (not commands) print instantly, like a real terminal.
    if (!isCmd && li > 0) {
      t += 0.25;
      keys.push({ t, line: li, text: line, kind: "enter" });
      t += 0.12;
      return;
    }
    const mistakeAt = p.mistake && li === 0 ? Math.floor(typed.length * 0.55) : -1;
    for (let i = 0; i < typed.length; i++) {
      const ch = typed[i];
      if (i === mistakeAt) {
        // wrong key, a beat, backspace
        cur += "x";
        keys.push({ t, line: li, text: cur, kind: "char" });
        t += base * 4;
        cur = cur.slice(0, -1);
        keys.push({ t, line: li, text: cur, kind: "back" });
        t += base * 2;
      }
      cur += ch;
      keys.push({ t, line: li, text: cur, kind: "char" });
      const jitter = 0.55 + rand(seed++) * 0.9;
      t += base * jitter * (/[ ,.]/.test(ch) ? 1.6 : 1);
    }
    t += 0.3;
    keys.push({ t, line: li, text: cur, kind: "enter" });
    t += 0.15;
  });
  return { keys, end: t };
}

export default defineComponent<Props>({
  id: "terminal-type",
  name: "Terminal Type",
  version: "1.0.0",
  group: "elements",
  category: "text-reveals",
  description: "Commands typed with a human rhythm in a clean terminal window, with a real mistake and backspace, and output that prints instantly.",
  tags: ["typing", "terminal", "developer", "mono", "product"],
  added: "2026-10-03",
  featured: false,
  theme: { mode: "dark", lighting: 0.55, grain: 0.3, vignette: 0.45 },
  notes: "Lines starting with > or $ are typed; other lines print as output. Keep it to 2–4 lines.",
  params: {
    lines: P.text("> captionseasy add clip.mp4\nTranscribing on this device...\nDone. 214 words, every one timed.\n> export --mp4 --srt", "Lines", { multiline: true, maxLength: 240 }),
    cps: P.number(16, "Typing speed", { min: 6, max: 40, step: 1, unit: "chars/s" }),
    window: P.bool(true, "Window frame"),
    title: P.text("zsh", "Window title", { maxLength: 30 }),
    caret: P.select("block", "Caret", ["block", "bar"]),
    size: P.number(1, "Type size", { min: 0.6, max: 1.5, step: 0.05, group: "style" }),
    mistake: P.bool(true, "One typo + backspace"),
    hold: P.number(1.2, "Hold", { min: 0.3, max: 4, step: 0.1, unit: "s" }),
  },
  duration: (p) => plan(p).end + p.hold,
  poster: 0.7,
  sounds: (p) => {
    const cues: SoundCue[] = [{ at: 0.02, sound: "whoosh.air", gain: 0.35, role: "window" }];
    plan(p).keys.forEach((k, i) => {
      if (k.kind === "enter") cues.push({ at: k.t, sound: "foley.key", gain: 0.75, seed: 99, rate: 0.85, role: "return" });
      else cues.push({ at: k.t, sound: "foley.key", gain: 0.42 + rand(i * 7) * 0.2, seed: (i % 5) + 1, role: "key" });
    });
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const { keys } = plan(p);
    const lines = p.lines.replace(/\r/g, "").split("\n");
    // Current text of each line.
    const shown: (string | null)[] = lines.map(() => null);
    let active = 0;
    let lastKey = -1;
    for (const k of keys) {
      if (k.t > t) break;
      shown[k.line] = k.text;
      active = k.kind === "enter" ? Math.min(lines.length - 1, k.line + 1) : k.line;
      lastKey = k.t;
    }
    stage(c, { kind: "soft" });
    const size = Math.min((c.vertical ? 50 : 44) * p.size, (c.safe.w - 120) / Math.max(10, ...p.lines.split("\n").map((l) => l.length)) / 0.6);
    const mono = T.mono;
    const lh = size * 1.6;
    const longest = Math.max(...lines.map((l) => c.layout(l || " ", { font: mono, size, weight: 500, tracking: 0 }).width));
    const pad = size * 1.3;
    const w = Math.min(c.safe.w, Math.max(longest + pad * 2, c.safe.w * 0.7));
    const bar = p.window ? size * 1.6 : 0;
    const h = bar + pad * 2 + lines.length * lh;
    const x = c.cx - w / 2, y = c.cy - h / 2;
    const intro = pr(t, 0, 0.6, E.out);
    const push = 1 + 0.03 * E.cine(c.p);
    c.with({ x: c.cx, y: c.cy + (1 - intro) * 60, scale: push * (0.96 + 0.04 * intro), alpha: intro }, () => {
      c.translate(-c.cx, -c.cy);
      if (p.window) {
        const dark = T.mode === "dark";
        c.cardShadow(x, y, w, h, 22, 0.7, dark ? 2 : 1);
        c.rrect(x, y, w, h, 22, dark ? "#121211" : "#FFFFF6");
        c.strokeRRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, 22, alpha(T.fg, 0.1), 1.5);
        c.line(x, y + bar, x + w, y + bar, alpha(T.fg, 0.08), 1.5);
        [0, 1, 2].forEach((i) => c.circle(x + size * 0.9 + i * size * 0.75, y + bar / 2, size * 0.2, alpha(T.fg, 0.2)));
        if (p.title) {
          const TL = c.layout(p.title, { font: mono, size: size * 0.62, weight: 500, tracking: 0.04 });
          c.drawLayout(TL, c.cx - TL.width / 2, y + bar / 2 - TL.cap / 2, { color: alpha(T.fg, 0.45) });
        }
      }
      lines.forEach((line, i) => {
        const txt = shown[i];
        if (txt === null) return;
        const isCmd = line.startsWith(">") || line.startsWith("$");
        const ty = y + bar + pad + i * lh;
        const L = c.layout(txt || " ", { font: mono, size, weight: isCmd ? 600 : 400, tracking: 0 });
        c.drawLayout(L, x + pad, ty, { color: isCmd ? T.fg : alpha(T.fg, 0.55) });
        if (i === active) {
          const idle = t - lastKey > 0.35;
          const on = !idle || Math.floor((t - lastKey) * 2.2) % 2 === 0;
          if (on) {
            const cx = x + pad + (txt ? L.width + size * 0.08 : 0);
            if (p.caret === "block") c.rect(cx, ty - size * 0.1, size * 0.58, size * 1.12, alpha(T.fg, 0.85));
            else c.rect(cx, ty - size * 0.12, size * 0.1, size * 1.16, T.fg);
          }
        }
      });
    });
  },
});
