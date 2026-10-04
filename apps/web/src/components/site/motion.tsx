"use client";

// Smooth scroll (Lenis) + GSAP ScrollTrigger + route transitions + the first-visit loader.

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Mark } from "./logo";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

declare global {
  interface Window {
    __lenis?: Lenis;
    __meLoaded?: boolean;
  }
}

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ── Smooth scroll ──────────────────────────────────────────────────────────
export function SmoothScroll() {
  const pathname = usePathname();
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) document.documentElement.classList.add("reduced");
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: !reduced, wheelMultiplier: 1 });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, []);

  // Scroll reveals for anything marked data-reveal, re-armed on every route.
  useEffect(() => {
    const run = () => {
      const els = gsap.utils.toArray<HTMLElement>("[data-reveal]:not([data-revealed])");
      ScrollTrigger.batch(els, {
        start: "top 88%",
        once: true,
        onEnter: (batch) => {
          batch.forEach((el) => el.setAttribute("data-revealed", ""));
          gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.07, overwrite: true });
        },
      });
      ScrollTrigger.refresh();
    };
    const id = window.setTimeout(run, 60);
    return () => window.clearTimeout(id);
  }, [pathname]);
  return null;
}

// ── Route transitions ──────────────────────────────────────────────────────
interface Nav {
  navigate: (href: string, label?: string) => void;
}
const NavCtx = createContext<Nav>({ navigate: () => undefined });
export const useNavigate = () => useContext(NavCtx).navigate;

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const curtain = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const [text, setText] = useState("");

  const navigate = useCallback(
    (href: string, l?: string) => {
      const target = href.split("#")[0].replace(/\/$/, "") || "/";
      const here = pathname.replace(/\/$/, "") || "/";
      if (target === here) {
        window.__lenis?.scrollTo(0);
        return;
      }
      setText(l ?? "");
      pending.current = true;
      const tl = gsap.timeline({ onComplete: () => router.push(href) });
      tl.set(curtain.current, { display: "flex" })
        .fromTo(curtain.current, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.65, ease: "expo.inOut" })
        .fromTo(label.current, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, "-=0.25");
    },
    [pathname, router],
  );

  useIso(() => {
    if (!pending.current) return;
    pending.current = false;
    window.__lenis?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    const tl = gsap.timeline({ delay: 0.12 });
    tl.to(label.current, { yPercent: -110, opacity: 0, duration: 0.35, ease: "expo.in" })
      .to(curtain.current, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.75, ease: "expo.inOut" }, "-=0.1")
      .set(curtain.current, { display: "none" });
    window.dispatchEvent(new Event("me:route"));
  }, [pathname]);

  return (
    <NavCtx.Provider value={{ navigate }}>
      {children}
      <div ref={curtain} className="fixed inset-0 z-[80] hidden items-center justify-center bg-ink text-cream" style={{ clipPath: "inset(100% 0 0 0)" }}>
        <div className="overflow-hidden">
          <div ref={label} className="flex items-center gap-4 text-[clamp(28px,5vw,64px)] font-bold tracking-[-0.045em]">
            <Mark size={44} inverted />
            <span>{text || "MotionEasy"}</span>
          </div>
        </div>
      </div>
    </NavCtx.Provider>
  );
}

/** Link that plays the curtain transition (modifier-clicks behave normally). */
export function TLink({ href, label, children, className, onClick, ...rest }: React.ComponentProps<typeof Link> & { href: string; label?: string }) {
  const navigate = useNavigate();
  return (
    <Link
      href={href}
      className={className}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || href.startsWith("http")) return;
        e.preventDefault();
        navigate(href, label);
      }}
    >
      {children}
    </Link>
  );
}

// ── First-visit loader ─────────────────────────────────────────────────────
export function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(true);
  useIso(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("me:loaded") === "1";
    } catch {
      /* private mode */
    }
    const done = () => {
      window.__meLoaded = true;
      window.dispatchEvent(new Event("me:loaded"));
      setShow(false);
    };
    if (seen || !root.current) {
      done();
      return;
    }
    const el = root.current;
    const counter = el.querySelector<HTMLElement>("[data-count]")!;
    const letters = el.querySelectorAll<HTMLElement>("[data-letter]");
    const bar = el.querySelector<HTMLElement>("[data-bar]")!;
    const obj = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        try {
          sessionStorage.setItem("me:loaded", "1");
        } catch {
          /* ignore */
        }
        done();
      },
    });
    tl.fromTo(letters, { yPercent: 115 }, { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.045 }, 0.1)
      .to(obj, { v: 100, duration: 1.7, ease: "power3.inOut", onUpdate: () => (counter.textContent = String(Math.round(obj.v)).padStart(3, "0")) }, 0)
      .fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1.7, ease: "power3.inOut" }, 0)
      .add(() => void document.fonts?.ready)
      .to(letters, { yPercent: -115, duration: 0.6, ease: "expo.in", stagger: 0.02 }, 1.85)
      .to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.95, ease: "expo.inOut" }, 2.15);
    return () => {
      tl.kill();
    };
  }, []);
  if (!show) return null;
  const word = "MotionEasy";
  return (
    <div ref={root} className="fixed inset-0 z-[100] flex flex-col justify-between bg-cream p-6 md:p-10" style={{ clipPath: "inset(0 0 0 0)" }}>
      <div className="flex items-center justify-between">
        <Mark size={30} />
        <span className="eyebrow">Motion library · v0.1</span>
      </div>
      <div className="flex items-end overflow-hidden leading-[0.9]">
        {word.split("").map((ch, i) => (
          <span key={i} data-letter className={`inline-block text-[clamp(64px,15vw,220px)] ${i >= 6 ? "accent" : "font-bold tracking-[-0.06em]"}`}>
            {ch}
          </span>
        ))}
      </div>
      <div className="flex items-end justify-between gap-6">
        <div className="h-px flex-1 bg-[var(--line)]">
          <div data-bar className="h-px origin-left bg-ink" />
        </div>
        <span data-count className="font-mono text-sm tabular-nums">000</span>
      </div>
    </div>
  );
}

/** Run a callback once the loader has finished (immediately on later visits). */
export function useAfterLoad(fn: () => void | (() => void), deps: unknown[] = []) {
  useEffect(() => {
    let cleanup: void | (() => void);
    const go = () => {
      cleanup = fn();
    };
    if (window.__meLoaded) go();
    else window.addEventListener("me:loaded", go, { once: true });
    return () => {
      window.removeEventListener("me:loaded", go);
      if (typeof cleanup === "function") cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
