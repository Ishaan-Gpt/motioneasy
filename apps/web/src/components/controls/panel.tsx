"use client";

// The control panel is generated from the component's schema: every prop is editable here, so changing
// text, colour, media, timing or sound never needs code or an LLM.

import { FONTS, FONT_IDS, guessKind, hintKind, type ParamDef, type ParamGroup, type ParamSchema, type Props } from "@motioneasy/engine";
import { BRAND, CLIPS, LOOKS, SCREENS } from "@motioneasy/library";
import { useMemo, useRef, useState } from "react";

const GROUP_ORDER: { id: ParamGroup; name: string }[] = [
  { id: "content", name: "Content" },
  { id: "media", name: "Media" },
  { id: "style", name: "Style" },
  { id: "motion", name: "Motion" },
  { id: "look", name: "Look & light" },
  { id: "sound", name: "Sound" },
];

export function ControlPanel({ schema, values, onChange, compact = false }: { schema: ParamSchema; values: Props; onChange: (key: string, value: unknown) => void; compact?: boolean }) {
  const [advanced, setAdvanced] = useState(false);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const groups = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({
        ...g,
        items: Object.entries(schema).filter(([, d]) => (d.group ?? "content") === g.id && (advanced || !d.advanced) && d.label !== "internal"),
      })).filter((g) => g.items.length),
    [schema, advanced],
  );
  const hasAdvanced = Object.values(schema).some((d) => d.advanced && d.label !== "internal");
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <section key={g.id} className="rounded-2xl border border-[var(--line)] bg-paper">
          <button className="flex w-full items-center justify-between px-4 py-3" onClick={() => setClosed((c) => ({ ...c, [g.id]: !c[g.id] }))}>
            <span className="text-[13px] font-bold tracking-[-0.01em]">{g.name}</span>
            <span className={`text-mute transition-transform duration-300 ${closed[g.id] ? "-rotate-90" : ""}`}>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            </span>
          </button>
          {!closed[g.id] && (
            <div className={`space-y-4 px-4 pb-4 ${compact ? "" : ""}`}>
              {g.items.map(([k, d]) => (
                <Field key={k} name={k} def={d} value={values[k]} onChange={(v) => onChange(k, v)} />
              ))}
            </div>
          )}
        </section>
      ))}
      {hasAdvanced && (
        <button className="btn btn-ghost btn-sm w-full" onClick={() => setAdvanced((a) => !a)}>
          {advanced ? "Hide advanced" : "Show advanced"}
        </button>
      )}
    </div>
  );
}

function Label({ def, right }: { def: ParamDef; right?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="label">{def.label}</span>
      {right}
    </div>
  );
}

