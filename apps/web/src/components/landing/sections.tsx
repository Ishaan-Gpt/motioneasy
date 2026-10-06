"use client";

import { SOUND_CATEGORIES, SYNTH_SOUNDS, cueBuffer, defaultProps, type Component, type Props } from "@motioneasy/engine";
import { CATEGORIES, COMPONENTS, GROUPS, TRANSITION_IDS, buildPrompt, componentById } from "@motioneasy/library";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState } from "react";
import { ComponentCard } from "@/components/library/card";
import { PlayerCanvas } from "@/components/player/player-canvas";
import { TLink } from "@/components/site/motion";
import { CodeBlock } from "@/components/studio/code";
import { siteUrl } from "@/lib/engine";
import { IcDial, IcFrames, IcPlay, IcPrompt } from "./glyphs";

// ── 1. The problem, told on scroll ─────────────────────────────────────────
export function Story() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current!;
    const lines = el.querySelectorAll<HTMLElement>("[data-line]");
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top top", end: "+=220%", scrub: 0.8, pin: el.querySelector("[data-pin]") } });
      lines.forEach((l, i) => {
        if (i > 0) tl.fromTo(l, { yPercent: 60, opacity: 0, filter: "blur(10px)" }, { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 1 }, i * 1.2);
        if (i < lines.length - 1) tl.to(l, { yPercent: -60, opacity: 0, filter: "blur(10px)", duration: 1 }, i * 1.2 + 0.9);
      });
      tl.fromTo(el.querySelector("[data-progress]"), { scaleX: 0 }, { scaleX: 1, ease: "none", duration: lines.length * 1.2 }, 0);
    }, el);
    return () => ctx.revert();
  }, []);
  const lines: [string, string][] = [
    ["One launch video took", "ten hours."],
    ["The next one would take", "ten more."],
    ["Unless the pieces", "already exist."],
    ["So we built them once,", "for every post after."],
  ];
  return (
    <section ref={root} className="relative bg-ink text-cream">
      <div data-pin className="relative flex h-screen flex-col justify-center overflow-hidden px-4 md:px-8">
        <div className="relative mx-auto grid w-full max-w-[1200px]">
          {lines.map(([a, b], i) => (
            <h2 key={i} data-line className="headline col-start-1 row-start-1 text-center text-[clamp(40px,7.5vw,112px)]" style={{ opacity: i === 0 ? 1 : 0 }}>
              {a} <em className="text-cream/90">{b}</em>
            </h2>
          ))}
        </div>
        <div aria-hidden className="absolute inset-x-4 bottom-10 md:inset-x-8">
          <div className="relative h-3">
            {Array.from({ length: 41 }, (_, i) => (
              <span key={i} className="absolute bottom-0 w-px bg-cream" style={{ left: `${(i / 40) * 100}%`, height: i % 10 ? 4 : 10, opacity: i % 10 ? 0.15 : 0.35 }} />
            ))}
          </div>
          <div className="h-px bg-cream/15">
            <div data-progress className="h-[1.5px] origin-left bg-tally" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 2. The hierarchy ───────────────────────────────────────────────────────
export function Hierarchy() {
  const elements = COMPONENTS.filter((c) => c.group === "elements").length;
  const scenes = COMPONENTS.filter((c) => c.group === "scenes").length;
  const levels = [
    { n: "01", name: "Primitives", count: "11 easings · 5 springs · 3D camera · light · 24 sounds", body: "The physics: AE-style speed ramps, springs with real overshoot, a perspective camera, soft light, film grain and procedural sound. Shared by everything above.", eg: ["E.ramp", "SPRING.pop", "camera.orbit", "stage('spot')", "impact.sub"] },
    { n: "02", name: "Elements", count: `${elements} components`, body: "Kinetic type, reveals, counters, devices, carousels, overlays, transitions. Each one a prop-driven block with its own sound design.", eg: CATEGORIES.filter((c) => c.group === "elements").slice(0, 6).map((c) => c.name) },
    { n: "03", name: "Scenes", count: `${scenes} components`, body: "Complete beats you can post as they are: hooks, reveals, proof, lists, end cards. Built from elements, tuned to a story moment.", eg: CATEGORIES.filter((c) => c.group === "scenes").slice(0, 6).map((c) => c.name) },
    { n: "04", name: "Posts", count: `${TRANSITION_IDS.length} transitions · music · 4 formats`, body: "A post is a short JSON spec: scenes in order, transitions between them, your music under it. Change a value, get a new video.", eg: ["hook → reveal → proof → cta", "posts/*.json", "pnpm render"] },
  ];
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-28 md:px-8 md:py-36">
      <div className="mb-14 grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
        <div data-reveal>
          <h2 className="headline text-[clamp(40px,5.5vw,80px)]">
            Four shelves. <em>Everything</em> has a place.
          </h2>
        </div>
        <p data-reveal className="lede max-w-xl md:justify-self-end">
          Like a component library for the web, but for motion. Small pieces compose into bigger ones, and every level is browsable, editable and exportable on its own.
        </p>
      </div>
      <div className="grid gap-px overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--line)] md:grid-cols-4">
        {levels.map((l) => (
          <div key={l.n} data-reveal className="group relative flex min-h-[380px] flex-col bg-cream p-7 transition-colors duration-500 hover:bg-ink hover:text-cream">
            <div className="flex items-start justify-between gap-4">
              <span className="font-serif text-[30px] italic leading-none opacity-60">{l.n}</span>
              <span className="max-w-[60%] pt-1 text-right text-[11px] font-semibold leading-snug opacity-60">{l.count}</span>
            </div>
            <h3 className="mt-14 text-[40px] font-bold tracking-[-0.05em]">{l.name}</h3>
            <p className="mt-3 text-[14px] leading-relaxed opacity-70">{l.body}</p>
            <div className="mt-auto flex flex-wrap gap-1.5 pt-8">
              {l.eg.map((e) => (
                <span key={e} className="rounded-full border border-current/15 px-2.5 py-1 font-mono text-[10.5px] opacity-70">
                  {e}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 3. One component, four ways (interactive) ──────────────────────────────
export function Demo() {
  const comp = componentById("focus-pull") as Component;
  const [props, setProps] = useState<Props>(() => defaultProps(comp));
  const [tab, setTab] = useState<"customize" | "prompt">("customize");
  const prompt = useMemo(() => (tab === "prompt" ? buildPrompt(comp, props, "vertical", 60, { siteUrl: siteUrl(), includeSource: false }) : ""), [tab, comp, props]);
  const set = (k: string, v: unknown) => setProps((p) => ({ ...p, [k]: v }));
  return (
    <section className="border-y border-[var(--line)] bg-sand-2/60">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-28 md:px-8 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <h2 data-reveal className="headline text-[clamp(40px,5vw,72px)]">
            Change it here. <em>Export it here.</em>
          </h2>
          <p data-reveal className="lede mt-5 max-w-lg">
            Words, colours, light, speed, media and sound are all controls. The preview is the render: what you see is frame for frame what downloads. Try it.
          </p>
          <div data-reveal className="card mt-8 max-w-lg space-y-4 p-5">
            <div className="seg">
              <button aria-pressed={tab === "customize"} onClick={() => setTab("customize")}>
                Customize
              </button>
              <button aria-pressed={tab === "prompt"} onClick={() => setTab("prompt")}>
                Prompt
              </button>
            </div>
            {tab === "customize" ? (
              <div className="space-y-4">
                <div>
                  <div className="label mb-1.5">Headline</div>
                  <textarea className="field" rows={2} value={props.headline as string} onChange={(e) => set("headline", e.target.value)} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="seg">
                    {["light", "dark"].map((m) => (
                      <button key={m} aria-pressed={props.mode === m} onClick={() => set("mode", m)} className="capitalize">
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className="seg">
                    {[0.75, 1, 1.5].map((s) => (
                      <button key={s} aria-pressed={props.speed === s} onClick={() => set("speed", s)}>
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
                <TLink href="/c/focus-pull/" label="Focus Pull" className="btn btn-ink w-full">
                  Open the full studio
                </TLink>
              </div>
            ) : (
              <CodeBlock code={prompt} lang="md" maxH="300px" className="!text-[11px]" />
            )}
          </div>
        </div>
        <div data-reveal className="mx-auto w-full max-w-[380px]">
          <PlayerCanvas comp={comp} props={props} format="vertical" autoplay muted loop maxScale={0.7} className="shadow-[var(--shadow-deep)]" rounded={26} />
        </div>
      </div>
    </section>
  );
}

// ── 4. Deterministic by design ─────────────────────────────────────────────
export function Deterministic() {
  const cards = [
    { I: IcFrames, k: "Same spec, same frames", v: "Every component is a pure function of time and props. No randomness that isn't seeded, no timers, no network at render time." },
    { I: IcPrompt, k: "Any model, same result", v: "A prompt carries the exact spec, the allowed values and the render command. A small model copies it as well as a big one; nothing is left to taste." },
    { I: IcDial, k: "Zero tokens to tweak", v: "New words, colours or media are prop edits in the browser or in JSON. The model is only needed when the library truly lacks a piece." },
  ];
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-28 md:px-8 md:py-36">
      <div data-reveal className="mx-auto max-w-4xl text-center">
        <h2 className="headline text-[clamp(40px,6vw,92px)]">
          The prompt carries the code. <em>The model only copies.</em>
        </h2>
      </div>
      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.k} data-reveal className="card group p-7">
            <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-[var(--line)] bg-sand-2 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-rotate-8 group-hover:scale-105">
              <c.I width={24} height={24} />
            </span>
            <h3 className="mt-10 text-[24px] font-bold tracking-[-0.035em]">{c.k}</h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-mute">{c.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 5. Sound ───────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
export async function playSound(id: string) {
  audioCtx ??= new AudioContext();
  if (audioCtx.state === "suspended") await audioCtx.resume();
  const buf = await cueBuffer({ at: 0, sound: id, len: 1.6 });
  if (!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const g = audioCtx.createGain();
  g.gain.value = 0.8;
  src.connect(g).connect(audioCtx.destination);
  src.start();
}

export function SoundSection() {
  const [playing, setPlaying] = useState("");
  const picks = ["whoosh.air", "whoosh.whip", "impact.sub", "impact.punch", "riser.build", "tonal.shimmer", "tonal.chime", "ui.click", "foley.key", "foley.shutter", "fx.glitch", "impact.trailer"];
  return (
    <section className="bg-ink text-cream">
      <div className="mx-auto grid max-w-[1440px] gap-14 px-4 py-28 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <h2 data-reveal className="headline text-[clamp(40px,5vw,76px)]">
            Sound is half <em>the picture.</em>
          </h2>
          <p data-reveal className="mt-5 max-w-lg text-[17px] leading-relaxed text-cream/60">
            Every move has its sound, timed to the frame: a riser ends exactly on the hit, a whoosh peaks with the camera. All {SYNTH_SOUNDS.length} sounds are designed in code, so they stretch to fit and carry no licence strings. Exports are mixed to -14 LUFS for every platform.
          </p>
          <TLink href="/sounds/" label="Sounds" className="btn mt-8 border border-cream/25 text-cream hover:bg-cream hover:text-ink" data-reveal>
            Explore the sound library
          </TLink>
        </div>
        <div data-reveal className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {picks.map((id) => {
            const s = SYNTH_SOUNDS.find((x) => x.id === id)!;
            return (
              <button
                key={id}
                onClick={async () => {
                  setPlaying(id);
                  await playSound(id);
                  setTimeout(() => setPlaying((p) => (p === id ? "" : p)), 900);
                }}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-colors duration-300 ${playing === id ? "border-cream bg-cream text-ink" : "border-cream/15 hover:border-cream/50"}`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${playing === id ? "bg-tally text-cream" : "bg-cream/10 group-hover:bg-cream/20"}`}>
                  <IcPlay width={15} height={15} />
                </span>
                <span>
                  <span className="block text-[14px] font-bold tracking-[-0.01em]">{s.name}</span>
                  <span className={`block text-[11.5px] ${playing === id ? "text-ink/60" : "text-cream/45"}`}>{SOUND_CATEGORIES.find((c) => c.id === s.category)?.name}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── 6. Featured + CTA ──────────────────────────────────────────────────────
export function Featured() {
  const list = COMPONENTS.filter((c) => c.featured).slice(0, 8);
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-28 md:px-8">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div data-reveal>
          <h2 className="headline text-[clamp(40px,5vw,72px)]">
            Hover to play. <em>Click to make it yours.</em>
          </h2>
        </div>
        <TLink href="/library/" label="Library" className="btn btn-line" data-reveal>
          See all {COMPONENTS.length}
        </TLink>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {list.map((c, i) => (
          <ComponentCard key={c.id} comp={c} index={i} />
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-2">
        {GROUPS.flatMap((g) => CATEGORIES.filter((c) => c.group === g.id)).map((c) => (
          <TLink key={c.id} href={`/library/${c.id}/`} label={c.name} className="chip !h-9 !px-4 !text-[13px] hover:!border-ink hover:!text-ink">
            {c.name}
          </TLink>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current!;
    const ctx = gsap.context(() => {
      gsap.fromTo(el.querySelector("[data-big]"), { scale: 0.86, opacity: 0.2 }, { scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: el, start: "top 90%", end: "center 60%", scrub: 0.6 } });
    }, el);
    return () => ctx.revert();
  }, []);
  void ScrollTrigger;
  return (
    <section ref={root} className="mx-auto max-w-[1440px] px-4 pb-32 pt-10 md:px-8">
      <div data-big className="relative overflow-hidden rounded-[36px] bg-ink px-6 py-24 text-center text-cream md:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-x-8 bottom-8 h-3 md:inset-x-14">
          {Array.from({ length: 61 }, (_, i) => (
            <span key={i} className="absolute bottom-0 w-px bg-cream" style={{ left: `${(i / 60) * 100}%`, height: i % 10 ? 4 : 10, opacity: i % 10 ? 0.12 : 0.3 }} />
          ))}
          <span className="absolute -bottom-0.5 left-[62%] h-4 w-[1.5px] bg-tally" />
        </div>
        <h2 className="headline relative text-[clamp(44px,7vw,112px)]">
          Make the next one <em>in minutes.</em>
        </h2>
        <p className="relative mx-auto mt-5 max-w-xl text-[17px] text-cream/60">Open a component, change three values, download. That's the whole workflow.</p>
        <div className="relative mt-10 flex flex-wrap justify-center gap-3">
          <TLink href="/library/" label="Library" className="btn btn-lg bg-cream text-ink hover:bg-white">
            Browse the library
          </TLink>
          <TLink href="/docs/" label="Docs" className="btn btn-lg border border-cream/25 text-cream hover:bg-cream/10">
            Read the docs
          </TLink>
        </div>
      </div>
    </section>
  );
}
