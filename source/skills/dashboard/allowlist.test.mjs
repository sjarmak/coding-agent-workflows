#!/usr/bin/env node
// Regression tests for the dashboard trust gate. Zero dependencies: node + assert.
// Run: node source/skills/dashboard/allowlist.test.mjs
//
// The gate's whole job is to be un-cleverable, so the cases below are the ways a
// stored collector could stop being the read-only command it claimed to be.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { checkCommand, loadPolicy } from './allowlist.mjs';

const policy = loadPolicy();
const results = [];
function test(name, fn) {
  try { fn(); results.push([true, name]); }
  catch (err) { results.push([false, name, err]); }
}
const allow = cmd => checkCommand(cmd, policy);

// --- the happy path ----------------------------------------------------------
test('admits an allowlisted prefix carrying its own arguments', () => {
  const v = allow('gh run list --limit 7 --json status,conclusion,workflowName');
  assert.equal(v.allowed, true, v.reason);
  assert.equal(v.matched, 'gh run list');
});

test('reports the exact prefix that admitted the command', () => {
  assert.equal(allow('git worktree list --porcelain').matched, 'git worktree list');
  assert.equal(allow('bd blocked --json').matched, 'bd blocked');
  assert.equal(allow('gh api -X GET repos/octocat/spoon-knife/actions/runs').matched, 'gh api -X GET');
});

// --- token boundaries --------------------------------------------------------
test('rejects a near-miss that shares a prefix but not a token boundary', () => {
  const v = allow('git logrotate --purge');
  assert.equal(v.allowed, false);
  assert.match(v.reason, /no allowlisted prefix/);
});

test('rejects a bare binary with no subcommand', () => {
  assert.equal(allow('git').allowed, false, 'bare git');
  assert.equal(allow('gh').allowed, false, 'bare gh');
  assert.equal(allow('bd').allowed, false, 'bare bd');
});

// --- write subcommands must not ride in on a read-only prefix ----------------
test('rejects write subcommands that share a family with allowed reads', () => {
  for (const cmd of [
    'git stash push -m wip',          // allowlist carries "git stash list" only
    'git branch -D feat/auth-rework', // allowlist carries --list / -v / --show-current
    'gh pr merge 412 --squash',       // "gh pr list" and "gh pr view" only
    'gh issue close 88',
    'npm install left-pad',           // "npm ls" / "npm outdated" only
  ]) {
    assert.equal(allow(cmd).allowed, false, `must reject: ${cmd}`);
  }
});

test('rejects a non-GET gh api call while allowing the GET form', () => {
  assert.equal(allow('gh api -X DELETE repos/octocat/spoon-knife/issues/3').allowed, false);
  assert.equal(allow('gh api --method POST repos/octocat/spoon-knife/issues').allowed, false);
  assert.equal(allow('gh api --method GET repos/octocat/spoon-knife').allowed, true);
});

// --- shell metacharacters ----------------------------------------------------
test('rejects a second command smuggled past an allowed prefix', () => {
  for (const [cmd, token] of [
    ['git status && rm -rf build', '&'],
    ['git status; curl https://example.invalid/x', ';'],
    ['rg --count TODO | xargs rm', '|'],
    ['git log > /tmp/leak.txt', '>'],
    ['git show $(cat /etc/hostname)', '$('],
    ['bd list `whoami`', '`'],
  ]) {
    const v = allow(cmd);
    assert.equal(v.allowed, false, `must reject: ${cmd}`);
    assert.equal(v.reason, `contains denied substring "${token}"`, `names the rule for: ${cmd}`);
  }
});

test('rejects write and exec escapes hidden in read-only tools', () => {
  assert.equal(allow('git log --output=/tmp/stolen.txt --oneline').allowed, false);
  assert.equal(allow('git rev-list --exec=/tmp/payload.sh HEAD').allowed, false);
});

// --- shape bounds ------------------------------------------------------------
test('rejects newline-injected and control-character commands', () => {
  const v = allow('git status\ngit push --force origin main');
  assert.equal(v.allowed, false);
  assert.equal(v.reason, 'command contains a control character or newline');
});

test('rejects a command past the length bound', () => {
  const v = allow('git log --oneline ' + 'x'.repeat(600));
  assert.equal(v.allowed, false);
  assert.match(v.reason, /over the 500 limit/);
});

test('rejects empty and non-string input', () => {
  assert.equal(allow('').allowed, false);
  assert.equal(allow('   ').allowed, false);
  assert.equal(checkCommand(null, policy).allowed, false);
  assert.equal(checkCommand(42, policy).allowed, false);
});

// --- policy integrity --------------------------------------------------------
test('every allowlist entry admits itself', () => {
  for (const prefix of policy.allow) {
    assert.equal(allow(prefix).allowed, true, `policy entry rejects itself: ${prefix}`);
  }
});

test('rejects a malformed policy file instead of failing open', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-policy-'));
  const empty = path.join(tmp, 'empty.json');
  const noDeny = path.join(tmp, 'no-deny.json');
  fs.writeFileSync(empty, JSON.stringify({ allow: [], deny_substrings: [] }));
  fs.writeFileSync(noDeny, JSON.stringify({ allow: ['git status'] }));

  assert.throws(() => loadPolicy(empty), /'allow' must be a non-empty array/);
  assert.throws(() => loadPolicy(noDeny), /'deny_substrings' must be an array/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

let failed = 0;
for (const [ok, name, err] of results) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) { failed++; console.error(`     ${err.message}`); }
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
