#!/usr/bin/env node
// Variety audit over post specs, oldest first (file name order): repeated recipe/opener/music,
// 3+ of one transition in a post, uniform shot lengths.
//   node cli/audit.mjs [posts/*.json ...]     (default: every spec in posts/)
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { loadLibrary } from "./library.mjs";
import { ROOT } from "./server.mjs";

const given = process.argv.slice(2).filter((a) => a.endsWith(".json"));
const files = given.length ? given.map((f) => resolve(f)) : readdirSync(join(ROOT, "posts")).filter((f) => f.endsWith(".json")).sort().map((f) => join(ROOT, "posts", f));
if (!files.length) {
  console.log("audit    no post specs found");
  process.exit(0);
}
const { auditPosts } = await loadLibrary();
const posts = files.map((f) => JSON.parse(readFileSync(f, "utf8")));
const issues = auditPosts(posts);
console.log(`audit    ${posts.length} posts`);
for (const i of issues) console.log(`  ✗ ${i}`);
if (!issues.length) console.log("         no repeated recipe, opener, music or signature transition; no uniform shot lengths");
process.exit(issues.length ? 1 : 0);
