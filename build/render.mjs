#!/usr/bin/env node
// Render the neutral source/ into per-agent targets:
//   - AGENTS.md          universal entry point (Codex, Amp, anything that reads AGENTS.md)
//   - targets/claude/    native Claude Code layout (rules, agents, skills, commands)
//   - targets/codex/     native Codex layout (AGENTS.md, config.toml, agents/*.toml, prompts/)
//
// Scope rules from source/manifest.json decide where each artifact lands:
//   universal -> AGENTS.md prose + both targets
//   claude    -> targets/claude only
//   codex     -> targets/codex only
//
// This is mechanism only (IO + template substitution). No content decisions live here;
// they live in source/ and source/manifest.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'source');
const TARGETS = path.join(ROOT, 'targets');

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));

// --- tiny frontmatter parser (only the fields we emit) ---
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

const rmrf = p => fs.rmSync(p, { recursive: true, force: true });
const mkdirp = p => fs.mkdirSync(p, { recursive: true });
const write = (p, s) => { mkdirp(path.dirname(p)); fs.writeFileSync(p, s); };
const copyDir = (a, b) => fs.cpSync(a, b, { recursive: true });
const readSkill = name => parse(fs.readFileSync(path.join(SRC, 'skills', name, 'SKILL.md'), 'utf8'));
const readWorkflow = name => parse(fs.readFileSync(path.join(SRC, 'workflows', `${name}.md`), 'utf8'));

// reset targets
rmrf(TARGETS);
mkdirp(TARGETS);

// =========================================================================
// targets/claude: native Claude Code layout
// =========================================================================
const C = path.join(TARGETS, 'claude');
// rules: all languages in manifest
for (const lang of Object.keys(manifest.rules)) {
  if (lang.startsWith('$')) continue;
  copyDir(path.join(SRC, 'rules', lang), path.join(C, 'rules', lang));
}
// agents: universal + claude
for (const [name, scope] of Object.entries(manifest.agents)) {
  if (name.startsWith('$')) continue;
  if (scope === 'universal' || scope === 'claude') {
    fs.cpSync(path.join(SRC, 'agents', `${name}.md`), path.join(C, 'agents', `${name}.md`));
  }
}
// skills: universal + claude
for (const [name, scope] of Object.entries(manifest.skills)) {
  if (name.startsWith('$')) continue;
  if (scope === 'universal' || scope === 'claude') {
    copyDir(path.join(SRC, 'skills', name), path.join(C, 'skills', name));
  }
}
// coding-practices skill: inject a generated catalog of the rule files. The Claude
// target is the one place rules are NOT auto-loaded, so this index makes them
// discoverable on demand. Generated from the rule set so it can't drift. (Mechanism
// only: file listing + frontmatter/heading extraction, no content decisions.)
const ruleEntry = file => {
  const { data, body } = parse(fs.readFileSync(file, 'utf8'));
  if (data.summary) return data.summary;
  const h1 = body.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : path.basename(file, '.md');
};
const cpPath = path.join(C, 'skills', 'coding-practices', 'SKILL.md');
if (fs.existsSync(cpPath)) {
  const catalog = [];
  for (const lang of Object.keys(manifest.rules)) {
    if (lang.startsWith('$')) continue;
    const dir = path.join(SRC, 'rules', lang);
    catalog.push('', `### ${lang === 'common' ? 'Common (all languages)' : lang}`, '');
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.md')).sort()) {
      catalog.push(`- \`.claude/rules/${lang}/${f}\` — ${ruleEntry(path.join(dir, f))}`);
    }
  }
  write(cpPath, fs.readFileSync(cpPath, 'utf8').replace('<!-- RULES_CATALOG -->', catalog.join('\n').trim()));
}
// workflows -> Claude commands
for (const [name, scope] of Object.entries(manifest.workflows)) {
  if (name.startsWith('$')) continue;
  if (scope === 'universal' || scope === 'claude') {
    const { body } = readWorkflow(name);
    write(path.join(C, 'commands', `${name}.md`), body + '\n');
  }
}
// templates: verbatim project-scaffolding files (not principle prose)
for (const [name, scope] of Object.entries(manifest.templates || {})) {
  if (name.startsWith('$')) continue;
  if (scope === 'universal' || scope === 'claude') {
    fs.cpSync(path.join(SRC, 'templates', name), path.join(C, 'templates', name));
  }
}

// =========================================================================
// targets/codex: native Codex layout
// =========================================================================
const X = path.join(TARGETS, 'codex');
mkdirp(X);
write(path.join(X, 'config.toml'),
  `# Codex configuration: coding-agent-workflows\n` +
  `# Universal practices live in the AGENTS.md at repo root (Codex reads it automatically).\n` +
  `# Subagents below mirror the universal Claude reviewers.\n\n` +
  `[agents]\n# see agents/*.toml\n`);
