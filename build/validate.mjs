#!/usr/bin/env node
// validate.mjs — integrity gate for the source/ layer and its rendered output.
//
// The render step is mechanism only; it will happily ship a skill that cannot
// load or a "universal" workflow that invokes a Claude-only skill. This gate
// catches the classes of breakage that otherwise reach a consuming project
// silently:
//
//   1. a SKILL.md that will not register (no frontmatter name/description)
//   2. a SKILL.md carrying $ARGUMENTS (a slash-command idiom; never substituted
//      in a skill, so it points at a literal dead variable)
//   3. a workflow whose `invokes:` names something the bundle does not ship
//   5. a host path (~/… or /home/…) in the agent-neutral universal output
//
// Plus one WARNING (non-fatal): a `universal` workflow invoking a Claude-only
// skill. By design the workflow is the portable process layer and the skill is
// the Claude accelerator, so the step must degrade gracefully in prose; the
// warning keeps those degradation points visible without blocking.
//
// Exit non-zero on any error. Run: npm run validate

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'source');
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));

// minimal frontmatter parse (same shape as render.mjs)
function parse(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: md };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, '');
    }
    data[kv[1]] = v;
  }
  return { data, body: m[2].trim() };
}

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

// 1 + 2 — skills load and carry no slash-command idioms
for (const [name, scope] of Object.entries(manifest.skills)) {
  if (name.startsWith('$')) continue;
  const p = path.join(SRC, 'skills', name, 'SKILL.md');
  if (!fs.existsSync(p)) { err(`skill ${name}`, 'listed in manifest but has no SKILL.md'); continue; }
  const raw = fs.readFileSync(p, 'utf8');
  const { data, body } = parse(raw);
  if (!raw.startsWith('---')) err(`skill ${name}`, 'no YAML frontmatter — will not register');
  if (!data.name) err(`skill ${name}`, "frontmatter missing 'name'");
  if (!data.description) err(`skill ${name}`, "frontmatter missing 'description'");
  if (/\$ARGUMENTS/.test(body)) err(`skill ${name}`, 'body contains $ARGUMENTS (slash-command idiom; skills receive args via invocation)');
  void scope;
}

// 3 + 4 — workflow invocations resolve and respect scope
const skillScope = manifest.skills;
const workflowScope = manifest.workflows;
for (const [name, wfScope] of Object.entries(manifest.workflows)) {
  if (name.startsWith('$')) continue;
  const p = path.join(SRC, 'workflows', `${name}.md`);
  if (!fs.existsSync(p)) { err(`workflow ${name}`, 'listed in manifest but has no .md'); continue; }
  const { data } = parse(fs.readFileSync(p, 'utf8'));
  const invokes = Array.isArray(data.invokes) ? data.invokes : (data.invokes ? [data.invokes] : []);
  for (const target of invokes) {
    const targetScope = skillScope[target] ?? workflowScope[target];
    if (targetScope === undefined) {
      err(`workflow ${name}`, `invokes '${target}', which is neither a shipped skill nor workflow`);
    } else if (wfScope === 'universal' && targetScope !== 'universal') {
      warn(`workflow ${name}`, `is universal but invokes '${target}' (${targetScope}); the step must degrade gracefully in prose for a runtime without subagents`);
    }
  }
}

// 5 — no host paths in the agent-neutral universal output
const HOSTPATH = /(?:~\/|\/home\/[a-z0-9_-]+)/i;
const universalTargets = ['AGENTS.md', 'AGENTS.full.md', path.join('targets', 'codex')];
const walk = (p, out) => {
  const st = fs.statSync(p);
  if (st.isDirectory()) for (const e of fs.readdirSync(p)) walk(path.join(p, e), out);
  else if (/\.(md|toml)$/.test(p)) out.push(p);
};
const uniFiles = [];
for (const rel of universalTargets) {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) walk(p, uniFiles);
}
for (const f of uniFiles) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (HOSTPATH.test(line)) err(`${path.relative(ROOT, f)}:${i + 1}`, `host path in universal output — "${line.trim().slice(0, 80)}"`);
  });
}

if (warnings.length) {
  console.error(`validate: ${warnings.length} warning(s)`);
  for (const w of warnings) console.error(`  warn   ${w}`);
  console.error('');
}
if (errors.length) {
  console.error(`validate: ${errors.length} error(s)\n`);
  for (const e of errors) console.error(`  ERROR  ${e}`);
  console.error('\nVALIDATION FAILED.');
  process.exit(1);
}
console.log(`validate: source/ and rendered universal output are consistent${warnings.length ? ` (${warnings.length} warning(s) above)` : ''}.`);
