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
//   4. a Codex custom agent missing required inline developer instructions
//   5. a universal skill missing from Codex's native skills/ target
//   6. a host path (~/… or /home/…) in the agent-neutral universal output
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
const catalogPath = path.join(SRC, 'catalog.json');

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

const validScopes = new Set(['universal', 'claude', 'codex']);
for (const section of ['rules', 'agents', 'skills', 'workflows', 'templates']) {
  for (const [name, scope] of Object.entries(manifest[section] || {})) {
    if (!name.startsWith('$') && !validScopes.has(scope)) err(`manifest ${section}.${name}`, `invalid scope '${scope}'`);
  }
}

if (!fs.existsSync(catalogPath)) {
  err('source/catalog.json', 'required skill catalog is missing');
} else {
  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  } catch (e) {
    err('source/catalog.json', `invalid JSON: ${e.message}`);
    catalog = null;
  }
  if (catalog) {
    if (catalog.version !== 1) err('source/catalog.json', "version must be 1");
    if (!catalog.skills || typeof catalog.skills !== 'object' || Array.isArray(catalog.skills)) {
      err('source/catalog.json', 'skills must be an object');
    } else {
      const manifestSkills = Object.keys(manifest.skills).filter(name => !name.startsWith('$'));
      for (const name of manifestSkills) {
        const record = catalog.skills[name];
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
          err(`catalog skill ${name}`, 'missing record');
          continue;
        }
        if (typeof record.origin !== 'string' || !record.origin) err(`catalog skill ${name}`, 'origin must be a non-empty string');
        if (!['core', 'engineering', 'agent-systems', 'runtime', 'optional'].includes(record.collection)) err(`catalog skill ${name}`, `invalid collection '${record.collection}'`);
        if (!Array.isArray(record.requires) || record.requires.some(dep => typeof dep !== 'string' || !dep)) err(`catalog skill ${name}`, 'requires must be an array of non-empty skill names');
        for (const dep of Array.isArray(record.requires) ? record.requires : []) {
          if (!catalog.skills[dep]) err(`catalog skill ${name}`, `requires missing skill '${dep}'`);
          if (!manifest.skills[dep] || manifest.skills[dep].startsWith('$')) err(`catalog skill ${name}`, `requires unshipped skill '${dep}'`);
          const ownerScope = manifest.skills[name];
          const dependencyScope = manifest.skills[dep];
          const compatible = ownerScope === 'universal'
            ? dependencyScope === 'universal'
            : ownerScope === 'claude'
              ? dependencyScope === 'universal' || dependencyScope === 'claude'
              : ownerScope === 'codex'
                ? dependencyScope === 'universal' || dependencyScope === 'codex'
                : false;
          if (dependencyScope && !compatible) err(`catalog skill ${name}`, `requires '${dep}' (${dependencyScope}), incompatible with ${ownerScope}`);
        }
      }
      for (const name of Object.keys(catalog.skills)) {
        if (name.startsWith('$')) continue;
        if (!manifest.skills[name]) err(`catalog skill ${name}`, 'record has no manifest target');
      }
    }
    const optional = catalog.optional;
    if (optional !== undefined && (typeof optional !== 'object' || Array.isArray(optional))) {
      err('source/catalog.json', 'optional must be an object');
    } else if (optional) {
      for (const [name, record] of Object.entries(optional)) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) { err(`catalog optional ${name}`, 'missing record'); continue; }
        if (manifest.skills[name]) err(`catalog optional ${name}`, 'optional skill must not be in the default manifest');
        if (typeof record.path !== 'string' || !record.path) err(`catalog optional ${name}`, 'path must be a non-empty string');
        else if (!fs.existsSync(path.join(SRC, '..', record.path, 'SKILL.md'))) err(`catalog optional ${name}`, 'path has no SKILL.md');
        if (typeof record.origin !== 'string' || !record.origin) err(`catalog optional ${name}`, 'origin must be a non-empty string');
        if (!['core', 'engineering', 'agent-systems', 'runtime', 'optional'].includes(record.collection)) err(`catalog optional ${name}`, `invalid collection '${record.collection}'`);
        if (!Array.isArray(record.requires) || record.requires.some(dep => typeof dep !== 'string' || !dep)) err(`catalog optional ${name}`, 'requires must be an array of non-empty skill names');
        for (const dep of Array.isArray(record.requires) ? record.requires : []) {
          if (!catalog.skills?.[dep] && !optional?.[dep]) err(`catalog optional ${name}`, `requires missing skill '${dep}'`);
          if (manifest.skills[dep] && manifest.skills[dep] !== 'universal') err(`catalog optional ${name}`, `requires '${dep}' (${manifest.skills[dep]}), incompatible with optional skills`);
        }
      }
    }
    if (!catalog.rule_dependencies || typeof catalog.rule_dependencies !== 'object' || Array.isArray(catalog.rule_dependencies)) {
      err('source/catalog.json', 'rule_dependencies must be an object');
    } else {
      for (const [rule, deps] of Object.entries(catalog.rule_dependencies)) {
        if (!fs.existsSync(path.join(SRC, 'rules', rule))) err(`rule dependency ${rule}`, 'rule file does not exist');
        if (!Array.isArray(deps)) { err(`rule dependency ${rule}`, 'dependencies must be an array'); continue; }
        for (const dep of deps) {
          if (!catalog.skills?.[dep] && !catalog.optional?.[dep]) err(`rule dependency ${rule}`, `missing skill '${dep}'`);
          if (!manifest.skills[dep] || manifest.skills[dep].startsWith('$')) err(`rule dependency ${rule}`, `unshipped skill '${dep}'`);
        }
      }
    }
  }
}

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

