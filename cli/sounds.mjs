#!/usr/bin/env node
// Recorded (CC0) sounds for the engine library.
//   node cli/sounds.mjs                 import the curated Kenney CC0 sounds from assets/audio/sfx
//   node cli/sounds.mjs --freesound      also fetch curated CC0 searches from Freesound (HQ previews);
//                                       uses the API when FREESOUND_API_KEY is set, else the public search page
// Writes packages/engine/assets/sounds/*.wav (48 kHz mono, leading silence trimmed, peak -1 dBFS),
// packages/engine/src/audio/samples.gen.ts (the manifest the engine registers) and CREDITS.md.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./server.mjs";

const OUT = join(ROOT, "packages/engine/assets/sounds");
const MANIFEST = join(ROOT, "packages/engine/src/audio/samples.gen.ts");
const KENNEY = join(ROOT, "assets/audio/sfx");
mkdirSync(OUT, { recursive: true });

// id, name, category, description, source file. Picked by ear for distinct roles (no near-duplicates).
const KENNEY_PICKS = [
  ["click", "Soft Click", "ui", "Recorded soft click. Buttons and taps where the synth click feels too clean.", "kenney-ui-audio/click1.ogg"],
  ["mouse", "Mouse Click", "ui", "A real mouse button: press and release.", "kenney-ui-audio/mouseclick1.ogg"],
  ["select", "Select", "ui", "Tiny bright select blip for list items and steps.", "kenney-interface-sounds/select_001.ogg"],
  ["toggle", "Toggle", "ui", "Switch flipping on. Settings, toggles, check marks.", "kenney-interface-sounds/toggle_001.ogg"],
  ["switch", "Switch", "ui", "Chunkier mechanical switch.", "kenney-ui-audio/switch10.ogg"],
  ["tick", "Wood Tick", "ui", "Recorded tick for counters and progress, warmer than the synth tick.", "kenney-interface-sounds/tick_001.ogg"],
  ["rollover", "Rollover", "ui", "Soft hover blip.", "kenney-ui-audio/rollover2.ogg"],
  ["confirm", "Confirm", "tonal", "Short rising two-tone confirmation.", "kenney-interface-sounds/confirmation_001.ogg"],
  ["success", "Success", "tonal", "Longer, brighter success sting.", "kenney-interface-sounds/confirmation_002.ogg"],
  ["pluck", "Pluck", "tonal", "Single plucked note. A number or chip landing.", "kenney-interface-sounds/pluck_002.ogg"],
  ["bong", "Bong", "tonal", "Rounded low bong for a soft arrival.", "kenney-interface-sounds/bong_001.ogg"],
  ["question", "Question", "tonal", "Two notes that ask a question. Hooks and polls.", "kenney-interface-sounds/question_001.ogg"],
  ["glass", "Glass Tap", "tonal", "A tap on glass. Clean reveals.", "kenney-interface-sounds/glass_001.ogg"],
  ["drop", "Drop", "foley", "Small object dropped on a table.", "kenney-interface-sounds/drop_002.ogg"],
  ["scratch", "Scratch", "foley", "Short paper scratch.", "kenney-interface-sounds/scratch_001.ogg"],
  ["open", "Open", "foley", "Something opening: a lid, a panel, a card.", "kenney-interface-sounds/open_001.ogg"],
  ["scroll", "Scroll", "foley", "A wheel scrolling for a beat. Feeds and lists.", "kenney-interface-sounds/scroll_001.ogg"],
  ["expand", "Expand", "fx", "Upward sweep for something growing or opening full screen.", "kenney-interface-sounds/maximize_001.ogg"],
  ["collapse", "Collapse", "fx", "Downward sweep for something closing or shrinking.", "kenney-interface-sounds/minimize_001.ogg"],
];

