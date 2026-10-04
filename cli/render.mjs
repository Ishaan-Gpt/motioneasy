#!/usr/bin/env node
// Render specs to MP4 with the exact same engine the website uses (headless Chrome + WebCodecs).
//   node cli/render.mjs posts/my-post.json [more.json ...] [--format square] [--scale 1] [--quality high]
//   node cli/render.mjs --component beat-slam [--props '{"text":"Hi *there*"}']
//   node cli/render.mjs posts/*.json --all-formats
// Output: out/<name>/<format>.mp4 (+ poster.png), verified with ffprobe.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { openHost } from "./server.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (k) => args.includes(`--${k}`);
const files = args.filter((a, i) => a.endsWith(".json") && !args[i - 1]?.startsWith("--"));
const jobs = [];
for (const f of files) {
  const spec = JSON.parse(readFileSync(f, "utf8"));
  const name = spec.id ?? f.replace(/^.*[\\/]/, "").replace(/\.json$/, "");
  const formats = flag("all-formats") && spec.formats ? spec.formats : [opt("format", spec.format ?? (spec.formats?.[0] ?? "vertical"))];
  for (const format of formats) jobs.push({ name, spec: { ...spec, format } });
}
if (opt("component")) {
  const format = opt("format", "vertical");
  jobs.push({ name: opt("component"), spec: { component: opt("component"), format, props: opt("props") ? JSON.parse(opt("props")) : undefined } });
}
if (!jobs.length) {
  console.log("usage: node cli/render.mjs <spec.json ...> | --component <id> [--format vertical|square|portrait|landscape]");
  process.exit(1);
}

const scale = Number(opt("scale", "1"));
const quality = opt("quality", "high");
const fps = opt("fps") ? Number(opt("fps")) : undefined;

const probe = (file) => {
  const j = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate:format=duration", "-of", "json", file]).toString());
  const v = j.streams.find((s) => s.codec_type === "video");
  const a = j.streams.find((s) => s.codec_type === "audio");
  return { duration: Number(j.format.duration), video: v && `${v.codec_name} ${v.width}x${v.height} ${v.r_frame_rate} ${v.pix_fmt}`, audio: a && `${a.codec_name} ${a.sample_rate}Hz` };
};
/** Integrated loudness and true peak via ffmpeg's ebur128 filter (summary goes to stderr). */
function measure(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const txt = r.stderr ?? "";
  const I = txt.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0];
  const peak = txt.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)?.[0];
  return { lufs: I ? Number(I) : null, peak: peak ? Number(peak) : null };
}

const host = await openHost();
let failed = 0;
try {
  for (const job of jobs) {
    const fmt = job.spec.format ?? "vertical";
    const out = `out/${job.name}/${fmt}.mp4`;
    const t0 = Date.now();
    process.stdout.write(`render   ${out} ... `);
    const meta = await host.page.evaluate(
      async ({ spec, out, scale, quality, fps }) => {
        const r = await MotionEasy.render(fps ? { ...spec, fps } : spec, { scale, quality });
        await fetch(`/__out?path=${encodeURIComponent(out)}`, { method: "POST", body: r.blob });
        const poster = await MotionEasy.still(spec, Math.max(0, r.duration * 0.6), 0.5);
        await fetch(`/__out?path=${encodeURIComponent(out.replace(/\.mp4$/, ".poster.png"))}`, { method: "POST", body: poster });
        return { frames: r.frames, duration: r.duration, codec: r.codec, w: r.width, h: r.height, fps: r.fps, audio: r.hasAudio, ext: r.ext };
      },
      { spec: job.spec, out, scale, quality, fps },
    );
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (!existsSync(out)) {
      console.log("FAILED (no file)");
      failed++;
      continue;
    }
    const p = probe(out);
    const m = meta.audio ? measure(out) : { lufs: null, peak: null };
    const durOk = Math.abs(p.duration - meta.duration) <= 1.5 / meta.fps + 0.03;
    console.log(`${secs}s`);
    console.log(`         ${p.video} | ${p.audio ?? "no audio"} | ${p.duration.toFixed(3)}s (${meta.frames} frames${durOk ? "" : " ✗ duration mismatch"}) | ${(statSync(out).size / 1e6).toFixed(1)} MB${m.lufs !== null ? ` | ${m.lufs} LUFS, peak ${m.peak} dBFS` : ""}`);
    if (!durOk) failed++;
  }
} finally {
  await host.close();
}
process.exit(failed ? 1 : 0);
