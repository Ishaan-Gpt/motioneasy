// The standalone build (window.MotionEasy). Powers the "standalone HTML" download, copy-paste prompts and
// the CLI renderer, all with exactly the same engine and components as the website.

import * as engine from "@motioneasy/engine";
import { COMPONENTS, componentById } from "./registry";
import { CATEGORIES, GROUPS } from "./categories";
import { buildSequence, type PostSpec } from "./sequence";

export interface Spec {
  component: string;
  version?: string;
  format?: engine.FormatId;
  fps?: number;
  props?: engine.Props;
}

type AnySpec = Spec | PostSpec;
const isPost = (s: AnySpec): s is PostSpec => Array.isArray((s as PostSpec).clips);

function resolve(spec: AnySpec) {
  if (isPost(spec)) {
    const comp = buildSequence(spec);
    const { props, issues } = engine.propsFor(comp, spec.props ?? {});
    return { comp, props, issues, format: spec.format ?? "vertical", fps: spec.fps ?? 60 };
  }
  const comp = componentById(spec.component);
  if (!comp) throw new Error(`Unknown component "${spec.component}". Known: ${COMPONENTS.map((c) => c.id).join(", ")}`);
  const { props, issues } = engine.propsFor(comp, spec.props);
  const format = spec.format && engine.componentFormats(comp).includes(spec.format) ? spec.format : "vertical";
  return { comp, props, issues, format, fps: spec.fps ?? 60 };
}

/** Render a spec to a video Blob (used by the CLI and by "Export MP4" in standalone pages). */
async function render(spec: AnySpec, o: Partial<engine.ExportOptions> = {}) {
  const r = resolve(spec);
  if (r.issues.length) console.warn("[MotionEasy]", r.issues.join("; "));
  return engine.exportVideo({ comp: r.comp, props: r.props, format: r.format, fps: r.fps, ...o });
}

async function still(spec: AnySpec, t: number, scale = 1) {
  const r = resolve(spec);
  return engine.exportStill({ comp: r.comp, props: r.props, format: r.format, t, scale });
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

/** Mount a player with play/scrub/export controls into an element. */
function mount(target: string | HTMLElement, spec: AnySpec, o: { autoplay?: boolean } = {}) {
  const host = typeof target === "string" ? (document.querySelector(target) as HTMLElement) : target;
  const r = resolve(spec);
  const F = engine.FORMATS[r.format];
  host.innerHTML = "";
  host.style.cssText += ";display:flex;flex-direction:column;gap:12px;align-items:center;font:500 14px system-ui;color:#1A1A1A";
  const frame = document.createElement("div");
  frame.style.cssText = `width:min(92vw, ${Math.round((F.w / F.h) * 78)}vh);aspect-ratio:${F.w}/${F.h};border-radius:18px;overflow:hidden;box-shadow:0 30px 80px -30px rgba(0,0,0,.35)`;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:100%;height:100%;display:block";
  frame.appendChild(canvas);
  const bar = document.createElement("div");
  bar.style.cssText = "display:flex;gap:8px;align-items:center";
  const btn = (label: string) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "border:1px solid #1A1A1A;background:#FFFFEB;border-radius:999px;padding:8px 16px;font:600 13px system-ui;cursor:pointer";
    bar.appendChild(b);
    return b;
  };
  const play = btn("Play");
  const exp = btn("Export MP4");
  const status = document.createElement("span");
  bar.appendChild(status);
  host.append(frame, bar);
  const player = new engine.Player(canvas, { format: r.format, fps: r.fps });
  void player.load(r.comp, r.props).then(() => o.autoplay && player.play());
  player.on((p) => (play.textContent = p.playing ? "Pause" : "Play"));
  play.onclick = () => player.toggle();
  exp.onclick = async () => {
    exp.disabled = true;
    try {
      const res = await render(spec, { onProgress: (p) => (status.textContent = `${p.phase} ${Math.round(p.progress * 100)}%`) });
      download(res.blob, `${isPost(spec) ? spec.id ?? "post" : spec.component}-${r.format}.${res.ext}`);
      status.textContent = "Done";
    } catch (e) {
      status.textContent = (e as Error).message;
    }
    exp.disabled = false;
  };
  return { player, destroy: () => player.dispose() };
}

const api = {
  version: "0.1.0",
  engine,
  components: COMPONENTS,
  categories: CATEGORIES,
  groups: GROUPS,
  configure: engine.configure,
  resolve,
  render,
  still,
  mount,
  download,
};

declare global {
  interface Window {
    MotionEasy: typeof api;
  }
}
if (typeof window !== "undefined") window.MotionEasy = api;
export default api;
