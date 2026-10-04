// Kit: "Developer-tool launch film" (@HowDevelop). TanStack AI, presented by Studio1: a dark graphite film
// where every transition demonstrates a feature — one signal becomes a network, chat() swaps providers
// without breaking the flow, one stream becomes every modality, agents branch into sandboxes and MCP, a
// stream drops and resumes, and every path converges on the reveal. Facts kept exactly (release candidate).

import { E, P, SPRING, alpha, clamp, defineComponent, glide, logLerp, mix, pr, rand, sp, type Component, type RC, type SoundCue } from "@motioneasy/engine";
import { maskRise } from "../kit";
import type { PostSpec } from "../sequence";
import { caret, typed } from "./shared";
import type { Kit } from "./types";

const BG = "#0B0C0E";
const INK = "#F2F2F0";
const MUTE = "#7C808A";
const PINK = "#FF5C8A";
const ORANGE = "#FF8A3D";
const TEAL = "#2DD4BF";
const VIOLET = "#8B7CFF";
const CYAN = "#38BDF8";
const LOOK = { mode: "dark" as const, bg: BG, fg: INK, accent: PINK, lighting: 0, grain: 0.25, vignette: 0.35, backdrop: "plain" as const, camera: "still" as const };

const sans = (size: number, weight = 700) => ({ font: "geist" as const, size, weight, tracking: -0.02, lineHeight: 1.12 });
const code = (size: number, weight = 500) => ({ font: "mono" as const, size, weight, tracking: 0 });

/** Luminous gradient fields drifting slowly behind the graphite; `hue` shifts the mix per scene. */
function field(c: RC, t: number, hue: [string, string, string], k = 1) {
  c.clear(BG);
  const d = (i: number) => Math.sin(t * 0.4 + i * 2.1) * c.W * 0.03;
  c.light(c.cx - c.W * 0.12 + d(1), c.cy + d(2), c.H * 0.55, hue[0], 0.22 * k, "screen");
  c.light(c.cx + c.W * 0.1 + d(3), c.cy - c.H * 0.08 + d(4), c.H * 0.5, hue[1], 0.18 * k, "screen");
  c.light(c.cx + d(5), c.cy + c.H * 0.12, c.H * 0.45, hue[2], 0.14 * k, "screen");
  // faint dot grid, the "graphite paper"
  c.ctx.fillStyle = alpha(INK, 0.05);
  for (let y = c.H * 0.04; y < c.H; y += c.H * 0.045) for (let x = c.W * 0.03; x < c.W; x += c.H * 0.045) c.ctx.fillRect(x, y, 1.4, 1.4);
}

/** Caption under the scene, masked in; stays inside the 9:16-safe centre. */
function caption(c: RC, lines: string[], t: number, at: number, y = c.H * 0.76) {
  lines.forEach((ln, i) => {
    const L = c.layout(ln, sans(c.H * 0.042, 700));
    const u = pr(t, at + i * 0.15, at + i * 0.15 + 0.4, E.out);
    const b = y + i * c.H * 0.05;
    maskRise(c, b - c.H * 0.045, c.H * 0.06, u, () => c.drawLayout(L, c.cx - L.width / 2, b - L.lines[0].y, { color: INK }));
  });
}

/** The central stream: a horizontal line of light with packets travelling along it. */
function stream(c: RC, t: number, x0: number, x1: number, y: number, a = 1, broken = -1) {
  const n = Math.floor((x1 - x0) / 14);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 14;
    if (broken > 0 && x > broken && x < broken + c.W * 0.06) continue;
    c.rect(x, y - 0.75, 7, 1.5, alpha(INK, 0.35 * a));
  }
  for (let k = 0; k < 3; k++) {
    const px = x0 + (((t * 0.45 + k / 3) % 1) * (x1 - x0));
    if (broken > 0 && px > broken) continue;
    c.light(px, y, c.H * 0.02, TEAL, 0.9 * a, "screen");
  }
}

function chip(c: RC, s: string, x: number, y: number, size: number, col: string, a = 1, fill?: string) {
  const L = c.layout(s, code(size, 600));
  const w = L.width + size * 1.2, h = size * 1.8;
  c.save();
  c.alpha(a);
  c.rrect(x - w / 2, y - h / 2, w, h, size * 0.4, fill ?? alpha(col, 0.14));
  c.strokeRRect(x - w / 2, y - h / 2, w, h, size * 0.4, alpha(col, 0.6), 1.2);
  c.drawLayout(L, x - L.width / 2, y - L.height / 2 + 1, { color: col });
  c.restore();
  return { w, h };
}

