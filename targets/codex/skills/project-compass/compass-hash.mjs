#!/usr/bin/env node
// compass-hash.mjs — canonical COMPASS.md staleness check (mechanism only).
//
// One algorithm, one implementation. The `project-compass` skill invokes this
// to stamp a map and to test it on refresh; the machine-level fleet scanner
// imports the same functions (from the bundle path) so a COMPASS map is
// verified identically everywhere. There is no second copy of the hash to drift.
//
// A COMPASS.md records, in YAML frontmatter, the exact area-relative files it
// was written from (`sources`) and a hash over their contents (`sources_hash`).
// Staleness is then a deterministic recompute — no model, no judgment:
//   current    hash matches               → the mapped files are unchanged
//   drifted    hash differs               → a mapped file changed; refresh
//   orphaned   a mapped file is gone       → the area moved/shrank; refresh
//   unstamped  no sources/hash present     → a legacy map that cannot be verified
//
// What it deliberately does NOT catch (the model's job on a full refresh, the
// analogue of a full re-index): a brand-new area that has no COMPASS.md at all,
// or a new file inside a mapped area that the map's author never listed. A hash
// only sees inside the file set it was given.
//
// Canonical hash: for each path in `sources` sorted lexicographically, append
//   `<relpath>\n<sha256-hex(file-bytes)>\n`
// to a buffer; sha256 the buffer; keep the first 16 hex chars, prefixed
// `sha256-16:`. Reproducible anywhere sha256 exists; 64 bits is ample for
// drift detection (this is not a security boundary).
//
// CLI:  node compass-hash.mjs [path ...]
//   path = a COMPASS.md file, or a directory to search (default: cwd).
//   Prints one line per map; exits non-zero if any is drifted or orphaned, so
//   it can gate a pre-commit hook or CI.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sha256hex = buf => crypto.createHash('sha256').update(buf).digest('hex');

// Hash the recorded source set. `sources` are area-relative paths (relative to
// the directory the COMPASS.md lives in). Missing files are reported, not hashed.
export function computeAreaHash(areaDir, sources) {
  const missing = [];
  const parts = [];
  for (const rel of [...sources].sort()) {
    let bytes;
    try { bytes = fs.readFileSync(path.join(areaDir, rel)); }
    catch { missing.push(rel); continue; }
    parts.push(`${rel}\n${sha256hex(bytes)}\n`);
  }
  return { hash: 'sha256-16:' + sha256hex(parts.join('')).slice(0, 16), missing };
}

// Parse only the two fields we stamp: the `sources_hash` scalar and the
// `sources` YAML list. Intentionally tiny — not a general YAML parser.
export function parseCompassFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { hash: null, sources: [] };
  const lines = m[1].split('\n');
  let hash = null;
  const sources = [];
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^sources_hash:\s*["']?([^"'\s]+)["']?\s*$/);
    if (h) { hash = h[1]; continue; }
    if (/^sources:\s*$/.test(lines[i])) {
      for (let j = i + 1; j < lines.length && /^\s*-\s+/.test(lines[j]); j++) {
        sources.push(lines[j].replace(/^\s*-\s+/, '').replace(/^["']|["']$/g, '').trim());
      }
    }
  }
  return { hash, sources };
}

// Check one COMPASS.md. Returns { path, status, ... }.
export function checkCompass(compassPath) {
  let text;
  try { text = fs.readFileSync(compassPath, 'utf8'); }
  catch { return { path: compassPath, status: 'unreadable' }; }
  const { hash, sources } = parseCompassFrontmatter(text);
  if (!hash || sources.length === 0) return { path: compassPath, status: 'unstamped' };
  const { hash: actual, missing } = computeAreaHash(path.dirname(compassPath), sources);
  if (missing.length) return { path: compassPath, status: 'orphaned', missing, expected: hash };
  if (actual !== hash) return { path: compassPath, status: 'drifted', expected: hash, actual };
  return { path: compassPath, status: 'current' };
}

// Find COMPASS.md files under a root. `exclude` is an array of RegExp tested
// against `path + '/'` (same convention as the fleet scanner), so a caller can
// pass its own vendored/build excludes. Hidden dirs, node_modules, and vendor
// are always skipped.
export function findCompassFiles(root, { maxDepth = 8, exclude = [] } = {}) {
  const excluded = p => exclude.some(re => re.test(p + '/'));
  const out = [];
  const walk = (dir, depth) => {
    if (depth > maxDepth || excluded(dir)) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === 'COMPASS.md' && e.isFile()) { out.push(path.join(dir, e.name)); continue; }
      if (e.isDirectory() && !e.name.startsWith('.') &&
          e.name !== 'node_modules' && e.name !== 'vendor') walk(path.join(dir, e.name), depth + 1);
    }
  };
  walk(root, 0);
  return out.sort();
}

// Summary shape used by the fleet scanner: counts plus per-map detail.
export function summarizeCompass(root, opts) {
  const detail = findCompassFiles(root, opts).map(checkCompass);
  const count = s => detail.filter(d => d.status === s).length;
  return {
    maps: detail.length,
    current: count('current'),
    drifted: count('drifted'),
    orphaned: count('orphaned'),
    unstamped: count('unstamped'),
    detail,
  };
}

const MARK = {
  current: 'ok       ', drifted: 'DRIFTED  ', orphaned: 'ORPHANED ',
  unstamped: 'unstamped', unreadable: 'UNREADABLE',
};

function main(argv) {
  const targets = argv.length ? argv : ['.'];
  const compasses = [];
  for (const t of targets) {
    let st;
    try { st = fs.statSync(t); } catch { console.error(`no such path: ${t}`); continue; }
    if (st.isDirectory()) compasses.push(...findCompassFiles(t));
    else if (path.basename(t) === 'COMPASS.md') compasses.push(t);
    else console.error(`not a COMPASS.md or directory: ${t}`);
  }
  if (!compasses.length) { console.log('no COMPASS.md files found'); return 0; }
  let needRefresh = 0;
  for (const c of compasses) {
    const r = checkCompass(c);
    let extra = '';
    if (r.status === 'orphaned') extra = `  missing: ${r.missing.join(', ')}`;
    else if (r.status === 'drifted') extra = `  ${r.expected} → ${r.actual}`;
    console.log(`${MARK[r.status] || r.status}  ${r.path}${extra}`);
    if (r.status === 'drifted' || r.status === 'orphaned') needRefresh++;
  }
  console.log(`\n${compasses.length} map(s): ${needRefresh} need refresh`);
  return needRefresh ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
