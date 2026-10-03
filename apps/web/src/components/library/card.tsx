"use client";

import { defaultProps, durationOf, type Component } from "@motioneasy/engine";
import { categoryById } from "@motioneasy/library";
import { useEffect, useMemo, useRef, useState } from "react";
import previews from "@/generated/previews.json";
import { PlayerCanvas } from "@/components/player/player-canvas";
import { TLink } from "@/components/site/motion";
import type { Player } from "@motioneasy/engine";

const PREVIEWS = previews as Record<string, { video: string; poster: string }>;

/** Library card: pre-rendered loop if available, else the live engine (poster frame, plays on hover). */
export function ComponentCard({ comp, index = 0 }: { comp: Component; index?: number }) {
  const pre = PREVIEWS[comp.id];
  const ref = useRef<HTMLAnchorElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const props = useMemo(() => defaultProps(comp), [comp]);
  const dur = useMemo(() => durationOf(comp, props), [comp, props]);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "200px" });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (pre) {
      const v = video.current;
      if (!v) return;
      if (hover) {
        v.currentTime = 0;
        void v.play().catch(() => undefined);
      } else v.pause();
      return;
    }
    if (!player) return;
    if (hover) {
      player.seek(0);
      player.play();
    } else {
      player.pause();
      player.seek(dur * (comp.poster ?? 0.5));
    }
  }, [hover, player, pre, dur, comp.poster]);

  return (
    <TLink
      ref={ref}
      href={`/c/${comp.id}/`}
      label={comp.name}
      className="group block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      data-reveal
      style={{ transitionDelay: `${(index % 4) * 40}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] border border-[var(--line)] bg-sand-2 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-deep)]">
        {pre ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pre.poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            <video ref={video} src={visible ? pre.video : undefined} muted loop playsInline preload="none" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${hover ? "opacity-100" : "opacity-0"}`} />
          </>
        ) : visible ? (
          <PlayerCanvas comp={comp} props={props} format="portrait" muted startAt="poster" maxScale={0.5} rounded={0} className="absolute inset-0 !h-full !w-full" onPlayer={setPlayer} />
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="rounded-full bg-cream/90 px-2.5 py-1 text-[11px] font-bold backdrop-blur">{dur.toFixed(1)}s</span>
          <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-cream">Open →</span>
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold tracking-[-0.02em]">{comp.name}</div>
          <div className="truncate text-[12.5px] text-mute">{categoryById(comp.category)?.name}</div>
        </div>
        {comp.featured && <span className="chip shrink-0">Featured</span>}
      </div>
    </TLink>
  );
}