const base = { version: "1.0.0", group: "kits" as const, category: "kit-tanstack-ai", added: "2026-10-04", formats: ["landscape" as const], theme: LOOK, camera: "still" as const };

// 0:00–0:02 hook
const hook = defineComponent<{ question: string }>({
  ...base, id: "tanstack-signal-network", name: "Prompt Cursor → Network of Possibilities",
  description: "A single prompt cursor blinks; it sends one signal that expands into a network of possibilities, edges in luminous colours; the question types beneath it.",
  tags: ["hook", "network", "signal", "graph"],
  params: { question: P.text("What can one\nAI API become?", "Question", { multiline: true, maxLength: 50 }) },
  duration: 3,
  sounds: () => [{ at: 0.1, sound: "fx.heartbeat", gain: 0.25, role: "pulse" }, { at: 0.9, sound: "whoosh.air", gain: 0.35, role: "signal" }, { at: 1.3, sound: "tonal.shimmer", gain: 0.2, role: "network" }],
  render(c, p) {
    const t = c.t;
    field(c, t, [VIOLET, TEAL, ORANGE], pr(t, 0, 1));
    const cx = c.cx, cy = c.H * 0.42;
    if (t < 1.0) {
      if (caret(t)) c.rect(cx - 1, cy - c.H * 0.02, 2.5, c.H * 0.04, INK);
    }
    const grow = pr(t, 0.9, 2.4, E.out);
    if (grow > 0) {
      const pts: [number, number, string][] = [];
      const cols = [PINK, ORANGE, TEAL, VIOLET, CYAN];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        pts.push([cx + Math.cos(a) * c.H * 0.13 * grow, cy + Math.sin(a) * c.H * 0.13 * grow, cols[i % 5]]);
        const a2 = a + 0.4;
        const r2 = c.H * (0.2 + rand(i) * 0.06) * pr(t, 1.2, 2.6, E.out);
        if (r2 > 1) pts.push([cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2, cols[(i + 2) % 5]]);
      }
      for (const [x, y, col] of pts) {
        c.line(cx, cy, x, y, alpha(col, 0.55), 1.2);
        c.circle(x, y, 3, col);
      }
      for (let i = 0; i < pts.length - 1; i += 2) if (pts[i + 1]) c.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], alpha(pts[i][2], 0.3), 1);
      c.light(cx, cy, c.H * 0.05, "#FFFFFF", 0.8, "screen");
      c.circle(cx, cy, 4, "#FFFFFF");
    }
    const q = typed(p.question.replace("\n", " \n"), t, 0.2, 18).split("\n");
    q.forEach((ln, i) => {
      const L = c.layout(ln, sans(c.H * 0.042));
      c.drawLayout(L, c.cx - L.width / 2, c.H * 0.74 + i * c.H * 0.05 - L.lines[0].y, { color: INK });
    });
  },
});

// 0:02–0:04 chat() + providers
const PROVIDERS = ["openai", "anthropic", "ollama", "gemini", "grok", "vertex", "mistral", "bedrock"];

