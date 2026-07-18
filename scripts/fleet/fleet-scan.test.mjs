#!/usr/bin/env node
// Regression tests for fleet-scan discovery. Zero dependencies: node + assert.
// Run: node scripts/fleet/fleet-scan.test.mjs   (wired as `npm test`).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { discoverRepos } from './fleet-scan.mjs';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-scan-test-'));
const mkrepo = p => { fs.mkdirSync(path.join(p, '.git'), { recursive: true }); };
const mkdir = p => fs.mkdirSync(p, { recursive: true });
const results = [];
function test(name, fn) {
  try { fn(); results.push([true, name]); }
  catch (err) { results.push([false, name, err]); }
}

// --- walk() descends into repos nested under a git-repo root -----------------
test('descends into repos nested under a git-repo root', () => {
  const root = path.join(tmpRoot, 'walk');
  mkrepo(root);                                  // the root is ITSELF a repo
  mkrepo(path.join(root, 'repoA'));              // depth 1
  mkrepo(path.join(root, 'repoB'));              // depth 1
  mkdir(path.join(root, 'plain'));               // plain dir, depth 1
  mkrepo(path.join(root, 'plain', 'repoC'));     // depth 2
  mkrepo(path.join(root, 'repoA', 'inner'));     // past a repo boundary
  // linked worktree: .git is a FILE, not a dir
  mkdir(path.join(root, 'wt'));
  fs.writeFileSync(path.join(root, 'wt', '.git'), 'gitdir: /elsewhere\n');

  const found = discoverRepos({
    roots: [root], maxDepth: 2, exclude: ['/node_modules/'], knownReposPath: '/nonexistent',
  });

  // The bug: a git-repo root hid every repo beneath it. All must be found now.
  assert.ok(found.includes(root), 'root repo itself recorded');
  assert.ok(found.includes(path.join(root, 'repoA')), 'repoA (was hidden)');
  assert.ok(found.includes(path.join(root, 'repoB')), 'repoB (was hidden)');
  assert.ok(found.includes(path.join(root, 'plain', 'repoC')), 'repoC nested via plain dir');
  // A repo boundary below the root still halts the walk.
  assert.ok(!found.includes(path.join(root, 'repoA', 'inner')), 'inner repo NOT enumerated');
  // A linked worktree (.git as a file) is not a distinct repo.
  assert.ok(!found.includes(path.join(root, 'wt')), 'worktree skipped');
});

// --- known-repos.list is compacted on scan -----------------------------------
test('compacts known-repos.list, dropping stale/excluded entries', () => {
  const root = path.join(tmpRoot, 'known');
  mkrepo(path.join(root, 'realrepo'));
  mkrepo(path.join(root, 'EXCLUDED', 'x'));      // real repo, but under excluded path
  mkdir(path.join(root, 'plaindir'));            // exists, not a repo
  const listPath = path.join(root, 'known-repos.list');
  fs.writeFileSync(listPath, [
    path.join(root, 'realrepo'),
    path.join(root, 'EXCLUDED', 'x'),
    '/does/not/exist',
    path.join(root, 'plaindir'),
    '',                                          // blank line
  ].join('\n') + '\n');

  const found = discoverRepos({
    roots: [], maxDepth: 2, exclude: ['/EXCLUDED/'], knownReposPath: listPath,
  });

  assert.ok(found.includes(path.join(root, 'realrepo')), 'valid known repo kept');
  assert.ok(!found.includes(path.join(root, 'EXCLUDED', 'x')), 'excluded dropped');
  // The file itself is rewritten to only the surviving entry.
  assert.equal(fs.readFileSync(listPath, 'utf8'), path.join(root, 'realrepo') + '\n');
});

// --- an already-clean list is left untouched (no churn) ----------------------
test('leaves an already-compact list unchanged', () => {
  const root = path.join(tmpRoot, 'clean');
  mkrepo(path.join(root, 'r1'));
  const listPath = path.join(root, 'known-repos.list');
  const original = path.join(root, 'r1') + '\n';
  fs.writeFileSync(listPath, original);
  const before = fs.statSync(listPath).mtimeMs;
  discoverRepos({ roots: [], maxDepth: 2, exclude: ['/node_modules/'], knownReposPath: listPath });
  assert.equal(fs.readFileSync(listPath, 'utf8'), original, 'content unchanged');
  assert.equal(fs.statSync(listPath).mtimeMs, before, 'not rewritten');
});

fs.rmSync(tmpRoot, { recursive: true, force: true });

let failed = 0;
for (const [ok, name, err] of results) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) { failed++; console.error(`     ${err.message}`); }
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
