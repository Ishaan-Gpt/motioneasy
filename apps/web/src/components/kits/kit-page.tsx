"use client";

import { kitById, layoutPost, promptOf } from "@motioneasy/library";
import { useMemo } from "react";
import { ComponentCard } from "@/components/library/card";
import { TLink } from "@/components/site/motion";

export function KitPage({ id }: { id: string }) {
  const kit = kitById(id)!;
  const src = promptOf(kit);
  const dur = useMemo(() => layoutPost(kit.template).duration, [kit]);
  const name = (cid?: string) => kit.components.find((c) => c.id === cid)?.name;
  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-8 md:px-8">
      <TLink href="/kits/" label="Prompt kits" className="text-[13px] font-semibold text-mute hover:text-ink">
        ← All prompt kits
      </TLink>
      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="eyebrow mb-2">{kit.family} · {kit.format === "square" ? "1:1" : kit.format === "landscape" ? "16:9" : "9:16"} · {dur.toFixed(1)}s</div>
          <h1 className="headline text-[clamp(34px,4.5vw,56px)]">{kit.title}</h1>
          <p className="lede mt-3 max-w-2xl">{kit.summary}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a className="btn btn-ink" href={`/compose/#template=${kit.id}`}>
              Open as a template in Compose →
            </a>
            {src && (
              <a className="btn btn-line" href={src.postUrl} target="_blank" rel="noreferrer">
                Original by @{src.author} ↗
              </a>
            )}
          </div>
        </div>
        <aside className="panel h-fit p-5 text-[14px]">
          <div className="label mb-2">Rules from the prompt</div>
          <ul className="space-y-2 text-ink/80">
            {kit.rules.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section className="mt-14">
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">The film, shot by shot</h2>
        <ol className="mt-4 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-white/60">
          {kit.shots.map((s, i) => (
            <li key={i} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 px-4 py-3 text-[14px] md:grid-cols-[72px_minmax(0,1fr)_260px]">
              <span className="font-mono text-[12px] text-mute">{s.at.toFixed(1)}s</span>
              <span>{s.shot}</span>
              {s.component && (
                <TLink href={`/c/${s.component}/`} label={name(s.component) ?? s.component} className="hidden truncate font-semibold hover:underline md:block">
                  {name(s.component)} →
                </TLink>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">{kit.components.length} components</h2>
        <p className="help mt-1">Each one works on its own; the template chains them in the original order.</p>
        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
          {kit.components.map((c, i) => (
            <ComponentCard key={c.id} comp={c} index={i} />
          ))}
        </div>
      </section>

      {src && (
        <section className="mt-14">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">The original prompt</h2>
          <p className="help mt-1">
            By {src.authorName} (
            <a className="underline" href={src.postUrl} target="_blank" rel="noreferrer">
              @{src.author}
            </a>
            ). The prompt belongs to its author; it is shown here, credited, as the reference this kit was rebuilt from.
          </p>
          <details className="mt-4 rounded-2xl border border-[var(--line)] bg-white/60 p-4">
            <summary className="cursor-pointer text-[14px] font-semibold">Show the prompt</summary>
            <pre className="thin-scroll mt-3 max-h-[480px] overflow-auto whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-ink/80">{src.prompt}</pre>
          </details>
        </section>
      )}
    </div>
  );
}