// universal agents -> codex agent toml stubs
for (const [name, scope] of Object.entries(manifest.agents)) {
  if (name.startsWith('$') || scope !== 'universal') continue;
  const { data } = parse(fs.readFileSync(path.join(SRC, 'agents', `${name}.md`), 'utf8'));
  const desc = (data.description || data.name || name).toString().replace(/"/g, "'");
  write(path.join(X, 'agents', `${name}.toml`),
    `name = "${name}"\n` +
    `description = "${desc}"\n` +
    `# Full instructions: see targets/claude/agents/${name}.md (source: source/agents/${name}.md)\n`);
}
// universal skills + workflows -> codex prompts
for (const [name, scope] of Object.entries(manifest.skills)) {
  if (name.startsWith('$') || scope !== 'universal') continue;
  const { body } = readSkill(name);
  write(path.join(X, 'prompts', `${name}.md`), body + '\n');
}
for (const [name, scope] of Object.entries(manifest.workflows)) {
  if (name.startsWith('$') || scope !== 'universal') continue;
  const { body } = readWorkflow(name);
  write(path.join(X, 'prompts', `${name}.md`), body + '\n');
}
// universal templates -> codex templates dir
for (const [name, scope] of Object.entries(manifest.templates || {})) {
  if (name.startsWith('$') || scope !== 'universal') continue;
  fs.cpSync(path.join(SRC, 'templates', name), path.join(X, 'templates', name));
}

// =========================================================================
// AGENTS.md: universal entry point
// =========================================================================
const parts = [];
parts.push('# Agentic Coding Practices');
parts.push('');
parts.push('> Generated by `build/render.mjs` from `source/`. Do not edit this file; edit `source/` and re-run `npm run build`.');
parts.push('');
parts.push('Coding standards, agent roles, skills, and workflows that read the same across coding agents. ');
parts.push('Claude Code reads `targets/claude/`; Codex reads this file plus `targets/codex/`; ');
parts.push('any agent that reads `AGENTS.md` (Amp, Aider, Gemini CLI, and others) gets the universal layer below.');
parts.push('');

// principles: inline the common rules in full (non-Claude agents won't follow links)
parts.push('## Principles');
parts.push('');
const ruleOverrides = manifest.rule_overrides || {};
const commonDir = path.join(SRC, 'rules', 'common');
for (const f of fs.readdirSync(commonDir).sort()) {
  if (!f.endsWith('.md')) continue;
  // claude/codex-scoped rule files ship to their target but stay out of universal AGENTS.md
  if ((ruleOverrides[`common/${f}`] || 'universal') !== 'universal') continue;
  const { body } = parse(fs.readFileSync(path.join(commonDir, f), 'utf8'));
  parts.push(body.trim());
  parts.push('');
}
parts.push('Language-specific rules (Go, Python, TypeScript, Rust) live under `rules/<lang>/` in each target.');
parts.push('');

// agent roster
parts.push('## Agent Roles');
parts.push('');
parts.push('| Role | Scope | Purpose |');
parts.push('|------|-------|---------|');
for (const [name, scope] of Object.entries(manifest.agents)) {
  if (name.startsWith('$')) continue;
  const { data } = parse(fs.readFileSync(path.join(SRC, 'agents', `${name}.md`), 'utf8'));
  const desc = (data.description || '').toString().split('. ')[0].slice(0, 90);
  parts.push(`| ${name} | ${scope} | ${desc} |`);
}
parts.push('');

// universal skills as prose
parts.push('## Skills');
parts.push('');
for (const [name, scope] of Object.entries(manifest.skills)) {
  if (name.startsWith('$') || scope !== 'universal') continue;
  const { data } = readSkill(name);
  parts.push(`- **${name}**: ${data.description || ''}`);
}
parts.push('');
parts.push('Claude-only skills (`review`, `diverge`, `converge`, `research-project`) use the Skill/subagent mechanism and ship in `targets/claude/skills/` only.');
parts.push('');

// workflows in full (the headline)
parts.push('## Workflows');
parts.push('');
parts.push('The codified multi-step procedures. Each is a runtime-neutral step DAG.');
parts.push('');
for (const [name, scope] of Object.entries(manifest.workflows)) {
  if (name.startsWith('$') || scope !== 'universal') continue;
  const { body } = readWorkflow(name);
  parts.push(body.trim());
  parts.push('');
  parts.push('---');
  parts.push('');
}

const agentsMd = parts.join('\n');
write(path.join(ROOT, 'AGENTS.md'), agentsMd);
// Codex convention: AGENTS.md at the codex target root too
write(path.join(X, 'AGENTS.md'), agentsMd);

console.log('rendered:');
console.log('  AGENTS.md');
console.log('  targets/claude/  (rules, agents, skills, commands)');
console.log('  targets/codex/   (AGENTS.md, config.toml, agents, prompts)');
