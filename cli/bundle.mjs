#!/usr/bin/env node
// Builds everything the site, the standalone HTML and the CLI share:
//   apps/web/public/engine/motioneasy.js   window.MotionEasy (engine + every component)
//   apps/web/public/engine/fonts|sounds     bundled assets
//   apps/web/public/media/...               demo media (copied from sources/ and assets/audio/music)
//   apps/web/src/generated/sources.json     component source code (for "Code" and prompts)
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(ROOT, "apps/web");
const PUB = join(WEB, "public");
const ENGINE_OUT = join(PUB, "engine");
const MEDIA_OUT = join(PUB, "media");
const quick = process.argv.includes("--quick");

const ensure = (d) => mkdirSync(d, { recursive: true });
const newer = (src, dst) => !existsSync(dst) || statSync(src).mtimeMs > statSync(dst).mtimeMs;

// 1. standalone bundle
ensure(ENGINE_OUT);
const t0 = Date.now();
await build({
  entryPoints: [join(ROOT, "packages/library/src/standalone.ts")],
  bundle: true,
  format: "iife",
  globalName: "__ME",
  platform: "browser",
  target: ["chrome110", "safari16", "firefox115"],
  minify: !process.argv.includes("--dev"),
  sourcemap: false,
  outfile: join(ENGINE_OUT, "motioneasy.js"),
  legalComments: "none",
  logLevel: "warning",
});
console.log(`bundle   engine/motioneasy.js ${(statSync(join(ENGINE_OUT, "motioneasy.js")).size / 1024).toFixed(0)} KB in ${Date.now() - t0} ms`);

// 2. engine assets
cpSync(join(ROOT, "packages/engine/assets"), ENGINE_OUT, { recursive: true });

// 3. component sources (for the Code tab and prompts); every component file must be registered
const compDir = join(ROOT, "packages/library/src/components");
const registry = readFileSync(join(ROOT, "packages/library/src/registry.ts"), "utf8");
const unregistered = readdirSync(compDir).filter((f) => f.endsWith(".ts") && !registry.includes(`./components/${f.replace(/\.ts$/, "")}"`));
if (unregistered.length) {
  console.error(`bundle   ✗ not registered in packages/library/src/registry.ts: ${unregistered.join(", ")}`);
  process.exit(1);
}
const sources = {};
for (const f of readdirSync(compDir).filter((f) => f.endsWith(".ts"))) {
  const src = readFileSync(join(compDir, f), "utf8");
  const id = src.match(/id:\s*"([^"]+)"/)?.[1];
  if (id) sources[id] = { file: `packages/library/src/components/${f}`, code: src };
}
// Prompt kits keep all of a prompt's components in one file; each id maps to that file.
const kitDir = join(ROOT, "packages/library/src/kits");
const kitIndex = readFileSync(join(kitDir, "index.ts"), "utf8");
for (const f of readdirSync(kitDir).filter((f) => f.endsWith(".ts") && !["index.ts", "types.ts", "shared.ts"].includes(f))) {
  if (!kitIndex.includes(`./${f.replace(/\.ts$/, "")}"`)) {
    console.error(`bundle   ✗ kit not registered in packages/library/src/kits/index.ts: ${f}`);
    process.exit(1);
  }
  const src = readFileSync(join(kitDir, f), "utf8");
  for (const m of src.matchAll(/\n\s+id: "([a-z0-9-]+)",\r?\n\s+name:/g)) sources[m[1]] = { file: `packages/library/src/kits/${f}`, code: src };
}
ensure(join(WEB, "src/generated"));
writeFileSync(join(WEB, "src/generated/sources.json"), JSON.stringify(sources));
console.log(`sources  ${Object.keys(sources).length} components`);

if (quick) process.exit(0);

// 4. demo media from sources/
const copy = (from, to) => {
  const src = join(ROOT, from), dst = join(MEDIA_OUT, to);
  if (!existsSync(src)) return;
  ensure(dirname(dst));
  if (newer(src, dst)) cpSync(src, dst);
};
const hero = join(ROOT, "sources/hero");
for (const f of readdirSync(hero)) if (/\.(mp4|webp|json)$/.test(f)) copy(`sources/hero/${f}`, `hero/${f}`);
const looks = join(ROOT, "sources/looks");
for (const f of readdirSync(looks)) if (/\.(mp4|webp|json)$/.test(f)) copy(`sources/looks/${f}`, `looks/${f}`);
for (const f of readdirSync(join(ROOT, "sources/brand"))) copy(`sources/brand/${f}`, `brand/${f}`);
if (existsSync(join(ROOT, "sources/mevora"))) for (const f of readdirSync(join(ROOT, "sources/mevora"))) copy(`sources/mevora/${f}`, `mevora/${f}`);
for (const f of readdirSync(join(ROOT, "assets/audio/music"))) if (/\.mp3$/.test(f)) copy(`assets/audio/music/${f}`, `music/${f}`);
if (existsSync(join(ROOT, "assets/audio/music/library")))
  for (const f of readdirSync(join(ROOT, "assets/audio/music/library"))) if (/\.mp3$/.test(f)) copy(`assets/audio/music/library/${f}`, `music/library/${f}`);
const shots = { hero: "01-hero.png", product: "02-product.png", looks: "03-looks.png", cta: "05-cta.png" };
ensure(join(MEDIA_OUT, "screens"));
for (const [name, file] of Object.entries(shots)) {
  const src = join(ROOT, "sources/captures/launchreel-2026-10-02/screenshots", file);
  const dst = join(MEDIA_OUT, "screens", `${name}.jpg`);
  if (existsSync(src) && newer(src, dst)) {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-vf", "scale=1920:-2", "-q:v", "3", dst]);
  }
}
console.log("media    demo media ready in apps/web/public/media");
