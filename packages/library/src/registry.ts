// Every component in the library, in display order. Add a file in components/ and list it here
// (cli/bundle.mjs fails the build if a component file is not registered).

import type { Component } from "@motioneasy/engine";
// kinetic type
import beatSlam from "./components/beat-slam";
import wordRotator from "./components/word-rotator";
import weightWave from "./components/weight-wave";
import echoStack from "./components/echo-stack";
import flyThrough from "./components/fly-through";
import charCascade from "./components/char-cascade";
import kineticStack from "./components/kinetic-stack";
import typeMarquee from "./components/type-marquee";
import imageType from "./components/image-type";
// text reveals
import focusPull from "./components/focus-pull";
import lightSweep from "./components/light-sweep";
import maskRise from "./components/mask-rise";
import terminalType from "./components/terminal-type";
import decode from "./components/decode";
import barWipe from "./components/bar-wipe";
import splitFlap from "./components/split-flap";
// numbers
import bigNumber from "./components/big-number";
// devices
import phoneHero from "./components/phone-hero";
import browserDrop from "./components/browser-drop";
import floatingCards from "./components/floating-cards";
// media
import coverflow from "./components/coverflow";
import swipeStack from "./components/swipe-stack";
import infiniteWall from "./components/infinite-wall";
import beforeAfter from "./components/before-after";
import gridAssemble from "./components/grid-assemble";
import cinematicStill from "./components/cinematic-still";
// overlays
import lowerThird from "./components/lower-third";
import clickCta from "./components/click-cta";
import callout from "./components/callout";
import notificationStack from "./components/notification-stack";
// numbers, captions, backgrounds, logos
import risingBars from "./components/rising-bars";
import ringMeter from "./components/ring-meter";
import captionKaraoke from "./components/caption-karaoke";
import captionPop from "./components/caption-pop";
import lightStage from "./components/light-stage";
import gridHorizon from "./components/grid-horizon";
import logoReveal from "./components/logo-reveal";
import logoBars from "./components/logo-bars";
import { TRANSITION_COMPONENTS } from "./components/transition-demos";
import { KIT_COMPONENTS } from "./kits";
// scenes
import hookStrike from "./components/hook-strike";
import scrollStop from "./components/scroll-stop";
import productOrbit from "./components/product-orbit";
import statTrio from "./components/stat-trio";
import checklist from "./components/checklist";
import style1Video from "./components/style1-video";
import fourSteps from "./components/four-steps";
import quoteCard from "./components/quote-card";
import countdown from "./components/countdown";
import nowLive from "./components/now-live";
import endCard from "./components/end-card";
import offerErase from "./components/offer-erase";

export const COMPONENTS: Component[] = [
  // scenes
  hookStrike, scrollStop, productOrbit, statTrio, checklist, style1Video, fourSteps, quoteCard, countdown, nowLive, endCard, offerErase,
  // elements
  beatSlam, kineticStack, typeMarquee, charCascade, imageType, wordRotator, weightWave, echoStack, flyThrough,
  focusPull, lightSweep, maskRise, barWipe, splitFlap, terminalType, decode,
  bigNumber, risingBars, ringMeter,
  captionKaraoke, captionPop,
  phoneHero, browserDrop, floatingCards,
  coverflow, swipeStack, infiniteWall, beforeAfter, gridAssemble, cinematicStill,
  lowerThird, clickCta, callout, notificationStack,
  ...TRANSITION_COMPONENTS,
  lightStage, gridHorizon,
  logoReveal, logoBars,
  ...KIT_COMPONENTS,
] as unknown as Component[];

export const componentById = (id: string) => COMPONENTS.find((c) => c.id === id);
