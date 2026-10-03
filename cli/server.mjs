// Tiny static server for the CLI: serves the built engine + media, a blank host page, and accepts
// rendered files back from the page (POST /__out?path=...).
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "apps/web/public");

const TYPES = {
  ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".html": "text/html",
  ".woff2": "font/woff2", ".mp4": "video/mp4", ".webm": "video/webm", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".png": "image/png", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4",
};

const HOST = `<!doctype html><html><head><meta charset="utf-8"><title>MotionEasy CLI</title>
<style>html,body{margin:0;background:#FFFFEB}</style></head><body>
<script src="/engine/motioneasy.js"></script>
<script>MotionEasy.configure({ assets: "/engine", media: "" }); window.__ready = true;</script>
</body></html>`;

/** Resolve a URL path to a file: /engine and /media come from the site build, everything else from the repo. */
function fileFor(path) {
  const p = normalize(decodeURIComponent(path)).replace(/^([/\\])+/, "");
  const fromPub = join(PUB, p);
  if (existsSync(fromPub) && statSync(fromPub).isFile()) return fromPub;
  const fromRoot = join(ROOT, p);
  if (fromRoot.startsWith(ROOT) && existsSync(fromRoot) && statSync(fromRoot).isFile()) return fromRoot;
  return null;
}

export function startServer(port = 0) {
  return new Promise((res) => {
    const server = createServer((req, rsp) => {
      const url = new URL(req.url, "http://x");
      if (req.method === "POST" && url.pathname === "/__out") {
        const out = resolve(ROOT, url.searchParams.get("path"));
        if (!out.startsWith(ROOT)) return rsp.writeHead(400).end();
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
          mkdirSync(dirname(out), { recursive: true });
          writeFileSync(out, Buffer.concat(chunks));
          rsp.writeHead(200).end("ok");
        });
        return;
      }
      if (url.pathname === "/" || url.pathname === "/host.html") {
        rsp.writeHead(200, { "content-type": "text/html" });
        return rsp.end(HOST);
      }
      const f = fileFor(url.pathname);
      if (!f) return rsp.writeHead(404).end("not found");
      const size = statSync(f).size;
      const type = TYPES[extname(f).toLowerCase()] ?? "application/octet-stream";
      const range = req.headers.range;
      if (range) {
        const [a, b] = range.replace("bytes=", "").split("-");
        const start = Number(a), end = b ? Number(b) : size - 1;
        rsp.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "content-length": end - start + 1 });
        return createReadStream(f, { start, end }).pipe(rsp);
      }
      rsp.writeHead(200, { "content-type": type, "content-length": size, "accept-ranges": "bytes" });
      createReadStream(f).pipe(rsp);
    });
    server.listen(port, "127.0.0.1", () => res({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

/** Launch system Chrome (WebCodecs H.264 + WebGL2) and open the host page. */
export async function openHost() {
  const { chromium } = await import("playwright-core");
  const { server, url } = await startServer();
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required", "--enable-gpu-rasterization", "--ignore-gpu-blocklist", "--use-angle=default"],
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") console.log(`[page ${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => console.log(`[page error] ${e.message}`));
  await page.goto(`${url}/host.html`);
  await page.waitForFunction(() => window.__ready === true);
  return {
    page,
    url,
    async close() {
      await browser.close();
      server.close();
    },
  };
}
