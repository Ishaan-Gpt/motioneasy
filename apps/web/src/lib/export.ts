"use client";

import { FONTS, type FormatId, type ParamSchema, type Props } from "@motioneasy/engine";
import { htmlHost } from "@motioneasy/library";
import { siteUrl } from "./engine";

const toDataUrl = (blob: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

/** Replace uploaded (blob:) media in props with data URLs so a downloaded spec/HTML carries them. */
export async function embedUploads(schema: ParamSchema, props: Props): Promise<Props> {
  const out: Props = { ...props };
  const conv = async (v: string) => (v.startsWith("blob:") ? toDataUrl(await (await fetch(v)).blob()) : v);
  for (const [k, d] of Object.entries(schema)) {
    if (d.type === "media" && typeof out[k] === "string") out[k] = await conv(out[k] as string);
    if (d.type === "mediaList" && Array.isArray(out[k])) out[k] = await Promise.all((out[k] as string[]).map(conv));
  }
  return out;
}

/** A single HTML file that plays and exports the spec offline: engine, fonts and uploads are inlined. */
export async function standaloneHtml(title: string, spec: unknown): Promise<Blob> {
  const site = siteUrl();
  const engine = await (await fetch("/engine/motioneasy.js")).text();
  const fonts: Record<string, string> = {};
  for (const f of Object.values(FONTS))
    for (const file of f.files) fonts[file.file] = await toDataUrl(await (await fetch(`/engine/fonts/${file.file}`)).blob());
  const tag = `<script>${engine.replace(/<\/script/gi, "<\\/script")}</script>\n<script>MotionEasy.configure({ fonts: ${JSON.stringify(fonts)} });</script>`;
  return new Blob([htmlHost(title, spec, site, tag)], { type: "text/html" });
}

export interface ExportSettings {
  format: FormatId;
  fps: 30 | 60;
  scale: 1 | 0.6667 | 0.5;
  quality: "high" | "balanced" | "small";
  audio: boolean;
}
