// The library's hierarchy: Group → Category → Component. Like 21st.dev's Marketing Blocks / UI
// Components split: Scenes are complete beats you can post; Elements are the parts scenes are made of.

import type { Group } from "@motioneasy/engine";
import { KIT_CATEGORIES } from "./kits";

export interface Category {
  id: string;
  group: Group;
  name: string;
  blurb: string;
}

export const GROUPS: { id: Group; name: string; blurb: string }[] = [
  { id: "scenes", name: "Scenes", blurb: "Complete, ready-to-post beats: hooks, reveals, proof, end cards." },
  { id: "elements", name: "Elements", blurb: "The building blocks: type, media, devices, overlays, transitions, light." },
  { id: "kits", name: "Prompt kits", blurb: "Famous launch and motion prompts, rebuilt shot by shot in their original form, as blank templates." },
];

export const CATEGORIES: Category[] = [
  { id: "hooks", group: "scenes", name: "Hooks", blurb: "The first two seconds. Stop the scroll." },
  { id: "reveals", group: "scenes", name: "Product Reveals", blurb: "The product enters, beautifully." },
  { id: "proof", group: "scenes", name: "Stats & Proof", blurb: "Numbers, claims and receipts." },
  { id: "lists", group: "scenes", name: "Lists & Steps", blurb: "Tips, steps and how-tos." },
  { id: "quotes", group: "scenes", name: "Quotes & Testimonials", blurb: "Other people saying it for you." },
  { id: "launch", group: "scenes", name: "Launches", blurb: "Announcements, countdowns, now-live moments." },
  { id: "compare", group: "scenes", name: "Before / After", blurb: "Show the difference." },
  { id: "endcards", group: "scenes", name: "End Cards & CTAs", blurb: "Logo, line, link. Land the ask." },
  { id: "kinetic-type", group: "elements", name: "Kinetic Type", blurb: "Type that moves with intent." },
  { id: "text-reveals", group: "elements", name: "Text Reveals", blurb: "Ways for words to arrive." },
  { id: "numbers", group: "elements", name: "Numbers & Data", blurb: "Counters, odometers, charts." },
  { id: "captions", group: "elements", name: "Captions", blurb: "Word-timed captions over your footage." },
  { id: "devices", group: "elements", name: "Devices & Frames", blurb: "Phones, browsers and windows in 3D." },
  { id: "media", group: "elements", name: "Media Layouts", blurb: "Carousels, stacks, grids, walls, splits." },
  { id: "overlays", group: "elements", name: "Overlays", blurb: "Lower thirds, pills, callouts, cursors." },
  { id: "transitions", group: "elements", name: "Transitions", blurb: "Cuts with intent: whips, irises, zooms." },
  { id: "backgrounds", group: "elements", name: "Backgrounds & Light", blurb: "Stages, light pools, grids, loops." },
  { id: "logos", group: "elements", name: "Logo Stings", blurb: "Your mark, revealed with care." },
];

CATEGORIES.push(...KIT_CATEGORIES);

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
