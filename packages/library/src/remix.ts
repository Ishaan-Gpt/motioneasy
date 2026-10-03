// Remix: one copy deck + a seed → N varied post specs (hook → body → proof → CTA). Clips are filled
// only with the deck's copy and media, so nothing is invented, and every post is checked against the
// variety rules: no recipe or hook component twice in a row, one signature transition per post (not
// the last post's), music alternates, copy cycles before it repeats, shot lengths are not uniform.

import { durationOf, propsFor, rng, type Component, type FormatId, type Props } from "@motioneasy/engine";
import { componentById } from "./registry";
import { layoutPost, type ClipSpec, type MusicSpec, type PostSpec } from "./sequence";
import type { TransitionId } from "./transitions";
import { MUSIC_LIBRARY, type MusicMood } from "./music.gen";

export interface Deck {
  id: string;
  name: string;
  url: string;
  /** Rich text: *accent* words. */
  tagline: string;
  /** Hook lines; with strike/replace they suit the strike-and-swap hook. */
  hooks: { line: string; strike?: string; replace?: string }[];
  /** One-line claims, ≤ 50 characters, rich text. */
  claims: string[];
  /** Very short claims (≤ 24 characters) for big kinetic type. */
  shorts?: string[];
  /** Feature chips, ≤ 32 characters. */
  features: string[];
  /** "number|label", e.g. "33|caption looks". Only real numbers. */
  stats: string[];
  /** "Title|detail" steps. */
  steps?: string[];
  checklist?: string[];
  /** Single bold words (≤ 8 letters) for type that carries footage (Image Type). */
  words?: string[];
  rotators?: { prefix: string; words: string[] }[];
  /** Real quotes from real people only. */
  quotes?: { quote: string; author: string; role: string; avatar?: string }[];
  /** End-card headlines. */
  cta: string[];
  media: {
    /** Product or creator footage (already showing the product). */
    clips: string[];
    /** Uncaptioned talking heads with transcripts (for live captions). */
    talking?: string[];
    /** Product screenshots. */
    screens?: string[];
    /** Before/after pairs of the same clip. */
    pairs?: { before: string; after: string }[];
    logo: string;
    wordmark?: string;
    /** The logo is three bars (enables the equaliser sting). */
    barMark?: boolean;
  };
  /** Explicit beds. Optional when musicMood is set. */
  music?: MusicSpec[];
  /** Pick beds from the music library by mood (one or several); each post enters on a strong, bar-aligned section. */
  musicMood?: MusicMood | MusicMood[];
}

/** The deck's beds: its own list, plus every library track in its moods. */
export function deckMusic(deck: Deck): MusicSpec[] {
  const moods = deck.musicMood ? (Array.isArray(deck.musicMood) ? deck.musicMood : [deck.musicMood]) : [];
  const lib = MUSIC_LIBRARY.filter((t) => moods.includes(t.mood)).map((t) => ({ src: t.src, gain: 0.5, offset: t.starts[0] ?? t.beat, fadeIn: 0.05, fadeOut: 1.2, credit: t.credit }));
  return [...(deck.music ?? []), ...lib];
}

export interface RemixOptions {
  count: number;
  seed?: number;
  format?: FormatId;
  /** Id prefix, e.g. a date: "2026-10-05". */
  prefix?: string;
  /** The last posts already published (oldest first), so the first new post doesn't repeat them. */
  history?: PostSpec[];
}

export interface RemixResult {
  posts: PostSpec[];
  /** Prop fixes the schemas had to make (should be empty for a good deck). */
  warnings: string[];
}

type Slot = "hook" | "body" | "list" | "proof" | "cta";
interface Pick {
  /** Next item of a deck list (shuffled once per batch, cycles before repeating). */
  next<T>(key: string, list: T[]): T;
  r: () => number;
}
type Fill = (d: Deck, p: Pick) => Props | null;

const has = (l?: unknown[]) => !!l && l.length > 0;
const plain = (s: string) => s.replace(/\*/g, "").replace(/\s+/g, " ").trim();

/** A readable title from the opening clip's own words. */
function titleOf(c: ClipSpec | undefined, recipe: string) {
  const p = (c?.props ?? {}) as Record<string, unknown>;
  const words = Array.isArray(p.words) ? `${p.prefix ?? ""} ${p.words[0]}` : null;
  const text = [p.line, p.text, p.headline, p.title, words, p.sub].find((v): v is string => typeof v === "string" && !!v.trim());
  const comp = c ? componentById(c.component)?.name : "";
  return `${text ? plain(text) : comp} · ${recipe}`;
}
const firstWords = (s: string, n: number) => s.split(/\s+/).slice(0, n).join(" ");