function Field({ name, def, value, onChange }: { name: string; def: ParamDef; value: unknown; onChange: (v: unknown) => void }) {
  void name;
  switch (def.type) {
    case "text": {
      const v = (value as string) ?? "";
      return (
        <div>
          <Label def={def} right={def.maxLength ? <span className="font-mono text-[10.5px] text-faint">{v.length}/{def.maxLength}</span> : null} />
          {def.multiline || v.length > 38 || v.includes("\n") ? (
            <textarea className="field" rows={Math.min(4, Math.max(2, v.split("\n").length))} value={v} maxLength={def.maxLength} onChange={(e) => onChange(e.target.value)} />
          ) : (
            <input className="field" value={v} maxLength={def.maxLength} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />
          )}
          {def.help && <p className="help mt-1">{def.help}</p>}
        </div>
      );
    }
    case "list": {
      const v = (value as string[]) ?? [];
      const set = (i: number, s: string) => onChange(v.map((x, j) => (j === i ? s : x)));
      return (
        <div>
          <Label def={def} right={<span className="font-mono text-[10.5px] text-faint">{v.length} items</span>} />
          <div className="space-y-1.5">
            {v.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-right font-mono text-[10.5px] text-faint">{i + 1}</span>
                <input className="field !py-1.5" value={item} maxLength={def.maxLength} onChange={(e) => set(i, e.target.value)} />
                <IconBtn label="Move up" disabled={i === 0} onClick={() => onChange(swap(v, i, i - 1))} d="M6 9V3M3 6l3-3 3 3" />
                <IconBtn label="Remove" disabled={v.length <= (def.min ?? 1)} onClick={() => onChange(v.filter((_, j) => j !== i))} d="M3 3l6 6M9 3l-6 6" />
              </div>
            ))}
          </div>
          {v.length < (def.max ?? 99) && (
            <button className="btn btn-line btn-sm mt-2" onClick={() => onChange([...v, v[v.length - 1] ?? ""])}>
              Add item
            </button>
          )}
          {def.help && <p className="help mt-1">{def.help}</p>}
        </div>
      );
    }
    case "number": {
      const v = typeof value === "number" ? value : def.default;
      const fill = ((v - def.min) / (def.max - def.min || 1)) * 100;
      const decimals = (String(def.step ?? 1).split(".")[1] ?? "").length;
      return (
        <div>
          <Label
            def={def}
            right={
              <input
                className="w-[72px] rounded-md border border-transparent bg-transparent px-1 text-right font-mono text-[11.5px] tabular-nums outline-none hover:border-[var(--line)] focus:border-ink"
                value={Number(v.toFixed(decimals))}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) onChange(Math.min(def.max, Math.max(def.min, n)));
                }}
              />
            }
          />
          <input
            type="range"
            className="slider"
            min={def.min}
            max={def.max}
            step={def.step ?? 1}
            value={v}
            style={{ ["--fill" as string]: `${fill}%` }}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {def.help && <p className="help">{def.help}</p>}
        </div>
      );
    }
    case "bool": {
      const v = !!value;
      return (
        <div>
          <button className="flex w-full items-center justify-between" onClick={() => onChange(!v)} role="switch" aria-checked={v}>
            <span className="label">{def.label}</span>
            <span className={`relative h-[22px] w-[38px] rounded-full transition-colors duration-300 ${v ? "bg-ink" : "bg-sand"}`}>
              <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-cream shadow transition-[left] duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${v ? "left-[19px]" : "left-[3px]"}`} />
            </span>
          </button>
          {def.help && <p className="help mt-1">{def.help}</p>}
        </div>
      );
    }
    case "select": {
      const v = value as string;
      const short = def.options.length <= 3 && def.options.every((o) => o.label.length < 16);
      return (
        <div>
          <Label def={def} />
          {short ? (
            <div className="seg w-full">
              {def.options.map((o) => (
                <button key={o.value} className="flex-1" aria-pressed={v === o.value} onClick={() => onChange(o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          ) : (
            <select className="field" value={v} onChange={(e) => onChange(e.target.value)}>
              {def.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {def.help && <p className="help mt-1">{def.help}</p>}
        </div>
      );
    }
    case "color":
      return <ColorField def={def} value={value as string} onChange={onChange} />;
    case "font": {
      const v = (value as string) ?? "brand";
      return (
        <div>
          <Label def={def} />
          <select className="field" value={v} onChange={(e) => onChange(e.target.value)}>
            <option value="brand">Brand font (Plus Jakarta Sans)</option>
            {FONT_IDS.map((f) => (
              <option key={f} value={f}>
                {FONTS[f].label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    case "media":
      return <MediaField def={def} value={value as string | null} onChange={onChange} />;
    case "mediaList":
      return <MediaListField def={def} value={(value as string[]) ?? []} onChange={onChange} />;
    case "json":
      return <JsonField def={def} value={value} onChange={onChange} />;
  }
}

const swap = <T,>(a: T[], i: number, j: number) => {
  const c = [...a];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};

function IconBtn({ label, onClick, disabled, d }: { label: string; onClick: () => void; disabled?: boolean; d: string }) {
  return (
    <button aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-mute hover:bg-sand-2 hover:text-ink disabled:opacity-30">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d={d} />
      </svg>
    </button>
  );
}

const SWATCHES = ["#FFFFEB", "#FFFFFF", "#F4F4E0", "#E4E4D0", "#8C8C83", "#4C4C47", "#1A1A1A", "#000000", "#F0D7FF", "#FFD9A8", "#FFA946", "#34D399"];

function ColorField({ def, value, onChange }: { def: Extract<ParamDef, { type: "color" }>; value: string; onChange: (v: unknown) => void }) {
  const isAuto = value === "auto";
  const [hex, setHex] = useState(isAuto ? "" : value);
  return (
    <div>
      <Label
        def={def}
        right={
          def.allowAuto ? (
            <button className={`chip !h-6 ${isAuto ? "!border-ink !text-ink" : ""}`} onClick={() => onChange(isAuto ? "#1A1A1A" : "auto")}>
              Auto
            </button>
          ) : null
        }
      />
      <div className="flex items-center gap-2">
        <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[var(--line-strong)]" style={{ background: isAuto ? "repeating-conic-gradient(#E4E4D0 0 25%, #FFFFEB 0 50%) 0 0/10px 10px" : value }}>
          <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={isAuto ? "#1a1a1a" : value.slice(0, 7)} onChange={(e) => (onChange(e.target.value), setHex(e.target.value))} />
        </label>
        <input
          className="field font-mono !text-[12.5px]"
          placeholder={isAuto ? "auto (follows mode)" : "#1A1A1A"}
          value={isAuto ? "" : hex || value}
          onChange={(e) => {
            setHex(e.target.value);
            if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e.target.value)) onChange(e.target.value);
          }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SWATCHES.map((s) => (
          <button key={s} aria-label={s} title={s} onClick={() => (onChange(s), setHex(s))} className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${value?.toLowerCase() === s.toLowerCase() ? "border-ink ring-2 ring-ink/20" : "border-[var(--line-strong)]"}`} style={{ background: s }} />
        ))}
      </div>
    </div>
  );
}

