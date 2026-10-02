# LaunchReel capture — 2026-10-02

Automated capture of https://captionseasy.vercel.app using
`vendor/sources/launchreel` (MIT).

- `launchreel.yaml` — the scenario that was run (single homepage tour:
  hero screenshot, slow scroll through sections, screenshots at each stop)
- `videos/homepage.mp4` — 24.8s, 1440x900, 24fps, H.264. Scripted scroll
  tour of the homepage, rendered frame-by-frame from recorded DOM events
- `videos/launch-reel.mp4` — the combined reel (same single scenario)
- `screenshots/` — 5 retina (2x) PNGs: hero, product, looks, features, CTA

How it was run: `launchreel study` crawled 13 pages, then the plan was
trimmed to the homepage only (legal pages are noise for a launch film).
`launchreel record` drove headless Chromium via Puppeteer + rrweb;
`launchreel export` replayed the events and encoded with ffmpeg (CRF 18).

Use these as clean source plates: composite them into the Remotion launch
film, crop the screenshots for thumbnails and social cards. The footage is
robot-precise (no human cursor feel), so it works best inside designed
motion graphics rather than standing alone.
