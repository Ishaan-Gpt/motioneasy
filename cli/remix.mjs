#!/usr/bin/env node
// Remix: a copy deck + a seed → N varied post specs. The "20–30 posts at near-zero tokens" path.
//   node cli/remix.mjs decks/captionseasy.json --count 20 --seed 7
//   options: --out posts/remix   --prefix 2026-10-05   --format vertical|square|portrait|landscape
//            --no-history (ignore the newest posts already in --out)   --dry (print, write nothing)
// Then: node cli/render.mjs posts/remix/*.json
import { build } from "esbuild";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { ROOT } from "./server.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (k) => args.includes(`--${k}`);
const deckPath = args.find((a, i) => a.endsWith(".json") && !args[i - 1]?.startsWith("--")) ?? "decks/captionseasy.json";
const count = Number(opt("count", "10"));
const seed = Number(opt("seed", "1"));
const outDir = resolve(opt("out", "posts/remix"));
const today = new Date();
const prefix = opt("prefix", `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
const format = opt("format", "vertical");

// The library is TypeScript with workspace imports: bundle it for Node on the fly.
const lib = await build({ entryPoints: [join(ROOT, "packages/library/src/index.ts")], bundle: true, platform: "node", format: "esm", write: false, logLevel: "error" });
const { remix, auditPosts } = await import(`data:text/javascript;base64,${Buffer.from(lib.outputFiles[0].text).toString("base64")}`);

const deck = JSON.parse(readFileSync(deckPath, "utf8"));
const history = !flag("no-history") && existsSync(outDir)
  ? readdirSync(outDir).filter((f) => f.endsWith(".json")).sort().slice(-5).map((f) => JSON.parse(readFileSync(join(outDir, f), "utf8")))
  : [];
const { posts, warnings } = remix(deck, { count, seed, format, prefix, history });

const pad = (s, n) => String(s).padEnd(n);
console.log(`remix    ${deck.name} · seed ${seed} · ${posts.length} posts${history.length ? ` (after ${history.length} existing)` : ""}`);
for (const p of posts) {
  const sig = p.clips.map((c) => (typeof c.transition === "string" ? c.transition : c.transition?.type)).find((t) => t && t !== "cut") ?? "cut";
  const music = p.music?.src.replace(/^.*[\\/]|\.mp3$/g, "").replace("kevin-macleod_", "") ?? "none";
  console.log(`  ${pad(p.id, 34)} ${pad(p.recipe, 14)} ${pad(sig, 8)} ${pad(music, 11)} ${p.clips.map((c) => c.component).join(" → ")}`);
}
const audit = auditPosts([...history, ...posts]);
for (const w of warnings) console.log(`  ! ${w}`);
for (const a of audit) console.log(`  ✗ ${a}`);
if (!audit.length) console.log("audit    no repeated recipe, opener, music or signature transition; no uniform shot lengths");

if (!flag("dry")) {
  mkdirSync(outDir, { recursive: true });
  for (const p of posts) writeFileSync(join(outDir, `${p.id}.json`), JSON.stringify(p, null, 2) + "\n");
  console.log(`wrote    ${posts.length} specs → ${outDir}`);
  console.log(`next     node cli/render.mjs ${join(opt("out", "posts/remix"), "*.json").replace(/\\/g, "/")}`);
}
process.exit(audit.length ? 1 : 0);
