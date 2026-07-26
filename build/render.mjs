#!/usr/bin/env node
// Render the neutral source/ into per-agent targets:
//   - AGENTS.md          thin always-loaded index (Codex, Amp, anything that reads AGENTS.md)
//   - AGENTS.full.md     full bundle the index points into, read on demand per section
//   - targets/claude/    native Claude Code layout (rules, agents, skills, commands)
//   - targets/codex/     native Codex layout (AGENTS.md, AGENTS.full.md, config.toml, agents/, prompts/, skills/)
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
// rules: detailed rule files are meant to be read on demand, not auto-loaded.
// Claude Code DOES auto-load rules/common/*.md, so the full common set ships to
// rules/reference/ (a sibling dir, not auto-loaded like rules/<lang>/), and only
// files marked `autoload: claude` (the thin house-rules.md) stay in rules/common/
// to load every session. Language rules stay under rules/<lang>/ (on-demand).
for (const lang of Object.keys(manifest.rules)) {
  if (lang.startsWith('$')) continue;
  if (lang !== 'common') {
    copyDir(path.join(SRC, 'rules', lang), path.join(C, 'rules', lang));
    continue;
  }
  const commonSrc = path.join(SRC, 'rules', 'common');
  for (const f of fs.readdirSync(commonSrc).filter(x => x.endsWith('.md'))) {
    const raw = fs.readFileSync(path.join(commonSrc, f), 'utf8');
    const { data } = parse(raw);
    const sub = data.autoload === 'claude' ? 'common' : 'reference';
    write(path.join(C, 'rules', sub, f), raw);
  }
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
      // common detail ships to rules/reference/; autoload files load every
      // session and are not on-demand catalog entries.
      if (lang === 'common') {
        if (parse(fs.readFileSync(path.join(dir, f), 'utf8')).data.autoload === 'claude') continue;
        catalog.push(`- \`.claude/rules/reference/${f}\` — ${ruleEntry(path.join(dir, f))}`);
      } else {
        catalog.push(`- \`.claude/rules/${lang}/${f}\` — ${ruleEntry(path.join(dir, f))}`);
      }
    }
  }
  write(cpPath, fs.readFileSync(cpPath, 'utf8').replace('<!-- RULES_CATALOG -->', catalog.join('\n').trim()));
}
// workflows -> Claude commands. Claude Code reads a `description` frontmatter
// key for slash-command discovery, so the workflow summary is emitted there.
for (const [name, scope] of Object.entries(manifest.workflows)) {
  if (name.startsWith('$')) continue;
  if (scope === 'universal' || scope === 'claude') {
    const { data, body } = readWorkflow(name);
    const desc = (data.summary || '').toString().replace(/"/g, "'");
    write(path.join(C, 'commands', `${name}.md`),
      `---\ndescription: "${desc}"\n---\n\n` + body + '\n');
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
// universal agents -> standalone Codex custom-agent TOML. Codex requires the
// complete role body in developer_instructions; it does not follow file refs.
for (const [name, scope] of Object.entries(manifest.agents)) {
  if (name.startsWith('$') || scope !== 'universal') continue;
  const { data, body } = parse(fs.readFileSync(path.join(SRC, 'agents', `${name}.md`), 'utf8'));
  const desc = (data.description || data.name || name).toString().replace(/"/g, "'");
  if (body.includes("'''")) {
    throw new Error(`agent ${name}: role body contains the TOML multiline literal delimiter`);
  }
  write(path.join(X, 'agents', `${name}.toml`),
    `name = "${name}"\n` +
    `description = "${desc}"\n` +
    `developer_instructions = '''\n${body}\n'''\n`);
}
// Universal skills ship twice for Codex:
//   - skills/<name>/SKILL.md for native metadata-based discovery
//   - prompts/<name>.md for explicit slash-command invocation
//
// Codex skill frontmatter intentionally contains only the two supported
// discovery fields. Source-only portability metadata (scope, ported-from) is
// useful to this renderer but should not leak into an installed skill.
for (const [name, scope] of Object.entries(manifest.skills)) {
  if (name.startsWith('$') || scope !== 'universal') continue;
  const sourceSkill = path.join(SRC, 'skills', name);
  const { data, body } = readSkill(name);
  const codexSkill = path.join(X, 'skills', name);
  copyDir(sourceSkill, codexSkill);
  const skillName = (data.name || name).toString().replace(/"/g, '\\"');
  const description = (data.description || '').toString().replace(/"/g, '\\"');
  write(path.join(codexSkill, 'SKILL.md'),
    `---\nname: "${skillName}"\ndescription: "${description}"\n---\n\n${body}\n`);
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
// (AGENTS.lite.md, below, is the thin variant sharing these pieces)
// =========================================================================
const rosterLines = ['| Role | Scope | Purpose |', '|------|-------|---------|'];
for (const [name, scope] of Object.entries(manifest.agents)) {
  if (name.startsWith('$')) continue;
  const { data } = parse(fs.readFileSync(path.join(SRC, 'agents', `${name}.md`), 'utf8'));
  const desc = (data.description || '').toString().split('. ')[0].slice(0, 90);
  rosterLines.push(`| ${name} | ${scope} | ${desc} |`);
}

const skillLines = [];
for (const [name, scope] of Object.entries(manifest.skills)) {
  if (name.startsWith('$') || scope !== 'universal') continue;
  const { data } = readSkill(name);
  skillLines.push(`- **${name}**: ${data.description || ''}`);
}
const skillsNote =
  'Claude-only skills (`review`, `diverge`, `converge`, `research-project`) use the Skill/subagent mechanism and ship in `targets/claude/skills/` only.';

const h1of = body => {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '';
};

const parts = [];
parts.push('# Agentic Coding Practices (full bundle)');
parts.push('');
parts.push('> Generated by `build/render.mjs` from `source/`. Do not edit this file; edit `source/` and re-run `npm run build`.');
parts.push('');
parts.push('The full text of the universal layer: principles, agent roster, skills, and workflows. ');
parts.push('This file is not meant to be auto-loaded; the thin `AGENTS.md` alongside it is the ');
parts.push('always-loaded index, and points here by section heading. Read the section a task needs.');
parts.push('');

// principles: the common rules in full — this file is the read-on-demand text behind the index
parts.push('## Principles');
parts.push('');
const ruleOverrides = manifest.rule_overrides || {};
const commonDir = path.join(SRC, 'rules', 'common');
for (const f of fs.readdirSync(commonDir).sort()) {
  if (!f.endsWith('.md')) continue;
  const { data, body } = parse(fs.readFileSync(path.join(commonDir, f), 'utf8'));
  // autoload files are a target-specific consolidation of the others — skip them
  // here so their content isn't duplicated alongside the full per-topic text.
  if (data.autoload) continue;
  // claude/codex-scoped rule files ship to their target but stay out of universal AGENTS.md
  if ((ruleOverrides[`common/${f}`] || 'universal') !== 'universal') continue;
  parts.push(body.trim());
  parts.push('');
}
parts.push('Language-specific rules (Go, Python, TypeScript, Rust) live under `rules/<lang>/` in each target.');
parts.push('');

// agent roster
parts.push('## Agent Roles');
parts.push('');
parts.push(...rosterLines);
parts.push('');

// universal skills as prose
parts.push('## Skills');
parts.push('');
parts.push(...skillLines);
parts.push('');
parts.push(skillsNote);
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

const fullMd = parts.join('\n');
write(path.join(ROOT, 'AGENTS.full.md'), fullMd);
write(path.join(X, 'AGENTS.full.md'), fullMd);

// =========================================================================
// AGENTS.md: the thin index, and the file agents auto-load
// Rules and workflows appear as one-line pointers into AGENTS.full.md
// instead of inlined in full, so the always-loaded context stays small.
// =========================================================================
const lite = [];
lite.push('# Agentic Coding Practices');
lite.push('');
lite.push('> Generated by `build/render.mjs` from `source/`. Do not edit this file; edit `source/` and re-run `npm run build`.');
lite.push('');
lite.push('Coding standards, agent roles, skills, and workflows that read the same across');
lite.push('coding agents. This file is an index: each entry below is a pointer, not the');
lite.push('content. The full text lives in `AGENTS.full.md` next to this file — read the');
lite.push('named section there when a task needs it, and only that section.');
lite.push('');
lite.push('## Principles');
lite.push('');
lite.push('Each is a section (matched by heading) in `AGENTS.full.md`:');
lite.push('');
for (const f of fs.readdirSync(commonDir).sort()) {
  if (!f.endsWith('.md')) continue;
  if ((ruleOverrides[`common/${f}`] || 'universal') !== 'universal') continue;
  const { data, body } = parse(fs.readFileSync(path.join(commonDir, f), 'utf8'));
  const head = h1of(body) || f;
  lite.push(`- **${head}** (\`common/${f}\`)${data.summary ? ` — ${data.summary}` : ''}`);
}
lite.push('');
lite.push('Language-specific rules (Go, Python, TypeScript, Rust) live under `rules/<lang>/` in each target.');
lite.push('');
lite.push('## Agent Roles');
lite.push('');
lite.push(...rosterLines);
lite.push('');
lite.push('## Skills');
lite.push('');
lite.push(...skillLines);
lite.push('');
lite.push(skillsNote);
lite.push('');
lite.push('## Workflows');
lite.push('');
lite.push('Multi-step procedures, each a full section in `AGENTS.full.md`:');
lite.push('');
for (const [name, scope] of Object.entries(manifest.workflows)) {
  if (name.startsWith('$') || scope !== 'universal') continue;
  const { data, body } = readWorkflow(name);
  lite.push(`- **${name}** — ${data.summary || ''} (§ "${h1of(body)}")`);
}
lite.push('');
const liteMd = lite.join('\n');
write(path.join(ROOT, 'AGENTS.md'), liteMd);
// Codex convention: AGENTS.md at the codex target root too
write(path.join(X, 'AGENTS.md'), liteMd);

console.log('rendered:');
console.log('  AGENTS.md        (thin index)');
console.log('  AGENTS.full.md   (full bundle, read on demand)');
console.log('  targets/claude/  (rules, agents, skills, commands)');
console.log('  targets/codex/   (AGENTS.md, AGENTS.full.md, config.toml, agents, prompts, skills)');