const providers = defineComponent<{ fn: string; count: number; providers: string[] }>({
  ...base, id: "tanstack-chat-providers", name: "chat() · Providers Swap",
  description: "The signal resolves into a chat() pill; provider nodes orbit it and swap rapidly while the central flow keeps running out to the right; an adapter counter ticks.",
  tags: ["code", "orbit", "providers", "api"],
  params: { fn: P.text("chat()", "Function", { maxLength: 16 }), count: P.number(24, "Providers", { min: 1, max: 999, step: 1, group: "content" }), providers: P.list(PROVIDERS, "Provider names", { max: 12 }) },
  duration: 4,
  sounds: () => [{ at: 0.05, sound: "impact.land", gain: 0.35, role: "resolve" }, ...[0.8, 1.3, 1.8, 2.3].map((at, i) => ({ at, sound: "ui.tick", gain: 0.25, seed: i, role: "swap" }) as SoundCue)],
  render(c, p) {
    const t = c.t;
    field(c, t, [ORANGE, PINK, VIOLET]);
    const cx = c.cx - c.W * 0.06, cy = c.H * 0.42;
    stream(c, t, cx + c.W * 0.07, c.W * 0.96, cy, pr(t, 0.2, 0.6));
    // orbit of providers: dotted ellipse, one highlighted, swapping on the beat
    const k = clamp(sp(t, 0, SPRING.firm), 0, 1.03);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      c.circle(cx + Math.cos(a) * c.W * 0.1 * k, cy + Math.sin(a) * c.H * 0.1 * k, 2, alpha(i % 3 ? ORANGE : PINK, 0.65));
    }
    const idx = Math.floor(Math.max(0, t - 0.6) / 0.5) % p.providers.length;
    const a = idx * 1.7 + t * 0.6;
    const px = cx + Math.cos(a) * c.W * 0.1, py = cy + Math.sin(a) * c.H * 0.1;
    c.light(px, py, c.H * 0.03, ORANGE, 0.8, "screen");
    c.circle(px, py, 4, "#FFF");
    c.drawLayout(c.layout(p.providers[idx] ?? "", code(c.H * 0.016)), px + 8, py - c.H * 0.03, { color: INK });
    // the pill
    const L = c.layout(p.fn, code(c.H * 0.068, 700));
    const w = L.width + c.H * 0.06, h = c.H * 0.085;
    c.with({ x: cx, y: cy, scale: 0.85 + 0.15 * k }, () => {
      c.rrect(-w / 2, -h / 2, w, h, h * 0.25, "#16171B");
      c.strokeRRect(-w / 2, -h / 2, w, h, h * 0.25, alpha(PINK, 0.5), 1.5);
      c.drawLayout(L, -L.width / 2, -L.height / 2 + 2, { color: PINK, emColor: INK });
    });
    const n = Math.min(p.count, 1 + Math.floor(Math.max(0, t - 0.6) / 0.5) * 3);
    c.drawLayout(c.layout(`adapter ${String(n).padStart(2, "0")}/${p.count}`, code(c.H * 0.013)), cx - c.W * 0.03, cy + h * 0.9, { color: MUTE });
    const C = c.layout(`${p.fn} · ${p.count} providers`, sans(c.H * 0.04));
    const u = pr(t, 0.4, 0.8, E.out);
    maskRise(c, c.H * 0.72, c.H * 0.06, u, () => {
      c.drawLayout(C, c.cx - C.width / 2, c.H * 0.76 - C.lines[0].y, { color: INK });
      c.drawLayout(c.layout(p.fn, sans(c.H * 0.04)), c.cx - C.width / 2, c.H * 0.76 - C.lines[0].y, { color: PINK });
    });
  },
});

