import { E, P, clamp, defineComponent, pr, spring, SPRING, tw, type SoundCue } from "@motioneasy/engine";
import { blockWindow, maskRise, stage, style, heroWord } from "../kit";
import { SCREENS } from "../demo";
import { drawBrowser, drawClick, drawCursor } from "../parts";

type Props = { media: string | null; url: string; headline: string; scroll: number; cursor: boolean; targetX: number; targetY: number; theme: "light" | "dark"; font: string };

const URL_AT = 0.75;
const CLICK = 3.55;

export default defineComponent<Props>({
  id: "browser-drop",
  name: "Browser Drop",
  version: "1.0.0",
  group: "elements",
  category: "devices",
  description: "A browser window drops into place with a 3D tilt, the URL types itself, the page glides down, and a cursor flies in and clicks your call to action.",
  tags: ["website", "browser", "cursor", "product", "saas"],
  added: "2026-10-03",
  camera: "drift",
  featured: true,
  theme: { mode: "light", lighting: 0.6, grain: 0.25, vignette: 0.25 },
  notes: "Use a real screenshot of your site (2× resolution looks best). Point the click at your real CTA.",
  params: {
    media: P.media(SCREENS.hero, "Page screenshot", "image"),
    url: P.text("captionseasy.com", "URL", { maxLength: 40 }),
    headline: P.text("Don't edit. *Just upload.*", "Headline", { maxLength: 50 }),
    scroll: P.number(0.04, "Page scroll", { min: 0, max: 0.8, step: 0.01, help: "How far down the page glides (fraction of its height)." }),
    cursor: P.bool(true, "Cursor click"),
    targetX: P.number(0.42, "Click X", { min: 0, max: 1, step: 0.01, group: "style", help: "Where the cursor clicks, as a fraction of the page width." }),
    targetY: P.number(0.39, "Click Y", { min: 0, max: 1, step: 0.01, group: "style", help: "…and of the page height." }),
    theme: P.select("light", "Window", ["light", "dark"]),
    font: P.font("brand", "Typeface"),
  },
  duration: 5.2,
  poster: 0.55,
  sounds: (p) => {
    const cues: SoundCue[] = [
      { at: 0.02, sound: "whoosh.air", gain: 0.55, role: "drop" },
      { at: 0.62, sound: "impact.land", gain: 0.55, role: "settle" },
    ];
    const n = p.url.length;
    for (let i = 0; i < n; i++) cues.push({ at: URL_AT + i * 0.045, sound: "foley.key", gain: 0.3, seed: (i % 4) + 1, role: "type" });
    cues.push({ at: 1.8, sound: "whoosh.swipe", gain: 0.35, role: "scroll" });
    if (p.cursor) {
      cues.push({ at: CLICK - 0.85, sound: "whoosh.air", gain: 0.3, seed: 3, role: "cursor" });
      cues.push({ at: CLICK, sound: "ui.click", gain: 0.85, role: "click" });
    }
    return cues;
  },
  render(c, p) {
    const T = c.theme;
    const t = c.t;
    const hasHead = !!p.headline;
    // The window takes the screenshot's shape, as wide as the format allows.
    const info = c.mediaInfo(p.media);
    const ar = info ? info.w / info.h : 16 / 10;
    const w = c.vertical ? c.W - 60 : c.landscape ? c.W * 0.64 : c.safe.w;
    const bar = Math.round(Math.max(44, w * 0.052));
    const contentH = Math.min(w / ar, c.H * 0.62);
    const h = contentH + bar;
    const L = hasHead ? c.fit(p.headline, style(c, c.vertical ? 104 : 80, { fontParam: p.font, weight: 750 }), c.safe.w * 0.92, 240, { maxLines: c.vertical ? 2 : 1, align: "center" }) : null;
    const headGap = c.vertical ? 110 : 54;
    // Headline + window are centred as one group.
    const groupH = h + (L ? L.height + headGap : 0);
    const wy = c.cy - groupH / 2 + (L ? L.height + headGap : 0) + h / 2;
    stage(c, { word: heroWord(p.headline), kind: "studio", focus: [c.cx, wy] });
    if (L) {
      const u = pr(t, 0.4, 1.2, E.out);
      const top = wy - h / 2 - L.height - headGap;
      const win = blockWindow(L);
      maskRise(c, top + win.top, win.h, u, () => c.drawLayout(L, c.cx - L.width / 2, top, { color: T.fg, emColor: T.accent }));
    }
    // Drop: from above, tilted back, onto the table with a spring.
    const drop = Math.min(1.02, spring(t - 0.05, SPRING.firm));
    const rx = (1 - drop) * -28;
    const y = (1 - Math.min(1, drop)) * -c.H * 0.55;
    const clickU = pr(t, CLICK, CLICK + 0.5);
    const push = 1 + 0.08 * pr(t, CLICK, CLICK + 1.3, E.out);
    const urlU = clamp((t - URL_AT) / (p.url.length * 0.045 + 0.001));
    const scrollPx = pr(t, 1.6, 3.0, E.inOut) * p.scroll * (w / ar);
    // Click target in frame space: image coordinates minus the scroll.
    const px = c.cx - w / 2 + p.targetX * w;
    const pyy = wy - h / 2 + bar + p.targetY * (w / ar) - scrollPx;
    const cam = c.camera({ fov: 28 });
    const win = c.layer(w, h, (lc) =>
      drawBrowser(lc, w, h, {
        url: p.url,
        urlProgress: urlU,
        theme: p.theme,
        radius: Math.max(14, w * 0.022),
        content: (cc, cw) => cc.media(p.media, 0, -scrollPx, cw, cw / ar, { fit: "cover" }),
      }),
    { res: 1.1 });
    c.with({ x: px, y: pyy, scale: push }, () => {
      c.translate(-px, -pyy);
      if (drop > 0.4) c.cardShadow(c.cx - w / 2, wy - h / 2 + y, w, h, 22, 0.6, 1.1 * clamp((drop - 0.4) / 0.6));
      cam.plane(win, { x: 0, y: wy - c.cy + y, z: 0, w, h, rx });
      if (p.cursor && t > CLICK - 1.0) {
        const m = pr(t, CLICK - 1.0, CLICK - 0.08, E.ramp);
        const sx = c.cx + w * 0.55, sy = wy + h * 0.7;
        const cx = tw(m, 0, 1, sx, px), cy = tw(m, 0, 1, sy, pyy) + Math.sin(m * Math.PI) * -60;
        drawClick(c, px, pyy, clickU, T.fg);
        const press = t > CLICK - 0.05 && t < CLICK + 0.14 ? 1 : 0;
        drawCursor(c, cx, cy, { scale: 1.25 / push, press, dark: T.mode === "dark" });
      }
    });
  },
});
