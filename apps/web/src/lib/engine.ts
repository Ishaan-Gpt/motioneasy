"use client";

import { configure } from "@motioneasy/engine";

let done = false;
/** Point the engine at the site's assets: /engine (fonts, sounds) and /media (demo media). */
export function setupEngine() {
  if (done || typeof window === "undefined") return;
  done = true;
  configure({ assets: "/engine", media: "" });
}

export const siteUrl = () => (typeof window === "undefined" ? "" : window.location.origin);

export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
