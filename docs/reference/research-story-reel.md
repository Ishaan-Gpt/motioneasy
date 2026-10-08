# Ultimate reference: "From an idea → to a storyboard → to motion → to a story" (research-platform film)

Source: `sources/references/research-story-reel/source.mp4` (the mp4 is git-ignored). 1276×720, 30 fps, 123.1 s, AAC 44.1 kHz stereo,
**−14.1 LUFS integrated, LRA 1.9 LU** (a very compressed, even bed). Only 7 hard cuts in the whole film
(0.83, 9.43, 19.17, 20.90, 23.20, 36.80 s): it plays as a near one-take, where type and objects carry the transitions.
Onset autocorrelation over 0–15 s gives a 0.604 s period (**≈ 99–100 BPM**).
Frames: `frames/` (4 fps), `f30/` (every frame 0–15 s), sheets `z_a…z_f.jpg`.

The breakdown goes 15 s at a time. The owner wants to match this level of craft for CaptionsEasy.

---

## Part 1 · 0:00–0:15

### Shot table
| t (s) | What happens | Move / technique |
|---|---|---|
| 0.00–0.70 | Black, navy glow rising from the bottom edge. "Every" then "day," appear in white, centred, large. | Word-by-word reveal: each word rises a few px from below, goes from blurred and grey to sharp and white. Line re-centres as it grows. |
| 0.70–0.83 | A small white dot is born *inside the text* (between "Every" and "day", at x-height) and balloons to fill the frame. | **Iris from a dot inside the type.** Scale in log space, about 0.13 s. The dot becomes the next scene's white background. |
| 0.87–1.90 | Light world: white top, periwinkle bloom at bottom. "Every day," now small and dark. "ideas" appears behind a blurred **blue highlighter pill** that sharpens and fades, leaving bold text. | **Hero word = weight change** (regular → bold), revealed through a defocused accent pill. |
| 1.90–2.80 | "are" → "born" → second line "inside your walls." | New words enter lighter grey and slightly low (baseline offset), then settle dark. Two-line layout reflows smoothly. |
| 2.70–3.30 | Product UI cards fly in from all frame edges: conversations list, chat bubble ("What if we create a central research hub?"), line chart, handwritten sticky notes, Research Projects bar chart, "Prof. Shemiz" message. | 3D-tilted white cards at different depths, soft shadows, **depth of field** (near cards blurred), slow push-in so the cards drift outward. Text stays centre. |
| 3.30–4.30 | Text swaps to "And every day," | Old line out, new words in one at a time, grey → black. Cards keep drifting. |
| 4.30–5.20 | "too many of them" (small, light). The cards **turn into blurry blue blobs**. | Defocus + recolour to the accent: the ideas lose their form. |
| 5.20–5.90 | "fade out." in blue bold, then the text and the blobs blur away to an empty light frame. | **The words act out their meaning.** |
| 6.00–8.00 | "Before they become anything real." at about 2× size, typed word by word from the left; the camera **tracks right** with the type, so earlier words slide off the left edge through a soft fade. "real." in accent blue. | Horizontal tracking camera on type. Edge fade mask. Accent colour on the last word. |
| 8.00–9.43 | "Because inside every institution" (smaller, centred, word by word), then an accelerating **push-in** (≈1.5×). | Cut ON motion at 9.43. |
| 9.43–11.40 | Dark world: black with a faint rounded-square tile grid, navy glow at bottom. Line icons (person, group, building) each with a blurred blue glass square behind; labels "Students", "Staff", "Faculty" arrive from different directions. | Camera drifts and pans. Elements at different depths and speeds. Icon + label pairs. |
| 11.40–12.50 | Close on big outlined pills "Thinking / Asking / Building" with icons between them, in rows sliding in alternate directions. One pill fills with a blue gradient (active). | Marquee rows. Active-state fill moves between pills. |
| 12.50–14.00 | Camera **pulls out** to reveal a huge grid of pills; active pills are joined by a line (Thinking → Asking → Building). | Zoom-out reveal: one thing becomes many → a network. |
| 14.00–15.00 | Grid dims away; the connecting line stays and becomes an arrow on black. | Leftover element becomes the bridge into the next part. |

### What I learnt (craft)
**Direction / story**
- The film opens on a problem told in a single sentence, built word by word over about 9 s: *Every day ideas are born inside your walls. And every day too many of them fade out before they become anything real. Because inside every institution…*
- The text is the narration. Each phrase gets its own visual action, and the visuals *illustrate the verb* (born → cards appear, fade out → things blur away, real → accent colour, institution → the people inside it).
- Light world = the ideas and the promise; dark world = the system and the people. The colour change marks a change of topic.

**Typography**
- One geometric grotesk with a distinctive curled "y" tail (not yet identified), set in sentence case. Plus a handwritten script, used only inside sticky notes.
- Hierarchy comes from **weight and colour, not size jumps**: bold for the hero noun ("ideas"), accent blue for the payoff word ("real.", "fade out."), mid-grey for words still arriving.
- Size changes with the beat of the sentence: a small intimate line, then a huge "Before they become anything real.", then small again.
- Words always arrive one at a time. A line is never revealed all at once.

**Motion / choreography**
- Each word arrives with rise + blur-to-sharp + grey-to-ink. Arrivals are spaced roughly on an eighth-note feel (~0.3 s) and slow down before the key word.
- Centred lines re-flow as they grow, so the whole line slides. That slide is part of the motion.
- Transitions grow out of objects: a dot inside the type, cards dissolving into blobs, text blurring out, a push-in cut on motion, a leftover line becoming an arrow.
- Many objects, never moving in lockstep: cards arrive from all edges at different depths and speeds.

