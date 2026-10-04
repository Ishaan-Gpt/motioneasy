#!/usr/bin/env node
// Library card previews: a silent 4:5 loop and a poster per component, rendered by the real engine.
//   node cli/previews.mjs              every component whose sources changed since its last preview
//   node cli/previews.mjs coverflow    some components        --force   re-render regardless
// → apps/web/public/previews/<id>.mp4 (432×540, 30 fps, H.264, no audio, faststart) + <id>.webp
//   apps/web/src/generated/previews.json   { id: { video, poster, hash } } (what the cards read)
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, openHost } from "./server.mjs";

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));
const PUB = join(ROOT, "apps/web/public/previews");
const JSON_OUT = join(ROOT, "apps/web/src/generated/previews.json");
const SCALE = 0.4;
mkdirSync(PUB, { recursive: true });

// A preview is stale when the engine, the shared library code or the component's own file changes.
const files = (dir) => readdirSync(dir, { recursive: true }).map((f) => join(dir, f)).filter((f) => statSync(f).isFile() && /\.(ts|json)$/.test(f)).sort();
const shared = createHash("sha1");
for (const f of [...files(join(ROOT, "packages/engine/src")), ...["kit", "parts", "demo", "captions", "transitions", "transcripts", "backdrops", "kits/shared", "kits/morph"].map((n) => join(ROOT, `packages/library/src/${n}.ts`))])
  shared.update(readFileSync(f));
const base = shared.digest("hex");
const sources = JSON.parse(readFileSync(join(ROOT, "apps/web/src/generated/sources.json"), "utf8"));
const fileOf = (id) => join(ROOT, id.startsWith("tr-") ? "packages/library/src/components/transition-demos.ts" : sources[id]?.file ?? "");
const hashOf = (id) => createHash("sha1").update(base).update(existsSync(fileOf(id)) ? readFileSync(fileOf(id)) : id).digest("hex").slice(0, 16);

const prev = existsSync(JSON_OUT) ? JSON.parse(readFileSync(JSON_OUT, "utf8")) : {};
const host = await openHost();
const out = {};
let made = 0;
try {
  const ids = await host.page.evaluate(() => MotionEasy.components.map((c) => c.id));
  for (const id of ids) {
    const hash = hashOf(id);
    const fresh = prev[id]?.hash === hash && existsSync(join(PUB, `${id}.mp4`)) && existsSync(join(PUB, `${id}.webp`));
    if ((only.length && !only.includes(id)) || (fresh && !force)) {
      if (prev[id]) out[id] = prev[id];
      continue;
    }
    const t0 = Date.now();
    const meta = await host.page.evaluate(
      async ({ id, scale }) => {
        // Each preview renders in the component's own format: 4:5 when it has one, else square, else 16:9.
        const comp = MotionEasy.components.find((c) => c.id === id);
        const fmts = comp?.formats ?? ["portrait"];
        const format = fmts.includes("portrait") ? "portrait" : fmts.includes("square") ? "square" : fmts[0];
        const spec = { component: id, format, fps: 30 };
        const r = await MotionEasy.render(spec, { scale: format === "landscape" ? scale * 0.75 : scale, quality: "small", audio: false });
        await fetch(`/__out?path=${encodeURIComponent(`apps/web/public/previews/${id}.raw.mp4`)}`, { method: "POST", body: r.blob });
        const res = MotionEasy.resolve(spec);
        const png = await MotionEasy.still(spec, r.duration * (res.comp.poster ?? 0.5), scale);
        await fetch(`/__out?path=${encodeURIComponent(`apps/web/public/previews/${id}.poster.png`)}`, { method: "POST", body: png });
        return { duration: r.duration, frames: r.frames, format };
      },
      { id, scale: SCALE },
    );
    const raw = join(PUB, `${id}.raw.mp4`), png = join(PUB, `${id}.poster.png`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-c:v", "copy", "-an", "-movflags", "+faststart", join(PUB, `${id}.mp4`)]);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-c:v", "libwebp", "-quality", "78", join(PUB, `${id}.webp`)]);
    rmSync(raw);
    rmSync(png);
    out[id] = { video: `/previews/${id}.mp4`, poster: `/previews/${id}.webp`, hash, format: meta.format };
    made++;
    const kb = (statSync(join(PUB, `${id}.mp4`)).size + statSync(join(PUB, `${id}.webp`)).size) / 1024;
    console.log(`preview  ${id.padEnd(20)} ${meta.duration.toFixed(1)}s ${String(meta.frames).padStart(4)} frames  ${kb.toFixed(0).padStart(4)} KB  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
} finally {
  await host.close();
}
// Drop previews of components that no longer exist.
for (const f of readdirSync(PUB)) {
  const id = f.replace(/\.(mp4|webp)$/, "");
  if (!out[id] && /\.(mp4|webp)$/.test(f)) rmSync(join(PUB, f));
}
writeFileSync(JSON_OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`previews ${made} rendered, ${Object.keys(out).length} total → apps/web/src/generated/previews.json`);
