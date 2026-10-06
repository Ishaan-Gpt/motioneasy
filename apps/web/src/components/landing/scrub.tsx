"use client";

import { cuesOf, defaultProps, durationOf, soundInfo, type Component, type Player, type Props } from "@motioneasy/engine";
import { COMPONENTS, componentById } from "@motioneasy/library";
import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlayerCanvas } from "@/components/player/player-canvas";
import { Timeline, timecode, type TimelineHandle } from "./timeline";

// Scroll is the playhead: on desktop the section pins and scroll position drives c.t of a real component.
// On small screens (and for keyboards) the same control is a scrub slider.
export function Scrub() {
  const comp = componentById("big-number") as Component;
  const props = useMemo<Props>(() => ({ ...defaultProps(comp), value: COMPONENTS.length, suffix: "components", label: "in the library today, every one scrubbable", count: 2.8, size: 0.72 }), [comp]);
  const duration = durationOf(comp, props);
  const cues = useMemo(() => cuesOf(comp, props, "vertical").map((c) => ({ at: c.at, label: soundInfo(c.sound)?.name ?? c.sound })).filter((c, i, a) => !i || c.at - a[i - 1].at > 0.12), [comp, props]);
  const root = useRef<HTMLElement>(null);
  const player = useRef<Player | null>(null);
  const tl = useRef<TimelineHandle>(null);
  const frame = useRef<HTMLSpanElement>(null);
  const [t, setT] = useState(0);

  const show = (time: number) => {
    player.current?.seek(time);
    tl.current?.set(time);
    if (frame.current) frame.current.textContent = String(Math.round(time * 60)).padStart(3, "0");
  };
  const showRef = useRef(show);
  showRef.current = show;

  useEffect(() => {
    const el = root.current!;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const st = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.4, onUpdate: (s) => setT(s.progress * duration) },
      });
      return () => st.kill();
    });
    return () => mm.revert();
  }, [duration]);

  useEffect(() => showRef.current(t), [t]);

  return (
    <section ref={root} className="relative border-y border-[var(--line)] bg-paper lg:h-[320vh]">
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-4 py-24 md:px-8 lg:sticky lg:top-0 lg:h-[100svh] lg:grid-cols-[1.1fr_0.9fr] lg:py-0">
        <div>
          <h2 data-reveal className="headline text-[clamp(40px,5.5vw,84px)]">
            Scroll is the playhead. <em>Every frame holds still.</em>
          </h2>
          <p data-reveal className="lede mt-6 max-w-lg">
            A component is a pure function of time and props. Scroll forward and back: frame 120 is frame 120, in this preview, in the site export and in the CLI render. That&apos;s why a prompt can reproduce it exactly.
          </p>
          <div data-reveal className="mt-10 max-w-lg">
            <div className="flex items-end gap-6">
              <div>
                <div className="font-mono text-[11px] text-mute">frame</div>
                <span ref={frame} className="font-serif text-[72px] leading-none tabular-nums tracking-[-0.02em]">000</span>
              </div>
              <div className="pb-2 font-mono text-[13px] tabular-nums text-mute">
                {timecode(t)} <span className="opacity-60">/ {timecode(duration)} · 60 fps</span>
              </div>
            </div>
          </div>
        </div>
        <div data-reveal className="mx-auto w-full max-w-[360px]">
          <div className="rounded-[30px] border border-[var(--line)] bg-cream p-3 shadow-[var(--shadow-deep)]">
            <div className="overflow-hidden rounded-[20px]">
              <PlayerCanvas comp={comp} props={props} format="vertical" muted loop={false} rounded={20} maxScale={0.7} onPlayer={(p) => (player.current = p)} />
            </div>
            <Timeline ref={tl} duration={duration} cues={cues} className="px-1.5 pb-1 pt-4" />
            <label className="mt-1 block border-t border-[var(--line)] px-1.5 pb-1 pt-3 lg:hidden">
              <span className="label mb-2 block">Drag to scrub</span>
              <input type="range" className="slider" min={0} max={duration} step={1 / 60} value={t} onChange={(e) => setT(Number(e.target.value))} style={{ ["--fill" as string]: `${(t / duration) * 100}%` }} />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
