#!/usr/bin/env node
// Contact sheets: for each component (or a spec file), render N frames across its duration into one PNG.
//   node cli/stills.mjs                       every component, vertical
//   node cli/stills.mjs beat-slam focus-pull  some components
//   node cli/stills.mjs --format landscape --frames 8
//   node cli/stills.mjs posts/x.json          a post or component spec
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, openHost } from "./server.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const format = opt("format", "vertical");
const frames = Number(opt("frames", "8"));
const scale = Number(opt("scale", "0.5"));
const props = opt("props", null);
const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

const host = await openHost();
try {
  const ids = positional.filter((a) => !a.endsWith(".json"));
  const files = positional.filter((a) => a.endsWith(".json"));
  const specs = [];
  for (const f of files) specs.push({ name: f.replace(/^.*[\\/]/, "").replace(/\.json$/, ""), spec: JSON.parse(readFileSync(f, "utf8")) });
  const all = await host.page.evaluate(() => MotionEasy.components.map((c) => c.id));
  for (const id of ids.length || files.length ? ids : all)
    specs.push({ name: `${id}-${format}`, spec: { component: id, format, props: props ? JSON.parse(props) : undefined } });

  for (const { name, spec } of specs) {
    const out = `out/stills/${name}.png`;
    const t0 = Date.now();
    const info = await host.page.evaluate(
      async ({ spec, frames, scale, out }) => {
        const r = MotionEasy.resolve(spec);
        const dur = MotionEasy.engine.durationOf(r.comp, r.props);
        const F = MotionEasy.engine.FORMATS[r.format];
        const cw = Math.round(F.w * scale), ch = Math.round(F.h * scale);
        const cols = Math.min(frames, F.w > F.h ? 3 : 4);
        const rows = Math.ceil(frames / cols);
        const gap = 12, label = 28;
        const sheet = document.createElement("canvas");
        sheet.width = cols * cw + (cols + 1) * gap;
        sheet.height = rows * (ch + label) + (rows + 1) * gap;
        const g = sheet.getContext("2d");
        g.fillStyle = "#2a2a28";
        g.fillRect(0, 0, sheet.width, sheet.height);
        for (let i = 0; i < frames; i++) {
          const t = frames === 1 ? dur * (r.comp.poster ?? 0.5) : (dur * (i + 0.5)) / frames;
          const blob = await MotionEasy.still(spec, t, scale);
          const bmp = await createImageBitmap(blob);
          const x = gap + (i % cols) * (cw + gap), y = gap + Math.floor(i / cols) * (ch + label + gap);
          g.drawImage(bmp, x, y + label, cw, ch);
          g.fillStyle = "#e8e8d8";
          g.font = "600 16px system-ui";
          g.fillText(`${t.toFixed(2)}s`, x, y + 18);
        }
        const png = await new Promise((res) => sheet.toBlob(res, "image/png"));
        await fetch(`/__out?path=${encodeURIComponent(out)}`, { method: "POST", body: png });
        return { dur, format: r.format };
      },
      { spec, frames, scale, out },
    );
    console.log(`stills   ${out}  (${info.format}, ${info.dur.toFixed(2)}s, ${Date.now() - t0} ms)`);
  }
} finally {
  await host.close();
}
void join;
void ROOT;
