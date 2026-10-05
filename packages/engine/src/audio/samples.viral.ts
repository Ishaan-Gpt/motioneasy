// The owner's own "viral" SFX pack (user-provided recordings, packages/engine/assets/sounds/viral-*.wav).
// Kept apart from samples.gen.ts so regenerating the CC0 pack never drops them; they are the first pick
// for their roles in RECORDED_FOR.
import type { SoundInfo } from "./library";

const src = "owner-provided (Ishaan's SFX folder)";
export const VIRAL_SOUNDS: SoundInfo[] = [
  { id: "viral.woosh", name: "Viral Woosh", category: "whoosh", kind: "sample", description: "Punchy short-form woosh for camera moves and slides.", file: "sounds/viral-woosh.wav", credit: "Owner's SFX pack", license: "owner-provided", source: src, len: 1.341 },
  { id: "viral.riser", name: "Viral Riser", category: "riser", kind: "sample", description: "Short riser into a reveal or a big move.", file: "sounds/viral-riser.wav", credit: "Owner's SFX pack", license: "owner-provided", source: src, len: 3.119 },
  { id: "viral.ui-riser", name: "UI Riser", category: "riser", kind: "sample", description: "Bright digital riser for UI and caption builds.", file: "sounds/viral-ui-riser.wav", credit: "Owner's SFX pack", license: "owner-provided", source: src, len: 2.173 },
  { id: "viral.typing", name: "Typing", category: "foley", kind: "sample", description: "A burst of keyboard typing under captions that type on.", file: "sounds/viral-typing.wav", credit: "Owner's SFX pack", license: "owner-provided", source: src, len: 2.412 },
  { id: "viral.ui-animations", name: "UI Animations", category: "ui", kind: "sample", description: "Glassy UI blips for elements popping in.", file: "sounds/viral-ui-animations.wav", credit: "Owner's SFX pack", license: "owner-provided", source: src, len: 2.002 },
  { id: "viral.finger-snap", name: "Finger Snap", category: "impact", kind: "sample", description: "A crisp snap for hits, cuts and reveals.", file: "sounds/viral-finger-snap.wav", credit: "Owner's SFX pack", license: "owner-provided", source: src, len: 2.628 },
];
