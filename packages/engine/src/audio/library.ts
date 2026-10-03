// The sound library: every sound a component can cue, with the metadata the site shows.
// "synth" sounds are generated (see synth.ts); "sample" sounds are CC0 recordings shipped with the site.

export type SoundCategory = "whoosh" | "impact" | "riser" | "tonal" | "ui" | "foley" | "fx" | "music";

export interface SoundInfo {
  id: string;
  name: string;
  category: SoundCategory;
  kind: "synth" | "sample";
  description: string;
  /** For samples: path relative to the engine asset base. */
  file?: string;
  credit?: string;
  license?: string;
  source?: string;
  stretch?: boolean;
}

export const SOUND_CATEGORIES: { id: SoundCategory; name: string; blurb: string }[] = [
  { id: "whoosh", name: "Whooshes", blurb: "Camera moves, whips, swipes and pass-bys." },
  { id: "impact", name: "Impacts", blurb: "Landings, slams, drops and trailer hits." },
  { id: "riser", name: "Risers", blurb: "Builds that land exactly on the hit." },
  { id: "tonal", name: "Tonal", blurb: "Shimmers, chimes and swells for reveals." },
  { id: "ui", name: "UI", blurb: "Clicks, ticks and pops for interface moments." },
  { id: "foley", name: "Foley", blurb: "Real-object sounds: keys, shutters, markers." },
  { id: "fx", name: "FX", blurb: "Glitches and pulses." },
  { id: "music", name: "Music", blurb: "Beds for full posts (CC-BY, credited)." },
];

export const SYNTH_SOUNDS: SoundInfo[] = [
  { id: "whoosh.air", name: "Air Pass", category: "whoosh", kind: "synth", description: "Soft, wide pass-by. The default for camera pushes and slides." },
  { id: "whoosh.whip", name: "Whip", category: "whoosh", kind: "synth", description: "Fast directional whip with a doppler edge. For whip pans and hard cuts." },
  { id: "whoosh.deep", name: "Deep Pass", category: "whoosh", kind: "synth", description: "Slow, heavy cinematic pass. For big reveals and fly-throughs." },
  { id: "whoosh.swipe", name: "Swipe", category: "whoosh", kind: "synth", description: "Short bright swipe. Card flicks, tab switches, small UI moves." },
  { id: "impact.sub", name: "Sub Boom", category: "impact", kind: "synth", description: "Deep sub drop with a crack on top. Use for the one big hit." },
  { id: "impact.punch", name: "Punch", category: "impact", kind: "synth", description: "Tight, dry punch. Word slams on the beat." },
  { id: "impact.land", name: "Soft Land", category: "impact", kind: "synth", description: "A card or phone settling onto the table." },
  { id: "impact.trailer", name: "Trailer Hit", category: "impact", kind: "synth", description: "Sub + metal ring + hall. The end-card hit." },
  { id: "impact.808", name: "808 Drop", category: "impact", kind: "synth", description: "Long saturated 808 under a beat drop." },
  { id: "riser.build", name: "Build", category: "riser", kind: "synth", description: "Noise + saw stack that climbs and stops dead on the hit.", stretch: true },
  { id: "riser.reverse", name: "Reverse Swell", category: "riser", kind: "synth", description: "Reversed wash that sucks into the next shot.", stretch: true },
  { id: "riser.air", name: "Air Swell", category: "riser", kind: "synth", description: "Breathy swell for slow reveals.", stretch: true },
  { id: "tonal.shimmer", name: "Shimmer", category: "tonal", kind: "synth", description: "A spray of glassy partials. One per video, on the hero." },
  { id: "tonal.chime", name: "Glass Chime", category: "tonal", kind: "synth", description: "Single clean bell for a logo or a number landing." },
  { id: "tonal.pad", name: "Pad Swell", category: "tonal", kind: "synth", description: "Warm open chord swell under an intro or outro.", stretch: true },
  { id: "tonal.notify", name: "Notify", category: "tonal", kind: "synth", description: "Two-note soft ping for notification moments." },
  { id: "ui.click", name: "Click", category: "ui", kind: "synth", description: "Mouse click with press and release." },
  { id: "ui.tick", name: "Tick", category: "ui", kind: "synth", description: "Tiny tick for counters, odometers and steps." },
  { id: "ui.pop", name: "Pop", category: "ui", kind: "synth", description: "Quick pop for chips and badges appearing." },
  { id: "foley.key", name: "Keystroke", category: "foley", kind: "synth", description: "Mechanical key press; every seed is a slightly different key." },
  { id: "foley.shutter", name: "Shutter", category: "foley", kind: "synth", description: "Camera shutter: two curtain clicks." },
  { id: "foley.marker", name: "Marker", category: "foley", kind: "synth", description: "Felt marker dragged across paper.", stretch: true },
  { id: "fx.glitch", name: "Glitch", category: "fx", kind: "synth", description: "Seeded digital stutter.", stretch: true },
  { id: "fx.heartbeat", name: "Heartbeat", category: "fx", kind: "synth", description: "Two low thumps. Tension before a reveal." },
];

/** Recorded sounds and music. Registered by the host (site/CLI) from the sample manifest. */
const extra: SoundInfo[] = [];
export function registerSounds(list: SoundInfo[]) {
  for (const s of list) if (!extra.some((e) => e.id === s.id)) extra.push(s);
}

export const allSounds = () => [...SYNTH_SOUNDS, ...extra];
export const soundInfo = (id: string) => allSounds().find((s) => s.id === id);