// Freesound searches (CC0 only). Each keeps the top `take` results by rating within the duration range.
// Roles a launch edit needs: directional whooshes of different weights, risers that land, impacts from soft
// to cinematic, type and UI foley, shimmer for reveals, glitch for cuts.
const FREESOUND_QUERIES = [
  { q: "whoosh", cat: "whoosh", dur: [0.3, 1.6], take: 3 },
  { q: "swoosh transition", cat: "whoosh", dur: [0.3, 1.8], take: 2 },
  { q: "whoosh soft", cat: "whoosh", dur: [0.4, 2], take: 2 },
  { q: "swish fast", cat: "whoosh", dur: [0.1, 0.8], take: 2 },
  { q: "whoosh deep cinematic", cat: "whoosh", dur: [0.8, 3], take: 2 },
  { q: "riser", cat: "riser", dur: [1, 4], take: 2 },
  { q: "uplifter", cat: "riser", dur: [1, 4], take: 2 },
  { q: "reverse cymbal", cat: "riser", dur: [0.8, 3], take: 1 },
  { q: "cinematic impact", cat: "impact", dur: [0.6, 4], take: 2 },
  { q: "boom hit", cat: "impact", dur: [0.5, 4], take: 2 },
  { q: "punch hit", cat: "impact", dur: [0.1, 1], take: 2 },
  { q: "thud soft", cat: "impact", dur: [0.1, 1.2], take: 2 },
  { q: "bass drop", cat: "impact", dur: [0.5, 3], take: 1 },
  { q: "typewriter key", cat: "foley", dur: [0.05, 0.6], take: 2 },
  { q: "keyboard typing", cat: "foley", dur: [0.3, 3], take: 1 },
  { q: "camera shutter", cat: "foley", dur: [0.1, 1.2], take: 1 },
  { q: "paper swipe", cat: "foley", dur: [0.1, 1.2], take: 1 },
  { q: "chime", cat: "tonal", dur: [0.4, 3], take: 2 },
  { q: "sparkle shimmer", cat: "tonal", dur: [0.4, 3], take: 2 },
  { q: "notification ding", cat: "tonal", dur: [0.2, 1.5], take: 1 },
  { q: "pop", cat: "ui", dur: [0.05, 0.6], take: 2 },
  { q: "bubble pop", cat: "ui", dur: [0.05, 0.6], take: 1 },
  { q: "button click", cat: "ui", dur: [0.03, 0.4], take: 1 },
  { q: "glitch", cat: "fx", dur: [0.2, 1.5], take: 2 },
  // 2026-10-07 · 30 s landscape film: liquid swirl, results raining in, a search bar typed key by key, the drop, glass UI.
  { q: "liquid whoosh", cat: "whoosh", dur: [0.6, 3], take: 2 },
  { q: "cards shuffle", cat: "foley", dur: [0.2, 2], take: 2 },
  { q: "mechanical keyboard key", cat: "foley", dur: [0.03, 0.5], take: 2 },
  { q: "sub drop", cat: "impact", dur: [0.8, 4], take: 2 },
  { q: "glass ting", cat: "ui", dur: [0.1, 1.5], take: 1 },
  { q: "light switch", cat: "ui", dur: [0.05, 0.6], take: 1 },
  { q: "vanish", cat: "fx", dur: [0.4, 2.5], take: 1 },
  // 2026-10-07 · 3D one-take: strings snapping, a glass marble dropping into liquid, glass cards clinking, rope creak.
  { q: "string snap", cat: "foley", dur: [0.1, 1.5], take: 2 },
  { q: "water drop splash", cat: "foley", dur: [0.2, 2], take: 2 },
  { q: "glass clink", cat: "ui", dur: [0.1, 1.5], take: 2 },
  { q: "rope creak", cat: "foley", dur: [0.3, 2.5], take: 1 },
];

// Highly rated but wrong for product edits (instruments, creatures, cartoons, stations): skipped on every run.
const SKIP = /fur|bamboo|insect|ukulele|metro|station|hardstyle|cartoon|furby|inside piano|shaking|distorted|scream|fart|laugh|death|fighting/i;

/** Keyless search: the public CC0-filtered results page carries id, author, title, duration and preview. */
async function searchWeb(q, dur, n) {
  const f = `license:"Creative Commons 0" duration:[${dur[0]} TO ${dur[1]}]`;
  const url = `https://freesound.org/search/?q=${encodeURIComponent(q)}&f=${encodeURIComponent(f)}&s=Rating+highest+first`;
  const html = await (await fetch(url, { headers: { "user-agent": "MotionEasy sound importer" } })).text();
  const out = [];
  for (const m of html.matchAll(/data-sound-id="(\d+)"[\s\S]*?data-username="([^"]+)"[\s\S]*?data-mp3="([^"]+)"[\s\S]*?data-title="([^"]*)"[\s\S]*?data-duration="([\d.]+)"/g)) {
    const [, id, username, mp3, title, d] = m;
    out.push({ id: Number(id), username, name: title.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"'), duration: Number(d), license: "publicdomain/zero", previews: { "preview-hq-mp3": mp3.replace("-lq.mp3", "-hq.mp3") }, url: `https://freesound.org/people/${username}/sounds/${id}/` });
    if (out.length >= n) break;
  }
  return out;
}

const ff = (args) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-v", "error", "-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
};
const maxDb = (file) => Number(spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" }).stderr.match(/max_volume: (-?[\d.]+) dB/)?.[1] ?? 0);
const duration = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());