**Camera**
- Never still: a slow push in the card scene, a horizontal track with the big type, a fast push into the cut, drift and pan in the dark scene, a big pull-out reveal on the pill grid.
- Depth of field is a real tool here: near cards blurred, mid cards sharp, glass squares blurred behind icons.

**Look / assets**
- Two worlds:
  - **Light:** near-white with a soft periwinkle/indigo bloom from the bottom.
  - **Dark:** near-black with a navy bottom glow and a faint tile grid.
- One accent: electric indigo (~#2E3BDB-ish).
- Product UI shown as clean, simplified **white cards**: lists with bars, chat bubbles, a chart, a profile message, sticky notes. Real-looking content, but stylised (no full screenshots).
- Thin-stroke line icons (person, group, building) sitting on blurred glowing glass tiles.
- Outlined pill chips; the active pill gets a gradient fill. Connecting lines suggest workflow.
- No particles, no flares, no shake. The "glow" is soft and big (blooms, blurred tiles) and never a stroke glow on text.

**Pacing**
- The first 9 s are a slow, intimate typographic sentence. At 9.43 s it switches to faster system visuals (icons, marquees, pull-out) at about one idea per second.
- Only 2 hard cuts in 15 s. Everything else is continuous.
- The audio bed is very even (LRA 1.9). The music sits under the type and never punches.

---

## Full-film map (0:15–2:03, at 0.5 s resolution)

| t (s) | Section | Signature move |
|---|---|---|
| 15–17 | Arrow line on black/indigo split | The leftover line from Part 1 becomes a forked arrow; indigo wall slides in |
| 17–19 | "The research gets stuck." | A black square **shrinks** around the text on an indigo field: the frame literally boxes the words in |
| 19–22 | "Not because the ideas are weak." | Light world, word by word, small |
| 22–24 | "But because the system isn't there." | Huge tracking type; a **glass sphere rolls** along a line under the words like a ball on a track |
| 24–26 | Dark, blue dots drifting | Breath shot before the stakes |
| 26–28 | "…is far greater than a missed output." | Glowing line chart rising under the words |
| 28–33 | "No momentum. No visibility. No growth." | Sans "No" + **script** payoff word that writes on; each line replaces the last; long hold |
| 33–35 | Swirl | Black → liquid indigo/white swirl: the gear change |
| 35–38 | **Logo reveal** "researchly" | Bold sans + script "ly"; a thin line with a dot draws around it like a cursor path |
| 38–42 | "We provide your institution an ecosystem for research." | Dot-and-line constellation fans out, then gathers into a fountain shape |
| 42–46 | "Where students / staff / faculty…" | Lines from one point down to glossy 3D sphere icons |
| 46–49 | "Post ideas · Find collaborators · Build projects together" | Glass pills stack between floating spheres |
| 49–53 | "Anyone inside the institution can contribute." | Letters drop into place; the full stop becomes a dot that draws a line down |
| 53–57 | Student → Faculty → Researcher | **Flowchart camera**: the camera rides the connector line from node to node, with motion blur |
| 57–60 | UI cards on a timeline line | A dot travels a horizontal line; cards float above and below it |
| 60–68 | Mobile app | Tilted phone UI, custom cursor taps "Request Collaboration", "+", menu pops, "Open Project" |
| 68–70 | "From idea. to output." | Words on a **blurred indigo blob**, with the blob as a soft mask |
| 70–75 | "Sync through chat." / "Track progress in real time." / "Keep projects moving." | Left-aligned 2–3 line captions, last word bold accent, phone UI tilted on the right |
| 75–77 | "All in one place." | Big soft vignette blob |
| 77–83 | Admin dashboard | Desktop UI pushes in; cursor clicks the sidebar; pie chart spins in; "Quarterly reports for **real data** to act on." |
| 83–88 | "See what's active or completed." / "Automated PDF downloads." | Extreme close-ups of the UI (menu expand, Download PDF press), with the caption beside it |
| 88–92 | Logo + **toggle switch** off | Grey pills "Hidden ideas / Stalled progress / Intimidating research" float around |
| 92–98 | Toggle flips ON | Everything turns indigo; pills become "Ideas find teams / Research becomes visible / Institutions grow". **The before→after told with a switch.** |
| 98–103 | "A stronger research culture / reputation / future." | Dashboard behind; anaphora of three |
| 103–108 | "Because when your people thrive, your institution thrives with them." | Vignette blob breathing |
| 108–112 | "Tomorrow's *research leaders* are already inside your *institution.*" | Script accent words |
| 112–117 | "Researchly is the infrastructure connecting them." | App-icon tile; dozens of **curved lines converge** into it from both sides |
| 117–121 | "Schedule a discovery meeting today." → logo end card | Word by word; logo settles on the gradient floor |

### Extra learnings from the full film
- **Script accent font**: a connected script is used ONLY for emotional payoff words (growth, research leaders, institution) and the logo "ly".
- **Grammar of three**: No momentum / No visibility / No growth · stronger culture / reputation / future · post / find / build.
- **Before→after with one UI control** (a toggle) is the film's emotional climax, not a feature list.
- **UI close-ups with captions beside them**: copy left (2–3 lines, last word accent bold), UI right, tilted, cursor acting.
- **Everything is connected by lines**: arrows, flowchart rails, constellations, converging curves. The line is the motif from start to end card.
- The pace is slow (2 min). Our 30 s cut must compress it by ~4× while keeping the word-by-word feel: fewer words per idea.
