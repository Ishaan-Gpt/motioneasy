#!/usr/bin/env node
// Screenshots of the site for review: node cli/shot.mjs [--base http://localhost:3000] [--mobile] [--full] /path1 /path2 ...
//   --scroll 1200   scroll before shooting   --wait 2500   extra wait (ms)   --click "selector"
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (k) => args.includes(`--${k}`);
const base = opt("base", "http://localhost:3000");
const mobile = flag("mobile");
const full = flag("full");
const scroll = Number(opt("scroll", "0"));
const wait = Number(opt("wait", "2500"));
const click = opt("click", null);
const paths = args.filter((a, i) => a.startsWith("/") && !args[i - 1]?.startsWith("--"));

mkdirSync("out/shots", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: mobile ? 2 : 1 });
page.on("pageerror", (e) => console.log(`[page error] ${e.message}\n${(e.stack ?? "").split("\n").slice(0, 6).join("\n")}`));
page.on("console", (m) => m.type() === "error" && console.log(`[console] ${m.text().slice(0, 300)}`));
// Skip the first-visit loader for most shots.
if (!flag("loader")) await page.addInitScript(() => sessionStorage.setItem("me:loaded", "1"));
for (const p of paths) {
  const t0 = Date.now();
  await page.goto(base + p, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(wait);
  if (click) {
    await page.click(click).catch((e) => console.log("click failed", e.message));
    await page.waitForTimeout(800);
  }
  if (scroll) {
    await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)), scroll);
    await page.waitForTimeout(1500);
  }
  const name = `out/shots/${(p.replace(/[\/#?=]+/g, "_").replace(/^_|_$/g, "") || "home")}${mobile ? "-m" : ""}${scroll ? `-s${scroll}` : ""}.png`;
  await page.screenshot({ path: name, fullPage: full });
  console.log(`shot     ${name} (${Date.now() - t0} ms)`);
}
await browser.close();