/** Candidate components per slot, each filled from the deck (null = the deck can't fill it). */
const CANDIDATES: Record<Slot, Record<string, Fill>> = {
  hook: {
    "hook-strike": (d, p) => {
      const h = p.next("strikeHooks", d.hooks.filter((x) => x.strike && x.replace));
      return h ? { line: h.line, strike: h.strike, replace: h.replace } : null;
    },
    "beat-slam": (d, p) => ({ text: p.next("claims", d.claims), variant: p.next("slamVariant", ["punch", "stack", "impact"]) }),
    "word-rotator": (d, p) => {
      if (!has(d.rotators)) return null;
      const w = p.next("rotators", d.rotators!);
      return { prefix: w.prefix, words: w.words, variant: p.next("rotVariant", ["drum", "slide", "focus"]) };
    },
    "echo-stack": (d, p) => (has(d.shorts) ? { text: p.next("shorts", d.shorts!) } : null),
    "scroll-stop": (d, p) => (d.media.clips.length >= 4 ? { media: d.media.clips, sub: p.next("claims", d.claims) } : null),
    decode: (d, p) => (has(d.shorts) ? { text: p.next("shorts", d.shorts!) } : null),
    "kinetic-stack": (d, p) => {
      const s = p.next("stackShorts", (d.shorts ?? []).concat(d.claims.filter((c) => plain(c).split(" ").length <= 4)));
      return s ? { text: s.replace(/\s+/g, " ").trim().split(" ").join("\n") } : null;
    },
    "char-cascade": (d, p) => ({ text: p.next("claims", d.claims), variant: p.next("cascadeVariant", ["rise", "drop", "scatter"]) }),
    "type-marquee": (d, p) => (has(d.shorts) ? { text: p.next("shorts", d.shorts!), echo: d.name.toUpperCase().slice(0, 20) } : null),
    "split-flap": (d, p) => {
      const rows = (has(d.shorts) ? plain(p.next("shorts", d.shorts!)) : "").toUpperCase().split(" ");
      return rows.length && rows.length <= 3 && rows.every((r) => r.length <= 12) ? { text: rows.join("\n") } : null;
    },
  },
  body: {
    "product-orbit": (d, p) => ({ media: p.next("clips", d.media.clips), headline: `Meet *${d.name}.*`, features: d.features.slice(0, 3) }),
    "phone-hero": (d, p) => ({ media: p.next("clips", d.media.clips), headline: p.next("claims", d.claims) }),
    "browser-drop": (d, p) => (has(d.media.screens) ? { media: p.next("screens", d.media.screens!), url: d.url, headline: p.next("claims", d.claims) } : null),
    "coverflow-3d": (d, p) => (d.media.clips.length >= 5 ? { media: d.media.clips.slice(0, 7), labels: [], showLabels: false, title: p.next("claims", d.claims) } : null),
    "infinite-wall": (d, p) => (d.media.clips.length >= 6 ? { media: d.media.clips, headline: p.next("claims", d.claims) } : null),
    "caption-karaoke": (d, p) => (has(d.media.talking) ? { media: p.next("talking", d.media.talking!) } : null),
    "image-type": (d, p) => (has(d.words) ? { text: p.next("words", d.words!).slice(0, 8), media: p.next("clips", d.media.clips), sub: plain(p.next("features", d.features)).slice(0, 40) } : null),
    "caption-pop": (d, p) => (has(d.media.talking) ? { media: p.next("talking", d.media.talking!), keywords: "" } : null),
    "before-after": (d, p) => {
      if (!has(d.media.pairs)) return null;
      const pr = p.next("pairs", d.media.pairs!);
      return { before: pr.before, after: pr.after, headline: p.next("claims", d.claims) };
    },
  },
  list: {
    "four-steps": (d, p) => (d.steps && d.steps.length >= 2 ? { title: p.next("claims", d.claims), steps: d.steps.slice(0, 4) } : null),
    "mask-rise": (d) => (d.steps && d.steps.length >= 3 ? { text: d.steps.slice(0, 3).map((s, i, a) => (i === a.length - 1 ? `*${s.split("|")[0]}.*` : `${s.split("|")[0]}.`)).join("\n") } : null),
    checklist: (d, p) => (has(d.checklist) ? { headline: p.next("claims", d.claims), items: d.checklist!.slice(0, 6) } : null),
    "bar-wipe": (d) => (d.steps && d.steps.length >= 3 ? { text: d.steps.slice(0, 3).map((s, i, a) => (i === a.length - 1 ? `*${s.split("|")[0]}.*` : `${s.split("|")[0]}.`)).join("\n") } : null),
  },
  proof: {
    "stat-trio": (d, p) => (d.stats.length >= 2 ? { headline: p.next("claims", d.claims), stats: d.stats.slice(0, 3) } : null),
    "big-number": (d, p) => {
      const s = p.next("stats", d.stats.filter((x) => /^\D*\d/.test(x) && Number(x.split("|")[0].replace(/[^\d.-]/g, "")) > 1));
      if (!s) return null;
      const [num, label] = s.split("|");
      const m = num.match(/^(\D*)([\d,.]+)(.*)$/);
      return m ? { value: Number(m[2].replace(/,/g, "")), prefix: m[1].slice(0, 3), suffix: m[3].trim().slice(0, 12), label: label?.trim() ?? "" } : null;
    },
    checklist: (d, p) => (has(d.checklist) ? { headline: p.next("claims", d.claims), items: d.checklist!.slice(0, 5) } : null),
    "quote-card": (d, p) => {
      if (!has(d.quotes)) return null;
      const q = p.next("quotes", d.quotes!);
      return { quote: q.quote, author: q.author, role: q.role, ...(q.avatar ? { avatar: q.avatar } : {}) };
    },
  },
  cta: {
    "end-card": (d, p) => ({ media: p.next("clips", d.media.clips), logo: d.media.logo, headline: p.next("cta", d.cta), url: d.url }),
    "logo-reveal": (d) => ({ logo: d.media.logo, tagline: d.tagline, url: d.url }),
    "logo-bars": (d) => (d.media.barMark && d.media.wordmark ? { wordmark: d.media.wordmark, tagline: firstWords(d.tagline.replace(/\*/g, ""), 3).replace(/[.,]?$/, ".") } : null),
    "click-cta": (d, p) => ({ headline: p.next("claims", d.claims), url: d.url }),
  },
};

