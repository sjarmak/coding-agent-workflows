#!/usr/bin/env node
// Release gate: scan rendered output for content that must never leave the machine.
// Runs over AGENTS.md + targets/ (the rendered artifacts), NOT source/: so provenance
// notes in source frontmatter (stripped at render time) don't trip it.
// Exit non-zero on any ERROR match. This gate is mandatory before sharing externally.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Hard blockers: absolute paths, PII, internal infra/jargon, private MCP servers.
// NOTE for forks: most of this list is specific to the original maintainer's
// environment (identity, internal repo names, private MCP servers). If you fork
// this repo, replace those patterns with your own — an unchanged list passes
// silently on leaks it was never written to catch.
const ERRORS = [
  { re: /\/home\/[a-z0-9_-]+/i, what: 'absolute home path' },
  { re: /cfa\.harvard\.edu|stephanie\.jarmak/i, what: 'personal/institutional identity' },
  // Note: `beads`, `bd`, and `dolt` are intentionally NOT blocked — beads (the `bd`
  // CLI) and its optional Dolt backend are public tools the bundle now recommends in
  // task-management.md. The genuinely-internal Gas City jargon below stays blocked.
  { re: /\bpolecat\b|\bsling\b|\bmayor\b|\bdrain-ack\b/i, what: 'Gas City runtime jargon' },
  { re: /\bgc (sling|doctor|prime|order|rig|runtime|session|mail)\b/i, what: 'gc CLI command' },
  { re: /mcp__(scix|fal-ai|code-intel|sourcegraph)/i, what: 'private MCP server reference' },
  // `gastownhall/beads` is carved out below: beads is a public tool the bundle
  // recommends, even though it lives under the same org as internal repos. Every
  // other gastownhall path (and the bare org name) stays blocked.
  { re: /\bds-research\b|gas-?city\/|gastownhall\b(?!\/beads)|zeldascension/i, what: 'internal workspace/repo path' },
];
// Soft warnings: provenance mentions that are acceptable but worth a human glance.
const WARNINGS = [
  { re: /\bGas City\b/, what: 'Gas City named as provenance (acceptable, confirm intentional)' },
];

const SCAN_ROOTS = ['AGENTS.md', 'AGENTS.lite.md', 'targets'];
const files = [];
const walk = p => {
  const st = fs.statSync(p);
  if (st.isDirectory()) for (const e of fs.readdirSync(p)) walk(path.join(p, e));
  else if (/\.(md|toml|json|txt)$/.test(p)) files.push(p);
};
for (const r of SCAN_ROOTS) {
  const p = path.join(ROOT, r);
  if (fs.existsSync(p)) walk(p);
}

let errors = 0, warns = 0;
for (const f of files) {
  const rel = path.relative(ROOT, f);
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const { re, what } of ERRORS) {
      if (re.test(line)) { console.error(`ERROR  ${rel}:${i + 1}  [${what}]  ${line.trim().slice(0, 100)}`); errors++; }
    }
    for (const { re, what } of WARNINGS) {
      if (re.test(line)) { console.warn(`warn   ${rel}:${i + 1}  [${what}]`); warns++; }
    }
  });
}

console.log(`\nsanitize: scanned ${files.length} rendered files: ${errors} error(s), ${warns} warning(s)`);
if (errors > 0) {
  console.error('\nRELEASE BLOCKED. Fix the source/ content above and re-run `npm run build`.');
  process.exit(1);
}
console.log('clean: safe to share.');
