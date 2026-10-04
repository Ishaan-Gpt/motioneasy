"use client";

import { FORMATS, Player, type Component, type FormatId, type Props } from "@motioneasy/engine";
import { useEffect, useRef, useState } from "react";
import { setupEngine } from "@/lib/engine";

export interface PlayerState {
  time: number;
  duration: number;
  playing: boolean;
  ready: boolean;
  muted: boolean;
}

/** A canvas that plays a component live. The box keeps the format's aspect ratio. */
export function PlayerCanvas({
  comp, props, format, autoplay = false, loop = true, muted = false, maxScale = 1, className = "", rounded = 18,
  onPlayer, onState, fps = 60, startAt,
}: {
  comp: Component;
  props: Props;
  format: FormatId;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  maxScale?: number;
  className?: string;
  rounded?: number;
  fps?: number;
  /** Seconds, or "poster" to show the poster frame until played. */
  startAt?: number | "poster";
  onPlayer?: (p: Player | null) => void;
  onState?: (s: PlayerState) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<Player | null>(null);
  const loadedComp = useRef<Component | null>(null);
  const stateCb = useRef(onState);
  stateCb.current = onState;
  const F = FORMATS[format];

  useEffect(() => {
    setupEngine();
    const p = new Player(canvas.current!, { format, fps, loop, muted, maxScale });
    player.current = p;
    onPlayer?.(p);
    const off = p.on((pl) => stateCb.current?.({ time: pl.time, duration: pl.duration, playing: pl.playing, ready: pl.ready, muted: pl.muted }));
    return () => {
      off();
      p.dispose();
      player.current = null;
      loadedComp.current = null;
      onPlayer?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)load when the component changes; otherwise stream prop changes.
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    if (loadedComp.current !== comp) {
      loadedComp.current = comp;
      const dur = (() => {
        try {
          return typeof comp.duration === "function" ? comp.duration(props) : comp.duration;
        } catch {
          return 0;
        }
      })();
      const t = startAt === "poster" ? dur * (comp.poster ?? 0.5) : startAt ?? 0;
      void p.load(comp, props, { format, time: t }).then(() => {
        if (autoplay) p.play();
      });
    } else p.setProps(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comp, props]);

  useEffect(() => {
    if (player.current && player.current.format !== format) player.current.setFormat(format);
  }, [format]);
  useEffect(() => {
    if (player.current) player.current.loop = loop;
  }, [loop]);
  useEffect(() => {
    player.current?.setMuted(muted);
  }, [muted]);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: `${F.w} / ${F.h}`, borderRadius: rounded }}>
      <canvas ref={canvas} className="block h-full w-full" />
    </div>
  );
}

/** Play/pause, scrubber with sound-cue ticks, time readout. */
export function Transport({ player, state, cues }: { player: Player | null; state: PlayerState; cues?: { at: number; label: string }[] }) {
  const bar = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const seekTo = (clientX: number) => {
    if (!player || !bar.current) return;
    const r = bar.current.getBoundingClientRect();
    player.seek(((clientX - r.left) / r.width) * state.duration);
  };
  const pct = state.duration ? (state.time / state.duration) * 100 : 0;
  return (
    <div className="flex w-full items-center gap-3">
      <button
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-cream transition-transform active:scale-95"
        onClick={() => player?.toggle()}
        aria-label={state.playing ? "Pause" : "Play"}
      >
        {state.playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="1" width="3" height="10" rx="1" fill="currentColor" /><rect x="7" y="1" width="3" height="10" rx="1" fill="currentColor" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /></svg>
        )}
      </button>
      <div
        ref={bar}
        className="group relative h-8 flex-1 cursor-pointer touch-none"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setDrag(true);
          player?.pause();
          seekTo(e.clientX);
        }}
        onPointerMove={(e) => drag && seekTo(e.clientX)}
        onPointerUp={() => setDrag(false)}
      >
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-sand" />
        <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-ink" style={{ width: `${pct}%` }} />
        {cues?.map((c, i) => (
          <div
            key={i}
            title={`${c.at.toFixed(2)}s · ${c.label}`}
            className="absolute top-[7px] h-[5px] w-[2px] rounded-full bg-ink/35"
            style={{ left: `${state.duration ? (c.at / state.duration) * 100 : 0}%` }}
          />
        ))}
        <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-ink bg-cream shadow transition-transform group-hover:scale-110" style={{ left: `${pct}%` }} />
      </div>
      <span className="w-[86px] shrink-0 text-right font-mono text-[11px] tabular-nums text-mute">
        {state.time.toFixed(2)} / {state.duration.toFixed(2)}s
      </span>
      <button className="btn btn-ghost btn-sm !px-2" onClick={() => player?.setMuted(!state.muted)} aria-label={state.muted ? "Unmute" : "Mute"}>
        {state.muted ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6h3l4-3v10L5 10H2z" /><path d="M11 6l4 4M15 6l-4 4" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6h3l4-3v10L5 10H2z" /><path d="M11.5 5.5a3.5 3.5 0 010 5M13 3.5a6.5 6.5 0 010 9" /></svg>
        )}
      </button>
    </div>
  );
}