/** Post shapes. Each slot list is one post; the CTA always closes. */
const RECIPES: Record<string, Slot[]> = {
  classic: ["hook", "body", "proof", "cta"],
  "demo-first": ["body", "proof", "cta"],
  "how-to": ["hook", "list", "cta"],
  "proof-first": ["proof", "body", "cta"],
  "show-and-tell": ["hook", "body", "list", "cta"],
};

/** Transitions with a look of their own: one per post, never the same as the post before. */
const SIGNATURE: TransitionId[] = ["whip", "zoom", "push", "match", "iris", "slide", "recede", "shutter", "wipe", "blur", "flash"];

/** Long components are trimmed so a post keeps moving. */
const MAX_CLIP = 5.5;

export function remix(deck: Deck, o: RemixOptions): RemixResult {
  const r = rng((o.seed ?? 1) * 2654435761);
  const order = new Map<string, number[]>();
  const cursor = new Map<string, number>();
  const pick: Pick = {
    r,
    next<T>(key: string, list: T[]): T {
      if (!list.length) return undefined as T;
      if (!order.has(key) || order.get(key)!.length !== list.length) {
        const idx = list.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
          const j = Math.floor(r() * (i + 1));
          [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        order.set(key, idx);
      }
      const n = cursor.get(key) ?? 0;
      cursor.set(key, n + 1);
      return list[order.get(key)![n % list.length]];
    },
  };
  const choose = <T,>(list: T[]) => list[Math.floor(r() * list.length)];
  const shuffle = <T,>(list: T[]) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const warnings: string[] = [];
  const posts: PostSpec[] = [];
  // Spread the library across the batch: least-used candidates first, random among equals.
  const usage = new Map<string, number>();
  const prev = [...(o.history ?? [])];
  const last = () => prev[prev.length - 1];
  const hookOf = (p?: PostSpec) => p?.clips[0]?.component;
  const signatureOf = (p?: PostSpec) => p?.clips.map((c) => (typeof c.transition === "string" ? c.transition : c.transition?.type)).find((t) => t && t !== "cut");

  for (let n = 0; n < o.count; n++) {
    // 1. recipe: never the previous post's
    const recipes = Object.keys(RECIPES).filter((k) => k !== last()?.recipe);
    const recipe = choose(recipes);
    // 2. fill each slot with a candidate the deck can fill; the opener differs from the last opener
    const clips: ClipSpec[] = [];
    for (const [i, slot] of RECIPES[recipe].entries()) {
      const used = new Set(clips.map((c) => c.component));
      const names = Object.keys(CANDIDATES[slot]).filter((id) => !used.has(id) && !(i === 0 && id === hookOf(last())));
      let placed = false;
      for (const id of shuffle(names).sort((a, b) => (usage.get(a) ?? 0) - (usage.get(b) ?? 0))) {
        const comp = componentById(id) as Component | undefined;
        const props = comp ? CANDIDATES[slot][id](deck, pick) : null;
        if (!comp || !props) continue;
        const { issues } = propsFor(comp, props);
        if (issues.length) {
          warnings.push(`${id}: ${issues.join("; ")} (skipped)`);
          continue;
        }
        const natural = durationOf(comp, propsFor(comp, props).props);
        clips.push({ component: id, props, ...(natural > MAX_CLIP + 0.5 ? { duration: MAX_CLIP } : {}) });
        usage.set(id, (usage.get(id) ?? 0) + 1);
        placed = true;
        break;
      }
      if (!placed) warnings.push(`post ${n + 1}: nothing in the deck fills the ${slot} slot`);
    }
    // 3. one signature transition, on a random joint; plain cuts elsewhere
    const sig = choose(SIGNATURE.filter((t) => t !== signatureOf(last())));
    const joint = 1 + Math.floor(r() * Math.max(1, clips.length - 1));
    clips.forEach((c, i) => {
      if (i === joint) c.transition = sig;
    });
    // 4. shot lengths must not be uniform: stretch the most even clip a little if they are
    const lens = clips.map((c) => c.duration ?? durationOf(componentById(c.component) as Component, propsFor(componentById(c.component) as Component, c.props).props));
    if (lens.length > 2 && Math.max(...lens) - Math.min(...lens) < 0.5) clips[Math.floor(r() * clips.length)].duration = lens[0] + 0.8;
    // 5. music alternates
    const beds = deckMusic(deck);
    const recent = prev.slice(-3).map((q) => q.music?.src);
    const tracks = beds.filter((m) => !recent.includes(m.src));
    const music = tracks.length ? { ...choose(tracks) } : beds[0] ? { ...beds[0] } : null;
    // Beat-locked components follow the bed's measured tempo, so their hits land on its beats.
    const track = MUSIC_LIBRARY.find((t) => t.src === music?.src);
    if (track) for (const c of clips) if (componentById(c.component)?.schema.bpm) c.props = { ...c.props, bpm: Math.round(track.bpm * 100) / 100 };

    const id = `${o.prefix ? `${o.prefix}-` : ""}${deck.id}-${o.seed ?? 1}-${String(n + 1).padStart(2, "0")}`;
    const post: PostSpec = { id, title: titleOf(clips[0], recipe), format: o.format ?? "vertical", fps: 60, recipe, seed: o.seed ?? 1, clips, music, notes: `remix: ${recipe}; ${clips.map((c) => c.component).join(" → ")}; signature ${sig}` };
    layoutPost(post); // throws if a component is unknown
    posts.push(post);
    prev.push(post);
  }
  return { posts, warnings };
}

/** Variety check over a run of posts (oldest first): what a reviewer would flag. */
export function auditPosts(posts: PostSpec[]): string[] {
  const out: string[] = [];
  posts.forEach((p, i) => {
    const q = posts[i - 1];
    const tr = p.clips.map((c) => (typeof c.transition === "string" ? c.transition : c.transition?.type)).filter((t): t is TransitionId => !!t && t !== "cut");
    const counts = tr.reduce<Record<string, number>>((a, t) => ((a[t] = (a[t] ?? 0) + 1), a), {});
    for (const [t, k] of Object.entries(counts)) if (k >= 3) out.push(`${p.id}: transition "${t}" used ${k} times`);
    if (q && p.recipe && p.recipe === q.recipe) out.push(`${p.id}: same recipe as ${q.id} (${p.recipe})`);
    if (q && p.clips[0]?.component === q.clips[0]?.component) out.push(`${p.id}: same opener as ${q.id} (${p.clips[0]?.component})`);
    if (q && p.music?.src && p.music.src === q.music?.src) out.push(`${p.id}: same music as ${q.id}`);
    const { clips } = layoutPost(p);
    const d = clips.map((c) => c.dur);
    if (d.length > 2 && Math.max(...d) - Math.min(...d) < 0.5) out.push(`${p.id}: uniform shot lengths`);
  });
  return out;
}
