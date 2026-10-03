#!/usr/bin/env node
// Review sheet: components × prop variants at one moment, in one PNG.
//   node cli/matrix.mjs --ids focus-pull,mask-rise --vary backdrop=grid,dots,type --t 0.7 --format vertical
//   --t is a fraction of each component's duration; --props '{...}' applies to every cell.
import { openHost } from "./server.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const ids = opt("ids", "focus-pull").split(",");
const [vk, vv] = (opt("vary", "backdrop=auto") ?? "").split("=");
const values = vv.split(",");
const format = opt("format", "vertical");
const at = Number(opt("t", "0.7"));
const scale = Number(opt("scale", "0.3"));
const base = JSON.parse(opt("props", "{}"));
const out = opt("out", `out/stills/matrix-${vk}.png`);
const cols = Number(opt("cols", "0"));

const host = await openHost();
try {
  await host.page.evaluate(
    async ({ ids, vk, values, format, at, scale, base, out, cols }) => {
      if (ids[0] === "all") ids = MotionEasy.components.map((c) => c.id);
      const F = MotionEasy.engine.FORMATS[format];
      const cw = Math.round(F.w * scale), ch = Math.round(F.h * scale);
      const gap = 8, label = 22;
      const n = ids.length * values.length;
      const C = cols || values.length;
      const sheet = document.createElement("canvas");
      sheet.width = C * (cw + gap) + gap;
      sheet.height = Math.ceil(n / C) * (ch + label + gap) + gap;
      const g = sheet.getContext("2d");
      g.fillStyle = "#2a2a28";
      g.fillRect(0, 0, sheet.width, sheet.height);
      for (let r = 0; r < ids.length; r++) {
        for (let k = 0; k < values.length; k++) {
          const cell = r * values.length + k;
          let v = values[k];
          if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
          const spec = { component: ids[r], format, props: { ...base, [vk]: v } };
          const res = MotionEasy.resolve(spec);
          const dur = MotionEasy.engine.durationOf(res.comp, res.props);
          const blob = await MotionEasy.still(spec, dur * at, scale);
          const bmp = await createImageBitmap(blob);
          const x = gap + (cell % C) * (cw + gap), y = gap + Math.floor(cell / C) * (ch + label + gap);
          g.drawImage(bmp, x, y + label, cw, ch);
          g.fillStyle = "#e8e8d8";
          g.font = "600 14px system-ui";
          g.fillText(`${ids[r]} · ${vk}=${values[k]}`, x, y + 15);
        }
      }
      const png = await new Promise((res) => sheet.toBlob(res, "image/png"));
      await fetch(`/__out?path=${encodeURIComponent(out)}`, { method: "POST", body: png });
    },
    { ids, vk, values, format, at, scale, base, out, cols },
  );
  console.log(`matrix   ${out}`);
} finally {
  await host.close();
}
