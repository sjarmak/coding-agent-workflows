import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const dispositions = new Set(['bundled', 'covered', 'external', 'project-local', 'optional']);

function validateEntry(root, name, entry) {
  if (!isRecord(entry)) return [`${name}: missing disposition record`];
  const errors = [];
  if (!dispositions.has(entry.disposition)) errors.push(`${name}: invalid disposition`);
  if (typeof entry.reason !== 'string' || !entry.reason.trim()) errors.push(`${name}: missing reason`);
  if (!Array.isArray(entry.origins) || !entry.origins.length || entry.origins.some(origin => typeof origin !== 'string' || !origin.trim())) errors.push(`${name}: missing origins`);
  if (!Array.isArray(entry.targets)) return [...errors, `${name}: targets must be an array`];
  if (entry.disposition !== 'project-local' && !entry.targets.length) errors.push(`${name}: no concrete target`);
  for (const target of entry.targets) {
    if (typeof target !== 'string' || !target || path.isAbsolute(target) || target.split('/').includes('..')) {
      errors.push(`${name}: invalid target path`);
    } else if (!fs.existsSync(path.join(root, target))) errors.push(`${name}: missing target ${target}`);
  }
  return errors;
}

export function validateSurface(root, skills, inventory) {
  if (!inventory || inventory.version !== 1 || !isRecord(inventory.skills) || !isRecord(inventory.tools)) return ['Invalid surface inventory'];
  const errors = [...Object.entries(inventory.skills), ...Object.entries(inventory.tools)]
    .flatMap(([name, entry]) => validateEntry(root, name, entry));
  const missing = Object.keys(skills).filter(name => !name.startsWith('$')).flatMap(name => {
    const entry = inventory.skills[name];
    if (!entry || entry.disposition !== 'bundled' || !Array.isArray(entry.targets) || !entry.targets.includes(`source/skills/${name}/SKILL.md`)) return [`${name}: shipped skill is unaccounted for`];
    return [];
  });
  const unshipped = Object.entries(inventory.skills).flatMap(([name, entry]) =>
    entry?.disposition === 'bundled' && !skills[name] ? [`${name}: marked bundled but absent from manifest`] : []);
  return [...errors, ...missing, ...unshipped];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source/manifest.json'), 'utf8'));
  const inventory = JSON.parse(fs.readFileSync(path.join(root, 'source/surface-inventory.json'), 'utf8'));
  const errors = validateSurface(root, manifest.skills, inventory);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`surface audit: ${Object.keys(inventory.skills).length} skills and ${Object.keys(inventory.tools).length} tools accounted for`);
}
