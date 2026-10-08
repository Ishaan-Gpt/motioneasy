# CaptionsEasy · 30 s · Apple-style film · Hinglish voiceover (for ElevenLabs)

Tone: calm, confident, a little smile in the voice. Apple-film restraint: short lines, real pauses, never shouting.
One narrator (young, warm, Indian). Lands on the music: the drop is under "Ab nahi.", the last chord under "CaptionsEasy."

## The script (read straight through, ~30 s)

| # | Time | Line (Roman Hinglish) | Read it like |
|---|---|---|---|
| 1 | 0:00 | **Video ready hai…** | relaxed, almost to yourself |
| 2 | 0:01.6 | **…par captions?** | small raised eyebrow |
| 3 | 0:02.6 | **Ya toh watermark.** | flat, unimpressed |
| 4 | 0:03.5 | **Ya subscription.** | flat |
| 5 | 0:04.4 | **Ya phir… bilkul boring.** | tiny sigh on "bilkul" |
| 6 | 0:06.3 | **Ab nahi.** | quiet, certain. Lands on the drop |
| 7 | 0:07.4 | **Introducing… CaptionsEasy.** | warm, proud, slow |
| 8 | 0:10.0 | **Captions jo sirf dikhte nahi —** | building |
| 9 | 0:11.6 | **chalte hain.** | a smile, light |
| 10 | 0:13.0 | **After Effects jaisa motion.** | confident |
| 11 | 0:14.6 | **After Effects ke bina.** | playful, half a beat later |
| 12 | 0:16.2 | **Thirty plus viral looks.** | crisp |
| 13 | 0:17.6 | **Jo pasand aaye, woh lagao.** | easy, casual |
| 14 | 0:19.2 | **Hinglish mein bolo…** | conversational |
| 15 | 0:20.4 | **captions? Bilkul sahi.** | "bilkul sahi" with a nod |
| 16 | 0:22.2 | **Na watermark. Na subscription. Na CapCut Pro.** | three even taps, a breath between |
| 17 | 0:25.0 | **Free. Aur open source.** | simple, proud |
| 18 | 0:26.4 | **CaptionsEasy.** | on the last chord |
| 19 | 0:27.4 | **Viral captions. Zero watermark.** | signature, unhurried |

## Paste-ready (ElevenLabs Multilingual v2)
```
Video ready hai... par captions?
Ya toh watermark. Ya subscription. Ya phir... bilkul boring.
Ab nahi.
Introducing... Captions Easy.
Captions jo sirf dikhte nahi... chalte hain.
After Effects jaisa motion. After Effects ke bina.
Thirty plus viral looks. Jo pasand aaye, woh lagao.
Hinglish mein bolo... captions? Bilkul sahi.
Na watermark. Na subscription. Na Cap Cut Pro.
Free. Aur open source.
Captions Easy. Viral captions. Zero watermark.
```

## Paste-ready (Eleven v3, with audio tags)
```
[relaxed] Video ready hai... [curious] par captions?
[unimpressed] Ya toh watermark. Ya subscription. [sighs] Ya phir... bilkul boring.
[short pause] [quietly, certain] Ab nahi.
[warm] Introducing... Captions Easy.
Captions jo sirf dikhte nahi... [smiling] chalte hain.
[confident] After Effects jaisa motion. [playful] After Effects ke bina.
Thirty plus viral looks. [casual] Jo pasand aaye, woh lagao.
Hinglish mein bolo... captions? [nods] Bilkul sahi.
Na watermark. [pause] Na subscription. [pause] Na Cap Cut Pro.
[proud] Free. Aur open source.
[warm] Captions Easy. Viral captions. Zero watermark.
```

If a Hindi word comes out with an English accent, swap just that word to Devanagari:
`Video ready है... पर captions? या तो watermark. या subscription. या फिर... बिल्कुल boring. अब नहीं।
Introducing... Captions Easy. Captions जो सिर्फ़ दिखते नहीं... चलते हैं। After Effects जैसा motion. After Effects के बिना।
Thirty plus viral looks. जो पसंद आए, वो लगाओ। Hinglish में बोलो... captions? बिल्कुल सही।
ना watermark. ना subscription. ना Cap Cut Pro. Free. और open source. Captions Easy. Viral captions. Zero watermark.`

## ElevenLabs settings
- Model: **Eleven v3** (tags + best Hinglish) or **Multilingual v2**.
- Voice: young, warm Indian narrator (Voice Library → language Hindi, accent Indian, "conversational" / "narration").
- Stability 45–50 · Similarity 75 · Style 20–30 · Speaker boost on · Speed 1.0 (0.95 if it rushes).
- Spell the brand **"Captions Easy"** (two words) and **"Cap Cut"** so they're said cleanly.

## Export (so it drops straight into the film)
Best: one file per numbered line above, named `01.mp3` … `19.mp3` (or one take, and I'll slice it on the pauses).
44.1 or 48 kHz, no music, no reverb, a little room tone at the start and end. Put them in
`launch-remotion/public/ad30/vo/elevenlabs/`. I'll measure each file's first syllable and lock it to the timings above.
