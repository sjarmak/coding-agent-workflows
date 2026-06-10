#!/usr/bin/env node
// Staleness gate for CI: snapshot the committed AGENTS.md + AGENTS.full.md +
// targets/, re-render in place, and diff the snapshots. Fails if they differ:
// i.e. someone edited generated output directly, or forgot to run `npm run build`
// after editing source/. On failure the committed snapshot is restored, so a
// failed check never leaves freshly rendered output in the working tree.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function snapshot() {
  const out = {};
  const add = p => {
    if (!fs.existsSync(p)) return;
    const st = fs.statSync(p);
    if (st.isDirectory()) for (const e of fs.readdirSync(p)) add(path.join(p, e));
    else out[path.relative(ROOT, p)] = fs.readFileSync(p, 'utf8');
  };
  add(path.join(ROOT, 'AGENTS.md'));
  add(path.join(ROOT, 'AGENTS.full.md'));
  add(path.join(ROOT, 'targets'));
  return out;
}

const before = snapshot();
execSync('node build/render.mjs', { cwd: ROOT, stdio: 'ignore' });
const after = snapshot();

const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
const stale = [...keys].filter(k => before[k] !== after[k]);

if (stale.length) {
  // put the committed output back so the failed check leaves no rendered changes
  for (const k of keys) {
    const p = path.join(ROOT, k);
    if (before[k] === undefined) fs.rmSync(p, { force: true });
    else if (before[k] !== after[k]) fs.writeFileSync(p, before[k]);
  }
  console.error('STALE generated output: run `npm run build` and commit:');
  for (const k of stale) console.error('  ' + k);
  process.exit(1);
}
console.log(`check: ${keys.size} generated files up to date.`);
