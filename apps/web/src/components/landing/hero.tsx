"use client";

import { cuesOf, defaultProps, durationOf, soundInfo, type Component, type Props } from "@motioneasy/engine";
import { COMPONENTS, componentById } from "@motioneasy/library";
import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlayerCanvas, type PlayerState } from "@/components/player/player-canvas";
import { TLink, useAfterLoad } from "@/components/site/motion";
import { IcArrow, IcKey } from "./glyphs";
import { Timeline, type TimelineHandle } from "./timeline";

const SHOWREEL = ["beat-slam", "coverflow-3d", "focus-pull", "big-number"];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const tl = useRef<TimelineHandle>(null);
  const [hook, setHook] = useState("Stop timing *captions.*");
  const [idx, setIdx] = useState(0);
  const comp = (componentById(SHOWREEL[idx % SHOWREEL.length]) ?? COMPONENTS[0]) as Component;
  const props = useMemo<Props>(() => {
    const p = defaultProps(comp);
    if (comp.id === "beat-slam") p.text = hook || "Your *hook* here";
    return p;
  }, [comp, hook]);
  const cues = useMemo(() => cuesOf(comp, props, "vertical").map((c) => ({ at: c.at, label: soundInfo(c.sound)?.name ?? c.sound })), [comp, props]);
  const duration = durationOf(comp, props);
  const last = useRef({ t: 0, id: "" });
  const onState = (s: PlayerState) => {
    tl.current?.set(s.time);
    // Advance the showreel when a component finishes a loop (unless the visitor is typing a hook).
    if (last.current.id !== comp.id) {
      last.current = { t: s.time, id: comp.id };
      return;
    }
    if (s.duration && s.time < last.current.t - 0.5 && document.activeElement?.id !== "hook") setIdx((i) => i + 1);
    last.current.t = s.time;
  };

  useAfterLoad(() => {
    const el = root.current!;
    const t = gsap.timeline({ defaults: { ease: "expo.out" } });
    t.fromTo(el.querySelectorAll("[data-word]"), { yPercent: 110 }, { yPercent: 0, duration: 1.3, stagger: 0.07 })
      .fromTo(el.querySelectorAll("[data-fade]"), { opacity: 0, y: 18, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.1, stagger: 0.08 }, 0.35)
      .fromTo(el.querySelector("[data-stage]"), { clipPath: "inset(12% 8% 12% 8% round 40px)", scale: 0.94 }, { clipPath: "inset(0% 0% 0% 0% round 30px)", scale: 1, duration: 1.6 }, 0.15)
      .fromTo(el.querySelector("[data-sweep]"), { scaleX: 0 }, { scaleX: 1, duration: 1.8, ease: "power3.inOut" }, 0.2);
    return () => void t.kill();
  });

  const words: [string, boolean][] = [["Motion,", false], ["ready", true], ["to", true], ["post.", true]];
  return (
    <section ref={root} className="relative overflow-hidden">
      <Ruler />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-14 px-4 pb-20 pt-10 md:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:pb-28 lg:pt-20">
        <div>
          <h1 className="display text-[clamp(56px,9vw,140px)]">
            {words.map(([w, em], i) => (
              <span key={i} className="mr-[0.18em] inline-block overflow-hidden pb-[0.08em] align-bottom">
                <span data-word className={`inline-block ${em ? "accent font-normal tracking-[-0.02em]" : ""}`}>
                  {w}
                </span>
              </span>
            ))}
          </h1>
          <p data-fade className="lede mt-7 max-w-xl">
            Cinematic, deterministic motion components for Reels, Shorts and TikToks. Pick one, drop in your words and media, export an MP4 right here. Or copy its prompt: any model reproduces it exactly.
          </p>
          <div data-fade className="mt-9 flex flex-wrap gap-3">
            <TLink href="/library/" label="Library" className="btn btn-ink btn-lg group">
              Browse the library
              <IcArrow width={18} height={18} className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
            </TLink>
            <TLink href="/compose/" label="Compose" className="btn btn-line btn-lg">
              Compose a post
            </TLink>
          </div>
          <dl data-fade className="mt-14 grid max-w-lg grid-cols-3 gap-6">
            {[
              [String(COMPONENTS.length), "components"],
              ["4", "formats each"],
              ["0", "tokens per edit"],
            ].map(([n, l]) => (
              <div key={l} className="border-l border-[var(--line-strong)] pl-4">
                <dt className="font-serif text-[52px] leading-none tabular-nums tracking-[-0.02em]">{n}</dt>
                <dd className="mt-2 text-[13px] text-mute">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-[360px]">
          <div data-stage className="relative overflow-hidden rounded-[30px] border border-[var(--line)] bg-paper p-3 shadow-[var(--shadow-deep)]">
            <div className="mb-3 flex items-center justify-between px-1.5 pt-0.5 text-[12px]">
              <span className="flex items-center gap-2 font-semibold tracking-[-0.01em]">
                <span className="h-2 w-2 rounded-full bg-tally" />
                {comp.name}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-mute">1080×1920 · 60</span>
            </div>
            <div className="overflow-hidden rounded-[20px]">
              <PlayerCanvas comp={comp} props={props} format="vertical" autoplay muted loop rounded={20} onState={onState} maxScale={0.75} />
            </div>
            <Timeline ref={tl} duration={duration} cues={cues} className="px-1.5 pt-4" />
            <div className="mt-2 border-t border-[var(--line)] px-1.5 pb-1 pt-3">
              <label htmlFor="hook" className="label mb-1.5 flex items-baseline justify-between gap-3">
                Type your hook
                <span className="help font-normal">
                  <span className="font-mono">*word*</span> sets the <em>serif</em>
                </span>
              </label>
              <input
                id="hook"
                className="field !text-[15px] font-semibold"
                value={hook}
                maxLength={48}
                onFocus={() => setIdx(0)}
                onChange={(e) => {
                  setHook(e.target.value);
                  setIdx(0);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A timecode ruler along the top of the page, swept in on load. */
function Ruler() {
  return (
    <div aria-hidden className="mx-auto max-w-[1440px] px-4 pt-6 md:px-8">
      <div data-sweep className="relative h-6 origin-left">
        {Array.from({ length: 61 }, (_, i) => (
          <span key={i} className="absolute bottom-0 w-px bg-ink" style={{ left: `${(i / 60) * 100}%`, height: i % 10 ? 5 : 12, opacity: i % 10 ? 0.15 : 0.35 }} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="absolute -top-1 hidden -translate-x-1/2 font-mono text-[10px] tabular-nums text-faint md:block" style={{ left: `${(i / 6) * 100}%` }}>
            {i === 6 ? "01:00" : `00:${String(i * 10).padStart(2, "0")}`}
          </span>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-px bg-ink/15" />
      </div>
    </div>
  );
}

export function Marquee({ items, speed = 40 }: { items: string[]; speed?: number }) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = track.current!;
    const w = el.scrollWidth / 2;
    const tween = gsap.fromTo(el, { x: 0 }, { x: -w, duration: w / speed, ease: "none", repeat: -1 });
    return () => void tween.kill();
  }, [speed]);
  return (
    <div className="mask-fade-x overflow-hidden border-y border-[var(--line)] py-5">
      <div ref={track} className="flex w-max gap-10 whitespace-nowrap">
        {[...items, ...items].map((t, i) => (
          <span key={i} className={`flex items-center gap-10 text-[clamp(28px,4vw,52px)] tracking-[-0.04em] ${i % 3 === 1 ? "accent" : "font-bold"} ${i % 2 ? "text-ink/30" : ""}`}>
            {t}
            <IcKey width={18} height={18} className="text-tally" />
          </span>
        ))}
      </div>
    </div>
  );
}
