// Demo media every component starts with. Paths are served at /media by the site and the CLI
// (copied from the repo's sources/ folder). Replace any of them with your own media in the controls.

export const CLIPS = {
  aisha: { src: "media/hero/aisha.mp4", look: "Bouncy Single Word", credit: "Wikinights testimonial by Aisha · CC BY-SA 4.0" },
  gianna: { src: "media/hero/gianna.mp4", look: "Jumping Box", credit: "Peru Testimonial - Gianna Garcia · CC BY 3.0" },
  jesse: { src: "media/hero/jesse.mp4", look: "3-Line Glow Hero", credit: "Peru Testimonial - Jesse Vilela · CC BY 3.0" },
  omar: { src: "media/hero/omar.mp4", look: "Yellow Highlighter", credit: "WIKITONGUES- Omar · CC BY 3.0" },
  rusita: { src: "media/hero/rusita.mp4", look: "Giant Italic Hero", credit: "Wikipedians speak - Rusita Paryekar · CC BY-SA 3.0" },
  sam: { src: "media/hero/sam.mp4", look: "Script Hero Pop", credit: "WIKITONGUES- Sam · CC BY-SA 4.0" },
  sol: { src: "media/hero/sol.mp4", look: "3-Line Stagger", credit: "Peru Testimonial - Sol Luciana · CC BY 3.0" },
  william: { src: "media/hero/william.mp4", look: "Comic Tilt", credit: "WIKITONGUES- William · CC BY-SA 4.0" },
  gereon: { src: "media/hero/gereon.mp4", look: "Underline Sweep", credit: "WIKITONGUES- Gereon · CC BY-SA 4.0" },
  mckensie: { src: "media/hero/mckensie.mp4", look: "Kinetic Big Word", credit: "WIKITONGUES- Mckensie · CC BY-SA 4.0" },
} as const;

export type ClipId = keyof typeof CLIPS;
export const clipList = (ids: ClipId[]) => ids.map((id) => CLIPS[id].src);
export const lookList = (ids: ClipId[]) => ids.map((id) => CLIPS[id].look);

/** Uncaptioned sources + word timestamps (for caption components). */
export const RAW = {
  omar: { src: "media/hero/omar.raw.mp4", words: "media/hero/omar.json" },
  sam: { src: "media/hero/sam.raw.mp4", words: "media/hero/sam.json" },
  gereon: { src: "media/hero/gereon.raw.mp4", words: "media/hero/gereon.json" },
  mckensie: { src: "media/hero/mckensie.raw.mp4", words: "media/hero/mckensie.json" },
};

export const SCREENS = {
  hero: "media/screens/hero.jpg",
  product: "media/screens/product.jpg",
  looks: "media/screens/looks.jpg",
  cta: "media/screens/cta.jpg",
};

export const BRAND = {
  logo: "media/brand/captionseasy-logo.svg",
  logoLight: "media/brand/captionseasy-logo-light.svg",
  icon: "media/brand/captionseasy-icon.svg",
  iconLight: "media/brand/captionseasy-icon-light.svg",
  wordmark: "media/brand/captionseasy-wordmark.svg",
  wordmarkLight: "media/brand/captionseasy-wordmark-light.svg",
};

export const LOOKS = [
  "hormozi_box", "beast_bounce", "karaoke_fill", "pop_clean", "gradient_pop", "outline_fill", "bold_pill", "comic_burst",
  "wave_bounce", "storytime", "chat_bubble", "scribble", "minimal_pro", "netflix_sub", "lower_third", "read_along",
  "luxe_serif", "motivational", "film_noir", "kinetic_mix", "retro_vhs", "retro_3d", "neon_sign", "terminal", "gaming_hud",
  "highlighter_card", "explainer", "desi_clean", "vintage_cinematic", "staggered_splash", "glow_stack_classic",
  "serif_pop_classic", "cartoon_stack_classic",
].map((id) => `media/looks/${id}.mp4`);

export const MEDIA_CREDITS = Object.values(CLIPS).map((c) => c.credit);

/** Music beds for posts (from assets/audio/music). CC-BY: the credit must ship with the post. */
export const MUSIC = [
  { id: "funkorama", name: "Funkorama", mood: "Upbeat funk", src: "media/music/kevin-macleod_Funkorama.mp3", credit: '"Funkorama" by Kevin MacLeod (incompetech.com), CC-BY 4.0' },
  { id: "inspired", name: "Inspired", mood: "Bright, motivational", bpm: 120.19, src: "media/music/kevin-macleod_Inspired.mp3", credit: '"Inspired" by Kevin MacLeod (incompetech.com), CC-BY 4.0' },
] as { id: string; name: string; mood: string; bpm?: number; src: string; credit: string }[];
