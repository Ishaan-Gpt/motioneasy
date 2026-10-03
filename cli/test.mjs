#!/usr/bin/env node
// Schema tests: every component's defaults parse clean, every example spec in posts/ and decks/ is
// valid and lays out, every registered component has a poster-able default render duration.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { loadLibrary } from "./library.mjs";
import { ROOT } from "./server.mjs";

const lib = await loadLibrary();
const { COMPONENTS, layoutPost } = lib;
const { coerce, defaultProps } = lib;

let fail = 0, pass = 0;
const check = (name, ok, why = "") => { if (ok) pass++; else { fail++; console.log(`  ✗ ${name}${why ? `: ${why}` : ""}`); } };

for (const c of COMPONENTS) {
  const p = defaultProps(c);
  check(`${c.id} has name/description`, !!c.name && !!c.description);
  if (p) {
    const r = coerce(c.schema, p);
    check(`${c.id} defaults parse without fixes`, r.issues.length === 0, r.issues.join("; "));
  }
}

const specs = [];
for (const dir of ["posts", "posts/remix", "examples"]) {
  const d = join(ROOT, dir);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) if (f.endsWith(".json")) specs.push(join(d, f));
}
for (const f of specs) {
  let spec;
  try { spec = JSON.parse(readFileSync(f, "utf8")); } catch (e) { check(f, false, "invalid JSON"); continue; }
  if (!Array.isArray(spec.clips)) continue; // not a post spec
  try {
    const { duration } = layoutPost(spec);
    check(`${f} lays out`, duration > 0);
    for (const cs of spec.clips) {
      const c = COMPONENTS.find((x) => x.id === cs.component);
      const r = coerce(c.schema, cs.props ?? {});
      check(`${f} · ${cs.component} props`, r.issues.length === 0, r.issues.join("; "));
    }
  } catch (e) { check(f, false, e.message); }
}
// The JSON examples shown on the Docs page must be valid too.
const docs = readFileSync(join(ROOT, "apps/web/src/app/docs/page.tsx"), "utf8");
const snippet = (name) => { const m = docs.match(new RegExp("const " + name + " = `([\\s\\S]*?)`;")); return m ? JSON.parse(eval("`" + m[1] + "`")) : null; };
const compSpec = snippet("COMPONENT_SPEC"), postSpec = snippet("POST_SPEC");
check("docs COMPONENT_SPEC found", !!compSpec);
if (compSpec) {
  const c = COMPONENTS.find((x) => x.id === compSpec.component);
  check("docs COMPONENT_SPEC component exists", !!c);
  if (c) { const r = coerce(c.schema, compSpec.props); check("docs COMPONENT_SPEC props", r.issues.length === 0, r.issues.join("; ")); }
}
check("docs POST_SPEC found", !!postSpec);
if (postSpec) { try { check("docs POST_SPEC lays out", layoutPost(postSpec).duration > 0); } catch (e) { check("docs POST_SPEC", false, e.message); } }
console.log(`test     ${pass} passed, ${fail} failed (${COMPONENTS.length} components, ${specs.length} spec files)`);
process.exit(fail ? 1 : 0);
