"use client";

import {
  FORMATS, componentFormats, cuesOf, defaultProps, durationOf, exportAudio, exportStill, propsFor, soundInfo,
  type Component, type FormatId, type Player, type Props,
} from "@motioneasy/engine";
import { COMPONENTS, buildPrompt, componentById, categoryById, makeSpec } from "@motioneasy/library";
import { useCallback, useEffect, useMemo, useState } from "react";
import sources from "@/generated/sources.json";
import { ControlPanel } from "@/components/controls/panel";
import { PlayerCanvas, Transport, type PlayerState } from "@/components/player/player-canvas";
import { ComponentCard } from "@/components/library/card";
import { TLink } from "@/components/site/motion";
import { useToast } from "@/components/site/toast";
import { copyText, download, siteUrl } from "@/lib/engine";
import { embedUploads, standaloneHtml } from "@/lib/export";
import { CodeBlock } from "./code";
import { ExportDialog } from "./export-dialog";

type Tab = "customize" | "prompt" | "code" | "spec";
const SRC = sources as Record<string, { file: string; code: string }>;

const b64 = {
  enc: (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s: string) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))),
};

export function Studio({ id }: { id: string }) {
  const comp = componentById(id) as Component;
  const toast = useToast();
  const formats = componentFormats(comp);
  const [format, setFormat] = useState<FormatId>(formats.includes("vertical") ? "vertical" : formats[0]);
  const [props, setProps] = useState<Props>(() => defaultProps(comp));
  const [tab, setTab] = useState<Tab>("customize");
  const [player, setPlayer] = useState<Player | null>(null);
  const [ps, setPs] = useState<PlayerState>({ time: 0, duration: 0, playing: false, ready: false, muted: false });
  const [exporting, setExporting] = useState(false);
  const [withSource, setWithSource] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState("");

  // Restore edits: shared link (#p=...) first, then this browser's last edits.
  useEffect(() => {
    try {
      const h = new URLSearchParams(location.hash.slice(1)).get("p");
      const saved = h ? b64.dec(h) : JSON.parse(localStorage.getItem(`me:props:${id}`) ?? "null");
      if (saved?.props) {
        setProps(propsFor(comp, { ...defaultProps(comp), ...saved.props }).props);
        if (saved.format && formats.includes(saved.format)) setFormat(saved.format);
      }
    } catch {
      /* ignore bad links */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const changed = useMemo(() => {
    const d = defaultProps(comp);
    const out: Props = {};
    for (const [k, v] of Object.entries(props)) if (JSON.stringify(v) !== JSON.stringify(d[k]) && !(typeof v === "string" && v.startsWith("blob:"))) out[k] = v;
    return out;
  }, [comp, props]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(`me:props:${id}`, JSON.stringify({ props: changed, format }));
      } catch {
        /* storage blocked */
      }
      const hash = Object.keys(changed).length || format !== "vertical" ? `#p=${b64.enc({ props: changed, format })}` : "";
      history.replaceState(null, "", location.pathname + hash);
    }, 250);
    return () => clearTimeout(t);
  }, [changed, format, id]);

  const set = useCallback((k: string, v: unknown) => setProps((p) => ({ ...p, [k]: v })), []);
  const spec = useMemo(() => makeSpec(comp, props, format, 60), [comp, props, format]);
  const cues = useMemo(() => cuesOf(comp, props, format), [comp, props, format]);
  const dur = useMemo(() => durationOf(comp, props), [comp, props]);
  const source = SRC[id]?.code ?? "";
  const prompt = useMemo(() => (tab === "prompt" ? buildPrompt(comp, props, format, 60, { siteUrl: siteUrl(), source, includeSource: withSource }) : ""), [tab, comp, props, format, source, withSource]);
  const cat = categoryById(comp.category);
  const related = useMemo(() => {
    const same = COMPONENTS.filter((c) => c.id !== id && c.category === comp.category);
    const other = COMPONENTS.filter((c) => c.id !== id && c.category !== comp.category);
    return [...same, ...other].slice(0, 4);
  }, [comp, id]);

  const copyPrompt = async () => {
    const p = buildPrompt(comp, props, format, 60, { siteUrl: siteUrl(), source, includeSource: withSource });
    if (await copyText(p)) toast("Prompt copied. Paste it into any AI tool.");
  };
  const copySpec = async () => {
    if (await copyText(JSON.stringify(spec, null, 2))) toast("Spec JSON copied");
  };
  const reset = () => {
    setProps(defaultProps(comp));
    toast("Reset to defaults");
  };
  const still = async () => {
    setBusy("still");
    try {
      download(await exportStill({ comp, props, format, t: ps.time, scale: 1 }), `${id}-${format}-${ps.time.toFixed(2)}s.png`);
    } finally {
      setBusy("");
    }
  };
  const wav = async () => {
    setBusy("wav");
    try {
      const b = await exportAudio(comp, props, format);
      if (b) download(b, `${id}-sound.wav`);
      else toast("This component has no sound");
    } finally {
      setBusy("");
    }
  };
  const html = async () => {
    setBusy("html");
    try {
      const full = { ...spec, props: await embedUploads(comp.schema, props) };
      download(await standaloneHtml(comp.name, full), `${id}.html`);
      toast("Standalone HTML downloaded: open it in Chrome, press Export.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 md:px-8">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-8">
        <div className="min-w-0">
          <nav className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-mute">
            <TLink href="/library/" label="Library" className="link-draw">
              Library
            </TLink>
            <span>/</span>
            <TLink href={`/library/${comp.category}/`} label={cat?.name} className="link-draw">
              {cat?.name}
            </TLink>
          </nav>
          <h1 className="headline text-[clamp(32px,4vw,52px)]">{comp.name}</h1>
          <p className="lede mt-2 max-w-2xl !text-base">{comp.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip">v{comp.version}</span>
            <span className="chip">{dur.toFixed(1)}s</span>
            <span className="chip">{cues.length} sound cues</span>
            {comp.tags.slice(0, 5).map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-line" onClick={copyPrompt}>
            Copy prompt
          </button>
          <button className="btn btn-ink" onClick={() => setExporting(true)}>
            Download MP4
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* stage */}
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-sand-2">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
              <div className="seg">
                {formats.map((f) => (
                  <button key={f} aria-pressed={format === f} onClick={() => setFormat(f)} title={FORMATS[f].platforms}>
                    {FORMATS[f].ratio}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button className="btn btn-ghost btn-sm" onClick={reset}>
                  Reset
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    if (await copyText(location.href)) toast("Link with your edits copied");
                  }}
                >
                  Share link
                </button>
              </div>
            </div>
            <div className="grid place-items-center px-4 py-6 md:py-10" style={{ minHeight: "min(78vh, 860px)" }}>
              <div style={{ width: format === "landscape" ? "min(100%, 980px)" : format === "square" ? "min(100%, 620px)" : format === "portrait" ? "min(100%, 560px)" : "min(100%, 440px)" }}>
                <PlayerCanvas comp={comp} props={props} format={format} autoplay onPlayer={setPlayer} onState={setPs} className="shadow-[var(--shadow-deep)]" />
              </div>
            </div>
            <div className="border-t border-[var(--line)] px-4 py-3">
              <Transport player={player} state={ps} cues={cues.map((c) => ({ at: c.at, label: soundInfo(c.sound)?.name ?? c.sound }))} />
            </div>
          </div>
        </div>

        {/* side panel */}
        <aside className="min-w-0">
          <div className="sticky top-[calc(var(--nav-h)+16px)] space-y-3">
            <div className="seg w-full">
              {(["customize", "prompt", "code", "spec"] as Tab[]).map((t) => (
                <button key={t} className="flex-1 capitalize" aria-pressed={tab === t} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </div>
            <div className="thin-scroll max-h-[calc(100vh-var(--nav-h)-150px)] overflow-y-auto pr-1" data-lenis-prevent>
              {tab === "customize" && <ControlPanel schema={comp.schema} values={props} onChange={set} />}
              {tab === "prompt" && (
                <div className="space-y-3">
                  <div className="panel space-y-2 p-4">
                    <p className="text-[13px] leading-relaxed text-mute">
                      A deterministic prompt: the exact spec, the allowed values, four ways to render it and acceptance checks. Paste it into Claude, Cursor or any agent and it reproduces this video exactly, with your edits.
                    </p>
                    <div className="flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
                        <input type="checkbox" checked={withSource} onChange={(e) => setWithSource(e.target.checked)} className="accent-[#1A1A1A]" />
                        Include source code
                      </label>
                      <button className="btn btn-ink btn-sm" onClick={copyPrompt}>
                        Copy prompt
                      </button>
                    </div>
                  </div>
                  <CodeBlock code={prompt} lang="md" maxH="58vh" />
                </div>
              )}
              {tab === "code" && (
                <div className="space-y-3">
                  <div className="panel flex items-center justify-between gap-2 p-3">
                    <span className="truncate font-mono text-[11.5px] text-mute">{SRC[id]?.file}</span>
                    <button className="btn btn-ink btn-sm" onClick={async () => (await copyText(source)) && toast("Source copied")}>
                      Copy
                    </button>
                  </div>
                  <CodeBlock code={source} lang="ts" maxH="64vh" />
                </div>
              )}
              {tab === "spec" && (
                <div className="space-y-3">
                  <div className="panel space-y-2 p-4">
                    <p className="text-[13px] leading-relaxed text-mute">
                      The spec is all a post needs. Save it as <code className="font-mono">posts/{id}.json</code> and run <code className="font-mono">pnpm render</code>, or import one here.
                    </p>
                    <div className="flex gap-2">
                      <button className="btn btn-ink btn-sm" onClick={copySpec}>
                        Copy JSON
                      </button>
                      <button className="btn btn-line btn-sm" onClick={() => setImportOpen(true)}>
                        Import JSON
                      </button>
                    </div>
                  </div>
                  <CodeBlock code={JSON.stringify(spec, null, 2)} lang="json" maxH="58vh" />
                </div>
              )}
            </div>
            <div className="panel grid grid-cols-2 gap-1.5 p-2">
              <button className="btn btn-ghost btn-sm" onClick={still} disabled={!!busy}>
                {busy === "still" ? "Rendering…" : "PNG still"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={wav} disabled={!!busy}>
                {busy === "wav" ? "Mixing…" : "Sound (WAV)"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={html} disabled={!!busy}>
                {busy === "html" ? "Packing…" : "Standalone HTML"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setImportOpen(true)}>
                Import JSON
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* details */}
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <div className="panel p-5">
          <div className="eyebrow mb-3">How to use it</div>
          <p className="text-[14px] leading-relaxed">{comp.notes ?? "Drop it anywhere in a post. Every value on the right is a prop: change it here or in the spec."}</p>
        </div>
        <div className="panel p-5 md:col-span-2">
          <div className="eyebrow mb-3">Sound design · {cues.length} cues</div>
          {cues.length ? (
            <ol className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {cues.map((c, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-1.5 text-[13px]">
                  <span className="font-mono text-[11.5px] tabular-nums text-mute">{c.at.toFixed(2)}s</span>
                  <span className="flex-1 font-semibold">{soundInfo(c.sound)?.name ?? c.sound}</span>
                  <span className="text-mute">{c.role ?? soundInfo(c.sound)?.category}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-mute">Silent by design.</p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="headline text-[28px]">
              Pairs well <em>with</em>
            </h2>
            <TLink href="/library/" label="Library" className="btn btn-line btn-sm">
              All components
            </TLink>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {related.map((c, i) => (
              <ComponentCard key={c.id} comp={c} index={i} />
            ))}
          </div>
        </div>
      )}

      <ExportDialog open={exporting} onClose={() => setExporting(false)} comp={comp} props={props} format={format} name={id} />
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={(json) => {
            try {
              const o = JSON.parse(json);
              if (o.component && o.component !== id) throw new Error(`This spec is for "${o.component}", not "${id}".`);
              const { props: p, issues } = propsFor(comp, { ...defaultProps(comp), ...(o.props ?? o) });
              setProps(p);
              if (o.format && formats.includes(o.format)) setFormat(o.format);
              toast(issues.length ? `Imported with ${issues.length} fixes` : "Spec imported");
              setImportOpen(false);
            } catch (e) {
              toast((e as Error).message);
            }
          }}
        />
      )}
    </div>
  );
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (json: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg space-y-3 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold tracking-[-0.035em]">Import a spec</h3>
        <p className="help">Paste the JSON from a prompt, a posts/*.json file or a teammate.</p>
        <textarea className="field font-mono !text-[12px]" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder='{ "component": "...", "props": { ... } }' />
        <div className="flex justify-end gap-2">
          <button className="btn btn-line" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-ink" onClick={() => onImport(text)}>
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
