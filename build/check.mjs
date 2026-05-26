#!/usr/bin/env node
// Staleness gate for CI: re-render into a temp dir and diff against the committed
// targets/ + AGENTS.md. Fails if they differ: i.e. someone edited generated output
// directly, or forgot to run `npm run build` after editing source/.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function snapshot() {
  const out = {};
  const add = p => {
    const st = fs.statSync(p);
    if (st.isDirectory()) for (const e of fs.readdirSync(p)) add(path.join(p, e));
    else out[path.relative(ROOT, p)] = fs.readFileSync(p, 'utf8');
  };
  add(path.join(ROOT, 'AGENTS.md'));
  add(path.join(ROOT, 'targets'));
  return out;
}

const before = snapshot();
execSync('node build/render.mjs', { cwd: ROOT, stdio: 'ignore' });
const after = snapshot();

const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
const stale = [...keys].filter(k => before[k] !== after[k]);

if (stale.length) {
  console.error('STALE generated output: run `npm run build` and commit:');
  for (const k of stale) console.error('  ' + k);
  process.exit(1);
}
console.log(`check: ${keys.size} generated files up to date.`);
