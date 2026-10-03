"use client";

// Waveform player (wavesurfer.js). With `region`, a fixed-length window can be dragged along the track:
// Compose uses it to pick which part of a song plays under the post.

import { useEffect, useRef, useState } from "react";
import type WaveSurfer from "wavesurfer.js";
import type { Region } from "wavesurfer.js/plugins/regions";

const url = (src: string) => (/^(blob:|data:|https?:|\/)/.test(src) ? src : `/${src}`);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Waveform({ src, height = 56, region, onRegion }: { src: string; height?: number; region?: { start: number; length: number }; onRegion?: (start: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const ws = useRef<WaveSurfer | null>(null);
  const reg = useRef<Region | null>(null);
  const cb = useRef(onRegion);
  cb.current = onRegion;
  const want = useRef(region);
  want.current = region;
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    let dead = false;
    setReady(false);
    void (async () => {
      const [{ default: WS }, { default: Regions }] = await Promise.all([import("wavesurfer.js"), import("wavesurfer.js/plugins/regions")]);
      if (dead || !box.current) return;
      const w = WS.create({
        container: box.current,
        url: url(src),
        height,
        waveColor: "rgba(26,26,26,0.22)",
        progressColor: "#1A1A1A",
        cursorColor: "#E5484D",
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1.5,
        barRadius: 2,
        normalize: true,
        dragToSeek: true,
      });
      ws.current = w;
      const regions = w.registerPlugin(Regions.create());
      w.on("ready", (d) => {
        setDur(d);
        setReady(true);
        const r = want.current;
        if (r) {
          const start = Math.max(0, Math.min(r.start, Math.max(0, d - r.length)));
          reg.current = regions.addRegion({ start, end: Math.min(d, start + r.length), drag: true, resize: false, color: "rgba(229,72,77,0.14)" });
          w.setTime(start);
          reg.current.on("update-end", () => {
            const s = reg.current!.start;
            w.setTime(s);
            cb.current?.(Math.round(s * 10) / 10);
          });
        }
      });
      w.on("timeupdate", setTime);
      w.on("play", () => setPlaying(true));
      w.on("pause", () => setPlaying(false));
      w.on("finish", () => setPlaying(false));
    })();
    return () => {
      dead = true;
      ws.current?.destroy();
      ws.current = null;
      reg.current = null;
    };
  }, [src, height]);

  // Keep the window in step with the post's length and with edits made elsewhere (the slider).
  useEffect(() => {
    const r = reg.current;
    if (!r || !region || !dur) return;
    const start = Math.max(0, Math.min(region.start, Math.max(0, dur - region.length)));
    if (Math.abs(r.start - start) > 0.05 || Math.abs(r.end - r.start - region.length) > 0.05) r.setOptions({ start, end: Math.min(dur, start + region.length) });
  }, [region, dur]);

  const toggle = () => {
    const w = ws.current;
    if (!w) return;
    if (w.isPlaying()) return w.pause();
    if (reg.current) reg.current.play(true);
    else void w.play();
  };

  return (
    <div className="flex items-center gap-3">
      <button onClick={toggle} disabled={!ready} aria-label={playing ? "Pause" : "Play"} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-cream transition-transform active:scale-95 disabled:opacity-40">
        {playing ? (
          <svg width="11" height="11" viewBox="0 0 12 12"><rect x="2" y="1" width="3" height="10" rx="1" fill="currentColor" /><rect x="7" y="1" width="3" height="10" rx="1" fill="currentColor" /></svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /></svg>
        )}
      </button>
      <div className="relative min-w-0 flex-1">
        <div ref={box} className={ready ? "" : "opacity-0"} style={{ minHeight: height }} />
        {!ready && <div className="absolute inset-0 grid place-items-center text-[11px] text-mute">Loading waveform…</div>}
      </div>
      <span className="w-[74px] shrink-0 text-right font-mono text-[10.5px] tabular-nums text-mute">
        {mmss(time)} / {mmss(dur)}
      </span>
    </div>
  );
}