// 0:04–0:06.5 multimodal
const modality = defineComponent<{ prompt: string; image: string | null; lines: string[] }>({
  ...base, id: "tanstack-modality-stream", name: "One Stream, Every Modality",
  description: "One continuous stream transforms in place: text tokens typing, an audio waveform, an image frame, a video timeline — tabs above tracking the current modality.",
  tags: ["multimodal", "stream", "morph", "waveform", "media"],
  params: { prompt: P.text("a sunrise over", "Text tokens", { maxLength: 30 }), image: P.media(null, "Image frame (empty = generated sunrise)", "image"), lines: P.list(["One pattern.", "Every modality."], "Caption", { max: 2 }) },
  duration: 4.5,
  sounds: () => [{ at: 0.1, sound: "foley.key", gain: 0.2, role: "text" }, { at: 0.9, sound: "whoosh.swipe", gain: 0.3, role: "audio" }, { at: 1.7, sound: "whoosh.swipe", gain: 0.3, role: "image" }, { at: 2.5, sound: "whoosh.swipe", gain: 0.3, role: "video" }],
  render(c, p) {
    const t = c.t;
    field(c, t, [ORANGE, VIOLET, TEAL]);
    const cy = c.H * 0.42;
    stream(c, t, c.W * 0.04, c.W * 0.96, cy);
    const tabs = ["TEXT", "AUDIO", "IMAGE", "VIDEO"];
    const m = Math.min(3, Math.floor(t / 1.0));
    tabs.forEach((s, i) => chip(c, s, c.cx + (i - 1.5) * c.W * 0.045, c.H * 0.2, c.H * 0.012, i === m ? PINK : MUTE, i === m ? 1 : 0.6, i === m ? alpha(PINK, 0.2) : "transparent"));
    const w = c.W * 0.21, h = c.H * 0.2;
    const x = c.cx - w / 2, y = cy - h / 2;
    const swap = (k: number) => pr(t, k * 1.0, k * 1.0 + 0.2);
    if (m === 0) {
      c.rrect(c.cx - c.W * 0.12, cy - c.H * 0.035, c.W * 0.24, c.H * 0.07, 8, "#15161A");
      const s = typed(p.prompt, t, 0.1, 18);
      const L = c.layout(s, code(c.H * 0.028));
      c.drawLayout(L, c.cx - c.W * 0.105, cy - L.height / 2, { color: INK });
      if (caret(t)) c.rect(c.cx - c.W * 0.105 + L.width + 3, cy - c.H * 0.016, 9, c.H * 0.032, ORANGE);
    } else if (m === 1) {
      for (let i = 0; i < 44; i++) {
        const hh = c.H * 0.12 * (0.25 + 0.75 * Math.abs(Math.sin(t * 8 + i * 0.55) * Math.sin(i * 0.3 + 0.4))) * swap(1);
        c.rrect(c.cx - c.W * 0.11 + i * c.W * 0.005, cy - hh / 2, c.W * 0.003, hh, 1.5, i % 2 ? CYAN : VIOLET);
      }
    } else if (m === 2) {
      c.save();
      c.alpha(swap(2));
      if (p.image) c.media(p.image, x, y, w, h, { radius: 8, key: "ts-img" });
      else {
        c.rrect(x, y, w, h, 8, c.linear(0, y, 0, y + h, [[0, "#3B2A7A"], [0.55, "#FF6A8A"], [1, "#FFB36B"]]));
        c.circle(c.cx, y + h * 0.7, h * 0.18, "#FFE8B0");
        for (let i = 0; i < 12; i++) c.rect(x + i * (w / 12), y + h * (0.62 + rand(i) * 0.2), w / 13, h, "#16111F");
      }
      c.strokeRRect(x, y, w, h, 8, alpha(PINK, 0.8), 2);
      c.restore();
    } else {
      c.rrect(x - c.W * 0.03, y + h * 0.25, w + c.W * 0.06, h * 0.5, 8, "#15161A");
      for (let i = 0; i < 6; i++) c.rrect(x - c.W * 0.025 + i * ((w + c.W * 0.05) / 6), y + h * 0.3, (w + c.W * 0.05) / 6 - 4, h * 0.4, 4, [VIOLET, PINK, ORANGE, TEAL, CYAN, VIOLET][i]);
      const ph = x - c.W * 0.025 + ((t - 2.4) * 0.8 % 1) * (w + c.W * 0.05);
      c.rect(ph, y + h * 0.2, 2, h * 0.6, "#FFF");
    }
    caption(c, p.lines, t, 0.2);
  },
});

