import type { Metadata } from "next";
import { FORMATS, FORMAT_IDS, SYNTH_SOUNDS, allSounds } from "@motioneasy/engine";
import { COMPONENTS, TRANSITION_IDS } from "@motioneasy/library";
import { DocsNav } from "@/components/docs/docs-nav";
import { TLink } from "@/components/site/motion";
import { CodeBlock } from "@/components/studio/code";

export const metadata: Metadata = {
  title: "Docs",
  description: "How MotionEasy works: component and post specs, formats, prop types, the prompt format, the CLI, sound, and how to add a component.",
};

function Section({ id, title, children }: { id: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[var(--line)] py-12 first:border-t-0 first:pt-0">
      <h2 className="headline mb-5 text-[clamp(26px,3vw,36px)]">{title}</h2>
      <div className="space-y-4 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="thin-scroll overflow-x-auto rounded-2xl border border-[var(--line)]" data-lenis-prevent>
      <table className="w-full min-w-[560px] text-left text-[13.5px]">
        <thead className="bg-sand-2">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[var(--line)] align-top">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-2.5">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const C = ({ children }: { children: React.ReactNode }) => <code className="rounded bg-sand-2 px-1.5 py-0.5 font-mono text-[12.5px]">{children}</code>;

const COMPONENT_SPEC = `{
  "component": "hook-strike",
  "version": "1.0.0",
  "format": "vertical",
  "fps": 60,
  "props": {
    "question": "Still timing captions\\nby hand?",
    "strike": "by hand?",
    "replacement": "*in one click.*",
    "mode": "light",
    "sound": true
  }
}`;

const POST_SPEC = `{
  "id": "2026-10-05-podcast-tip",
  "title": "Podcast tip",
  "format": "vertical",
  "fps": 60,
  "clips": [
    { "component": "hook-strike", "props": { "question": "Still timing captions\\nby hand?" } },
    { "component": "caption-karaoke", "transition": "whip" },
    { "component": "stat-trio", "transition": { "type": "push", "duration": 0.4 }, "duration": 3.5 },
    { "component": "end-card", "transition": "zoom" }
  ],
  "music": {
    "src": "media/music/kevin-macleod_Funkorama.mp3",
    "gain": 0.5, "offset": 12, "fadeOut": 1.2,
    "credit": "\\"Funkorama\\" by Kevin MacLeod (incompetech.com), CC-BY 4.0"
  }
}`;

const NEW_COMPONENT = `// packages/library/src/components/big-claim.ts
import { E, P, defineComponent, pr, spring, SPRING } from "@motioneasy/engine";
import { maskRise, blockWindow, stage, style } from "../kit";

type Props = { claim: string; font: string };

export default defineComponent<Props>({
  id: "big-claim",
  name: "Big Claim",
  version: "1.0.0",
  group: "elements",            // "scenes" = postable beat, "elements" = a part
  category: "text-reveals",     // one of the 18 library categories
  description: "One claim rises out of a mask and settles with a soft spring.",
  tags: ["text", "claim", "reveal"],
  added: "2026-10-05",
  theme: { mode: "light", lighting: 0.6, grain: 0.3, vignette: 0.3 },
  notes: "One short, true claim. Pair with a proof beat, not another text reveal.",
  params: {
    claim: P.text("Captions in *one click.*", "Claim", { maxLength: 60 }),
    font: P.font("brand", "Typeface"),
  },
  duration: 3,
  sounds: () => [{ at: 0.35, sound: "whoosh.air", gain: 0.5, role: "rise" }],
  render(c, p) {
    const T = c.theme;
    stage(c, { kind: "soft" });
    // Measured, fitted text: never overflows the safe box of any format.
    const L = c.fit(p.claim, style(c, c.vertical ? 120 : 100, { fontParam: p.font }), c.safe.w, 400, { align: "center" });
    const top = c.cy - L.height / 2;
    const u = pr(c.t, 0.3, 1.1, E.out);
    const s = 0.96 + 0.04 * Math.min(1, Math.max(0, spring(c.t - 0.3, SPRING.soft)));
    const win = blockWindow(L);
    c.with({ x: c.cx, y: c.cy, scale: s }, () => {
      c.translate(-c.cx, -c.cy);
      maskRise(c, top + win.top, win.h, u, () => c.drawLayout(L, c.cx - L.width / 2, top, { color: T.fg, emColor: T.accent }));
    });
  },
});`;

export default function Page() {
  const scenes = COMPONENTS.filter((c) => c.group === "scenes").length;
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 md:px-8">
      <div className="pb-10 pt-10">
        <div className="eyebrow mb-2">Docs</div>
        <h1 className="headline text-[clamp(36px,5vw,68px)]">
          How it <em>works.</em>
        </h1>
        <p className="lede mt-3 max-w-2xl">Specs, formats, props, prompts, the CLI and how to add a component. Everything here is generated from the same engine the site runs on.</p>
      </div>
      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--nav-h)+24px)]">
            <DocsNav />
          </div>
        </aside>
        <article className="min-w-0 max-w-[860px]">
          <Section id="overview" title="Overview">
            <p>
              MotionEasy is a library of motion components for social video. A component is data (an id, a prop schema, sound cues) plus one <strong>pure render function of time and props</strong>, drawn on a canvas. No timers, no CSS animation, no unseeded randomness: the same spec gives the same frame, in the browser preview, in the MP4 export and in the CLI.
            </p>
            <Table
              head={["Part", "What it is"]}
              rows={[
                [<C key="e">packages/engine</C>, "Canvas renderer, timing (easing, springs, keyframes, beat grid), text layout, 3D camera, WebGL blur, media decode, synthesised sound, -14 LUFS mixer, live player and MP4/WebM exporter."],
                [<C key="l">packages/library</C>, `${COMPONENTS.length} components (${scenes} scenes, ${COMPONENTS.length - scenes} elements), ${TRANSITION_IDS.length} transitions, the post sequencer and the prompt generator.`],
                [<C key="c">cli/</C>, "bundle, stills (contact sheets), render (specs to MP4, verified), shot (site screenshots) and sounds (CC0 recordings)."],
                [<C key="w">apps/web</C>, "This site: library, component studio, Compose, Sounds and these docs."],
              ]}
            />
          </Section>

          <Section id="quick-start" title="Quick start">
            <p>Node 20+, pnpm and Chrome (the CLI renders in headless Chrome for WebCodecs H.264).</p>
            <CodeBlock
              lang="md"
              maxH="none"
              code={`pnpm install
pnpm dev                                   # bundle the engine, then the site on :3000
node cli/stills.mjs hook-strike            # contact sheet → out/stills/hook-strike-vertical.png
node cli/render.mjs posts/my-post.json     # MP4 → out/my-post/vertical.mp4 (+ poster, ffprobe, loudness)`}
            />
            <p>
              No install? Every component page has <strong>Download MP4</strong> (rendered in your browser) and a <strong>Standalone HTML</strong> download that plays and exports offline.
            </p>
          </Section>

          <Section id="specs" title="Component specs">
            <p>
              A spec is all a video needs. It names the component, pins its version and lists every prop explicitly (the site writes them all out, so a spec never depends on defaults that might change). The <strong>Spec</strong> tab on any component page shows the live spec; <strong>Import JSON</strong> loads one back.
            </p>
            <CodeBlock lang="json" maxH="none" code={COMPONENT_SPEC} />
            <p>
              Props are validated on load: unknown keys are dropped, numbers are clamped to their range, wrong types fall back to the default. Every fix is reported, never silently ignored.
            </p>
          </Section>

          <Section id="posts" title="Post specs">
            <p>
              A post joins components in order. Each clip can set the <C>transition</C> it cuts in with (a name, or <C>{"{ type, duration }"}</C>) and a <C>duration</C> override; the transition overlaps the two clips. <C>music</C> lays a bed under the whole post. Build one visually in <TLink href="/compose/" label="Compose" className="link-draw font-semibold">Compose</TLink> and export the JSON.
            </p>
            <CodeBlock lang="json" maxH="none" code={POST_SPEC} />
            <Table
              head={["Field", "Meaning"]}
              rows={[
                [<C key="1">clips[].component</C>, "Component id (see the library)."],
                [<C key="2">clips[].props</C>, "Only the props you change; the rest are the component's defaults."],
                [<C key="3">clips[].transition</C>, `Into this clip: ${TRANSITION_IDS.join(", ")}. Default: cut.`],
                [<C key="4">clips[].duration</C>, "Seconds. Shorter trims the end, longer holds the final frame of the motion."],
                [<C key="5">look</C>, "Optional props applied to every clip: mode, bg, fg, accent, glow, lighting, grain, vignette."],
                [<C key="6">music</C>, "src (a media path or URL), gain, offset (start inside the track), fadeIn, fadeOut, credit."],
              ]}
            />
          </Section>

          <Section id="formats" title="Formats & safe zones">
            <p>
              Components lay out in reference units where the <strong>short edge is always 1080</strong>, so one spec renders correctly in every format and at every preview size. Text-bearing elements stay inside the platform safe box (no captions bar, right rail or top bar over them).
            </p>
            <Table
              head={["Format", "Ratio", "Size", "Safe box (x, y, w, h)", "For"]}
              rows={FORMAT_IDS.map((f) => {
                const F = FORMATS[f];
                return [<C key="f">{f}</C>, F.ratio, `${F.w}×${F.h}`, `${F.safe.x}, ${F.safe.y}, ${F.safe.w}, ${F.safe.h}`, F.platforms];
              })}
            />
          </Section>

          <Section id="props" title="Prop types">
            <p>One schema drives the control panel, spec validation, the JSON spec and the prop table inside every prompt.</p>
            <Table
              head={["Type", "Value", "Notes"]}
              rows={[
                [<C key="a">text</C>, "string", "Rich text (see below). maxLength, multiline."],
                [<C key="b">number</C>, "number", "min, max, step, unit. Clamped on load."],
                [<C key="c">bool</C>, "boolean", ""],
                [<C key="d">select</C>, "string", "One of the listed options."],
                [<C key="e">color</C>, "#RRGGBB or \"auto\"", "\"auto\" follows the light/dark mode."],
                [<C key="f">list</C>, "string[]", "min/max items, per-item maxLength."],
                [<C key="g">media</C>, "path, URL or null", "Image or video; demo media lives under media/."],
                [<C key="h">mediaList</C>, "string[]", "Several images/videos (carousels, walls)."],
                [<C key="i">font</C>, "\"brand\" or a font id", "jakarta, inter, bricolage, instrument, fraunces, mono."],
                [<C key="j">json</C>, "any", "Advanced data, e.g. a Whisper transcript for captions."],
              ]}
            />
            <p>
              Every component also has the standard props: <C>speed</C> (plays the whole component faster or slower, sounds follow), the look (<C>mode</C>, colours, <C>lighting</C>, <C>grain</C>, <C>vignette</C>) and sound (<C>sound</C>, <C>volume</C>, <C>soundTone</C>).
            </p>
          </Section>

          <Section id="rich-text" title="Rich text">
            <p>
              Wrap words in <C>*asterisks*</C> to set them in the accent style (the brand serif, italic by default). A newline forces a line break, and authored lines are kept: text shrinks a little rather than wrap inside a line you wrote. Centred text is balanced, so you never get a lone word on the last line.
            </p>
            <CodeBlock lang="md" maxH="none" code={`"Small tool. *Big numbers.*"          → "Big numbers." in the serif accent
"33 caption looks.\\n*Free, in your browser.*"   → two lines, exactly as written`} />
          </Section>

          <Section id="prompts" title="Prompt format">
            <p>
              <strong>Copy prompt</strong> (on any component page, and in Compose) produces a deterministic brief for any AI tool. It never asks the model to design anything: it carries the exact spec, the allowed values and the checks that prove the render is right.
            </p>
            <Table
              head={["Section", "Contents"]}
              rows={[
                ["What it is", "Component, version, format, length, frame count and fps."],
                ["The spec", "The full JSON spec: the single source of truth."],
                ["Editable props", "Every prop with its type, allowed range or options, and current value."],
                ["Render it", "A: the website (Import JSON → Download MP4). B: a one-file HTML page that plays and exports. C: pnpm render in a repo. D: the component's source, for forking only when no prop does the job."],
                ["Acceptance checks", "H.264 size, fps and frame count, yuv420p, AAC 48 kHz at about -14 LUFS, and the sound cue timings."],
              ]}
            />
          </Section>

          <Section id="cli" title="CLI">
            <p>
              The CLI drives the same bundle as the site in headless Chrome. Run <C>node cli/bundle.mjs</C> first (or <C>pnpm bundle</C>); <C>pnpm dev</C> and <C>pnpm build</C> do it for you.
            </p>
            <Table
              head={["Command", "Does", "Options"]}
              rows={[
                [<C key="b">node cli/bundle.mjs</C>, "Builds window.MotionEasy, copies fonts and demo media into the site, writes component sources.", "--quick (skip media), --dev (unminified)"],
                [<C key="s">node cli/stills.mjs [ids…|spec.json]</C>, "Contact sheet per component or spec → out/stills/<name>.png. No ids = every component.", "--format, --frames 8, --scale 0.5, --props '{…}'"],
                [<C key="r">node cli/render.mjs spec.json…</C>, "Renders to out/<id>/<format>.mp4 + poster, then checks it with ffprobe (size, fps, duration ±1 frame) and measures loudness.", "--format, --all-formats, --scale, --quality high|balanced|small, --fps, --component <id> --props"],
                [<C key="h">node cli/shot.mjs /path…</C>, "Screenshots of the site for review → out/shots/.", "--base, --mobile, --full, --scroll, --wait, --click"],
                [<C key="so">node cli/sounds.mjs</C>, "Imports the curated CC0 recordings (trimmed, 48 kHz, peak -1 dBFS) and regenerates the sound manifest and credits.", "--freesound (needs FREESOUND_API_KEY; adds curated CC0 searches)"],
              ]}
            />
          </Section>

          <Section id="sound" title="Sound">
            <p>
              Components cue sounds on their own timeline: a riser ends exactly on the hit, a whoosh peaks with the camera. There are {SYNTH_SOUNDS.length} sounds designed in code (they stretch to fit and carry no licence strings) and {allSounds().filter((s) => s.kind === "sample").length} CC0 recordings; any audio file works too, as <C>url:path</C>. Recordings live in <C>packages/engine/assets/sounds</C> with a generated manifest and <C>CREDITS.md</C>. The export mixer normalises to <strong>-14 LUFS</strong> with a limiter keeping true peaks under -1 dBTP. Browse and download them on the <TLink href="/sounds/" label="Sounds" className="link-draw font-semibold">Sounds</TLink> page.
            </p>
          </Section>

          <Section id="add-component" title="Add a component">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Create <C>packages/library/src/components/&lt;id&gt;.ts</C> exporting <C>defineComponent(…)</C> (template below).
              </li>
              <li>
                Register it in <C>packages/library/src/registry.ts</C> (the bundle fails if a component file isn&apos;t registered).
              </li>
              <li>
                Run <C>node cli/bundle.mjs --quick</C> and <C>node cli/stills.mjs &lt;id&gt;</C>, then look at the sheet in every format (<C>--format square</C>, <C>--format landscape</C>).
              </li>
              <li>Check it on the site: the controls, prompt, spec and export come from the schema for free.</li>
            </ol>
            <CodeBlock lang="ts" maxH="none" code={NEW_COMPONENT} />
            <p className="font-semibold">The rules that keep every frame reproducible:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Everything is a function of <C>c.t</C> and props. Use <C>pr</C>, <C>tw</C>, <C>kf</C>, <C>spring</C> and the <C>E</C> easings; randomness only through <C>c.rnd(i)</C> or <C>rand(seed)</C>.
              </li>
              <li>
                Text goes through <C>c.fit</C> / <C>c.layout</C> (measured, wrapped, fitted) and stays inside <C>c.safe</C>.
              </li>
              <li>Colours come from the theme (<C>c.theme.fg</C>, <C>bg</C>, <C>accent</C>, <C>glow</C>) or from props, never hard-coded.</li>
              <li>Media through <C>c.media(…)</C>; trims and speeds are props, never pre-cut files.</li>
              <li>Never show a capability, number or customer that isn&apos;t real.</li>
            </ul>
          </Section>
        </article>
      </div>
    </div>
  );
}
