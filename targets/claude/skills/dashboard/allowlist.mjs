#!/usr/bin/env node
// allowlist.mjs — the dashboard's trust gate (mechanism only, no judgment).
//
// A learned collector is a shell command the model worked out at run time and
// wrote into a project's .dashboard/profile.json. On every later run that command
// executes again without anyone reading it. This module decides, mechanically,
// which commands are eligible for that treatment.
//
// The rule, in order:
//   1. a command is a bounded one-line string (no control characters)
//   2. it contains no shell metacharacter and no write/exec escape flag
//   3. it starts with an allowlisted prefix on a TOKEN boundary
//
// Fail any step and the command is not stored and not auto-run. The model may
// still run it once, with the user's explicit approval, for this run only.
//
// Token boundary matters: "git log" must not admit "git logsomething", and
// prefix specificity matters: the list carries "git stash list", never "git
// stash", so no write subcommand rides in on a read-only prefix.
//
// CLI:  node allowlist.mjs "<command>"
//   prints ALLOW <matched prefix> / DENY <reason>; exits 0 on allow, 1 on deny,
//   so a caller can gate on the exit code rather than parse prose.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY_PATH = path.join(HERE, 'allowlist.json');

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function loadPolicy(policyPath = DEFAULT_POLICY_PATH) {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  if (!Array.isArray(policy.allow) || !policy.allow.length) {
    throw new Error(`${policyPath}: 'allow' must be a non-empty array`);
  }
  if (!Array.isArray(policy.deny_substrings)) {
    throw new Error(`${policyPath}: 'deny_substrings' must be an array`);
  }
  return policy;
}

const tokens = s => s.trim().split(/\s+/);

// Does `cmd` start with `prefix` on a token boundary?
function prefixMatches(cmdTokens, prefix) {
  const want = tokens(prefix);
  if (want.length > cmdTokens.length) return false;
  return want.every((t, i) => t === cmdTokens[i]);
}

/**
 * @returns {{allowed: boolean, reason: string, matched: string|null}}
 *   `matched` is the allowlist prefix that admitted the command, for the caller
 *   to record next to it in the profile. `reason` always explains the verdict;
 *   a denial names the specific rule that rejected it, never a generic message.
 */
export function checkCommand(cmd, policy = loadPolicy()) {
  const deny = (reason) => ({ allowed: false, reason, matched: null });

  if (typeof cmd !== 'string' || !cmd.trim()) {
    return deny('empty or non-string command');
  }
  const maxLength = policy.max_length ?? 500;
  if (cmd.length > maxLength) {
    return deny(`command is ${cmd.length} chars, over the ${maxLength} limit`);
  }
  if (CONTROL_CHARS.test(cmd)) {
    return deny('command contains a control character or newline');
  }
  for (const bad of policy.deny_substrings) {
    if (cmd.includes(bad)) return deny(`contains denied substring "${bad}"`);
  }

  const cmdTokens = tokens(cmd);
  const matched = policy.allow.find(prefix => prefixMatches(cmdTokens, prefix));
  if (!matched) {
    return deny(`no allowlisted prefix matches "${cmdTokens.slice(0, 3).join(' ')}"`);
  }
  return { allowed: true, reason: `matches allowlisted prefix "${matched}"`, matched };
}

// --- CLI ---------------------------------------------------------------------
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const cmd = process.argv.slice(2).join(' ');
  if (!cmd) {
    console.error('usage: node allowlist.mjs "<command>"');
    process.exit(2);
  }
  const verdict = checkCommand(cmd);
  if (verdict.allowed) {
    console.log(`ALLOW  ${verdict.matched}`);
    process.exit(0);
  }
  console.log(`DENY   ${verdict.reason}`);
  process.exit(1);
}