// 0:06.5–0:09 agents, sandboxes, MCP
const agents = defineComponent<{ runs: string[]; tools: string[]; caption: string }>({
  ...base, id: "tanstack-agents-mcp", name: "Branching Agent Runs → MCP",
  description: "The stream branches into sandboxed agent runs progressing in parallel (each with a task, a progress bar and a status), then converges on an MCP node that reaches out to external tools.",
  tags: ["agents", "branching", "parallel", "mcp", "progress"],
  params: { runs: P.list(["agent 01|plan code + test", "agent 02|search repo + draft", "agent 03|review diff + patch"], "Runs (name|task)", { min: 2, max: 4 }), tools: P.list(["search", "github", "slack", "docs"], "Tools", { max: 5 }), caption: P.text("Agents · Sandboxes · MCP", "Caption", { maxLength: 40 }) },
  duration: 4,
  sounds: () => [{ at: 0.05, sound: "whoosh.swipe", gain: 0.3, role: "branch" }, { at: 1.4, sound: "ui.pop", gain: 0.25, role: "done" }, { at: 2.2, sound: "tonal.notify", gain: 0.25, role: "mcp" }],
  render(c, p) {
    const t = c.t;
    field(c, t, [VIOLET, CYAN, PINK]);
    const cy = c.H * 0.42, bx = c.W * 0.4;
    stream(c, t, c.W * 0.04, bx - c.W * 0.06, cy);
    const n = p.runs.length;
    const cw = c.W * 0.17, ch = c.H * 0.085;
    const mx = bx + cw + c.W * 0.05;
    p.runs.forEach((r, i) => {
      const [name, task] = r.split("|");
      const y = cy + (i - (n - 1) / 2) * ch * 1.35;
      const u = pr(t, 0.1 + i * 0.12, 0.5 + i * 0.12, E.out);
      if (u <= 0) return;
      const pts: [number, number][] = [];
      for (let k = 0; k <= 16; k++) { const f = k / 16; pts.push([bx - c.W * 0.06 + c.W * 0.06 * f, cy + (y - cy) * (f * f * (3 - 2 * f))]); }
      c.polyline(pts, alpha(INK, 0.45), 1.3, u);
      c.save();
      c.alpha(u);
      c.rrect(bx, y - ch / 2, cw, ch, 6, "#15161A");
      c.strokeRRect(bx, y - ch / 2, cw, ch, 6, alpha(INK, 0.12), 1);
      c.drawLayout(c.layout(name ?? "", code(c.H * 0.017, 700)), bx + 10, y - ch * 0.34, { color: INK });
      c.drawLayout(c.layout(task ?? "", code(c.H * 0.014)), bx + 10, y - ch * 0.04, { color: MUTE });
      const prog = clamp(pr(t, 0.4 + i * 0.2, 1.6 + i * 0.25));
      c.rect(bx + 8, y + ch * 0.3, (cw - 16) * prog, 2, [TEAL, ORANGE, VIOLET][i % 3]);
      chip(c, prog >= 1 ? "done" : "sandbox", bx + cw - c.W * 0.022, y - ch * 0.22, c.H * 0.009, prog >= 1 ? TEAL : MUTE);
      c.restore();
      c.line(bx + cw, y, mx - 14, cy, alpha(INK, 0.3 * pr(t, 1.6, 2.0)), 1);
    });
    const ma = pr(t, 1.6, 2.0, E.out);
    if (ma > 0) {
      chip(c, "MCP", mx, cy, c.H * 0.014, CYAN, ma, alpha(CYAN, 0.2));
      p.tools.forEach((s, i) => {
        const a = (i / Math.max(1, p.tools.length - 1) - 0.5) * 1.6;
        const tx = mx + Math.cos(a) * c.W * 0.1, ty = cy + Math.sin(a) * c.H * 0.14;
        const u = pr(t, 2.0 + i * 0.1, 2.3 + i * 0.1);
        c.line(mx + 18, cy, mx + 18 + (tx - mx - 18) * u, cy + (ty - cy) * u, alpha(CYAN, 0.4), 1);
        if (u >= 1) c.drawLayout(c.layout(s, code(c.H * 0.012)), tx + 6, ty - 6, { color: i === 1 ? CYAN : MUTE });
      });
    }
    const C = c.layout(p.caption, sans(c.H * 0.04));
    maskRise(c, c.H * 0.72, c.H * 0.06, pr(t, 0.3, 0.7, E.out), () => c.drawLayout(C, c.cx - C.width / 2, c.H * 0.76 - C.lines[0].y, { color: INK }));
  },
});

