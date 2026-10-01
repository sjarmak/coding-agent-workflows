import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateSurface } from './surface-audit.mjs';

const fixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'surface-audit-'));
  fs.mkdirSync(path.join(root, 'source/skills/example'), { recursive: true });
  fs.writeFileSync(path.join(root, 'source/skills/example/SKILL.md'), 'Example');
  fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(path.join(root, 'docs/tools.md'), 'Tools');
  return root;
};
const entry = { disposition: 'bundled', targets: ['source/skills/example/SKILL.md'], reason: 'Reusable procedure.', origins: ['installed:agents'] };
const snapshot = { version: 1, skills: { example: entry }, tools: {} };

test('complete audited surface resolves to shipped artifacts', () => {
  const root = fixture();
  try {
    assert.deepEqual(validateSurface(root, { example: 'universal' }, snapshot), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('unaccounted bundled skills and missing resource targets fail', () => {
  const root = fixture();
  try {
    assert.match(validateSurface(root, { example: 'universal', forgotten: 'universal' }, snapshot).join('\n'), /forgotten/);
    const broken = { ...snapshot, skills: { example: { ...entry, targets: ['source/skills/missing/SKILL.md'] } } };
    assert.match(validateSurface(root, { example: 'universal' }, broken).join('\n'), /missing/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('external integrations need a concrete guide and local exclusions need a reason', () => {
  const root = fixture();
  try {
    const audited = { ...snapshot, tools: { graph: { disposition: 'external', targets: ['docs/tools.md'], reason: 'Configured separately.', origins: ['installed:mcp'] } } };
    assert.deepEqual(validateSurface(root, { example: 'universal' }, audited), []);
    const invalid = { ...snapshot, skills: { example: entry, local: { disposition: 'project-local', targets: [], reason: '', origins: [] } } };
    assert.match(validateSurface(root, { example: 'universal' }, invalid).join('\n'), /local/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('malformed records fail without throwing and same-name tools cannot mask skills', () => {
  const root = fixture();
  try {
    for (const malformed of [null, [], {}, { ...entry, targets: null }]) {
      assert.ok(validateSurface(root, { example: 'universal' }, { ...snapshot, skills: { example: malformed } }).length);
    }
    const collision = { ...snapshot, skills: { example: { ...entry, reason: '' } }, tools: { example: entry } };
    assert.match(validateSurface(root, { example: 'universal' }, collision).join('\n'), /missing reason/);
    for (const skills of [[], 'invalid']) assert.ok(validateSurface(root, {}, { ...snapshot, skills }).length);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
