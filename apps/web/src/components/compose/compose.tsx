"use client";

// Compose: a post is a list of components joined by transitions with music under it (a PostSpec).
// Everything here edits that JSON; the preview and the MP4 come from buildSequence(), the same code
// the CLI renders with.

import {
  FORMATS, cuesOf, defaultProps, diffProps, durationOf, propsFor, soundInfo,
  type Component, type FormatId, type Player, type Props,
} from "@motioneasy/engine";
import {
  CATEGORIES, COMPONENTS, MUSIC, TRANSITIONS, TRANSITION_IDS, buildPostPrompt, buildSequence, categoryById, componentById, layoutPost,
  type ClipSpec, type MusicSpec, type PostSpec, type TransitionId,
} from "@motioneasy/library";
import { useEffect, useMemo, useRef, useState } from "react";
import { Waveform } from "@/components/audio/waveform";
import { ControlPanel } from "@/components/controls/panel";
import { PlayerCanvas, Transport, type PlayerState } from "@/components/player/player-canvas";
import { CodeBlock } from "@/components/studio/code";
import { ExportDialog } from "@/components/studio/export-dialog";
import { useToast } from "@/components/site/toast";
import { copyText, download, siteUrl } from "@/lib/engine";
import { embedUploads } from "@/lib/export";

interface Clip {
  key: string;
  component: string;
  props: Props;
  transition: TransitionId;
  /** Transition length override (s). */
  tlen?: number;
  /** Clip length override (s). */
  duration?: number;
}

interface Draft {
  id: string;
  title: string;
  format: FormatId;
  clips: Clip[];
  music: MusicSpec | null;
}

type Tab = "clip" | "post" | "spec";

const STORE = "me:compose";
const STARTER: PostSpec = {
  id: "my-first-post",
  title: "My first post",
  format: "vertical",
  clips: [
    { component: "hook-strike" },
    { component: "product-orbit", transition: "whip" },
    { component: "stat-trio", transition: "push" },
    { component: "end-card", transition: "zoom" },
  ],
  music: { src: MUSIC[0].src, gain: 0.5, credit: MUSIC[0].credit },
};

let seq = 0;
const newKey = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "post";

function clipFrom(cs: ClipSpec, i: number): Clip {
  const comp = componentById(cs.component);
  if (!comp) throw new Error(`Unknown component "${cs.component}" in clip ${i + 1}.`);
  const tr = typeof cs.transition === "string" ? { type: cs.transition } : cs.transition ?? { type: "cut" as TransitionId };
  return {
    key: newKey(),
    component: comp.id,
    props: propsFor(comp, { ...defaultProps(comp), ...(cs.props ?? {}) }).props,
    transition: TRANSITIONS[tr.type as TransitionId] ? (tr.type as TransitionId) : "cut",
    tlen: (tr as { duration?: number }).duration,
    duration: cs.duration,
  };
}

/** Accepts a post spec, or a single-component spec (becomes a one-clip post). */
function draftFrom(o: unknown): Draft {
  const s = o as Partial<PostSpec> & { component?: string; props?: Props };
  if (!s || typeof s !== "object") throw new Error("That isn't a JSON object.");
  const clips: ClipSpec[] | undefined = Array.isArray(s.clips) ? s.clips : s.component ? [{ component: s.component, props: s.props }] : undefined;
  if (!clips?.length) throw new Error('No clips found. A post spec has a "clips" array.');
  const title = s.title ?? s.id ?? "Untitled post";
  return {
    id: s.id ?? slug(title),
    title,
    format: s.format && s.format in FORMATS ? s.format : "vertical",
    clips: clips.map(clipFrom),
    music: s.music?.src ? { gain: 0.5, ...s.music } : null,
  };
}

function specFrom(d: Draft): PostSpec {
  return {
    id: d.id,
    title: d.title,
    format: d.format,
    fps: 60,
    clips: d.clips.map((c, i) => {
      const comp = componentById(c.component)!;
      const out: ClipSpec = { component: c.component };
      const props = diffProps(comp, c.props);
      if (Object.keys(props).length) out.props = props;
      if (i > 0 && c.transition !== "cut") out.transition = c.tlen ? { type: c.transition, duration: c.tlen } : c.transition;
      if (c.duration) out.duration = c.duration;
      return out;
    }),
    music: d.music,
  };
}

/** Short, unique transition labels (the names share first words: "Light flash", "Light wipe"). */
const label = (id: TransitionId) => id[0].toUpperCase() + id.slice(1);