// AG-UI live interfaces
const agui = defineComponent<{ title: string; status: string; message: string; tool: string; lines: string[] }>({
  ...base, id: "tanstack-agui-live", name: "AG-UI Events → Live Interface",
  description: "One run lifts into a live interface panel driven by AG-UI events: a streaming status badge, a tool-call chip, and an assistant message drafting itself line by line.",
  tags: ["agent ui", "streaming", "events", "chat"],
  params: { title: P.text("agent 02 · drafting", "Panel title", { maxLength: 30 }), status: P.text("streaming", "Status", { maxLength: 16 }), message: P.text("Drafting release notes for 3 merged runs…", "Assistant message", { maxLength: 80 }), tool: P.text("tool: github · 3 results", "Tool call", { maxLength: 40 }), lines: P.list(["AG-UI events.", "Live interfaces."], "Caption", { max: 2 }) },
  duration: 4,
  sounds: () => [{ at: 0.1, sound: "whoosh.air", gain: 0.3, role: "lift" }, { at: 0.9, sound: "ui.pop", gain: 0.25, role: "tool" }, { at: 1.4, sound: "foley.key", gain: 0.15, role: "stream" }],
  render(c, p) {
    const t = c.t;
    field(c, t, [CYAN, VIOLET, TEAL]);
    const k = clamp(sp(t, 0, SPRING.firm), 0, 1.02);
    const w = c.W * 0.3, h = c.H * 0.36;
    const x = c.cx - w / 2 + c.W * 0.02, y = c.H * 0.12 + (1 - k) * c.H * 0.1;
    stream(c, t, c.W * 0.04, x - 10, y + h * 0.35);
    c.save();
    c.alpha(clamp(k * 2));
    c.rrect(x, y, w, h, 10, "#131418");
    c.strokeRRect(x, y, w, h, 10, alpha(CYAN, 0.35), 1.2);
    c.drawLayout(c.layout(p.title, code(c.H * 0.018, 700)), x + 14, y + 14, { color: INK });
    chip(c, `● ${p.status}`, x + w - c.W * 0.04, y + 20, c.H * 0.011, CYAN);
    if (t > 0.8) chip(c, p.tool, x + c.W * 0.07, y + h * 0.28, c.H * 0.011, ORANGE, pr(t, 0.8, 1.0));
    c.rect(x + 12, y + h * 0.42, w - 24, 1, alpha(INK, 0.08));
    const msg = typed(p.message, t, 1.2, 28);
    const M = c.fit(msg || " ", code(c.H * 0.021), w - 28, h * 0.3);
    c.drawLayout(M, x + 12, y + h * 0.5, { color: INK });
    if (caret(t)) c.rect(x + 14 + (M.lines[M.lines.length - 1]?.w ?? 0), y + h * 0.5 + (M.lines.length - 1) * c.H * 0.02, 7, c.H * 0.018, TEAL);
    c.restore();
    caption(c, p.lines, t, 0.3);
  },
});

// 0:09–0:11.5 reliability
const reliable = defineComponent<{ header: string; output: string; token: number; check: string; lines: string[] }>({
  ...base, id: "tanstack-resumable-stream", name: "Interrupted → Resumed → Type-safe",
  description: "A stream freezes mid-output, the line breaks, reconnects and resumes from the exact token it stopped at; then a clean type-check confirmation snaps into place.",
  tags: ["reliability", "resume", "streaming", "type-safe"],
  params: { header: P.text("STREAM · run 04", "Header", { maxLength: 30 }), output: P.text("Summarising 3 agent runs → release notes", "Output", { maxLength: 80 }), token: P.number(1284, "Resume token", { min: 0, max: 999999, step: 1, group: "content" }), check: P.text("tsc — 0 type errors", "Check", { maxLength: 30 }), lines: P.list(["Persistent.", "Durable.", "Type-safe."], "Caption", { max: 3 }) },
  duration: 4.5,
  sounds: () => [{ at: 0.9, sound: "fx.glitch", gain: 0.25, role: "drop" }, { at: 1.7, sound: "tonal.notify", gain: 0.25, role: "resume" }, { at: 2.9, sound: "impact.land", gain: 0.35, role: "check" }],
  render(c, p) {
    const t = c.t;
    field(c, t, [TEAL, CYAN, VIOLET], 0.9);
    const w = c.W * 0.3, h = c.H * 0.16, x = c.cx - w / 2, y = c.H * 0.27;
    const frozen = t > 0.9 && t < 1.7;
    const lineY = c.H * 0.5;
    stream(c, frozen ? 0.9 : t, c.W * 0.04, c.W * 0.96, lineY, 1, frozen ? c.cx + c.W * 0.01 : -1);
    c.rrect(x, y, w, h, 8, "#131418");
    c.strokeRRect(x, y, w, h, 8, alpha(TEAL, 0.3), 1);
    c.drawLayout(c.layout(p.header, code(c.H * 0.012, 600)), x + 10, y + 8, { color: MUTE });
    const tok = Math.round(p.token * Math.min(t, 0.9) / 0.9 + (t > 1.7 ? (t - 1.7) * 60 : 0));
    c.drawLayout(c.layout(`● tok ${tok.toLocaleString("en-US")}`, code(c.H * 0.012)), x + w - c.W * 0.06, y + 8, { color: TEAL });
    const shown = p.output.slice(0, Math.floor(p.output.length * (t < 0.9 ? t / 0.9 * 0.55 : t < 1.7 ? 0.55 : Math.min(1, 0.55 + (t - 1.7) * 0.5))));
    c.drawLayout(c.fit(shown || " ", code(c.H * 0.022), w - 24, h * 0.6), x + 12, y + h * 0.35, { color: INK });
    if (frozen) chip(c, "connection lost", c.cx, y - c.H * 0.03, c.H * 0.01, ORANGE);
    if (t > 1.7) chip(c, `↻ resumed at tok ${p.token.toLocaleString("en-US")}`, c.cx, y - c.H * 0.03, c.H * 0.01, TEAL, pr(t, 1.7, 1.9));
    if (t > 2.9) {
      const k = clamp(sp(t, 2.9, SPRING.firm), 0, 1.05);
      c.with({ x: c.cx, y: lineY + c.H * 0.06, scale: k }, () => chip(c, `✓ ${p.check}`, 0, 0, c.H * 0.012, TEAL, 1, alpha(TEAL, 0.18)));
    }
    p.lines.forEach((ln, i) => {
      const L = c.layout(ln, sans(c.H * 0.042));
      const u = pr(t, 0.4 + i * 1.0, 0.8 + i * 1.0, E.out);
      const b = c.H * 0.72 + i * c.H * 0.045;
      maskRise(c, b - c.H * 0.04, c.H * 0.055, u, () => c.drawLayout(L, c.cx - L.width / 2, b - L.lines[0].y, { color: INK }));
    });
  },
});

