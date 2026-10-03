"use client";

import { useEffect, useState } from "react";

export const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "quick-start", label: "Quick start" },
  { id: "specs", label: "Component specs" },
  { id: "posts", label: "Post specs" },
  { id: "formats", label: "Formats & safe zones" },
  { id: "props", label: "Prop types" },
  { id: "rich-text", label: "Rich text" },
  { id: "prompts", label: "Prompt format" },
  { id: "cli", label: "CLI" },
  { id: "sound", label: "Sound" },
  { id: "add-component", label: "Add a component" },
];

const go = (id: string, smooth = true) => {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 88;
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: !smooth });
  else window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
};

/** Sticky table of contents with scroll-spy; also honours /docs/#section on arrival. */
export function DocsNav() {
  const [active, setActive] = useState("overview");
  useEffect(() => {
    const h = location.hash.slice(1);
    if (h) setTimeout(() => go(h, false), 350);
    const io = new IntersectionObserver(
      (es) => {
        const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);
  return (
    <nav className="space-y-0.5">
      <div className="eyebrow mb-3">On this page</div>
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={(e) => {
            e.preventDefault();
            history.replaceState(null, "", `#${s.id}`);
            go(s.id);
          }}
          className={`block rounded-lg px-3 py-1.5 text-[13.5px] font-semibold transition-colors ${active === s.id ? "bg-ink text-cream" : "text-mute hover:text-ink"}`}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