const noBlobs = (_k: string, v: unknown) => (typeof v === "string" && v.startsWith("blob:") ? null : v);

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function Compose() {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(STARTER));
  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState<Tab>("clip");
  const [player, setPlayer] = useState<Player | null>(null);
  // Open on a frame with something in it (t = 0 of most hooks is an empty stage).
  const [ps, setPs] = useState<PlayerState>({ time: 1.5, duration: 0, playing: false, ready: false, muted: false });
  const [adding, setAdding] = useState<null | "add" | "replace">(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy] = useState("");

  // Restore the last draft from this browser (uploads can't survive a reload, so they come back empty).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) setDraft(draftFrom(JSON.parse(saved)));
    } catch {
      /* ignore a broken save */
    }
  }, []);

  const spec = useMemo(() => specFrom(draft), [draft]);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify(spec, noBlobs));
      } catch {
        /* storage blocked */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [spec]);

  const live = useDebounced(spec, 140);
  const built = useMemo(() => {
    try {
      return { comp: buildSequence(live), error: "" };
    } catch (e) {
      return { comp: null, error: (e as Error).message };
    }
  }, [live]);
  const comp = built.comp as Component | null;
  const compProps = useMemo(() => (comp ? defaultProps(comp) : {}), [comp]);
  const timeline = useMemo(() => {
    try {
      return layoutPost(live);
    } catch {
      return null;
    }
  }, [live]);
  const cues = useMemo(() => (comp ? cuesOf(comp, compProps, draft.format) : []), [comp, compProps, draft.format]);
  const total = timeline?.duration ?? 0;

  const clip = draft.clips[Math.min(sel, draft.clips.length - 1)];
  const clipComp = clip ? (componentById(clip.component) as Component) : null;
  const natural = clip && clipComp ? durationOf(clipComp, clip.props) : 0;

  const update = (fn: (d: Draft) => Draft) => setDraft((d) => fn(d));
  const setClip = (i: number, patch: Partial<Clip>) => update((d) => ({ ...d, clips: d.clips.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  const setClipProp = (k: string, v: unknown) => update((d) => ({ ...d, clips: d.clips.map((c, j) => (j === sel ? { ...c, props: { ...c.props, [k]: v } } : c)) }));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.clips.length) return;
    update((d) => {
      const clips = [...d.clips];
      [clips[i], clips[j]] = [clips[j], clips[i]];
      return { ...d, clips };
    });
    setSel(j);
  };
  const remove = (i: number) => {
    if (draft.clips.length <= 1) return toast("A post needs at least one clip");
    update((d) => ({ ...d, clips: d.clips.filter((_, j) => j !== i) }));
    setSel((s) => Math.max(0, Math.min(s, draft.clips.length - 2)));
  };
  const duplicate = (i: number) => {
    update((d) => ({ ...d, clips: [...d.clips.slice(0, i + 1), { ...d.clips[i], key: newKey() }, ...d.clips.slice(i + 1)] }));
    setSel(i + 1);
  };
  const pick = (id: string) => {
    const c = componentById(id) as Component;
    const fresh: Clip = { key: newKey(), component: id, props: defaultProps(c), transition: draft.clips.length ? "whip" : "cut" };
    if (adding === "replace" && clip) setClip(sel, { component: id, props: fresh.props, duration: undefined });
    else {
      update((d) => ({ ...d, clips: [...d.clips.slice(0, sel + 1), fresh, ...d.clips.slice(sel + 1)] }));
      setSel(Math.min(sel + 1, draft.clips.length));
    }
    setTab("clip");
    setAdding(null);
  };
  const seekClip = (i: number) => {
    setSel(i);
    setTab("clip");
    const k = timeline?.clips[i];
    if (player && k) player.seek(k.start + k.tin + 0.02);
  };

  /** The spec with uploads embedded as data URLs, so the JSON reproduces the post anywhere. */
  const portable = async (): Promise<PostSpec> => {
    const s = specFrom(draft);
    const clips = await Promise.all(
      draft.clips.map(async (c, i) => {
        const cc = componentById(c.component) as Component;
        const embedded = diffProps(cc, await embedUploads(cc.schema, c.props));
        return { ...s.clips[i], ...(Object.keys(embedded).length ? { props: embedded } : {}) };
      }),
    );
    let music = s.music;
    if (music?.src.startsWith("blob:")) {
      const blob = await (await fetch(music.src)).blob();
      const data = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(blob);
      });
      music = { ...music, src: data };
    }
    return { ...s, clips, music };
  };
  const hasUploads = JSON.stringify(spec).includes("blob:");
  const copyJson = async () => {
    setBusy("copy");
    try {
      if (await copyText(JSON.stringify(hasUploads ? await portable() : spec, null, 2))) toast(hasUploads ? "Spec copied, uploads embedded" : "Spec JSON copied");
    } finally {
      setBusy("");
    }
  };
  const saveJson = async () => {
    setBusy("save");
    try {
      download(new Blob([JSON.stringify(hasUploads ? await portable() : spec, null, 2)], { type: "application/json" }), `${draft.id}.json`);
      toast(`Saved ${draft.id}.json: put it in posts/ and run pnpm render`);
    } finally {
      setBusy("");
    }
  };
  const copyPrompt = async () => {
    if (await copyText(buildPostPrompt(spec, { siteUrl: siteUrl(), includeSource: false }))) toast("Prompt copied. Paste it into any AI tool.");
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-8">
        <div className="min-w-0">
          <div className="eyebrow mb-2">Compose</div>
          <h1 className="headline text-[clamp(32px,4vw,52px)]">
            Clips in, <em>post</em> out.
          </h1>
          <p className="lede mt-2 max-w-2xl !text-base">Line up components, pick how each one cuts in, lay music under it and export one MP4. The whole post is a small JSON spec you can save, share or render from the CLI.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-line" onClick={() => setImporting(true)}>
            Import JSON
          </button>
          <button className="btn btn-line" onClick={saveJson} disabled={!!busy}>
            {busy === "save" ? "Packing…" : "Export JSON"}
          </button>
          <button className="btn btn-ink" onClick={() => setExporting(true)} disabled={!comp}>
            Download MP4
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          <div className="relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-sand-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
              <div className="seg">
                {(Object.keys(FORMATS) as FormatId[]).map((f) => (
                  <button key={f} aria-pressed={draft.format === f} onClick={() => update((d) => ({ ...d, format: f }))} title={FORMATS[f].platforms}>
                    {FORMATS[f].ratio}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-mute">
                <span className="chip">{draft.clips.length} clips</span>
                <span className="chip">{total.toFixed(1)}s</span>
                <span className="chip">{cues.length} sound cues</span>
              </div>
            </div>
            <div className="grid place-items-center px-4 py-6 md:py-10" style={{ minHeight: "min(72vh, 820px)" }}>
              <div style={{ width: draft.format === "landscape" ? "min(100%, 980px)" : draft.format === "square" ? "min(100%, 600px)" : draft.format === "portrait" ? "min(100%, 540px)" : "min(100%, 420px)" }}>
                {comp ? (
                  <PlayerCanvas comp={comp} props={compProps} format={draft.format} startAt={ps.time} onPlayer={setPlayer} onState={setPs} className="shadow-[var(--shadow-deep)]" />
                ) : (
                  <div className="panel p-6 text-sm text-mute">{built.error || "Add a clip to start."}</div>
                )}
              </div>
            </div>
            <div className="border-t border-[var(--line)] px-4 py-3">
              <Transport player={player} state={ps} cues={cues.map((c) => ({ at: c.at, label: c.role === "music" ? "Music" : soundInfo(c.sound)?.name ?? c.sound }))} />
            </div>
          </div>

          <Timeline draft={draft} timeline={timeline} time={ps.time} sel={sel} onPick={seekClip} onAdd={() => setAdding("add")} />
        </div>

        <aside className="min-w-0">
          <div className="space-y-3 lg:sticky lg:top-[calc(var(--nav-h)+16px)]">
            <div className="seg w-full">
              {(["clip", "post", "spec"] as Tab[]).map((t) => (
                <button key={t} className="flex-1 capitalize" aria-pressed={tab === t} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </div>
            <div className="thin-scroll space-y-3 lg:max-h-[calc(100vh-var(--nav-h)-110px)] lg:overflow-y-auto lg:pr-1" data-lenis-prevent>
              {tab === "clip" && clip && clipComp && (
                <>
                  <div className="panel space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="eyebrow mb-1">
                          Clip {sel + 1} of {draft.clips.length}
                        </div>
                        <div className="truncate text-lg font-bold tracking-[-0.03em]">{clipComp.name}</div>
                        <div className="text-[12.5px] text-mute">{categoryById(clipComp.category)?.name}</div>
                      </div>
                      <button className="btn btn-line btn-sm shrink-0" onClick={() => setAdding("replace")}>
                        Change
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button className="btn btn-ghost btn-sm" onClick={() => move(sel, -1)} disabled={sel === 0}>
                        ← Earlier
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => move(sel, 1)} disabled={sel === draft.clips.length - 1}>
                        Later →
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => duplicate(sel)}>
                        Duplicate
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => remove(sel)}>
                        Remove
                      </button>
                    </div>
                  </div>

                  {sel > 0 && (
                    <div className="panel space-y-3 p-4">
                      <div className="flex items-center justify-between">
                        <span className="label">Transition in</span>
                        <span className="help">{TRANSITIONS[clip.transition].description}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {TRANSITION_IDS.map((id) => (
                          <button key={id} title={TRANSITIONS[id].name} className={`chip !h-8 justify-center !px-1 ${clip.transition === id ? "!border-ink !bg-ink !text-cream" : ""}`} onClick={() => setClip(sel, { transition: id, tlen: undefined })}>
                            {label(id)}
                          </button>
                        ))}
                      </div>
                      {clip.transition !== "cut" && (
                        <Slider label="Transition length" unit="s" min={0.1} max={1.5} step={0.02} value={clip.tlen ?? TRANSITIONS[clip.transition].duration} onChange={(v) => setClip(sel, { tlen: v })} onReset={clip.tlen ? () => setClip(sel, { tlen: undefined }) : undefined} />
                      )}
                    </div>
                  )}

                  <div className="panel p-4">
                    <Slider label="Clip length" unit="s" min={0.5} max={Math.max(20, natural * 2)} step={0.1} value={clip.duration ?? natural} onChange={(v) => setClip(sel, { duration: v })} onReset={clip.duration ? () => setClip(sel, { duration: undefined }) : undefined} />
                    <p className="help mt-1">Natural length {natural.toFixed(2)}s. Shorter trims the end; longer holds the last frame of the motion.</p>
                  </div>

                  <ControlPanel key={clip.key} schema={clipComp.schema} values={clip.props} onChange={setClipProp} />
                </>
              )}

              {tab === "post" && <PostPanel draft={draft} update={update} length={total} />}

              {tab === "spec" && (
                <div className="space-y-3">
                  <div className="panel space-y-2 p-4">
                    <p className="text-[13px] leading-relaxed text-mute">
                      Save this as <code className="font-mono">posts/{draft.id}.json</code> and run <code className="font-mono">pnpm render posts/{draft.id}.json</code>, or paste the prompt into any AI tool to reproduce it exactly.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-ink btn-sm" onClick={copyJson} disabled={!!busy}>
                        Copy JSON
                      </button>
                      <button className="btn btn-line btn-sm" onClick={saveJson} disabled={!!busy}>
                        Download .json
                      </button>
                      <button className="btn btn-line btn-sm" onClick={copyPrompt}>
                        Copy prompt
                      </button>
                    </div>
                    {hasUploads && <p className="help">Your uploads are embedded when you copy or download (the file gets bigger).</p>}
                  </div>
                  <CodeBlock code={JSON.stringify(spec, noBlobs, 2)} lang="json" maxH="60vh" />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {comp && <ExportDialog open={exporting} onClose={() => setExporting(false)} comp={comp} props={compProps} format={draft.format} name={draft.id} />}
      {adding && <AddClip mode={adding} onClose={() => setAdding(null)} onPick={pick} />}
      {importing && (
        <ImportPost
          onClose={() => setImporting(false)}
          onImport={(text) => {
            try {
              const d = draftFrom(JSON.parse(text));
              setDraft(d);
              setSel(0);
              setImporting(false);
              toast(`Imported "${d.title}" · ${d.clips.length} clips`);
            } catch (e) {
              toast((e as Error).message);
            }
          }}
        />
      )}
    </div>
  );
}

function Timeline({ draft, timeline, time, sel, onPick, onAdd }: { draft: Draft; timeline: ReturnType<typeof layoutPost> | null; time: number; sel: number; onPick: (i: number) => void; onAdd: () => void }) {
  const total = Math.max(0.001, timeline?.duration ?? 1);
  const pct = (s: number) => `${(s / total) * 100}%`;
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="eyebrow">Timeline</div>
        <button className="btn btn-ink btn-sm" onClick={onAdd}>
          + Add clip
        </button>
      </div>
      <div className="thin-scroll overflow-x-auto pb-2" data-lenis-prevent>
        <div className="relative h-[92px]" style={{ minWidth: `${Math.max(560, total * 70)}px` }}>
          {timeline?.clips.map((k, i) => {
            const c = draft.clips[i];
            const comp = componentById(c.component);
            const on = i === sel;
            return (
              <button
                key={c.key}
                onClick={() => onPick(i)}
                className={`absolute top-3 flex h-[72px] flex-col justify-between overflow-hidden rounded-xl border px-3 py-2 text-left transition-colors ${on ? "border-ink bg-ink text-cream" : "border-[var(--line-strong)] bg-cream hover:bg-sand-2"}`}
                style={{ left: pct(k.start), width: `calc(${pct(k.dur)} - 2px)`, zIndex: on ? 3 : 1 + (i % 2) }}
                title={`${comp?.name} · ${k.dur.toFixed(2)}s`}
              >
                <span className="truncate text-[12.5px] font-bold tracking-[-0.01em]">
                  {i + 1}. {comp?.name}
                </span>
                <span className={`font-mono text-[10.5px] tabular-nums ${on ? "text-cream/70" : "text-mute"}`}>{k.dur.toFixed(1)}s</span>
              </button>
            );
          })}
          {timeline?.clips.map((k, i) =>
            i > 0 && draft.clips[i].transition !== "cut" ? (
              <span key={`t${draft.clips[i].key}`} className="pointer-events-none absolute top-0 z-[4] -translate-x-1/2 whitespace-nowrap rounded-full border border-[var(--line-strong)] bg-paper px-2 py-0.5 text-[10px] font-bold shadow-sm" style={{ left: pct(k.start + k.tin / 2) }}>
                {label(draft.clips[i].transition)}
              </span>
            ) : null,
          )}
          <div className="pointer-events-none absolute bottom-0 top-0 z-[5] w-[2px] -translate-x-1/2 rounded-full bg-[#E5484D]" style={{ left: pct(Math.min(time, total)) }} />
        </div>
      </div>
      {draft.music && <div className="help mt-1 truncate">Music: {MUSIC.find((m) => m.src === draft.music?.src)?.name ?? "Uploaded track"} · {draft.music.credit ?? "add a credit if the licence needs one"}</div>}
    </div>
  );
}

function PostPanel({ draft, update, length }: { draft: Draft; update: (fn: (d: Draft) => Draft) => void; length: number }) {
  const file = useRef<HTMLInputElement>(null);
  const m = draft.music;
  const setMusic = (patch: Partial<MusicSpec> | null) => update((d) => ({ ...d, music: patch === null ? null : { ...(d.music ?? { src: "" }), ...patch } as MusicSpec }));
  const current = m ? (MUSIC.find((x) => x.src === m.src)?.id ?? "upload") : "none";
  return (
    <div className="space-y-3">
      <div className="panel space-y-3 p-4">
        <div>
          <div className="label mb-1.5">Title</div>
          <input className="field" value={draft.title} maxLength={80} onChange={(e) => update((d) => ({ ...d, title: e.target.value, id: slug(e.target.value) }))} />
          <p className="help mt-1">
            File name: <span className="font-mono">{draft.id}.json</span>
          </p>
        </div>
      </div>
      <div className="panel space-y-3 p-4">
        <div className="label">Music</div>
        <select
          className="field"
          value={current === "none" || current === "upload" ? "" : current}
          onChange={(e) => {
            const t = MUSIC.find((x) => x.id === e.target.value);
            // Start on the track's first strong, bar-aligned section so the edit opens with energy.
            if (t) setMusic({ src: t.src, credit: t.credit, gain: m?.gain ?? 0.5, offset: t.starts[0] ?? 0 });
          }}
        >
          <option value="" disabled>
            {current === "upload" ? "Your upload" : "Pick a track…"}
          </option>
          {[...new Set(MUSIC.map((t) => t.mood.split(" · ")[0]))].map((mood) => (
            <optgroup key={mood} label={mood}>
              {MUSIC.filter((t) => t.mood.startsWith(mood)).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {Math.round(t.bpm)} BPM
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-1.5">
          <button className={`chip !h-9 justify-center ${current === "none" ? "!border-ink !bg-ink !text-cream" : ""}`} onClick={() => setMusic(null)}>
            None
          </button>
          <button className={`chip !h-9 justify-center ${current === "upload" ? "!border-ink !bg-ink !text-cream" : ""}`} onClick={() => file.current?.click()}>
            Upload…
          </button>
        </div>
        <input
          ref={file}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setMusic({ src: URL.createObjectURL(f), credit: undefined, gain: m?.gain ?? 0.5, offset: 0 });
            e.target.value = "";
          }}
        />
        {m && (
          <>
            <div>
              <div className="label mb-1.5">Which part plays</div>
              <Waveform key={m.src} src={m.src} height={52} region={{ start: m.offset ?? 0, length: Math.max(0.5, length) }} onRegion={(s) => setMusic({ offset: s })} />
              <p className="help mt-1">Drag the red window: it is the {length.toFixed(1)}s of the track under your post.</p>
            </div>
            <Slider label="Music volume" min={0} max={1} step={0.05} value={m.gain ?? 0.55} onChange={(v) => setMusic({ gain: v })} />
            <Slider label="Start inside the track" unit="s" min={0} max={180} step={0.5} value={m.offset ?? 0} onChange={(v) => setMusic({ offset: v })} />
            <Slider label="Fade out" unit="s" min={0} max={4} step={0.1} value={m.fadeOut ?? 1.2} onChange={(v) => setMusic({ fadeOut: v })} />
            <div>
              <div className="label mb-1.5">Credit</div>
              <input className="field" value={m.credit ?? ""} placeholder="Required for CC-BY music" onChange={(e) => setMusic({ credit: e.target.value || undefined })} />
              <p className="help mt-1">CC-BY tracks need this credit in the post caption or end card.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, unit = "", onChange, onReset }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void; onReset?: () => void }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="label">{label}</span>
        <span className="flex items-center gap-2">
          {onReset && (
            <button className="text-[11px] font-semibold text-mute underline-offset-2 hover:underline" onClick={onReset}>
              Auto
            </button>
          )}
          <span className="font-mono text-[11px] tabular-nums text-mute">
            {value.toFixed(step < 0.1 ? 2 : 1)}
            {unit}
          </span>
        </span>
      </div>
      <input type="range" className="slider w-full" min={min} max={max} step={step} value={value} style={{ ["--fill" as string]: `${fill}%` }} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function AddClip({ mode, onClose, onPick }: { mode: "add" | "replace"; onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    return CATEGORIES.map((cat) => ({
      cat,
      items: COMPONENTS.filter((c) => c.category === cat.id && (!s || `${c.name} ${c.description} ${c.tags.join(" ")}`.toLowerCase().includes(s))),
    })).filter((g) => g.items.length);
  }, [q]);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card flex max-h-[84vh] w-full max-w-3xl flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold tracking-[-0.03em]">{mode === "add" ? "Add a clip" : "Change this clip"}</h3>
          <button className="btn btn-line btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <input className="field mb-4" autoFocus placeholder="Search components: hook, stat, logo, captions…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="thin-scroll -mr-2 overflow-y-auto pr-2" data-lenis-prevent>
          {groups.map(({ cat, items }) => (
            <div key={cat.id} className="mb-5">
              <div className="eyebrow mb-2">
                {cat.name} <span className="normal-case tracking-normal">· {cat.blurb}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((c) => (
                  <button key={c.id} className="rounded-xl border border-[var(--line)] bg-cream p-3 text-left transition-colors hover:border-ink hover:bg-sand-2" onClick={() => onPick(c.id)}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] font-bold tracking-[-0.02em]">{c.name}</span>
                      <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-mute">{durationOf(c, defaultProps(c)).toFixed(1)}s</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-mute">{c.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!groups.length && <p className="help">Nothing matches “{q}”.</p>}
        </div>
      </div>
    </div>
  );
}

function ImportPost({ onClose, onImport }: { onClose: () => void; onImport: (json: string) => void }) {
  const [text, setText] = useState("");
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg space-y-3 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold tracking-[-0.035em]">Import a post</h3>
        <p className="help">Paste a post spec (posts/*.json, a prompt, a teammate&apos;s export) or a single component spec. This replaces the current post.</p>
        <textarea className="field font-mono !text-[12px]" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder='{ "clips": [ { "component": "hook-strike" }, … ] }' />
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) onImport(await f.text());
            e.target.value = "";
          }}
        />
        <div className="flex justify-between gap-2">
          <button className="btn btn-ghost" onClick={() => file.current?.click()}>
            Open file…
          </button>
          <div className="flex gap-2">
            <button className="btn btn-line" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-ink" onClick={() => onImport(text)} disabled={!text.trim()}>
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
