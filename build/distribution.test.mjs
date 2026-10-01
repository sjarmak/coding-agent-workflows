import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const fixture = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coding-agent-distribution-'));
  fs.cpSync(path.join(root, 'source'), path.join(dir, 'source'), { recursive: true });
  fs.cpSync(path.join(root, 'optional'), path.join(dir, 'optional'), { recursive: true });
  fs.cpSync(path.join(root, 'build'), path.join(dir, 'build'), { recursive: true });
  fs.cpSync(path.join(root, 'install.sh'), path.join(dir, 'install.sh'));
  return dir;
};

const run = (dir, script, args = [], extraEnv = {}) => spawnSync(
  script.endsWith('.sh') ? 'bash' : process.execPath, [script, ...args], {
  cwd: dir,
  encoding: 'utf8',
  env: { ...process.env, ...extraEnv },
});

test('renderer includes House Rules and copies language rules to Codex', () => {
  const dir = fixture();
  try {
    const result = run(dir, 'build/render.mjs');
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    const full = fs.readFileSync(path.join(dir, 'AGENTS.full.md'), 'utf8');
    assert.match(full, /^# House Rules \(always-on\)/m);
    assert.equal(
      fs.readFileSync(path.join(dir, 'source/rules/python/testing.md'), 'utf8'),
      fs.readFileSync(path.join(dir, 'targets/codex/rules/python/testing.md'), 'utf8'),
    );
    assert.ok(fs.existsSync(path.join(dir, 'targets/codex/skills/ultracode/SKILL.md')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('agents install includes native skills and language rules', () => {
  const dir = fixture();
  const destination = path.join(dir, 'destination');
  try {
    const rendered = run(dir, 'build/render.mjs');
    assert.equal(rendered.status, 0, rendered.stderr);
    const result = run(dir, 'install.sh', ['agents', destination]);
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.ok(fs.existsSync(path.join(destination, '.agents/skills/focus/SKILL.md')));
    for (const resource of ['impeccable/scripts/load-context.mjs', 'impeccable/reference/craft.md', 'impeccable/LICENSE', 'graphify/SKILL.md', 'code-graph/SKILL.md', 'tufte-chart/scripts/render_line_svg.py']) {
      assert.deepEqual(
        fs.readFileSync(path.join(destination, '.agents/skills', resource)),
        fs.readFileSync(path.join(dir, resource.endsWith('/SKILL.md') ? 'targets/codex/skills' : 'source/skills', resource)),
      );
    }
    assert.ok(fs.existsSync(path.join(destination, '.agents/rules/python/testing.md')));
    assert.equal(fs.existsSync(path.join(destination, '.agents/skills/ultracode')), false);
    const linkedAgents = path.join(dir, 'linked-agents');
    const agentsExternal = path.join(dir, 'agents-external');
    fs.mkdirSync(agentsExternal);
    fs.mkdirSync(linkedAgents);
    fs.symlinkSync(agentsExternal, path.join(linkedAgents, '.agents'));
    const linkedResult = run(dir, 'install.sh', ['agents', linkedAgents]);
    assert.equal(linkedResult.status, 0, linkedResult.stderr);
    assert.equal(fs.readdirSync(agentsExternal).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Codex upgrade preserves foreign files and prunes owned files safely around symlinks', () => {
  const dir = fixture();
  const codexHome = path.join(dir, 'codex-home');
  const destination = path.join(dir, 'destination');
  try {
    const rendered = run(dir, 'build/render.mjs');
    assert.equal(rendered.status, 0, rendered.stderr);
    const first = run(dir, 'install.sh', ['codex', destination], { CODEX_HOME: codexHome });
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(codexHome, 'skills/foreign.md'), 'foreign');
    const external = path.join(dir, 'external');
    fs.mkdirSync(external, { recursive: true });
    fs.rmSync(path.join(codexHome, 'skills/focus'), { recursive: true, force: true });
    fs.symlinkSync(external, path.join(codexHome, 'skills/focus'));
    const second = run(dir, 'install.sh', ['codex-upgrade', destination], { CODEX_HOME: codexHome });
    assert.equal(second.status, 0, `${second.stderr}\n${second.stdout}`);
    assert.equal(fs.readFileSync(path.join(codexHome, 'skills/foreign.md'), 'utf8'), 'foreign');
    assert.equal(fs.realpathSync(path.join(codexHome, 'skills/focus')), external);
    assert.equal(fs.readdirSync(external).length, 0);
    const ownership = fs.readFileSync(path.join(codexHome, '.coding-agent-workflows-manifest'), 'utf8');
    assert.doesNotMatch(ownership, /skills\/focus\/SKILL\.md/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('validation rejects catalog records with missing dependencies', () => {
  const dir = fixture();
  try {
    const catalogPath = path.join(dir, 'source/catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    catalog.skills.focus.requires = ['missing-skill'];
    fs.writeFileSync(catalogPath, JSON.stringify(catalog));
    const rendered = run(dir, 'build/render.mjs');
    assert.equal(rendered.status, 0, rendered.stderr);
    const result = run(dir, 'build/validate.mjs');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /missing-skill/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('validation accepts the complete source and optional catalog', () => {
  const dir = fixture();
  try {
    assert.equal(run(dir, 'build/render.mjs').status, 0);
    const result = run(dir, 'build/validate.mjs');
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('validation rejects dependencies unavailable to the owning runtime', () => {
  const dir = fixture();
  try {
    const catalogPath = path.join(dir, 'source/catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    catalog.skills.ultracode.requires = ['review'];
    fs.writeFileSync(catalogPath, JSON.stringify(catalog));
    const rendered = run(dir, 'build/render.mjs');
    assert.equal(rendered.status, 0, rendered.stderr);
    const result = run(dir, 'build/validate.mjs');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /runtime|codex|review/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Codex plain reinstall preserves obsolete ownership until upgrade prunes it', () => {
  const dir = fixture();
  const codexHome = path.join(dir, 'codex-home');
  const destination = path.join(dir, 'destination');
  try {
    assert.equal(run(dir, 'build/render.mjs').status, 0);
    assert.equal(run(dir, 'install.sh', ['codex', destination], { CODEX_HOME: codexHome }).status, 0);
    fs.rmSync(path.join(dir, 'targets/codex/prompts/focus.md'));
    assert.equal(run(dir, 'install.sh', ['codex', destination], { CODEX_HOME: codexHome }).status, 0);
    assert.ok(fs.existsSync(path.join(codexHome, 'prompts/focus.md')));
    assert.equal(run(dir, 'install.sh', ['codex-upgrade', destination], { CODEX_HOME: codexHome }).status, 0);
    assert.equal(fs.existsSync(path.join(codexHome, 'prompts/focus.md')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Codex rejects symlinked home and manifest without writing through them', () => {
  const dir = fixture();
  const destination = path.join(dir, 'destination');
  try {
    assert.equal(run(dir, 'build/render.mjs').status, 0);
    const external = path.join(dir, 'external');
    fs.mkdirSync(external);
    const linkedHome = path.join(dir, 'linked-home');
    fs.symlinkSync(external, linkedHome);
    const rejected = run(dir, 'install.sh', ['codex', destination], { CODEX_HOME: linkedHome });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /symlink/i);
    const home = path.join(dir, 'home');
    fs.mkdirSync(home);
    fs.symlinkSync(external, path.join(home, '.coding-agent-workflows-manifest'));
    const result = run(dir, 'install.sh', ['codex', destination], { CODEX_HOME: home });
    assert.notEqual(result.status, 0);
    assert.equal(fs.readdirSync(external).length, 0);
    const backupHome = path.join(dir, 'backup-home');
    fs.mkdirSync(backupHome);
    fs.symlinkSync(external, path.join(backupHome, '.coding-agent-workflows-backup'));
    const backupResult = run(dir, 'install.sh', ['codex', destination], { CODEX_HOME: backupHome });
    assert.notEqual(backupResult.status, 0);
    assert.match(backupResult.stderr, /backup path|symlink/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Claude upgrade and remove do not follow symlinked owned paths', () => {
  const dir = fixture();
  const destination = path.join(dir, 'destination');
  try {
    assert.equal(run(dir, 'build/render.mjs').status, 0);
    assert.equal(run(dir, 'install.sh', ['claude', destination]).status, 0);
    const external = path.join(dir, 'external');
    fs.mkdirSync(external);
    fs.writeFileSync(path.join(external, 'sentinel'), 'keep');
    fs.rmSync(path.join(destination, '.claude/skills/focus'), { recursive: true, force: true });
    fs.symlinkSync(external, path.join(destination, '.claude/skills/focus'));
    assert.equal(run(dir, 'install.sh', ['upgrade', destination]).status, 0);
    assert.equal(fs.readFileSync(path.join(external, 'sentinel'), 'utf8'), 'keep');
    assert.equal(run(dir, 'install.sh', ['remove', destination]).status, 0);
    assert.equal(fs.readFileSync(path.join(external, 'sentinel'), 'utf8'), 'keep');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('validation rejects invalid generic manifest scopes', () => {
  const dir = fixture();
  try {
    const manifestPath = path.join(dir, 'source/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.skills.focus = 'runtime-only';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.equal(run(dir, 'build/render.mjs').status, 0);
    const result = run(dir, 'build/validate.mjs');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /invalid scope/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});


test('renderer excludes Python runtime caches from distributed resources', () => {
  const dir = fixture();
  try {
    const cache = path.join(dir, 'source/skills/impeccable/__pycache__');
    fs.mkdirSync(cache, { recursive: true });
    fs.writeFileSync(path.join(cache, 'runtime.pyc'), 'local cache');
    fs.mkdirSync(path.join(dir, 'source/skills/impeccable/.pytest_cache'));
    fs.writeFileSync(path.join(dir, 'source/skills/impeccable/.coverage'), 'local coverage');
    const rendered = run(dir, 'build/render.mjs');
    assert.equal(rendered.status, 0, rendered.stderr);
    for (const target of ['claude', 'codex']) {
      for (const artifact of ['__pycache__', '.pytest_cache', '.coverage']) {
        assert.equal(fs.existsSync(path.join(dir, 'targets', target, 'skills/impeccable', artifact)), false, artifact);
      }
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('staleness check preserves binary assets when restoring stale output', () => {
  const dir = fixture();
  try {
    const source = path.join(dir, 'source/skills/impeccable/test-font.woff');
    const original = Buffer.from([0, 255, 128, 65]);
    fs.writeFileSync(source, original);
    assert.equal(run(dir, 'build/render.mjs').status, 0);
    fs.writeFileSync(source, Buffer.from([1, 254, 129, 66]));
    const checked = run(dir, 'build/check.mjs');
    assert.notEqual(checked.status, 0);
    assert.deepEqual(fs.readFileSync(path.join(dir, 'targets/codex/skills/impeccable/test-font.woff')), original);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
