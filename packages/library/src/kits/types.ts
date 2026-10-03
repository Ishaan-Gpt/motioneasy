// Prompt kits: each well-known launch / motion prompt, backtracked shot by shot into the reusable
// components it is made of. A kit keeps the prompt's own subject, copy, palette and timing as its
// defaults (nothing is re-branded), media starts as labelled placeholders, and its template chains the
// components in the original order so the whole film plays as a post.

import type { Component, FormatId } from "@motioneasy/engine";
import type { PostSpec } from "../sequence";

export type KitFamily = "showreel" | "launch" | "ui" | "social" | "intro";

export interface Shot {
  /** Seconds into the original film. */
  at: number;
  /** What happens, in the original's terms. */
  shot: string;
  /** The kit component that recreates it. */
  component?: string;
}

export interface Kit {
  id: string;
  /** Id of the source post in kits/prompts.json (author, link, full prompt text). */
  promptId: string;
  title: string;
  family: KitFamily;
  format: FormatId;
  /** One paragraph: what the original film is and how it is built. */
  summary: string;
  /** The original film, shot by shot. */
  shots: Shot[];
  /** Rules the original lives by (from the prompt): palette, type, motion, banned effects. */
  rules: string[];
  components: Component[];
  template: PostSpec;
}

export interface PromptSource {
  id: string;
  category: string;
  title: string;
  author: string;
  authorName: string;
  postUrl: string;
  poster: string;
  format: string;
  duration: number;
  likes: number;
  note: string;
  prompt: string;
  source: string;
  partial: boolean;
}