// ── Media ──────────────────────────────────────────────────────────────────
function Thumb({ src, className = "" }: { src: string; className?: string }) {
  const url = /^(blob:|data:|https?:|\/)/.test(src) ? src : `/${src}`;
  const poster = !src.startsWith("blob:") && /\.mp4$/.test(src) ? url.replace(/\.mp4$/, ".webp") : undefined;
  return guessKind(src) === "video" ? (
    <video src={url} poster={poster} muted playsInline preload="metadata" className={`h-full w-full object-cover ${className}`} onMouseEnter={(e) => void e.currentTarget.play().catch(() => undefined)} onMouseLeave={(e) => e.currentTarget.pause()} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={`h-full w-full object-cover ${className}`} />
  );
}

function useUpload(onFile: (url: string) => void) {
  const input = useRef<HTMLInputElement>(null);
  const el = (
    <input
      ref={input}
      type="file"
      accept="image/*,video/*"
      className="hidden"
      multiple
      onChange={(e) => {
        for (const f of Array.from(e.target.files ?? [])) {
          const url = URL.createObjectURL(f);
          hintKind(url, f.type.startsWith("video") ? "video" : "image");
          onFile(url);
        }
        e.target.value = "";
      }}
    />
  );
  return { el, open: () => input.current?.click() };
}

const DEMO: { group: string; items: string[] }[] = [
  { group: "Creator clips (captioned)", items: Object.values(CLIPS).map((c) => c.src) },
  { group: "Product screens", items: Object.values(SCREENS) },
  { group: "Caption looks", items: LOOKS },
  { group: "Brand", items: [BRAND.logo, BRAND.icon, BRAND.wordmark, BRAND.logoLight] },
];

