// Where the engine finds its own assets (fonts, recorded sounds). The site serves them at /engine,
// the standalone HTML inlines or points at a hosted copy, the CLI points at its local server.

import { setAudioBase } from "./audio/mix";
import { setMediaBase } from "./media";
import { setFontData } from "./fonts";

let base = "/engine";

export function setAssetBase(url: string) {
  base = url.replace(/\/$/, "");
  setAudioBase(base);
}
export const getAssetBase = () => base;

export function configure(o: { assets?: string; media?: string; fonts?: Record<string, string> }) {
  if (o.assets !== undefined) setAssetBase(o.assets);
  if (o.media !== undefined) setMediaBase(o.media);
  if (o.fonts) setFontData(o.fonts);
}

setAudioBase(base);