// 3 — workflow invocations resolve and respect scope
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

// 4 — every universal agent uses Codex's standalone custom-agent schema. Codex
// does not follow instruction-file references: the role body must be inline.
for (const [name, scope] of Object.entries(manifest.agents)) {
  if (name.startsWith('$') || scope !== 'universal') continue;
  const sourcePath = path.join(SRC, 'agents', `${name}.md`);
  const targetPath = path.join(ROOT, 'targets', 'codex', 'agents', `${name}.toml`);
  if (!fs.existsSync(targetPath)) {
    err(`agent ${name}`, 'universal agent missing from targets/codex/agents');
    continue;
  }
  const { body } = parse(fs.readFileSync(sourcePath, 'utf8'));
  const raw = fs.readFileSync(targetPath, 'utf8');
  const targetName = raw.match(/^name = "([^"\n]+)"\s*$/m);
  if (!targetName || targetName[1] !== name) {
    err(`agent ${name}`, `Codex target name is '${targetName?.[1] || ''}'`);
  }
  const description = raw.match(/^description = "([^"\n]+)"\s*$/m);
  if (!description) {
    err(`agent ${name}`, "Codex target missing non-empty 'description'");
  }
  if (/^instructions_file\s*=/m.test(raw)) {
    err(`agent ${name}`, "Codex target uses unsupported 'instructions_file'");
  }
  const instructions = raw.match(/^developer_instructions = '''\n([\s\S]*?)\n'''\s*$/m);
  if (!instructions) {
    err(`agent ${name}`, "Codex target missing inline 'developer_instructions'");
  } else if (instructions[1] !== body) {
    err(`agent ${name}`, 'Codex target developer_instructions differ from the source role body');
  }
}

// 5 — every universal skill is natively discoverable by Codex. Prompts remain
// an additional explicit invocation surface, not a substitute for skills.
for (const [name, scope] of Object.entries(manifest.skills)) {
  if (name.startsWith('$') || (scope !== 'universal' && scope !== 'codex')) continue;
  const p = path.join(ROOT, 'targets', 'codex', 'skills', name, 'SKILL.md');
  if (!fs.existsSync(p)) {
    err(`skill ${name}`, 'universal skill missing from targets/codex/skills');
    continue;
  }
  const raw = fs.readFileSync(p, 'utf8');
  const { data } = parse(raw);
  if (data.name !== name) err(`skill ${name}`, `Codex target name is '${data.name || ''}'`);
  if (!data.description) err(`skill ${name}`, 'Codex target missing description');
  const extra = Object.keys(data).filter(key => key !== 'name' && key !== 'description');
  if (extra.length) err(`skill ${name}`, `Codex target has unsupported frontmatter: ${extra.join(', ')}`);
}

// 6 — no host paths in the agent-neutral universal output
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
