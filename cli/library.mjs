// Loads the TypeScript library for Node by bundling it on the fly (shared by remix, audit and test).
import { build } from "esbuild";
import { join } from "node:path";
import { ROOT } from "./server.mjs";

export async function loadLibrary() {
  const lib = await build({ stdin: { contents: `export * from "./packages/library/src/index.ts"; export { coerce, defaultProps, propsFor } from "./packages/engine/src/index.ts";`, resolveDir: ROOT, loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "error" });
  return import(`data:text/javascript;base64,${Buffer.from(lib.outputFiles[0].text).toString("base64")}`);
}
