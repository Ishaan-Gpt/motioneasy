// The component contract. A component is data (id, params, sounds) plus one pure render function of
// (context, props) where the context carries the time. Nothing else: no state, no timers, no randomness
// that isn't seeded. That is what makes a spec reproducible to the frame.

import type { RC } from "./context";
import { FORMAT_IDS, type FormatId } from "./formats";
import { P, coerce, defaults, type ParamSchema, type Props } from "./params";
import type { SoundCue } from "./audio/mix";
import { recordedFor } from "./audio/library";
import { SYNTHS } from "./audio/synth";
import { themeParams, type CameraMove, type ThemeDefaults } from "./theme";
import { mediaRefs } from "./media";

export type Group = "scenes" | "elements";

export interface ComponentDef<Pr extends Props = Props> {
  id: string;
  name: string;
  version: string;
  group: Group;
  category: string;
  description: string;
  tags: string[];
  /** Seconds at speed 1. */
  duration: number | ((p: Pr) => number);
  formats?: FormatId[];
  params: ParamSchema;
  /** Default look (mode, lighting, grain, vignette); false = component handles its own look. */
  theme?: ThemeDefaults | false;
  /** Preferred camera move when the Camera prop is "auto" (default push-in; "still" for shots with their own 3D camera). */
  camera?: CameraMove;
  sounds?: (p: Pr, info: { dur: number; format: FormatId }) => SoundCue[];
  render: (c: RC, p: Pr) => void;
  /** Extra media this component draws that isn't in a media param (e.g. the clips inside a post). */
  media?: (p: Pr) => string[];
  /** Poster frame as a fraction of the duration. */
  poster?: number;
  /** Sub-frame motion blur samples on export (0 = component does its own blur). */
  shutter?: number;
  credits?: string[];
  /** What it's for, and what NOT to pair it with. */
  notes?: string;
  featured?: boolean;
  added: string;
}

export interface Component<Pr extends Props = Props> extends ComponentDef<Pr> {
  /** Full schema including the standard Look, Motion and Sound params. */
  schema: ParamSchema;
}

const STANDARD = (theme: ThemeDefaults | false | undefined): ParamSchema => ({
  speed: P.number(1, "Speed", { min: 0.5, max: 2, step: 0.05, unit: "×", group: "motion", help: "Plays the whole component faster or slower. Sounds follow." }),
  ...(theme === false ? {} : themeParams(theme ?? {})),
  sound: P.bool(true, "Sound", { group: "sound" }),
  volume: P.number(1, "Volume", { min: 0, max: 1.5, step: 0.05, group: "sound" }),
  soundKit: P.select("recorded", "Sound kit", [
    { value: "recorded", label: "Recorded (real whooshes, hits, foley)" },
    { value: "synth", label: "Synthesised" },
  ], { group: "sound", help: "Recorded swaps each sound role for a matching CC0 recording where one exists." }),
  soundTone: P.number(0.5, "Sound brightness", { min: 0, max: 1, step: 0.05, group: "sound", advanced: true }),
});

export function defineComponent<Pr extends Props = Props>(def: ComponentDef<Pr>): Component<Pr> {
  return { ...def, schema: { ...def.params, ...STANDARD(def.theme) } };
}

export const componentFormats = (c: ComponentDef) => c.formats ?? FORMAT_IDS;

/** Duration in seconds after the speed prop. */
export function durationOf(c: ComponentDef, props: Props) {
  const base = typeof c.duration === "function" ? c.duration(props) : c.duration;
  const speed = typeof props.speed === "number" && props.speed > 0 ? props.speed : 1;
  return base / speed;
}

/** Sound cues in output time (speed applied, volume/tone applied, muted if sound is off). */
export function cuesOf(c: ComponentDef, props: Props, format: FormatId): SoundCue[] {
  if (!c.sounds || props.sound === false) return [];
  const speed = typeof props.speed === "number" && props.speed > 0 ? props.speed : 1;
  const base = typeof c.duration === "function" ? c.duration(props) : c.duration;
  const vol = typeof props.volume === "number" ? props.volume : 1;
  const tone = typeof props.soundTone === "number" ? props.soundTone : 0.5;
  const recorded = props.soundKit !== "synth";
  return c.sounds(props, { dur: base, format }).map((q, i) => {
    const cue: SoundCue = { ...q, at: q.at / speed, len: q.len !== undefined ? q.len / speed : undefined, gain: (q.gain ?? 1) * vol, tone: q.tone ?? tone };
    const rec = recorded ? recordedFor(q.sound, (q.seed ?? 0) + i) : null;
    if (!rec) return cue;
    // A recorded riser can't stretch: start it so its end still lands where the synth's would.
    const synth = SYNTHS[q.sound];
    const end = synth?.stretch ? cue.at + (cue.len ?? synth.dur / speed) : null;
    return { ...cue, sound: rec.id, len: undefined, at: end !== null && rec.len ? Math.max(0, end - rec.len) : cue.at };
  });
}

export function propsFor(c: Component, input?: Props) {
  return coerce(c.schema, input);
}

export const defaultProps = (c: Component) => defaults(c.schema);

/** Keys of params that hold media (for preloading). */
export const mediaKeys = (schema: ParamSchema) => Object.entries(schema).filter(([, d]) => d.type === "media" || d.type === "mediaList").map(([k]) => k);

/** Every media ref a component will draw with these props (what the player and exporter preload). */
export const mediaOf = (c: Component, props: Props): string[] => [...new Set([...mediaRefs(props, mediaKeys(c.schema)), ...(c.media?.(props) ?? [])])];

// ── Specs: the JSON a post / prompt / CLI passes around ───────────────────
export interface ComponentSpec {
  component: string;
  version?: string;
  format?: FormatId;
  fps?: number;
  props?: Props;
}

/** Props that differ from the defaults (keeps specs and prompts short). */
export function diffProps(c: Component, props: Props): Props {
  const d = defaults(c.schema);
  const out: Props = {};
  for (const [k, v] of Object.entries(props)) if (JSON.stringify(v) !== JSON.stringify(d[k])) out[k] = v;
  return out;
}
