// Prop schemas. One definition drives the control panel on the site, spec validation, the JSON spec and
// the "editable props" table inside every exported prompt. Changing a prop never needs code or an LLM.

import type { FontId } from "./fonts";

export type ParamGroup = "content" | "media" | "style" | "motion" | "look" | "sound";

interface Base<T> {
  label: string;
  default: T;
  group?: ParamGroup;
  help?: string;
  /** Hide in the panel unless "advanced" is open. */
  advanced?: boolean;
}

export type MediaAccept = "image" | "video" | "any";

export type ParamDef =
  | (Base<string> & { type: "text"; multiline?: boolean; maxLength?: number; placeholder?: string })
  | (Base<string[]> & { type: "list"; min?: number; max?: number; maxLength?: number; itemLabel?: string })
  | (Base<number> & { type: "number"; min: number; max: number; step?: number; unit?: string })
  | (Base<boolean> & { type: "bool" })
  | (Base<string> & { type: "select"; options: { value: string; label: string }[] })
  | (Base<string> & { type: "color"; allowAuto?: boolean })
  | (Base<string | null> & { type: "media"; accept: MediaAccept })
  | (Base<string[]> & { type: "mediaList"; accept: MediaAccept; min?: number; max?: number })
  | (Base<FontId | "brand"> & { type: "font" })
  | (Base<unknown> & { type: "json" });

export type ParamSchema = Record<string, ParamDef>;

type Opt<T> = Omit<T, "type" | "default" | "label">;
type Of<K extends ParamDef["type"]> = Extract<ParamDef, { type: K }>;

/** Builders keep component files short and readable. */
export const P = {
  text: (d: string, label: string, o: Opt<Of<"text">> = {}): ParamDef => ({ type: "text", default: d, label, group: "content", ...o }),
  list: (d: string[], label: string, o: Opt<Of<"list">> = {}): ParamDef => ({ type: "list", default: d, label, group: "content", ...o }),
  number: (d: number, label: string, o: Opt<Of<"number">>): ParamDef => ({ type: "number", default: d, label, group: "motion", ...o }),
  bool: (d: boolean, label: string, o: Opt<Of<"bool">> = {}): ParamDef => ({ type: "bool", default: d, label, group: "style", ...o }),
  select: (d: string, label: string, options: (string | { value: string; label: string })[], o: Omit<Opt<Of<"select">>, "options"> = {}): ParamDef => ({
    type: "select", default: d, label, group: "style",
    options: options.map((x) => (typeof x === "string" ? { value: x, label: x[0].toUpperCase() + x.slice(1).replace(/-/g, " ") } : x)),
    ...o,
  }),
  color: (d: string, label: string, o: Opt<Of<"color">> = {}): ParamDef => ({ type: "color", default: d, label, group: "look", allowAuto: d === "auto", ...o }),
  media: (d: string | null, label: string, accept: MediaAccept = "any", o: Omit<Opt<Of<"media">>, "accept"> = {}): ParamDef => ({ type: "media", default: d, label, accept, group: "media", ...o }),
  mediaList: (d: string[], label: string, accept: MediaAccept = "any", o: Omit<Opt<Of<"mediaList">>, "accept"> = {}): ParamDef => ({ type: "mediaList", default: d, label, accept, group: "media", ...o }),
  font: (d: FontId | "brand", label: string, o: Opt<Of<"font">> = {}): ParamDef => ({ type: "font", default: d, label, group: "style", ...o }),
  json: (d: unknown, label: string, o: Opt<Of<"json">> = {}): ParamDef => ({ type: "json", default: d, label, group: "content", advanced: true, ...o }),
};

export type Props = Record<string, unknown>;

export function defaults(schema: ParamSchema): Props {
  const out: Props = {};
  for (const [k, d] of Object.entries(schema)) out[k] = structuredClone(d.default);
  return out;
}

/** Coerce arbitrary input into valid props: unknown keys dropped, bad values replaced by defaults. */
export function coerce(schema: ParamSchema, input: Props | undefined): { props: Props; issues: string[] } {
  const props = defaults(schema);
  const issues: string[] = [];
  if (!input) return { props, issues };
  for (const [k, v] of Object.entries(input)) {
    const d = schema[k];
    if (!d) {
      issues.push(`unknown prop "${k}" ignored`);
      continue;
    }
    const bad = (why: string) => issues.push(`prop "${k}": ${why}, default used`);
    switch (d.type) {
      case "text":
        if (typeof v !== "string") bad("expected text");
        else {
          props[k] = d.maxLength ? v.slice(0, d.maxLength) : v;
          if (d.maxLength && v.length > d.maxLength) issues.push(`prop "${k}": trimmed to ${d.maxLength} characters`);
        }
        break;
      case "list":
      case "mediaList":
        if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) bad("expected a list of text");
        else {
          props[k] = v.slice(0, d.max ?? 99);
          if (v.length > (d.max ?? 99)) issues.push(`prop "${k}": kept the first ${d.max ?? 99} items`);
        }
        break;
      case "number":
        if (typeof v !== "number" || !Number.isFinite(v)) bad("expected a number");
        else {
          props[k] = Math.min(d.max, Math.max(d.min, v));
          if (props[k] !== v) issues.push(`prop "${k}": ${v} is outside ${d.min}–${d.max}, clamped to ${props[k]}`);
        }
        break;
      case "bool":
        if (typeof v !== "boolean") bad("expected true/false");
        else props[k] = v;
        break;
      case "select":
        if (!d.options.some((o) => o.value === v)) bad(`expected one of ${d.options.map((o) => o.value).join(", ")}`);
        else props[k] = v;
        break;
      case "color":
        if (typeof v !== "string" || !(v === "auto" || /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v))) bad("expected #hex or auto");
        else props[k] = v;
        break;
      case "media":
        if (v !== null && typeof v !== "string") bad("expected a media path or null");
        else props[k] = v;
        break;
      case "font":
        if (typeof v !== "string") bad("expected a font id");
        else props[k] = v;
        break;
      case "json":
        props[k] = v;
        break;
    }
  }
  return { props, issues };
}

/** Human description of a param's allowed values (used in prompts and docs). */
export function describeParam(d: ParamDef): string {
  switch (d.type) {
    case "text":
      return `text${d.maxLength ? ` ≤ ${d.maxLength} chars` : ""}${d.multiline ? ", newlines allowed" : ""}; wrap words in *asterisks* for the accent style`;
    case "list":
      return `list of text (${d.min ?? 1}–${d.max ?? "∞"} items)`;
    case "number":
      return `number ${d.min}–${d.max}${d.unit ? ` ${d.unit}` : ""}`;
    case "bool":
      return "true | false";
    case "select":
      return d.options.map((o) => `"${o.value}"`).join(" | ");
    case "color":
      return `#hex${d.allowAuto ? ' | "auto"' : ""}`;
    case "media":
      return `${d.accept} file path/URL | null`;
    case "mediaList":
      return `list of ${d.accept} paths/URLs (${d.min ?? 0}–${d.max ?? "∞"})`;
    case "font":
      return '"brand" | "jakarta" | "inter" | "bricolage" | "instrument" | "fraunces" | "mono"';
    case "json":
      return "JSON";
  }
}