/** Any audio file → 48 kHz mono WAV, leading silence trimmed, peak -1 dBFS, capped length with a fade. */
function master(src, dst, maxLen = 4) {
  const tmp = `${dst}.tmp.wav`;
  ff(["-i", src, "-af", `silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.004,atrim=0:${maxLen}`, "-ac", "1", "-ar", "48000", tmp]);
  const gain = -1 - maxDb(tmp);
  const len = duration(tmp);
  const fade = len >= maxLen - 0.01 ? `,afade=t=out:st=${(len - 0.25).toFixed(3)}:d=0.25` : "";
  ff(["-i", tmp, "-af", `volume=${gain.toFixed(2)}dB${fade}`, "-c:a", "pcm_s16le", dst]);
  rmSync(tmp);
  return duration(dst);
}

const prev = existsSync(MANIFEST) ? readFileSync(MANIFEST, "utf8") : "";
// Freesound sounds fetched earlier are always kept (their files stay in place and posts reference them), so a re-fetch
// whose search ranking shifted only adds sounds, never drops one.
const prevFs = [...prev.matchAll(/^  (\{ id: "fs\.[^\n]*\}),\r?$/gm)].map((m) => new Function(`return ${m[1]}`)());
const entries = [];

for (const [id, name, category, description, file] of KENNEY_PICKS) {
  const out = `kenney-${id}.wav`;
  const len = master(join(KENNEY, file), join(OUT, out));
  entries.push({ id: `kenney.${id}`, name, category, kind: "sample", description, file: `sounds/${out}`, credit: "Kenney (kenney.nl)", license: "CC0", source: "https://kenney.nl/assets", len });
  console.log(`sound    kenney.${id.padEnd(10)} ${len.toFixed(2)}s`);
}

if (process.argv.includes("--freesound")) {
  const key = process.env.FREESOUND_API_KEY;
  const seen = new Set();
  for (const s of FREESOUND_QUERIES) {
    let results;
    if (key) {
      const filter = `license:"Creative Commons 0" duration:[${s.dur[0]} TO ${s.dur[1]}]`;
      const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(s.q)}&filter=${encodeURIComponent(filter)}&sort=rating_desc&page_size=${s.take * 3}&fields=id,name,username,license,previews,duration,url&token=${key}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`sounds   freesound "${s.q}": HTTP ${res.status} ${await res.text()}`);
        process.exit(1);
      }
      results = (await res.json()).results;
    } else results = await searchWeb(s.q, s.dur, s.take * 3);
    const hits = results.filter((r) => /publicdomain\/zero/.test(r.license) && !seen.has(r.id) && !SKIP.test(r.name)).slice(0, s.take);
    for (const r of hits) {
      seen.add(r.id);
      const slug = r.name.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || String(r.id);
      const dl = join(OUT, `fs-${r.id}.src.mp3`);
      writeFileSync(dl, Buffer.from(await (await fetch(r.previews["preview-hq-mp3"])).arrayBuffer()));
      const out = `fs-${r.id}.wav`;
      const len = master(dl, join(OUT, out));
      rmSync(dl);
      const name = r.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 32);
      entries.push({ id: `fs.${s.cat}.${slug}`, name, category: s.cat, kind: "sample", description: `"${r.name}" by ${r.username} on Freesound.`, file: `sounds/${out}`, credit: `${r.username} (freesound.org)`, license: "CC0", source: r.url, len });
      console.log(`sound    fs.${s.cat}.${slug.padEnd(20)} ${len.toFixed(2)}s  by ${r.username}`);
    }
  }
}

const kept = prevFs.filter((e) => !entries.some((x) => x.id === e.id));
const line = (e) => `  { id: ${JSON.stringify(e.id)}, name: ${JSON.stringify(e.name)}, category: ${JSON.stringify(e.category)}, kind: "sample", description: ${JSON.stringify(e.description)}, file: ${JSON.stringify(e.file)}, credit: ${JSON.stringify(e.credit)}, license: "CC0", source: ${JSON.stringify(e.source)}, len: ${Number(e.len ?? 0).toFixed(3)} },`;
writeFileSync(
  MANIFEST,
  `// Generated by cli/sounds.mjs: CC0 recordings in packages/engine/assets/sounds. Do not edit by hand.\nimport type { SoundInfo } from "./library";\n\nexport const SAMPLE_SOUNDS: SoundInfo[] = [\n${[...entries, ...kept].map(line).join("\n")}\n];\n`,
);
writeFileSync(
  join(OUT, "CREDITS.md"),
  `# Recorded sounds\n\nAll CC0 1.0 (public domain): free for any use, no attribution required. Credited anyway.\n\n| id | file | by | source |\n|---|---|---|---|\n${[...entries, ...kept].map((e) => `| \`${e.id}\` | ${e.file.replace("sounds/", "")} | ${e.credit} | ${e.source} |`).join("\n")}\n`,
);
console.log(`sounds   ${entries.length + kept.length} recordings → packages/engine/src/audio/samples.gen.ts`);
