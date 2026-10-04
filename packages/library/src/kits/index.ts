// Every prompt kit. Add a kit file here and its components join the library under "Prompt kits".
import type { Component } from "@motioneasy/engine";
import type { Category } from "../categories";
import type { Kit, PromptSource } from "./types";
import prompts from "./prompts.json";
import { spotifyFilm } from "./spotify-film";
import { keynoteOneTake } from "./keynote-one-take";
import { minimalLaunch } from "./minimal-launch";
import { uiMorphLoop } from "./ui-morph-loop";
import { makermap } from "./makermap";
import { spritesPromo } from "./sprites-promo";
import { pokedexMorph } from "./pokedex-morph";
import { techhallaBumper } from "./techhalla-bumper";
import { buildTheFloor } from "./build-the-floor";
import { tanstackAI } from "./tanstack-ai";
import { notchBrowser } from "./notch-browser";
import { motionReel } from "./motion-reel";
import { productShowreel } from "./product-showreel";

export * from "./types";

export const KITS: Kit[] = [spotifyFilm, keynoteOneTake, minimalLaunch, uiMorphLoop, makermap, spritesPromo, pokedexMorph, techhallaBumper, buildTheFloor, tanstackAI, notchBrowser, motionReel, productShowreel];

export const KIT_COMPONENTS: Component[] = KITS.flatMap((k) => k.components);

export const KIT_CATEGORIES: Category[] = KITS.map((k) => ({ id: `kit-${k.id}`, group: "kits", name: k.title, blurb: k.summary.split(". ")[0] + "." }));

export const PROMPTS = prompts as PromptSource[];
export const promptOf = (k: Kit) => PROMPTS.find((p) => p.id === k.promptId);
export const kitById = (id: string) => KITS.find((k) => k.id === id);
