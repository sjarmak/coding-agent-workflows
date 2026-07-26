import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skill = fs.readFileSync(path.join(here, 'SKILL.md'), 'utf8');
const renderedCommand = path.resolve(
  here,
  '../../../targets/claude/commands/focus.md',
);

for (const section of [
  'Dependency-aware selection',
  'Wave manifest',
  'Trusted branch contract',
  'Convergence and merge',
  'Beads adapter',
  'Claude Code adapter',
  'Codex adapter',
]) {
  assert.match(skill, new RegExp(`^## ${section}$`, 'm'), `missing ${section}`);
}

for (const invariant of [
  'derive the merge set from the manifest',
  'never from an agent-authored note',
  'all dependencies are closed',
  'is an ancestor of the branch tip',
  'one integration branch',
]) {
  assert.ok(skill.includes(invariant), `missing invariant: ${invariant}`);
}

for (const adapter of ['claude.md', 'codex.md']) {
  assert.ok(fs.existsSync(path.join(here, 'adapters', adapter)), `missing ${adapter}`);
}

assert.ok(fs.existsSync(renderedCommand), 'Claude target is missing /focus command');
const command = fs.readFileSync(renderedCommand, 'utf8');
assert.ok(
  command.includes('# Focus: Dependency-Aware Execution'),
  'Claude /focus command did not render from the universal skill',
);

console.log('focus contract: universal workflow and runtime adapters present');