// 0:11.5–0:15 reveal
const reveal = defineComponent<{ name: string; accentWord: string; tagline: string; status: string; url: string; credit: string; hold: number }>({
  ...base, id: "tanstack-reveal", name: "Converge → Reveal",
  description: "All paths converge into a single glowing point that blooms into the bold final composition: the product name with a gradient accent word, a hairline, the tagline, a dotted ring, a small status chip and URL, and a subordinate film credit; held long enough to read.",
  tags: ["reveal", "logo", "end card", "converge"],
  params: { name: P.text("TanStack", "Name", { maxLength: 20 }), accentWord: P.text("AI", "Accent word (gradient)", { maxLength: 10 }), tagline: P.text("Build what's next.", "Tagline", { maxLength: 40 }), status: P.text("RELEASE CANDIDATE", "Status chip", { maxLength: 24 }), url: P.text("tanstack.com/ai", "URL", { maxLength: 30 }), credit: P.text("A STUDIO1 FILM", "Credit", { maxLength: 30 }), hold: P.number(3.0, "Hold", { min: 0.5, max: 6, step: 0.1, unit: "s" }) },
  duration: (p) => 2.5 + p.hold,
  sounds: () => [{ at: 0.1, sound: "riser.build", len: 0.9, gain: 0.35, role: "converge" }, { at: 1.0, sound: "impact.trailer", gain: 0.45, role: "reveal" }, { at: 1.3, sound: "tonal.shimmer", gain: 0.2, role: "glint" }],
  render(c, p) {
    const t = c.t;
    field(c, t, [PINK, VIOLET, ORANGE], 0.8 + 0.4 * pr(t, 0.9, 1.4));
    const conv = pr(t, 0, 0.9, E.in);
    if (conv < 1) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = c.W * 0.4 * (1 - conv);
        c.line(c.cx + Math.cos(a) * r, c.cy + Math.sin(a) * r, c.cx + Math.cos(a) * (r + c.W * 0.05), c.cy + Math.sin(a) * (r + c.W * 0.05), alpha([PINK, TEAL, ORANGE, VIOLET][i % 4], 0.6), 1.5);
      }
      c.light(c.cx, c.cy, c.H * (0.02 + 0.08 * conv), "#FFD3E0", 0.9, "screen");
      return;
    }
    const k = clamp(sp(t, 0.9, SPRING.firm), 0, 1.03);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 + t * 0.05;
      c.circle(c.cx + Math.cos(a) * c.W * 0.17 * k, c.cy + Math.sin(a) * c.H * 0.2 * k, 1.8, alpha(INK, 0.45));
    }
    const N = c.layout(p.name, sans(c.H * 0.1, 800)), A = c.layout(p.accentWord, sans(c.H * 0.1, 800));
    const gap = c.H * 0.018, total = N.width + gap + A.width;
    const x = c.cx - total / 2, y = c.cy - c.H * 0.01;
    c.with({ x: c.cx, y, scale: 0.92 + 0.08 * k }, () => {
      c.translate(-c.cx, -y);
      c.drawLayout(N, x, y - N.lines[0].y, { color: INK, alpha: clamp(k * 2) });
      c.drawLayout(A, x + N.width + gap, y - A.lines[0].y, { color: c.linear(x + N.width, 0, x + total, 0, [[0, ORANGE], [1, PINK]]), alpha: clamp(k * 2) });
    });
    c.rect(c.cx - c.W * 0.04 * pr(t, 1.2, 1.5), y + c.H * 0.025, c.W * 0.08 * pr(t, 1.2, 1.5), 1.5, alpha(INK, 0.4));
    const T = c.layout(p.tagline, sans(c.H * 0.026, 600));
    maskRise(c, y + c.H * 0.035, c.H * 0.05, pr(t, 1.3, 1.7, E.out), () => c.drawLayout(T, c.cx - T.width / 2, y + c.H * 0.07 - T.lines[0].y, { color: INK }));
    const fa = pr(t, 1.8, 2.2);
    if (fa > 0) {
      const S = chip(c, p.status, c.cx - c.W * 0.04, c.H * 0.86, c.H * 0.009, ORANGE, fa);
      c.drawLayout(c.layout(p.url, code(c.H * 0.012)), c.cx - c.W * 0.04 + S.w / 2 + 8, c.H * 0.86 - c.H * 0.008, { color: alpha(INK, 0.7 * fa) });
      const C = c.layout(p.credit, code(c.H * 0.01));
      c.drawLayout(C, c.cx - C.width / 2, c.H * 0.93, { color: alpha(MUTE, fa) });
    }
  },
});

