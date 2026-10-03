// Posts: a sequence of components joined by transitions, with music under it. A post spec is plain JSON,
// so making the next post is editing values, not writing code.

import {
  P, cuesOf, defineComponent, drawRaw, durationOf, finish, propsFor, resolveTheme, CAPTIONSEASY,
  type Component, type FormatId, type Props, type SoundCue,
} from "@motioneasy/engine";
import { componentById } from "./registry";
import { TRANSITIONS, type TransitionId } from "./transitions";

export interface ClipSpec {
  component: string;
  props?: Props;
  /** Transition INTO this clip from the previous one. */
  transition?: TransitionId | { type: TransitionId; duration?: number };
  /** Override the clip length (seconds). Trims or extends the final hold. */
  duration?: number;
}

export interface MusicSpec {
  src: string;
  gain?: number;
  /** Start position inside the track (seconds). */
  offset?: number;
  fadeIn?: number;
  fadeOut?: number;
  credit?: string;
}

export interface PostSpec {
  id?: string;
  title?: string;
  format?: FormatId;
  fps?: number;
  /** Look applied to every clip unless the clip overrides it (mode, bg, fg, accent, glow, lighting, grain, vignette). */
  look?: Props;
  clips: ClipSpec[];
  music?: MusicSpec | null;
  /** Post-level props (sound on/off, volume). */
  props?: Props;
  notes?: string;
}

interface Built {
  comp: Component;
  props: Props;
  start: number;
  dur: number;
  /** overlap with the previous clip (transition length) */
  tin: number;
  trans: TransitionId;
}

const LOOK_KEYS = ["mode", "bg", "fg", "accent", "glow", "lighting", "grain", "vignette"];

export function layoutPost(spec: PostSpec): { clips: Built[]; duration: number } {
  const clips: Built[] = [];
  let cursor = 0;
  spec.clips.forEach((cs, i) => {
    const comp = componentById(cs.component);
    if (!comp) throw new Error(`Unknown component "${cs.component}" in clip ${i + 1}`);
    const look: Props = {};
    for (const k of LOOK_KEYS) if (spec.look && k in spec.look) look[k] = spec.look[k];
    const { props } = propsFor(comp, { ...look, ...(cs.props ?? {}) });
    const natural = durationOf(comp, props);
    const dur = cs.duration ?? natural;
    const tr = typeof cs.transition === "string" ? { type: cs.transition } : cs.transition ?? { type: "cut" as TransitionId };
    const def = TRANSITIONS[tr.type] ?? TRANSITIONS.cut;
    const tin = i === 0 ? 0 : Math.min(tr.duration ?? def.duration, dur * 0.5, clips[i - 1].dur * 0.5);
    const start = i === 0 ? 0 : cursor - tin;
    clips.push({ comp, props, start, dur, tin, trans: def.id });
    cursor = start + dur;
  });
  return { clips, duration: cursor };
}

/** Build a virtual component that plays the whole post. */
export function buildSequence(spec: PostSpec): Component {
  const { clips, duration } = layoutPost(spec);
  const fps = spec.fps ?? 60;
  const cues = (p: Props): SoundCue[] => {
    const out: SoundCue[] = [];
    for (const c of clips) {
      for (const q of cuesOf(c.comp, c.props, spec.format ?? "vertical")) if (q.at < c.dur) out.push({ ...q, at: q.at + c.start });
      if (c.tin > 0) for (const q of TRANSITIONS[c.trans].sounds(c.tin)) out.push({ ...q, at: q.at + c.start });
    }
    if (spec.music?.src) {
      out.push({
        at: 0, sound: `url:${spec.music.src}`, gain: spec.music.gain ?? 0.55, offset: spec.music.offset ?? 0,
        len: duration, fadeIn: spec.music.fadeIn ?? 0.2, fadeOut: spec.music.fadeOut ?? 1.2, role: "music",
      });
    }
    void p;
    return out;
  };
  return defineComponent({
    id: spec.id ?? "post",
    name: spec.title ?? "Post",
    version: "1.0.0",
    group: "scenes",
    category: "posts",
    description: spec.notes ?? "A sequence of components.",
    tags: [],
    added: "2026-10-03",
    theme: false,
    params: { _: P.bool(true, "internal", { advanced: true }) },
    duration: () => duration,
    sounds: (p) => cues(p),
    render(c) {
      const t = c.t;
      const active = clips.filter((k) => t >= k.start && t < k.start + k.dur);
      if (!active.length) active.push(clips[clips.length - 1]);
      const opts = { format: c.format, fps, media: c.env.media, pool: c.env.pool, brand: c.brand, quality: c.env.quality, scale: c.s };
      const draw = (k: Built, ctx = c.ctx) => {
        const lt = Math.min(k.dur, t - k.start);
        const theme = drawRaw(ctx, k.comp, k.props, lt, opts);
        finish(ctx, theme, lt, fps, c.W, c.H, c.s);
      };
      if (active.length === 1) {
        draw(active[0]);
        return;
      }
      const [a, b] = active.sort((x, y) => x.start - y.start);
      const u = Math.min(1, Math.max(0, (t - b.start) / Math.max(1e-3, b.tin)));
      const A = c.layer(c.W, c.H, (lc) => draw(a, lc.ctx));
      const B = c.layer(c.W, c.H, (lc) => draw(b, lc.ctx));
      c.ctx.save();
      c.ctx.setTransform(c.s, 0, 0, c.s, 0, 0);
      c.ctx.fillStyle = resolveTheme(b.props, c.brand ?? CAPTIONSEASY).bg;
      c.ctx.fillRect(0, 0, c.W, c.H);
      TRANSITIONS[b.trans].draw(c, A, B, u);
      c.ctx.restore();
    },
  });
}

export const postDuration = (spec: PostSpec) => layoutPost(spec).duration;
