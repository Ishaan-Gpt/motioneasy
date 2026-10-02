# Vendor — auto-capture sources

Tools that turn a website URL into screenshots and demo recordings with no
hand recording. Read-only reference copies (nested `.git` dirs removed).
Upstream links below.

| Repo | What it is | Why it's here |
|------|-----------|---------------|
| `launchreel/` | `npx launchreel study <url>` crawls a site, generates an editable `launchreel.yaml` scenario plan (LLM-assisted), then Puppeteer + rrweb auto-record the scenarios and ffmpeg exports MP4s + a combined launch reel. Retina screenshots, auth support, MIT | Point it at the CapsEasy site, get clean walkthrough clips and screenshots for free |
| `launchloom/` | Brief + a real product recording in, landscape film + vertical cut + landing page + social drafts out, all on your own machine | Full campaign-kit reference, one step beyond pure capture |

Captured outputs from runs against captionseasy.vercel.app live in
`sources/captures/`, not here.
