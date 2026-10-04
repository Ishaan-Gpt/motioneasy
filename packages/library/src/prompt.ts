// Prompts and portable exports. A prompt never asks a model to design anything: it carries the exact
// spec, the allowed values, the render paths and acceptance checks, so even a small model only copies.

import {
  FORMATS, cuesOf, describeParam, durationOf, plainText,
  type Component, type FormatId, type ParamDef, type Props,
} from "@motioneasy/engine";
import { buildSequence, type PostSpec } from "./sequence";

export interface Spec {
  component: string;
  version: string;
  format: FormatId;
  fps: number;
  props: Props;
}

export function makeSpec(comp: Component, props: Props, format: FormatId, fps = 60): Spec {
  // Every prop is written out: the spec is explicit, nothing depends on defaults that might change.
  const ordered: Props = {};
  for (const k of Object.keys(comp.schema)) if (k in props) ordered[k] = props[k];
  return { component: comp.id, version: comp.version, format, fps, props: ordered };
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

function valueText(d: ParamDef, v: unknown) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return JSON.stringify(v.length > 60 ? v.slice(0, 57) + "…" : v);
  if (Array.isArray(v)) return v.length > 3 ? `[${v.length} items]` : JSON.stringify(v);
  void d;
  return JSON.stringify(v);
}

export interface PromptOptions {
  /** Where the site lives (window.location.origin on the site). */
  siteUrl: string;
  /** Component source code to include for forking. */
  source?: string;
  includeSource?: boolean;
}

export function htmlHost(title: string, spec: unknown, siteUrl: string, engineTag?: string, mediaBase?: string) {
  const json = JSON.stringify(spec, null, 2).replace(/<\//g, "<\\/");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/</g, "&lt;")} · MotionEasy</title>
</head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#FFFFEB;padding:24px 0;box-sizing:border-box">
<div id="app"></div>
${engineTag ?? `<script src="${siteUrl}/engine/motioneasy.js"></script>`}
<script>
  MotionEasy.configure({ assets: "${siteUrl}/engine", media: "${mediaBase ?? siteUrl}" });
  MotionEasy.mount("#app", ${json});
</script>
</body>
</html>
`;
}

export function buildPrompt(comp: Component, props: Props, format: FormatId, fps: number, o: PromptOptions): string {
  const spec = makeSpec(comp, props, format, fps);
  const F = FORMATS[format];
  const dur = durationOf(comp, props);
  const frames = Math.round(dur * fps);
  const cues = cuesOf(comp, props, format);
  const site = o.siteUrl.replace(/\/$/, "");
  const rows = Object.entries(comp.schema)
    .filter(([, d]) => !d.advanced || d.type !== "json")
    .map(([k, d]) => `| \`${k}\` | ${d.label} | ${describeParam(d)} | ${valueText(d, props[k])} |`);
  const usesMedia = Object.values(comp.schema).some((d) => d.type === "media" || d.type === "mediaList");
  const L: string[] = [];
  L.push(`# MotionEasy component: ${comp.name} (\`${comp.id}\` v${comp.version})`);
  L.push("");
  L.push("You are reproducing a deterministic motion-graphics component. The video is fully determined by the spec below: the same spec always renders the same frames and the same sound.");
  L.push("Do not redesign it, re-time it, re-colour it or add anything. Only the values inside `props` may change, and only within the allowed values in the table.");
  L.push("");
  L.push("## What it is");
  L.push(plainText(comp.description));
  L.push(`- Length: ${fmt(dur)} s at ${fps} fps (${frames} frames)`);
  L.push(`- Format: ${F.name} ${F.w}×${F.h} (${F.ratio}, ${F.platforms})`);
  L.push(`- Sound: ${cues.length ? `${cues.length} cues, mixed to about -14 LUFS` : "none"}`);
  if (comp.notes) L.push(`- Notes: ${comp.notes}`);
  L.push("");
  L.push("## The spec (single source of truth)");
  L.push("```json");
  L.push(JSON.stringify(spec, null, 2));
  L.push("```");
  L.push("");
  L.push("## Editable props");
  L.push("| prop | what | allowed values | current |");
  L.push("|---|---|---|---|");
  L.push(...rows);
  L.push("");
  L.push("Text props: wrap words in `*asterisks*` to set them in the accent style (serif italic); a newline (`\\n`) forces a line break. Colours set to `\"auto\"` follow `mode` (light = cream on ink text, dark = ink background).");
  L.push("");
  L.push("## Render it (pick one path)");
  L.push("");
  L.push("### A. No code (fastest)");
  L.push(`1. Open ${site}/c/${comp.id}/ in Chrome or Edge.`);
  L.push("2. Click **Import JSON** and paste the spec above.");
  L.push("3. Click **Download MP4**. Rendering happens in the browser; nothing is uploaded.");
  L.push("");
  L.push("### B. One HTML file (any machine, no install)");
  L.push(`Create \`${comp.id}.html\` with exactly this content, open it in Chrome or Edge, press **Export MP4**:`);
  L.push("```html");
  L.push(htmlHost(comp.name, spec, site).trim());
  L.push("```");
  if (usesMedia)
    L.push(`Media paths starting with \`media/\` are demo files served by ${site}. To use your own files, put them next to the HTML file, set the prop to the file name (for example \`"my-clip.mp4"\`) and change \`media: "${site}"\` to \`media: "."\` (serve the folder with any static server, e.g. \`npx serve\`).`);
  L.push("");
  L.push("### C. Inside a MotionEasy repo");
  L.push(`Save the spec as \`posts/${comp.id}.json\` and run \`pnpm render posts/${comp.id}.json\`. Output: \`out/${comp.id}/${format}.mp4\`.`);
  if (o.includeSource !== false && o.source) {
    L.push("");
    L.push("### D. Fork the design (only if no prop does what you need)");
    L.push("This is the component's full source. It runs on the MotionEasy engine (`@motioneasy/engine`): a pure function of time and props drawn on a canvas. Keep every timing and easing value unless you are deliberately changing the design, and bump the version.");
    L.push("```ts");
    L.push(o.source.trim());
    L.push("```");
  }
  L.push("");
  L.push("## Acceptance checks");
  L.push(`- Video: H.264, ${F.w}×${F.h}, ${fps} fps, ${frames} frames (${fmt(dur)} s), yuv420p.`);
  if (cues.length) {
    L.push("- Audio: AAC 48 kHz stereo, integrated loudness about -14 LUFS, peak below -1 dBFS.");
    L.push(`- Sound cues (s): ${cues.map((q) => `${fmt(q.at)} ${q.sound.startsWith("url:") ? "music" : q.sound}`).join(", ")}.`);
  }
  L.push("- If any of these differ, the spec was changed: re-render from the spec instead of fixing frames by hand.");
  return L.join("\n");
}

