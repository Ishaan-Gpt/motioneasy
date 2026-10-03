"use client";

import type { Component } from "@motioneasy/engine";
import { CATEGORIES, COMPONENTS, GROUPS, categoryById } from "@motioneasy/library";
import { useMemo, useState } from "react";
import { TLink } from "@/components/site/motion";
import { ComponentCard } from "./card";

type Sort = "featured" | "newest" | "az";

export function Sidebar({ active }: { active?: string }) {
  const count = (cat: string) => COMPONENTS.filter((c) => c.category === cat).length;
  return (
    <nav className="space-y-7 text-[14px]">
      <TLink href="/library/" label="Library" className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 font-semibold ${!active ? "bg-ink text-cream" : "hover:bg-sand-2"}`}>
        <span>All components</span>
        <span className="font-mono text-[11px] opacity-60">{COMPONENTS.length}</span>
      </TLink>
      {GROUPS.map((g) => (
        <div key={g.id}>
          <div className="eyebrow mb-2 px-2.5">{g.name}</div>
          <ul className="space-y-0.5">
            {CATEGORIES.filter((c) => c.group === g.id).map((c) => {
              const n = count(c.id);
              return (
                <li key={c.id}>
                  <TLink
                    href={`/library/${c.id}/`}
                    label={c.name}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${active === c.id ? "bg-ink text-cream" : n ? "text-ink/80 hover:bg-sand-2 hover:text-ink" : "text-faint hover:bg-sand-2"}`}
                  >
                    <span>{c.name}</span>
                    <span className="font-mono text-[11px] opacity-60">{n}</span>
                  </TLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function LibraryView({ category }: { category?: string }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("featured");
  const cat = category ? categoryById(category) : undefined;
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let l: Component[] = COMPONENTS.filter((c) => !category || c.category === category);
    if (needle) l = l.filter((c) => [c.name, c.description, c.category, ...c.tags].join(" ").toLowerCase().includes(needle));
    const order = COMPONENTS.map((c) => c.id);
    if (sort === "featured") l = [...l].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || order.indexOf(a.id) - order.indexOf(b.id));
    if (sort === "newest") l = [...l].sort((a, b) => b.added.localeCompare(a.added) || order.indexOf(b.id) - order.indexOf(a.id));
    if (sort === "az") l = [...l].sort((a, b) => a.name.localeCompare(b.name));
    return l;
  }, [q, sort, category]);

  return (
    <div className="mx-auto grid max-w-[1440px] gap-8 px-4 pb-20 pt-8 md:grid-cols-[230px_minmax(0,1fr)] md:px-8">
      <aside className="hidden md:block">
        <div className="sticky top-[calc(var(--nav-h)+24px)] thin-scroll max-h-[calc(100vh-var(--nav-h)-48px)] overflow-y-auto pb-8" data-lenis-prevent>
          <Sidebar active={category} />
        </div>
      </aside>
      <div className="min-w-0">
        <div className="mb-8">
          <div className="eyebrow mb-2">{cat ? GROUPS.find((g) => g.id === cat.group)?.name : "Library"}</div>
          <h1 className="headline text-[clamp(36px,5vw,64px)]">{cat ? cat.name : <>Every component, <em>ready to post.</em></>}</h1>
          <p className="lede mt-3 max-w-2xl">{cat ? cat.blurb : "Scenes you can post as they are, and the elements they're made of. Open one to change its words, colours, media and sound, then export an MP4 or copy its prompt."}</p>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="7" cy="7" r="5" />
              <path d="M11 11l3.5 3.5" />
            </svg>
            <input className="field !rounded-full !pl-9" placeholder="Search: slam, 3D, counter, captions…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="seg">
            {(["featured", "newest", "az"] as Sort[]).map((s) => (
              <button key={s} aria-pressed={sort === s} onClick={() => setSort(s)}>
                {s === "az" ? "A–Z" : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {/* Mobile category chips */}
        <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1 md:hidden">
          <TLink href="/library/" label="Library" className={`chip shrink-0 !h-8 ${!category ? "!border-ink !bg-ink !text-cream" : ""}`}>
            All
          </TLink>
          {CATEGORIES.filter((c) => COMPONENTS.some((x) => x.category === c.id)).map((c) => (
            <TLink key={c.id} href={`/library/${c.id}/`} label={c.name} className={`chip shrink-0 !h-8 ${category === c.id ? "!border-ink !bg-ink !text-cream" : ""}`}>
              {c.name}
            </TLink>
          ))}
        </div>
        {list.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
            {list.map((c, i) => (
              <ComponentCard key={c.id} comp={c} index={i} />
            ))}
          </div>
        ) : (
          <div className="panel grid place-items-center px-6 py-20 text-center">
            <p className="text-lg font-bold tracking-[-0.02em]">{q ? `Nothing matches “${q}”.` : "This shelf is being stocked."}</p>
            <p className="mt-1 text-sm text-mute">{q ? "Try a broader word, like “type” or “3d”." : "New components land every week."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
