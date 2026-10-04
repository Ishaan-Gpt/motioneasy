// Word timing for caption components: a transcript (Whisper JSON in any common shape), the demo
// transcripts, or plain text spread evenly when no timing exists.

import { TRANSCRIPTS, type Word } from "./transcripts";

export type { Word };

export function normalizeTranscript(raw: unknown): Word[] | null {
  if (!raw) return null;
  const list = Array.isArray(raw) ? raw : (raw as { words?: unknown[]; segments?: { words?: unknown[] }[] }).words ?? (raw as { segments?: { words?: unknown[] }[] }).segments?.flatMap((s) => s.words ?? []);
  if (!Array.isArray(list) || !list.length) return null;
  const out: Word[] = [];
  for (const w of list) {
    if (Array.isArray(w) && typeof w[0] === "string") out.push([w[0], Number(w[1]), Number(w[2])]);
    else if (w && typeof w === "object") {
      const o = w as Record<string, unknown>;
      const text = String(o.text ?? o.word ?? "").trim();
      if (!text) continue;
      const ms = "startMs" in o;
      const s = Number(ms ? o.startMs : o.start ?? o.from ?? 0) / (ms ? 1000 : 1);
      const e = Number(ms ? o.endMs : o.end ?? o.to ?? s + 0.3) / (ms ? 1000 : 1);
      out.push([text, s, e]);
    }
  }
  return out.length ? out : null;
}

/** Words to show: explicit transcript > demo transcript for the clip > even timing from text. */
export function timedWords(media: string | null, transcript: unknown, text: string, start = 0.25, wps = 2.6): Word[] {
  const explicit = transcript !== "auto" ? normalizeTranscript(transcript) : null;
  if (explicit) return explicit;
  if (media && TRANSCRIPTS[media] && transcript === "auto") return TRANSCRIPTS[media];
  const words = text.split(/\s+/).filter(Boolean);
  return words.map((w, i) => [w, start + i / wps, start + (i + 1) / wps] as Word);
}

export interface Page {
  words: { text: string; s: number; e: number; i: number }[];
  s: number;
  e: number;
}

/** Group words into short pages (max words / chars), breaking on sentence ends and long pauses. */
export function paginate(words: Word[], maxWords = 3, maxChars = 18): Page[] {
  const pages: Page[] = [];
  let cur: Page | null = null;
  words.forEach(([text, s, e], i) => {
    const len = cur ? cur.words.reduce((a, w) => a + w.text.length + 1, 0) : 0;
    const gap = cur ? s - cur.e : 0;
    if (!cur || cur.words.length >= maxWords || len + text.length > maxChars || gap > 0.6) {
      cur = { words: [], s, e };
      pages.push(cur);
    }
    cur.words.push({ text, s, e, i });
    cur.e = e;
    if (/[.!?]$/.test(text)) cur = null;
  });
  // A page stays up until the next one starts (no flicker in short gaps).
  for (let i = 0; i < pages.length - 1; i++) if (pages[i + 1].s - pages[i].e < 0.6) pages[i].e = pages[i + 1].s;
  return pages;
}
