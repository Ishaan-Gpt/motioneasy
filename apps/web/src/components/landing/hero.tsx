"use client";

import { defaultProps, type Component, type Props } from "@motioneasy/engine";
import { COMPONENTS, componentById } from "@motioneasy/library";
import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlayerCanvas, type PlayerState } from "@/components/player/player-canvas";
import { TLink, useAfterLoad } from "@/components/site/motion";

const SHOWREEL = ["beat-slam", "coverflow-3d", "focus-pull", "big-number"];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const [hook, setHook] = useState("Stop timing *captions.*");
  const [idx, setIdx] = useState(0);
  const comp = (componentById(SHOWREEL[idx % SHOWREEL.length]) ?? COMPONENTS[0]) as Component;
  const props = useMemo<Props>(() => {
    const p = defaultProps(comp);
    if (comp.id === "beat-slam") p.text = hook || "Your *hook* here";
    return p;
  }, [comp, hook]);
  const last = useRef({ t: 0, id: "" });
  const onState = (s: PlayerState) => {
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
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.fromTo(el.querySelectorAll("[data-word]"), { yPercent: 110 }, { yPercent: 0, duration: 1.3, stagger: 0.07 })
      .fromTo(el.querySelectorAll("[data-fade]"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.35)
      .fromTo(el.querySelector("[data-stage]"), { clipPath: "inset(12% 8% 12% 8% round 40px)", scale: 0.94 }, { clipPath: "inset(0% 0% 0% 0% round 28px)", scale: 1, duration: 1.6 }, 0.15)
      .fromTo(el.querySelectorAll("[data-float]"), { opacity: 0, y: 30, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 1.2, stagger: 0.12 }, 0.8);
    // Light pools follow the pointer, gently.
    const move = (e: PointerEvent) => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      gsap.to(el.querySelectorAll("[data-light]"), { x: (i) => x * (i ? -60 : 80), y: (i) => y * (i ? -40 : 50), duration: 1.6, ease: "power3.out" });
    };
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      tl.kill();
    };
  });

  const words: [string, boolean][] = [["Motion,", false], ["ready", true], ["to", true], ["post.", true]];
  return (
    <section ref={root} className="relative overflow-hidden">
      <div data-light className="pointer-events-none absolute -left-40 -top-40 h-[620px] w-[620px] rounded-full opacity-70 blur-3xl" style={{ background: "radial-gradient(circle, rgba(240,215,255,.55), transparent 65%)" }} />
      <div data-light className="pointer-events-none absolute -right-48 top-40 h-[680px] w-[680px] rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, rgba(255,217,168,.5), transparent 65%)" }} />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-4 pb-20 pt-10 md:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:pb-28 lg:pt-16">
        <div>
          <div data-fade className="eyebrow mb-6 flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" /> A motion library for social video
          </div>
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
            <TLink href="/library/" label="Library" className="btn btn-ink btn-lg">
              Browse the library
            </TLink>
            <TLink href="/compose/" label="Compose" className="btn btn-line btn-lg">
              Compose a post
            </TLink>
          </div>
          <dl data-fade className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-[var(--line)] pt-6">
            {[
              [String(COMPONENTS.length), "components"],
              ["4", "formats each"],
              ["0", "tokens per edit"],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="text-[34px] font-bold tracking-[-0.05em]">{n}</dt>
                <dd className="text-[13px] text-mute">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-[420px]">
          <div data-stage className="relative overflow-hidden rounded-[28px] shadow-[0_50px_120px_-40px_rgba(26,26,26,.55)]">
            <PlayerCanvas comp={comp} props={props} format="vertical" autoplay muted loop rounded={28} onState={onState} maxScale={0.75} />
          </div>
          <div data-float className="card absolute -left-6 top-10 hidden w-[250px] p-3 sm:block lg:-left-24">
            <label htmlFor="hook" className="eyebrow mb-1.5 block">
              Type your hook · live
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
            <p className="help mt-1.5">Wrap a word in *asterisks* for the serif accent.</p>
          </div>
          <div data-float className="card absolute -right-4 bottom-12 hidden items-center gap-2.5 px-3.5 py-2.5 sm:flex lg:-right-10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink/40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ink" />
            </span>
            <div>
              <div className="text-[13px] font-bold tracking-[-0.01em]">{comp.name}</div>
              <div className="text-[11px] text-mute">Rendering live in your browser</div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
          <span key={i} className={`text-[clamp(28px,4vw,52px)] tracking-[-0.04em] ${i % 3 === 1 ? "accent" : "font-bold"} ${i % 2 ? "text-ink/30" : ""}`}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
