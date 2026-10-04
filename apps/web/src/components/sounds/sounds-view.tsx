"use client";

// Every sound a component can cue, rendered live by the same engine that mixes the exports. Settings
// here (brightness, variation, length) are the cue's own fields, so what you hear is what a spec gets.

import { SOUND_CATEGORIES, allSounds, cueBuffer, cuesOf, defaultProps, toWav, type SoundCategory, type SoundInfo } from "@motioneasy/engine";
import { COMPONENTS, MUSIC, TRANSITIONS, TRANSITION_IDS } from "@motioneasy/library";
import { useEffect, useMemo, useRef, useState } from "react";
import { Waveform } from "@/components/audio/waveform";
import { TLink } from "@/components/site/motion";
import { useToast } from "@/components/site/toast";
import { CodeBlock } from "@/components/studio/code";
import { copyText, download, setupEngine } from "@/lib/engine";

interface Settings {
  tone: number;
  seed: number;
  len: number;
}

let actx: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;
async function play(buf: AudioBuffer, onEnd: () => void) {
  actx ??= new AudioContext();
  if (actx.state === "suspended") await actx.resume();
  current?.stop();
  const src = actx.createBufferSource();
  src.buffer = buf;
  const g = actx.createGain();
  g.gain.value = 0.85;
  src.connect(g).connect(actx.destination);
  src.onended = () => {
    if (current === src) current = null;
    onEnd();
  };
  src.start();
  current = src;
}

function peaks(buf: AudioBuffer, bars: number) {
  const ch = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
  const step = Math.max(1, Math.floor(buf.length / bars));
  const out: number[] = [];
  for (let b = 0; b < bars; b++) {
    let m = 0;
    for (let i = b * step; i < Math.min(buf.length, (b + 1) * step); i += 4) for (const c of ch) m = Math.max(m, Math.abs(c[i]));
    out.push(m);
  }
  const top = Math.max(1e-6, ...out);
  return out.map((v) => v / top);
}

/** Which components (and transitions) cue each sound with their default props. */
function usage() {
  const map = new Map<string, { id: string; name: string }[]>();
  const add = (sound: string, id: string, name: string) => {
    if (sound.startsWith("url:")) return;
    const list = map.get(sound) ?? [];
    if (!list.some((x) => x.id === id)) list.push({ id, name });
    map.set(sound, list);
  };
  for (const c of COMPONENTS) for (const q of cuesOf(c, defaultProps(c), "vertical")) add(q.sound, c.id, c.name);
  for (const t of TRANSITION_IDS) for (const q of TRANSITIONS[t].sounds(TRANSITIONS[t].duration || 0.4)) add(q.sound, `tr-${t}`, TRANSITIONS[t].name);
  return map;
}

