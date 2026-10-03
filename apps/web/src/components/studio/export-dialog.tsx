"use client";

import { FORMATS, componentFormats, exportVideo, type Component, type FormatId, type Props } from "@motioneasy/engine";
import { useEffect, useRef, useState } from "react";
import { download } from "@/lib/engine";
import type { ExportSettings } from "@/lib/export";

/** Render-to-MP4 dialog: settings, then a progress view with frame count and cancel. */
export function ExportDialog({ open, onClose, comp, props, format, name }: { open: boolean; onClose: () => void; comp: Component; props: Props; format: FormatId; name: string }) {
  const [s, setS] = useState<ExportSettings>({ format, fps: 60, scale: 1, quality: "high", audio: true });
  const [state, setState] = useState<{ phase: string; progress: number; frame?: number; frames?: number } | null>(null);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const t0 = useRef(0);
  useEffect(() => setS((x) => ({ ...x, format })), [format]);
  if (!open) return null;
  const formats = componentFormats(comp);
  const F = FORMATS[s.format];
  const busy = !!state && state.phase !== "done";

  const run = async () => {
    setError("");
    abort.current = new AbortController();
    t0.current = performance.now();
    setState({ phase: "prepare", progress: 0 });
    try {
      const r = await exportVideo({
        comp, props, format: s.format, fps: s.fps, scale: s.scale, quality: s.quality, audio: s.audio,
        signal: abort.current.signal,
        onProgress: (p) => setState({ phase: p.phase, progress: p.progress, frame: p.frame, frames: p.frames }),
      });
      download(r.blob, `${name}-${s.format}-${r.width}x${r.height}.${r.ext}`);
      setState({ phase: "done", progress: 1, frames: r.frames, frame: r.frames });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
      setState(null);
    }
  };

  const secs = (performance.now() - t0.current) / 1000;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={() => !busy && onClose()}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="eyebrow mb-1">Export</div>
            <h3 className="text-xl font-bold tracking-[-0.035em]">Download MP4</h3>
          </div>
          {!busy && (
            <button className="btn btn-line btn-sm" onClick={onClose}>
              Close
            </button>
          )}
        </div>
        {!state || state.phase === "done" ? (
          <div className="space-y-4">
            <Row label="Format">
              <div className="flex flex-wrap gap-1.5">
                {formats.map((f) => (
                  <button key={f} className={`chip !h-8 !px-3 ${s.format === f ? "!border-ink !bg-ink !text-cream" : ""}`} onClick={() => setS({ ...s, format: f })}>
                    {FORMATS[f].ratio} · {FORMATS[f].name}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Frame rate">
              <Seg value={s.fps} options={[[60, "60 fps"], [30, "30 fps"]]} onChange={(v) => setS({ ...s, fps: v as 30 | 60 })} />
            </Row>
            <Row label="Size">
              <Seg value={s.scale} options={[[1, "1080p"], [0.6667, "720p"], [0.5, "540p"]]} onChange={(v) => setS({ ...s, scale: v as 1 })} />
            </Row>
            <Row label="Quality">
              <Seg value={s.quality} options={[["high", "High"], ["balanced", "Balanced"], ["small", "Small"]]} onChange={(v) => setS({ ...s, quality: v as "high" })} />
            </Row>
            <Row label="Sound">
              <Seg value={s.audio ? 1 : 0} options={[[1, "With sound"], [0, "Silent"]]} onChange={(v) => setS({ ...s, audio: v === 1 })} />
            </Row>
            <p className="help">
              {Math.round(F.w * s.scale)}×{Math.round(F.h * s.scale)} · H.264 + AAC · loudness-normalised to -14 LUFS. Rendered in this tab with WebCodecs; nothing is uploaded.
            </p>
            {error && <p className="rounded-lg bg-[#fde8e6] p-3 text-[13px] text-[#8a1c12]">{error}</p>}
            {state?.phase === "done" && <p className="rounded-lg bg-sand-2 p-3 text-[13px]">Done: {state.frames} frames in {secs.toFixed(1)}s. Check your downloads.</p>}
            <button className="btn btn-ink btn-lg w-full" onClick={run}>
              {state?.phase === "done" ? "Render again" : "Render & download"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold capitalize">{state.phase === "video" ? "Rendering frames" : state.phase === "audio" ? "Mixing sound" : state.phase === "finalize" ? "Finishing file" : "Preparing"}</span>
              <span className="font-mono text-xs tabular-nums text-mute">
                {state.frames ? `${state.frame ?? 0}/${state.frames}` : ""} {Math.round(state.progress * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sand">
              <div className="h-full rounded-full bg-ink transition-[width] duration-200" style={{ width: `${Math.max(2, state.progress * 100)}%` }} />
            </div>
            <button className="btn btn-line w-full" onClick={() => abort.current?.abort()}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="label shrink-0">{label}</span>
      {children}
    </div>
  );
}

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => (
        <button key={String(v)} aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}
