#!/usr/bin/env node
// Music library: curated CC-BY tracks by Kevin MacLeod (incompetech.com), tagged by mood and measured.
//   node cli/music.mjs            fetch missing tracks, measure them, write the manifest
//   node cli/music.mjs --list     print the library
// Tracks go to assets/audio/music/library/ (git-ignored: re-fetched on demand). The manifest
// packages/library/src/music.gen.ts carries what an edit needs: measured BPM, the first beat, energy,
// and bar-aligned entry points into the strongest sections, so cuts land on the music.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./server.mjs";

const LIB = join(ROOT, "assets/audio/music/library");
const MANIFEST = join(ROOT, "packages/library/src/music.gen.ts");
mkdirSync(LIB, { recursive: true });

// title on incompetech → mood. Moods: soft (premium, calm), uplifting (bright product), groove (funky,
// warm), driving (electronic energy), dramatic (cinematic intensity). Picked for social edits: steady
// pulse, no long intros, no comedy or horror colour.
const PICKS = {
  soft: ["Evening", "Almost Bliss", "Dreamer", "Easy Lemon", "Light Thought var 1", "Screen Saver", "Limit 70"],
  uplifting: ["Inspired", "Nowhere Land", "Montauk Point", "On My Way", "Son of a Rocket", "Electrodoodle", "Newer Wave", "Brightly Fancy"],
  groove: ["Funkorama", "Funky Chunk", "Got Funk", "Disco Medusae", "Loopster", "Backbay Lounge", "Werq", "Chill Wave", "Lobby Time"],
  driving: ["Raving Energy", "Voxel Revolution", "Realizer", "Delightful D", "Getting it Done", "Nonstop", "Super Power Cool Dude"],
  dramatic: ["Volatile Reaction"],
};
// Tracks committed before the library existed keep their paths.
const LEGACY = { Funkorama: "assets/audio/music/kevin-macleod_Funkorama.mp3", Inspired: "assets/audio/music/kevin-macleod_Inspired.mp3", "Volatile Reaction": "assets/audio/music/kevin-macleod_VolatileReaction.mp3" };

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

if (process.argv.includes("--list")) {
  const src = existsSync(MANIFEST) ? readFileSync(MANIFEST, "utf8") : "";
  for (const m of src.matchAll(/name: "([^"]+)", mood: "(\w+)"[^}]*?bpm: ([\d.]+)[^}]*?energy: ([\d.]+)/g)) console.log(`${m[2].padEnd(10)} ${m[1].padEnd(24)} ${m[3].padStart(6)} BPM  energy ${m[4]}`);
  process.exit(0);
}

const catalog = await (await fetch("https://incompetech.com/music/royalty-free/pieces.json")).json();
const byTitle = new Map(catalog.map((p) => [p.title, p]));

/** Decode to mono 11025 Hz floats. */
function decode(file) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "11025", "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(r.stderr.toString());
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4);
}

/** Tempo near the catalog BPM (or its half/double), beat phase, a 1 s energy curve and bar-aligned entries. */
function analyse(x, hint) {
  const sr = 11025, hop = 128, fps = sr / hop;
  const n = Math.floor(x.length / hop);
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < hop; k++) s += x[i * hop + k] ** 2;
    e[i] = Math.sqrt(s / hop);
  }
  const o = new Float32Array(n);
  for (let i = 1; i < n; i++) o[i] = Math.max(0, e[i] - e[i - 1]);
  const from = Math.floor(10 * fps), to = Math.min(n - 1, Math.floor(100 * fps));
  const score = (bpm, phase = 0) => {
    const per = (fps * 60) / bpm;
    let s = 0;
    for (let k = 0; ; k++) {
      const i = Math.round(from + phase + k * per);
      if (i >= to) break;
      s += o[i] + 0.5 * (o[i - 1] + o[i + 1]);
    }
    return s;
  };
  // Search near the catalog tempo and its half/double; keep the catalog's octave unless another is clearly stronger.
  const around = (base) => {
    let top = { s: -1, bpm: base };
    for (let b = base * 0.97; b <= base * 1.03; b += 0.02) {
      const per = (fps * 60) / b;
      let s = 0;
      for (let ph = 0; ph < per; ph += per / 8) s = Math.max(s, score(b, ph));
      if (s > top.s) top = { s, bpm: b };
    }
    return top;
  };
  let best = around(hint);
  for (const base of [hint / 2, hint * 2].filter((b) => b >= 70 && b <= Math.max(150, hint))) {
    const alt = around(base);
    if (alt.s > best.s * 1.25) best = alt;
  }
  const per = (fps * 60) / best.bpm;
  let phase = 0, ps = -1;
  for (let ph = 0; ph < per; ph += 0.25) {
    const s = score(best.bpm, ph);
    if (s > ps) { ps = s; phase = ph; }
  }
  const beat0 = (((from + phase) / fps) % (60 / best.bpm));
  // energy: RMS per second, normalised against the track's own 90th percentile
  const secs = Math.floor(x.length / sr);
  const rms = [];
  for (let s = 0; s < secs; s++) {
    let a = 0;
    for (let k = s * sr; k < (s + 1) * sr; k++) a += x[k] ** 2;
    rms.push(Math.sqrt(a / sr));
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const p90 = sorted[Math.floor(sorted.length * 0.9)] || 1e-6;
  const bar = (4 * 60) / best.bpm;
  const starts = [];
  for (let t = beat0; t < secs - 20; t += bar) {
    const w = rms.slice(Math.floor(t), Math.floor(t) + 8);
    const avg = w.reduce((a, b) => a + b, 0) / Math.max(1, w.length);
    if (avg >= p90 * 0.82 && (!starts.length || t - starts[starts.length - 1] >= 16)) starts.push(Number(t.toFixed(3)));
    if (starts.length >= 4) break;
  }
  const loud = sorted[Math.floor(sorted.length * 0.5)];
  return { bpm: Number(best.bpm.toFixed(2)), beat: Number(beat0.toFixed(3)), starts, loud };
}

