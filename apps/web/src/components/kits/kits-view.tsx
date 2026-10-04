"use client";

import { KITS, layoutPost, promptOf, type Kit } from "@motioneasy/library";
import { useMemo, useState } from "react";
import previews from "@/generated/previews.json";
import { TLink } from "@/components/site/motion";

const PREVIEWS = previews as Record<string, { video: string; poster: string }>;
const FAMILIES: { id: Kit["family"] | "all"; name: string }[] = [
  { id: "all", name: "All" },
  { id: "launch", name: "Launch films" },
  { id: "ui", name: "UI motion" },
  { id: "showreel", name: "Showreels" },
  { id: "intro", name: "Intros & type" },
  { id: "social", name: "Social" },
];

function KitCard({ kit, index }: { kit: Kit; index: number }) {
  const src = promptOf(kit);
  const dur = useMemo(() => layoutPost(kit.template).duration, [kit]);
  // the card shows the kit's most telling shot: the middle of the film
  const hero = kit.components[Math.floor(kit.components.length / 2)] ?? kit.components[0];
  const pre = hero ? PREVIEWS[hero.id] : undefined;
  return (
    <TLink href={`/kits/${kit.id}/`} label={kit.title} className="group block" data-reveal style={{ transitionDelay: `${(index % 3) * 50}ms` }}>
      <div className="relative aspect-video overflow-hidden rounded-[20px] border border-[var(--line)] bg-[#151514] shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-deep)]">
        {pre ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pre.poster} alt="" className="absolute inset-0 h-full w-full object-contain" loading="lazy" />
            <video src={pre.video} muted loop playsInline autoPlay preload="none" className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center font-mono text-[12px] text-cream/50">{kit.components.length} components</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-cream/90 px-2.5 py-1 font-mono text-[11px] font-bold">{kit.format === "square" ? "1:1" : kit.format === "landscape" ? "16:9" : "9:16"} · {dur.toFixed(0)}s</span>
      </div>
      <div className="mt-3 px-0.5">
        <div className="text-[16px] font-bold tracking-[-0.02em]">{kit.title}</div>
        <div className="mt-0.5 text-[13px] text-mute">
          {kit.components.length} components · after @{src?.author ?? "?"}
        </div>
      </div>
    </TLink>
  );
}

export function KitsView() {
  const [fam, setFam] = useState<Kit["family"] | "all">("all");
  const list = KITS.filter((k) => fam === "all" || k.family === fam);
  const total = KITS.reduce((s, k) => s + k.components.length, 0);
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-8 md:px-8">
      <div className="mb-8 max-w-3xl">
        <div className="eyebrow mb-2">Prompt kits</div>
        <h1 className="headline text-[clamp(36px,5vw,64px)]">
          Famous prompts, <em>rebuilt shot by shot.</em>
        </h1>
        <p className="lede mt-3">
          The launch and motion prompts people shared, each backtracked from its original film into the components it is made of. They keep their original copy, palette and timing; media starts as labelled placeholders. Open one as a template and make it yours. {KITS.length} kits, {total} components.
        </p>
      </div>
      <div className="mb-6 flex flex-wrap gap-1.5">
        {FAMILIES.filter((f) => f.id === "all" || KITS.some((k) => k.family === f.id)).map((f) => (
          <button key={f.id} className={`chip ${fam === f.id ? "!border-ink !bg-ink !text-cream" : ""}`} onClick={() => setFam(f.id)}>
            {f.name}
          </button>
        ))}
      </div>
      <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((k, i) => (
          <KitCard key={k.id} kit={k} index={i} />
        ))}
      </div>
    </div>
  );
}