/** Prompt for a whole post (sequence of components). */
export function buildPostPrompt(post: PostSpec, o: PromptOptions): string {
  const comp = buildSequence(post);
  const dur = durationOf(comp, {});
  const fps = post.fps ?? 60;
  const format = post.format ?? "vertical";
  const F = FORMATS[format];
  const site = o.siteUrl.replace(/\/$/, "");
  const L: string[] = [];
  L.push(`# MotionEasy post: ${post.title ?? post.id ?? "untitled"}`);
  L.push("");
  L.push("This post is a deterministic sequence of MotionEasy components. Render it exactly as specified; do not add, remove, reorder or restyle clips unless asked.");
  L.push("");
  L.push(`- Length: ${fmt(dur)} s at ${fps} fps · ${F.name} ${F.w}×${F.h} (${F.ratio})`);
  L.push(`- Clips: ${post.clips.map((c, i) => `${i + 1}. ${c.component}${c.transition ? ` (in: ${typeof c.transition === "string" ? c.transition : c.transition.type})` : ""}`).join(" · ")}`);
  if (post.music?.src) L.push(`- Music: ${post.music.src}${post.music.credit ? ` (${post.music.credit})` : ""}`);
  L.push("");
  L.push("## The post spec");
  L.push("```json");
  L.push(JSON.stringify(post, null, 2));
  L.push("```");
  L.push("");
  L.push("## Render it");
  L.push(`- No code: open ${site}/compose/, click **Import JSON**, paste the spec, click **Download MP4**.`);
  L.push(`- One HTML file: same as a component, with the post spec as the argument to \`MotionEasy.mount\`:`);
  L.push("```html");
  L.push(htmlHost(post.title ?? "Post", post, site).trim());
  L.push("```");
  L.push(`- In a MotionEasy repo: save as \`posts/${post.id ?? "post"}.json\`, run \`pnpm render posts/${post.id ?? "post"}.json\`.`);
  L.push("");
  L.push("## Acceptance checks");
  L.push(`- H.264 ${F.w}×${F.h} ${fps} fps, ${Math.round(dur * fps)} frames; AAC 48 kHz about -14 LUFS.`);
  return L.join("\n");
}
