# Storyboard — CapsEasy Launch

Theme: 085 · Constructivist Agitprop · Format: 1920x1080 · Length: 30s · Sound: kevin-macleod_Inspired.mp3

## Message & tone
- **Sentence:** I want to say "Stop timing captions. Start posting." in a bold tone, so the viewer feels aggressive confidence.
- **Tone arc:** bold → graphic → urgent → bold
- accent: #034f46 (Deep green)
- **Motif (optional):** A hard diagonal wedge pierces the frame to break between logical sections.

## Ledger

One row per shot. Fill it **before** building, then run `python tools/variety_audit.py STORYBOARD.md`.
Use `motif:` for a deliberate repeat, and `surprise:` in *notes* for the pattern-breaking moment.

| # | start | dur | beat | tone | entrance | transition_out | ease | direction | palette | camera | components | new_component | sfx | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0:00 | 4.0 | hook | bold | wedge-pierce | whip-pan-x | expo.out | diagonal | cream+ink | locked | type-headline | | | |
| 2 | 0:04.0| 6.0 | upload | graphic | block-slam | graphic-match-shape| spring | right | cream+ink | push-in | upload-frame | agitprop-wedge | | |
| 3 | 0:10.0| 7.5 | engine | urgent | diagonal-split| mask-iris | power4.inOut | diagonal | deepgreen+ink| track-y | whisper-status | | | surprise: deliberate pause for tension |
| 4 | 0:17.5| 10.1| proof | bold | motif: wedge-pierce | circle-wipe | spring | up | ink+cream | pan-x | looks-grid | | | surprise: color inversion |
| 5 | 0:27.6| 2.4 | cta | graphic | wedge-burst | hold | expo.inOut | center | lavender+ink | locked | logo+cta | | | |

## The seven questions (answer before you build)
1. What do I want to say, and in what tone? (the sentence above)
2. Is anything repeating? Yes, the wedge-pierce transition is used twice, marked as a motif to bookend the proof section.
3. What does each transition *mean*? The wedge violently cuts through the problem (time spent editing).
4. What are the colours doing over time? Where is the colour event? Cream/ink throughout, but Shot 4 wildly inverts to Ink background with Cream text as the "surprise".
5. Which component have I never made before? `agitprop-wedge`
6. Where is the surprise (about every 10–15 s)? At 17.5s, the color completely inverts.
7. Did this repeat my last film? No.

## Frames

### Frame 1 · Hook
- key visual: Massive diagonal text: STOP TIMING CAPTIONS.
- moves first: Text slams in from corners, ease spring.
- on-screen words: STOP TIMING CAPTIONS
- beat hook: The wedge hits on Beat 1.

### Frame 2 · Upload (Action)
- key visual: The upload UI is pinned inside a sharp green wedge.
- moves first: UI frame slides right.
- on-screen words: DON'T EDIT. JUST UPLOAD.

### Frame 3 · Engine (Proof)
- key visual: Whisper loading states overlapping each other mechanically.
- moves first: Text splits diagonally.
- on-screen words: ON-DEVICE WHISPER

### Frame 4 · Core Value (Looks)
- key visual: 33 looks contact sheet scrolls wildly on an inverted black background.
- new component: agitprop-wedge
- moves first: Background inverts.
- on-screen words: 33 STUNNING LOOKS

### Frame 5 · CTA
- key visual: Lockup: MP4 + SRT. Free forever.
- loop note: Ends on static logo which can cleanly wedge-wipe back to Frame 1.
