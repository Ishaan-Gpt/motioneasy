// Every prompt kit. Add a kit file here and its components join the library under "Prompt kits".
import type { Component } from "@motioneasy/engine";
import type { Category } from "../categories";
import type { Kit, PromptSource } from "./types";
import prompts from "./prompts.json";
import { spotifyFilm } from "./spotify-film";

export * from "./types";

export const KITS: Kit[] = [spotifyFilm];

export const KIT_COMPONENTS: Component[] = KITS.flatMap((k) => k.components);

export const KIT_CATEGORIES: Category[] = KITS.map((k) => ({ id: `kit-${k.id}`, group: "kits", name: k.title, blurb: k.summary.split(". ")[0] + "." }));

export const PROMPTS = prompts as PromptSource[];
export const promptOf = (k: Kit) => PROMPTS.find((p) => p.id === k.promptId);
export const kitById = (id: string) => KITS.find((k) => k.id === id);
