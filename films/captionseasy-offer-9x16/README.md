# CaptionsEasy · "Erase the boring" · 20 s offer · 9:16

Post `posts/2026-10-08-captionseasy-offer-erase.json` · component `offer-erase` (`packages/library/src/components/offer-erase.ts`).
1080×1920 · 60 fps · one 120 BPM bed (Delightful D, offset 0.124 s, so beat 0 lands on frame 0; one beat = 0.5 s).

## Concept board (five passes, then the pick)

1. **Erase the boring (picked).** A plain white subtitle is painted out and the real viral look takes its place. The offer is the story: boring → erased → unlocked → free.
2. **Unlock.** The padlock opens and a keyhole iris carries every cut. Strong graphic, but thin on product proof.
3. **Zero ladder.** Giant zeros (watermark, subscription, ₹0) iris into each other. Clean and abstract, no product on screen.
4. **Look wall.** Thirty look strips scroll as a vertical stack with speed ramps. All proof, no story.
5. **Paywall smash.** Generic popups get crushed. Rejected: it needs fake product UI and invented prices.

Picked 1, with 2's padlock iris, 3's zero iris and 4's beat-cut looks inside it. It is the only one that shows real output (the owner's creators, their captions, their looks) and still tells one story.

## Shot list

| # | time (s) | VO (Hinglish, scratch) | picture | out |
|---|---|---|---|---|
| 1 | 0.0–2.0 | Video ready hai… par captions? | Raw clip in a card slams in on beat 1. Plain white subtitles type on each spoken word. The owner's overwhelmed character. | brush erases the card |
| 2 | 2.0–5.0 | Boring white subtitles? Nahi. | The same clip with its real viral look. "Boring white subtitles?" types on, strikes through, "Nahi." lands on an orange highlighter. | playhead scrub |
| 3 | 5.0–7.5 | Thirty plus looks. Ek click mein. | Real footage, cut on every beat across four creator clips and three looks. "30+ looks" rolls to "One click.". | logo bars slide |
| 4 | 7.5–10.0 | Hinglish bhi? Bilkul sahi. | Mint bloom on deep green, the owner's mic, karaoke fill on each word, check badge. | push up |
| 5 | 10.0–12.5 | CapCut Pro? Zaroorat nahi. | Cloud padlock rattles and unlocks. "CapCut Pro?" strikes through. "Zaroorat nahi." | keyhole iris from the padlock |
| 6 | 12.5–15.5 | Zero watermark. Zero rupaye. | The watermark stamp is painted out. A big orange zero pops with an ink shadow. | zero ring grows |
| 7 | 15.5–17.5 | Free. Open source. | Deep green. The logo bars bounce on the beat. "Free. Open source." | logo bars slide |
| 8 | 17.5–20.0 | CaptionsEasy. | Logo slams in. "Viral captions. Zero watermark." types on, then captionseasy.com, the owner's fist-pump, and the CC-BY credit. | end |

Inside shot 3 the whip cuts land on 5.5, 6.0, 6.5 and 7.0.

## Voiceover

Scratch take: `vo/make_offer_vo.py` (edge-tts, `en-IN-NeerjaExpressiveNeural`, rate +10%). Each line's speech starts at:
01 0.20 · 02 2.25 · 03 5.05 · 04 7.70 · 05 10.25 · 06 12.65 · 07 15.60 · 08 17.65 s.
The on-screen words use the word boundaries from `vo/vo.json`, so the type lands on the spoken word.

To swap in a real narrator (ElevenLabs or a person): record each line as `01.mp3` … `08.mp3` in `vo/`, keep the same names, and run `python films/captionseasy-offer-9x16/vo/make_offer_vo.py --measure-only` to re-read the timings. If a take is much longer than the scratch one, move the line's start in the component (`VO` in `offer-erase.ts`) and the shot cut that follows.

## Assets (all from the repo)

- Logo: `apps/web/public/media/brand/captionseasy-logo.svg` (the real file).
- Owner's character sheet: `sources/ceshot/` (overwhelmed, mic, cloud-lock, fist-pump).
- Hero pair: `sources/hero/omar.raw.mp4` (uncaptioned) and `omar.mp4` (captioned by the product).
- Creator footage: `sources/creators/creator-1..3.mp4` and `merged-3looks.mp4` (720×1280, captioned by the product).
- Music: "Delightful D" by Kevin MacLeod (incompetech.com), CC-BY 4.0. Credited on the end card.
- Type: Plus Jakarta Sans and Instrument Serif (the site's faces). Inter is used only for the plain "boring" subtitle.

## Honesty

- Every claim is one already in BRIEF.md or the deck: free, open source, 30+ looks, no watermark, accurate Hinglish (owner-stated), MP4 export, no CapCut Pro needed. No invented numbers, prices or customers.
- The plain subtitle is typeset by us to show the old look. It is not any competitor's UI.
- The watermark stamp is a generic "WATERMARK" band, with no brand on it.

## Known limits

- The hero clips are 432×600 and are shown in a card at about 1.4× scale, so they are a little soft. The creator footage is 720×1280 and is upscaled 1.5× to full frame.
- The VO is a scratch take from Microsoft's neural voice. Replace it before any public release.

## Render

```bash
node cli/bundle.mjs
node cli/render.mjs posts/2026-10-08-captionseasy-offer-erase.json --format vertical
ffmpeg -v error -y -i out/2026-10-08-captionseasy-offer-erase/vertical.mp4 -c:v copy -af "loudnorm=I=-14:TP=-2:LRA=11" -c:a aac -b:a 192k -ar 48000 out/2026-10-08-captionseasy-offer-erase/offer-9x16-final.mp4
```

The render's own mix lands at about −14 LUFS, but its AAC encode peaks above −1 dBTP. The `loudnorm` pass (video copied, audio only) brings the final to −13.9 LUFS integrated and −2.0 dBFS true peak.

Mix: the bed (Delightful D) sits at gain 0.10 in the post spec. Measured from the source files, the VO speech sits about 8 dB above the bed. Gains above 0.2 bury the voice. Output: `out/2026-10-08-captionseasy-offer-erase/offer-9x16-final.mp4` (1080×1920, 60 fps, 20.0 s, H.264 + AAC). `out/` is git-ignored.