export function SoundsView() {
  const [cat, setCat] = useState<SoundCategory | "all">("all");
  const [q, setQ] = useState("");
  const [s, setS] = useState<Settings>({ tone: 0.5, seed: 1, len: 1.6 });
  const [sounds, setSounds] = useState<SoundInfo[]>([]);
  useEffect(() => {
    setupEngine();
    setSounds(allSounds());
  }, []);
  const used = useMemo(() => usage(), []);
  const cats = SOUND_CATEGORIES.filter((c) => c.id !== "music" && sounds.some((x) => x.category === c.id));
  const shown = sounds.filter((x) => x.category !== "music" && (cat === "all" || x.category === cat) && (!q.trim() || `${x.name} ${x.id} ${x.description}`.toLowerCase().includes(q.trim().toLowerCase())));
  const groups = cats.map((c) => ({ c, items: shown.filter((x) => x.category === c.id) })).filter((g) => g.items.length);

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-20 md:px-8">
      <div className="pb-8 pt-10">
        <div className="eyebrow mb-2">Sounds</div>
        <h1 className="headline text-[clamp(36px,5vw,68px)]">
          Every sound, <em>designed in code.</em>
        </h1>
        <p className="lede mt-3 max-w-2xl">
          {sounds.filter((x) => x.kind === "synth").length} synthesised sounds{sounds.some((x) => x.kind === "sample") ? ` and ${sounds.filter((x) => x.kind === "sample").length} CC0 recordings` : ""}, each timed to the frame by the component that cues it. Risers stretch to land on the hit, every seed is a new take, and exports are mixed to -14 LUFS. Play them here, download a WAV, or use the id in a spec.
        </p>
      </div>

      <div className="z-20 -mx-4 mb-8 md:sticky md:top-[var(--nav-h)] border-y border-[var(--line)] bg-cream/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="thin-scroll -mx-1 max-w-full overflow-x-auto px-1" data-lenis-prevent>
            <div className="seg">
              <button aria-pressed={cat === "all"} onClick={() => setCat("all")}>
                All
              </button>
              {cats.map((c) => (
                <button key={c.id} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <input className="field !h-9 !w-56 !py-1.5" placeholder="Search sounds" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-2">
            <Knob label="Brightness" value={s.tone} min={0} max={1} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => setS({ ...s, tone: v })} />
            <Knob label="Take" value={s.seed} min={1} max={12} step={1} fmt={(v) => `#${v}`} onChange={(v) => setS({ ...s, seed: v })} />
            <Knob label="Stretch" value={s.len} min={0.4} max={4} step={0.1} fmt={(v) => `${v.toFixed(1)}s`} onChange={(v) => setS({ ...s, len: v })} />
          </div>
        </div>
      </div>

      {groups.map(({ c, items }) => (
        <section key={c.id} className="mb-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="headline text-[28px]">{c.name}</h2>
            <p className="text-[13.5px] text-mute">{c.blurb}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((x) => (
              <SoundCard key={x.id} info={x} s={s} used={used.get(x.id) ?? []} />
            ))}
          </div>
        </section>
      ))}
      {!groups.length && <p className="help">Nothing matches “{q}”.</p>}

      <section className="mb-12 mt-16">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="headline text-[28px]">Music beds</h2>
          <p className="text-[13.5px] text-mute">For whole posts. CC-BY: the credit ships with the post.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {MUSIC.map((m) => (
            <div key={m.id} className="panel space-y-3 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-lg font-bold tracking-[-0.03em]">{m.name}</div>
                  <div className="text-[13px] text-mute">
                    {m.mood}
                    {m.bpm ? ` · ${m.bpm} BPM` : ""}
                  </div>
                </div>
                <TLink href="/compose/" label="Compose" className="btn btn-line btn-sm">
                  Use in a post
                </TLink>
              </div>
              <Waveform src={m.src} height={64} />
              <p className="help">{m.credit}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <div className="eyebrow mb-3">In a spec</div>
          <p className="text-[14px] leading-relaxed">
            Components cue sounds on their own timeline; you rarely write cues by hand. When you do (a custom component, a post), a cue is a small object. <code className="font-mono text-[12.5px]">len</code> stretches risers and swells, <code className="font-mono text-[12.5px]">seed</code> picks the take, <code className="font-mono text-[12.5px]">tone</code> is brightness.
          </p>
        </div>
        <CodeBlock
          lang="ts"
          maxH="none"
          code={`sounds: (p) => [
  { at: 0.0, sound: "riser.build", len: 1.2, gain: 0.6 },   // ends on the hit at 1.2s
  { at: 1.2, sound: "impact.sub", gain: 0.9 },
  { at: 1.2, sound: "tonal.shimmer", gain: 0.4, seed: 3, tone: 0.7 },
  { at: 0, sound: "url:media/music/kevin-macleod_Funkorama.mp3", gain: 0.5, fadeOut: 1.2 },
]`}
        />
      </section>
    </div>
  );
}

function Knob({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="label !text-mute">{label}</span>
      <input type="range" className="slider w-24" min={min} max={max} step={step} value={value} style={{ ["--fill" as string]: `${((value - min) / (max - min)) * 100}%` }} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="w-10 font-mono text-[11px] tabular-nums text-mute">{fmt(value)}</span>
    </label>
  );
}

function SoundCard({ info, s, used }: { info: SoundInfo; s: Settings; used: { id: string; name: string }[] }) {
  const toast = useToast();
  const [buf, setBuf] = useState<AudioBuffer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState(false);
  const cue = useMemo(() => ({ at: 0, sound: info.id, seed: s.seed, tone: s.tone, len: info.stretch ? s.len : undefined }), [info, s]);
  const live = useRef(0);
  useEffect(() => {
    const n = ++live.current;
    setErr(false);
    void cueBuffer(cue).then((b) => {
      if (n !== live.current) return;
      setBuf(b);
      setErr(!b);
    });
  }, [cue]);
  const bars = useMemo(() => (buf ? peaks(buf, 64) : []), [buf]);
  const go = async () => {
    const b = buf ?? (await cueBuffer(cue));
    if (!b) return;
    setPlaying(true);
    await play(b, () => setPlaying(false));
  };
  return (
    <div className={`panel flex flex-col gap-3 p-4 transition-colors ${playing ? "!border-ink" : ""}`}>
      <div className="flex items-start gap-3">
        <button onClick={go} disabled={err} aria-label={`Play ${info.name}`} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform active:scale-95 ${playing ? "bg-ink text-cream" : "bg-sand-2 text-ink hover:bg-sand"}`}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[15px] font-bold tracking-[-0.02em]">{info.name}</span>
            <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-mute">{buf ? `${buf.duration.toFixed(2)}s` : "…"}</span>
          </div>
          <button className="font-mono text-[11px] text-mute hover:text-ink" title="Copy id" onClick={async () => (await copyText(info.id)) && toast(`Copied "${info.id}"`)}>
            {info.id}
          </button>
        </div>
      </div>
      <button onClick={go} className="flex h-12 items-center gap-[2px]" aria-hidden tabIndex={-1}>
        {bars.length
          ? bars.map((v, i) => <span key={i} className={`flex-1 rounded-full ${playing ? "bg-ink" : "bg-ink/25"}`} style={{ height: `${Math.max(4, v * 100)}%` }} />)
          : Array.from({ length: 64 }, (_, i) => <span key={i} className="h-[4%] flex-1 rounded-full bg-ink/10" />)}
      </button>
      <p className="text-[13px] leading-snug text-mute">{info.description}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        <button className="btn btn-line btn-sm" disabled={!buf} onClick={() => buf && download(toWav(buf), `${info.id}${s.seed !== 1 ? `-take${s.seed}` : ""}.wav`)}>
          WAV
        </button>
        {info.stretch && <span className="chip">stretches</span>}
        {info.kind === "sample" && <span className="chip" title={info.credit}>{info.license ?? "CC0"}</span>}
        {used.slice(0, 3).map((u) => (
          <TLink key={u.id} href={`/c/${u.id}/`} label={u.name} className="chip hover:!border-ink hover:!text-ink">
            {u.name}
          </TLink>
        ))}
        {used.length > 3 && <span className="chip">+{used.length - 3}</span>}
      </div>
    </div>
  );
}
