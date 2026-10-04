import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const agent = fs.readFileSync(path.join(root, 'targets/claude/agents/code-search.md'), 'utf8');
const codexAgent = fs.readFileSync(path.join(root, 'targets/codex/agents/code-search.toml'), 'utf8');

test('code-search can load a deferred codegraph tool before calling it', () => {
  const tools = agent.match(/^tools: \[(.*)\]$/m)[1].split(',').map((tool) => tool.trim());
  assert.ok(tools.includes('ToolSearch'));
  assert.ok(tools.includes('mcp__codegraph__codegraph_explore'));
  assert.match(agent, /`select:mcp__codegraph__codegraph_explore`/);
});

test('codex code-search names ToolSearch only as a Claude Code instruction', () => {
  const lines = codexAgent.split('\n').filter((line) => line.includes('ToolSearch'));
  assert.ok(lines.length > 0);
  for (const line of lines) assert.match(line, /in Claude Code, /);
});
