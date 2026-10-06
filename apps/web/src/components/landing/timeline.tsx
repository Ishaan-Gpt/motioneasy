"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export interface TimelineHandle {
  /** Move the playhead and timecode without re-rendering React. */
  set: (time: number) => void;
}

/** SS:FF at the given fps, the way an editor reads it. */
export function timecode(t: number, fps = 60) {
  const s = Math.max(0, t);
  const f = Math.floor((s % 1) * fps + 1e-6);
  return `${String(Math.floor(s)).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

/** A ruler with the component's real sound cues as keyframe diamonds and a playhead. */
export const Timeline = forwardRef<TimelineHandle, { duration: number; cues: { at: number; label: string }[]; dark?: boolean; className?: string }>(
  function Timeline({ duration, cues, dark = false, className = "" }, ref) {
    const head = useRef<HTMLDivElement>(null);
    const tc = useRef<HTMLSpanElement>(null);
    const dur = Math.max(0.01, duration);
    useImperativeHandle(ref, () => ({
      set: (t) => {
        const pct = Math.min(1, Math.max(0, t / dur)) * 100;
        if (head.current) head.current.style.left = `${pct}%`;
        if (tc.current) tc.current.textContent = timecode(t);
      },
    }), [dur]);
    const ticks = Math.floor(dur * 4);
    return (
      <div className={`${dark ? "text-cream" : "text-ink"} ${className}`}>
        <div className="mb-2 flex items-baseline justify-between font-mono text-[11px] tabular-nums">
          <span ref={tc} className="text-[13px] font-semibold">00:00</span>
          <span className="opacity-50">{timecode(dur)}</span>
        </div>
        <div className="relative h-9">
          <div className="absolute inset-x-0 top-0 h-3">
            {Array.from({ length: ticks + 1 }, (_, i) => (
              <span key={i} className="absolute top-0 w-px bg-current" style={{ left: `${((i / 4) / dur) * 100}%`, height: i % 4 ? 5 : 11, opacity: i % 4 ? 0.2 : 0.45 }} />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-3 h-px bg-current opacity-15" />
          {cues.map((c, i) => (
            <span
              key={i}
              title={c.label}
              className="absolute bottom-[9px] h-[9px] w-[9px] -translate-x-1/2 rotate-45 rounded-[1.5px] border border-current bg-[var(--tl-bg)]"
              style={{ left: `${(c.at / dur) * 100}%`, ["--tl-bg" as string]: dark ? "var(--color-ink)" : "var(--color-cream)" }}
            />
          ))}
          <div ref={head} className="absolute -top-1 bottom-0 w-0" style={{ left: "0%" }}>
            <span className="absolute -left-[5px] -top-0.5 h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-tally" />
            <span className="absolute left-[-0.75px] top-0 h-full w-[1.5px] bg-tally" />
          </div>
        </div>
      </div>
    );
  },
);
