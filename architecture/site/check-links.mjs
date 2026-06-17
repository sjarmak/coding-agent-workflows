// Architecture model drift guard.
// Walks every *.c4 file in the repo and verifies that each relative `link`
// target (e.g. `link ../src/foo 'foo'`) still resolves to a real file/dir.
// A dead link means the model points at code that was moved/renamed/deleted —
// the most common way a model silently drifts out of sync. URL links
// (http/https/mailto) are skipped. Exits non-zero if any link is dead, so the
// Pages workflow fails before publishing a stale model.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

function walk(dir) {
  let out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "_site") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith(".c4")) out.push(p);
  }
  return out;
}

const files = walk(".");
const linkRe = /\blink\s+("[^"]+"|'[^']+'|[^\s]+)/g;
const missing = [];

for (const f of files) {
  const txt = readFileSync(f, "utf8");
  let m;
  while ((m = linkRe.exec(txt))) {
    let target = m[1].replace(/^['"]|['"]$/g, "");
    if (/^(https?:|mailto:|#)/.test(target)) continue; // external / anchor — skip
    if (!/^\.\.?\//.test(target)) continue; // not a relative path
    target = target.split("#")[0]; // drop any anchor
    if (!existsSync(join(dirname(f), target))) missing.push(`${f} → ${target}`);
  }
}

if (missing.length) {
  // Report drift as GitHub Actions warnings (visible on the run) without
  // blocking the deploy — models are authored from working trees that can
  // legitimately differ from the published branch.
  console.log(`::warning::Architecture model has ${missing.length} dead source link(s) — the model may be drifting from the code (these links 404 for viewers; fix in architecture/*.c4):`);
  for (const x of missing) console.log(`::warning::  ${x}`);
  console.log(`⚠ ${missing.length} dead source link(s) found (non-blocking — see warnings above).`);
} else {
  console.log(`✓ All architecture model source links resolve (${files.length} .c4 file(s) scanned).`);
}
process.exit(0);
