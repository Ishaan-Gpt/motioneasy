#!/usr/bin/env node
// Prompt kits: write each kit's template as a post spec (out/kits/<id>.json) and list them.
//   node cli/kits.mjs              write every template, print the kit list
//   node cli/kits.mjs spotify-film write one
// Then: node cli/stills.mjs out/kits/<id>.json   ·   node cli/render.mjs out/kits/<id>.json
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadLibrary } from "./library.mjs";
import { ROOT } from "./server.mjs";

const { KITS, layoutPost, promptOf } = await loadLibrary();
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const out = join(ROOT, "out/kits");
mkdirSync(out, { recursive: true });
for (const k of KITS) {
  if (only.length && !only.includes(k.id)) continue;
  const { duration } = layoutPost(k.template);
  writeFileSync(join(out, `${k.id}.json`), JSON.stringify(k.template, null, 2) + "\n");
  const src = promptOf(k);
  console.log(`kit      ${k.id.padEnd(24)} ${String(k.components.length).padStart(2)} components  ${duration.toFixed(1)}s  @${src?.author ?? "?"}  → out/kits/${k.id}.json`);
}
