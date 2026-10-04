"use client";

import { gsap } from "gsap";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "./logo";
import { TLink } from "./motion";

const LINKS = [
  { href: "/library/", label: "Library" },
  { href: "/kits/", label: "Prompt kits" },
  { href: "/compose/", label: "Compose" },
  { href: "/sounds/", label: "Sounds" },
  { href: "/docs/", label: "Docs" },
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!menu.current) return;
    if (open) {
      gsap.set(menu.current, { display: "flex" });
      gsap.fromTo(menu.current, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.7, ease: "expo.out" });
      gsap.fromTo(menu.current.querySelectorAll("a"), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: "expo.out", stagger: 0.05, delay: 0.1 });
    } else {
      gsap.to(menu.current, { clipPath: "inset(0 0 100% 0)", duration: 0.45, ease: "expo.in", onComplete: () => void gsap.set(menu.current, { display: "none" }) });
    }
  }, [open]);

  const active = (href: string) => pathname.startsWith(href.replace(/\/$/, "")) || (href === "/library/" && pathname.startsWith("/c/"));

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled || open ? "border-b border-[var(--line)] bg-cream/80 backdrop-blur-xl" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-[var(--nav-h)] max-w-[1440px] items-center justify-between px-4 md:px-8">
          <TLink href="/" label="MotionEasy" aria-label="MotionEasy home">
            <Wordmark />
          </TLink>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <TLink
                key={l.href}
                href={l.href}
                label={l.label}
                className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold tracking-[-0.01em] transition-colors ${active(l.href) ? "bg-ink text-cream" : "text-ink/70 hover:text-ink"}`}
              >
                {l.label}
              </TLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <a className="btn btn-ghost btn-sm" href="https://github.com/Ishaan-Gpt/motioneasy" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <TLink href="/library/" label="Library" className="btn btn-ink btn-sm">
              Browse the library
            </TLink>
          </div>
          <button className="btn btn-line btn-sm md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </header>
      <div ref={menu} className="fixed inset-0 z-40 hidden flex-col justify-end gap-2 bg-cream px-6 pb-16 pt-24 md:hidden" style={{ clipPath: "inset(0 0 100% 0)" }}>
        {[{ href: "/", label: "Home" }, ...LINKS].map((l) => (
          <div key={l.href} className="overflow-hidden">
            <TLink href={l.href} label={l.label} className="block text-[44px] font-bold tracking-[-0.05em]">
              {l.label}
            </TLink>
          </div>
        ))}
      </div>
    </>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
        <div className="space-y-4">
          <Wordmark />
          <p className="max-w-sm text-sm text-mute">
            Cinematic, deterministic motion components for social video. Pick one, drop in your media, export an MP4. In your browser, no LLM required.
          </p>
        </div>
        {[
          { h: "Library", l: [["Scenes", "/library/#scenes"], ["Elements", "/library/#elements"], ["Transitions", "/library/transitions/"], ["Sounds", "/sounds/"]] },
          { h: "Make", l: [["Compose a post", "/compose/"], ["Docs", "/docs/"], ["Prompt format", "/docs/#prompts"], ["CLI", "/docs/#cli"]] },
          { h: "Made for", l: [["CaptionsEasy", "https://captionseasy.com"], ["GitHub", "https://github.com/Ishaan-Gpt/motioneasy"]] },
        ].map((col) => (
          <div key={col.h} className="space-y-3">
            <div className="eyebrow">{col.h}</div>
            <ul className="space-y-2 text-sm font-semibold">
              {col.l.map(([t, h]) => (
                <li key={t}>
                  {h.startsWith("http") ? (
                    <a href={h} target="_blank" rel="noreferrer" className="link-draw">
                      {t}
                    </a>
                  ) : (
                    <TLink href={h} label={t} className="link-draw">
                      {t}
                    </TLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-5 text-xs text-mute md:px-8">
        <span>© 2026 MotionEasy. Renders happen on your machine; nothing is uploaded.</span>
        <span>Demo clips: Wikimedia Commons, CC BY / BY-SA. Fonts: SIL OFL.</span>
      </div>
    </footer>
  );
}