const rows = [];
for (const [mood, titles] of Object.entries(PICKS)) {
  for (const title of titles) {
    const meta = byTitle.get(title);
    if (!meta) { console.warn(`music    not in catalog: ${title}`); continue; }
    const id = slug(title);
    const file = LEGACY[title] ? join(ROOT, LEGACY[title]) : join(LIB, `${id}.mp3`);
    if (!existsSync(file)) {
      const url = `https://incompetech.com/music/royalty-free/mp3-royaltyfree/${encodeURIComponent(meta.filename)}`;
      const res = await fetch(url);
      if (!res.ok) { console.warn(`music    download failed ${title}: HTTP ${res.status}`); continue; }
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
    const a = analyse(decode(file), Number(meta.bpm) || 120);
    rows.push({ id, name: title, mood, bpm: a.bpm, beat: a.beat, starts: a.starts.length ? a.starts : [a.beat], loud: a.loud, feel: meta.feel, instruments: meta.instruments, length: meta.length.replace(/^00:/, ""), src: LEGACY[title] ? `media/music/${LEGACY[title].split("/").pop()}` : `media/music/library/${id}.mp3`, credit: `"${title}" by Kevin MacLeod (incompetech.com), CC-BY 4.0` });
    console.log(`music    ${mood.padEnd(10)} ${title.padEnd(24)} ${String(a.bpm).padStart(6)} BPM  first beat ${a.beat}s  entries ${a.starts.join(", ")}`);
  }
}
// energy 0..1 across the library (median loudness of each track, relative)
const lo = Math.min(...rows.map((r) => r.loud)), hi = Math.max(...rows.map((r) => r.loud));
for (const r of rows) r.energy = Number(((r.loud - lo) / Math.max(1e-6, hi - lo)).toFixed(2));

const line = (r) => `  { id: ${JSON.stringify(r.id)}, name: ${JSON.stringify(r.name)}, mood: ${JSON.stringify(r.mood)}, bpm: ${r.bpm}, beat: ${r.beat}, starts: [${r.starts.join(", ")}], energy: ${r.energy}, feel: ${JSON.stringify(r.feel)}, instruments: ${JSON.stringify(r.instruments)}, length: ${JSON.stringify(r.length)}, src: ${JSON.stringify(r.src)}, credit: ${JSON.stringify(r.credit)} },`;
writeFileSync(
  MANIFEST,
  `// Generated by cli/music.mjs from incompetech.com (Kevin MacLeod, CC-BY 4.0: the credit must ship with\n// the post). Measured: bpm, first beat (s), bar-aligned entries into strong sections (s), energy 0..1.\n// Do not edit by hand.\n\nexport type MusicMood = "soft" | "uplifting" | "groove" | "driving" | "dramatic";\n\nexport interface Track {\n  id: string;\n  name: string;\n  mood: MusicMood;\n  bpm: number;\n  beat: number;\n  starts: number[];\n  energy: number;\n  feel: string;\n  instruments: string;\n  length: string;\n  src: string;\n  credit: string;\n}\n\nexport const MUSIC_LIBRARY: Track[] = [\n${rows.map(line).join("\n")}\n];\n`,
);
console.log(`music    ${rows.length} tracks → packages/library/src/music.gen.ts`);
