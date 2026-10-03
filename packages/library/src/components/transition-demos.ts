// Every transition is also a library component: shot A → transition → shot B. In a post, the same
// transition joins any two clips (see sequence.ts).

import { P, alpha, defineComponent, type Component, type RC } from "@motioneasy/engine";
import { CLIPS } from "../demo";
import { TRANSITIONS, type TransitionId } from "../transitions";

type Props = { from: string | null; to: string | null; labelA: string; labelB: string; hold: number; length: number };

function plate(c: RC, media: string | null, label: string, key: string, t: number) {
  c.media(media, 0, 0, c.W, c.H, { t, focus: [0.5, 0.35], key });
  c.rect(0, 0, c.W, c.H, c.linear(0, 0, 0, c.H, [[0, alpha("#000", 0.25)], [0.4, alpha("#000", 0)], [1, alpha("#000", 0.3)]]));
  if (label) {
    const L = c.layout(label, { font: c.theme.mono, size: c.vertical ? 30 : 24, weight: 500, tracking: 0.16, uppercase: true });
    c.drawLayout(L, c.safe.x, c.safe.y, { color: "#FFFFEB" });
  }
}

function make(id: TransitionId, featured: boolean): Component {
  const def = TRANSITIONS[id];
  return defineComponent<Props>({
    id: `tr-${id}`,
    name: def.name,
    version: "1.0.0",
    group: "elements",
    category: "transitions",
    description: def.description + " Drop it between any two clips in a post.",
    tags: ["transition", id, "cut"],
    added: "2026-10-03",
    featured,
    theme: { mode: "dark", lighting: 0, grain: 0.3, vignette: 0.35 },
    notes: "In a post, set `transition` on the incoming clip. Use one signature transition per post; plain cuts between the rest.",
    params: {
      from: P.media(CLIPS.gianna.src, "Shot A", "any"),
      to: P.media(CLIPS.jesse.src, "Shot B", "any"),
      labelA: P.text("Shot A", "Label A", { maxLength: 20 }),
      labelB: P.text("Shot B", "Label B", { maxLength: 20 }),
      hold: P.number(0.9, "Hold each shot", { min: 0.3, max: 3, step: 0.1, unit: "s" }),
      length: P.number(def.duration || 0.4, "Transition length", { min: 0.1, max: 1.5, step: 0.02, unit: "s" }),
    },
    duration: (p) => p.hold * 2 + p.length,
    poster: 0.48,
    sounds: (p) => def.sounds(p.length).map((q) => ({ ...q, at: q.at + p.hold })),
    render(c, p) {
      const t = c.t;
      const u = Math.min(1, Math.max(0, (t - p.hold) / Math.max(0.001, p.length)));
      if (u <= 0) return plate(c, p.from, p.labelA, "a", t);
      if (u >= 1) return plate(c, p.to, p.labelB, "b", t - p.hold);
      const A = c.layer(c.W, c.H, (lc) => plate(lc, p.from, p.labelA, "a", t));
      const B = c.layer(c.W, c.H, (lc) => plate(lc, p.to, p.labelB, "b", t - p.hold));
      def.draw(c, A, B, u);
    },
  }) as unknown as Component;
}

export const TRANSITION_COMPONENTS: Component[] = (["whip", "zoom", "push", "slide", "iris", "wipe", "shutter", "flash", "blur", "cut"] as TransitionId[]).map((id) =>
  make(id, id === "whip" || id === "zoom"),
);