const components = [hook, providers, modality, agents, agui, reliable, reveal] as unknown as Component[];

const template: PostSpec = {
  id: "kit-tanstack-ai",
  title: "TanStack AI — developer-tool launch film",
  format: "landscape",
  fps: 60,
  clips: components.map((k) => ({ component: k.id })),
  music: { src: "media/music/library/voxel-revolution.mp3", gain: 0.5, offset: 11.834, fadeIn: 0.05, fadeOut: 1.2, credit: "\"Voxel Revolution\" by Kevin MacLeod (incompetech.com), CC-BY 4.0" },
  notes: "Kit template: @HowDevelop's TanStack AI launch film (the original render runs ~30 s); facts as supplied: release candidate, 24 providers, AG-UI, MCP.",
};

export const tanstackAI: Kit = {
  id: "tanstack-ai",
  promptId: "2103840883812733090",
  title: "Developer-tool launch film",
  family: "launch",
  format: "landscape",
  summary: "A premium developer-tool launch film on a dark graphite canvas with luminous gradients: every transition demonstrates a feature instead of swapping title cards — one signal becomes a network, chat() swaps providers without breaking the flow, a stream becomes every modality, agents branch through sandboxes into MCP, a dropped stream resumes, and every path converges on the reveal.",
  shots: [
    { at: 0, shot: "A prompt cursor blinks; one signal expands into a network; 'What can one AI API become?'", component: "tanstack-signal-network" },
    { at: 3, shot: "The signal resolves into chat(); provider nodes orbit and swap; 'chat() · 24 providers'", component: "tanstack-chat-providers" },
    { at: 6.5, shot: "One stream becomes text, waveform, image frame, video timeline; 'One pattern. Every modality.'", component: "tanstack-modality-stream" },
    { at: 10, shot: "The stream branches into sandboxed agent runs, then reaches tools through MCP", component: "tanstack-agents-mcp" },
    { at: 13.5, shot: "AG-UI events drive a live interface panel", component: "tanstack-agui-live" },
    { at: 16.5, shot: "A stream freezes, reconnects and resumes from the same token; a type-check snaps in; 'Persistent. Durable. Type-safe.'", component: "tanstack-resumable-stream" },
    { at: 20.5, shot: "All paths converge: 'TanStack AI' · 'Build what's next.' · release candidate · a Studio1 film", component: "tanstack-reveal" },
  ],
  rules: [
    "Dark graphite canvas; luminous gradients and controlled flashes; crisp type, kinetic code, layered interface fragments",
    "Every transition demonstrates a feature rather than replacing one title card with another",
    "Important content inside a 9:16-safe central area; brief, legible wording; no tiny code nobody can read",
    "Accuracy: release candidate (not a stable v1), 24 providers, AG-UI, chat(), media, sandboxes, MCP, type safety, persistence, resumable streams",
    "Original electronic sound design: restrained opening pulse, synced transition hits, rising momentum, a satisfying resolve; works muted",
    "No stock footage, spinning logos, fake dashboards, excessive glitch",
  ],
  components,
  template,
};

void glide;
void logLerp;
void mix;