function DemoPicker({ open, onClose, onPick, accept }: { open: boolean; onClose: () => void; onPick: (src: string) => void; accept: "image" | "video" | "any" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card max-h-[82vh] w-full max-w-3xl overflow-auto p-5 thin-scroll" data-lenis-prevent onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-[-0.03em]">Demo media</h3>
          <button className="btn btn-line btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        {DEMO.map((g) => {
          const items = g.items.filter((s) => accept === "any" || guessKind(s) === accept);
          if (!items.length) return null;
          return (
            <div key={g.group} className="mb-5">
              <div className="eyebrow mb-2">{g.group}</div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {items.map((s) => (
                  <button key={s} className="aspect-[3/4] overflow-hidden rounded-lg border border-[var(--line)] bg-sand-2 transition-transform hover:scale-[1.03]" onClick={() => (onPick(s), onClose())}>
                    <Thumb src={s} className={s.includes("/brand/") ? "!object-contain p-2" : ""} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MediaField({ def, value, onChange }: { def: Extract<ParamDef, { type: "media" }>; value: string | null; onChange: (v: unknown) => void }) {
  const [picker, setPicker] = useState(false);
  const up = useUpload((u) => onChange(u));
  return (
    <div>
      <Label def={def} />
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--line)] bg-sand-2">{value ? <Thumb src={value} className={value.includes("/brand/") ? "!object-contain p-1.5" : ""} /> : null}</div>
        <div className="flex flex-wrap gap-1.5">
          <button className="btn btn-ink btn-sm" onClick={up.open}>
            Upload
          </button>
          <button className="btn btn-line btn-sm" onClick={() => setPicker(true)}>
            Demo
          </button>
          {value && (
            <button className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>
              Clear
            </button>
          )}
        </div>
      </div>
      {def.help && <p className="help mt-1">{def.help}</p>}
      {up.el}
      <DemoPicker open={picker} onClose={() => setPicker(false)} onPick={(s) => onChange(s)} accept={def.accept} />
    </div>
  );
}

function MediaListField({ def, value, onChange }: { def: Extract<ParamDef, { type: "mediaList" }>; value: string[]; onChange: (v: unknown) => void }) {
  const [picker, setPicker] = useState(false);
  const latest = useRef(value);
  latest.current = value;
  const up = useUpload((u) => onChange([...latest.current, u].slice(0, def.max ?? 99)));
  return (
    <div>
      <Label def={def} right={<span className="font-mono text-[10.5px] text-faint">{value.length}{def.max ? `/${def.max}` : ""}</span>} />
      <div className="grid grid-cols-4 gap-1.5">
        {value.map((s, i) => (
          <div key={`${s}-${i}`} className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-[var(--line)] bg-sand-2">
            <Thumb src={s} />
            <div className="absolute inset-x-1 top-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100">
              <button className="grid h-6 w-6 place-items-center rounded-full bg-cream/90 text-[11px] font-bold" title="Move left" disabled={i === 0} onClick={() => onChange(swap(value, i, i - 1))}>
                ←
              </button>
              <button className="grid h-6 w-6 place-items-center rounded-full bg-cream/90 text-[11px] font-bold" title="Remove" disabled={value.length <= (def.min ?? 0)} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
            <span className="absolute bottom-1 left-1 rounded bg-ink/70 px-1 font-mono text-[9.5px] text-cream">{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <button className="btn btn-ink btn-sm" onClick={up.open}>
          Upload
        </button>
        <button className="btn btn-line btn-sm" onClick={() => setPicker(true)}>
          Add demo
        </button>
      </div>
      {up.el}
      <DemoPicker open={picker} onClose={() => setPicker(false)} onPick={(s) => onChange([...value, s].slice(0, def.max ?? 99))} accept={def.accept} />
    </div>
  );
}

function JsonField({ def, value, onChange }: { def: ParamDef; value: unknown; onChange: (v: unknown) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 1));
  const [err, setErr] = useState("");
  return (
    <div>
      <Label def={def} />
      <textarea
        className="field font-mono !text-[11px]"
        rows={5}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setErr("");
          } catch {
            setErr("Not valid JSON yet");
          }
        }}
      />
      {err && <p className="help !text-[#b42318]">{err}</p>}
    </div>
  );
}
