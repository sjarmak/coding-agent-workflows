import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('render preserves native Codex settings without changing Claude or unconfigured roles', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-settings-'));
  try {
    for (const dir of ['source', 'build']) {
      fs.cpSync(path.join(root, dir), path.join(fixture, dir), { recursive: true });
    }
    const render = () => {
      const result = spawnSync(process.execPath, ['build/render.mjs'], {
        cwd: fixture, encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
    };
    render();
    const target = path.join(fixture, 'targets/codex/agents/architect.toml');
    const original = fs.readFileSync(target, 'utf8');
    const unchanged = fs.readFileSync(path.join(fixture, 'targets/codex/agents/planner.toml'), 'utf8');
    const settings = 'model = "gpt-6-sol"\nmodel_reasoning_effort = "high"\nsandbox_mode = "read-only"\n\n[mcp_servers.docs]\nurl = "https://example.com/mcp"\n';
    fs.writeFileSync(path.join(fixture, 'source/agents/architect.codex.toml'), settings);
    render();
    assert.equal(fs.readFileSync(target, 'utf8'), `${original}\n${settings}`);
    assert.equal(fs.readFileSync(path.join(fixture, 'targets/codex/agents/planner.toml'), 'utf8'), unchanged);
    assert.equal(
      fs.readFileSync(path.join(fixture, 'targets/claude/agents/architect.md'), 'utf8'),
      fs.readFileSync(path.join(fixture, 'source/agents/architect.md'), 'utf8'),
    );
    assert.equal(fs.existsSync(path.join(fixture, 'targets/claude/agents/architect.codex.toml')), false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
