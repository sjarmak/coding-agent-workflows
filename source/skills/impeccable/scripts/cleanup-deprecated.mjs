#!/usr/bin/env node
// Modified for portable workflow distribution; see ../NOTICE.md.



















import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, lstatSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';


const DEPRECATED_NAMES = [

  'frontend-design',
  'teach-impeccable',

  'arrange',
  'normalize',
  'onboard',
  'extract',

  'adapt',
  'animate',
  'audit',
  'bolder',
  'clarify',
  'colorize',
  'critique',
  'delight',
  'distill',
  'harden',
  'layout',
  'optimize',
  'overdrive',
  'polish',
  'quieter',
  'shape',
  'typeset',
];


const HARNESS_DIRS = [
  '.claude', '.cursor', '.gemini', '.codex', '.agents',
  '.trae', '.trae-cn', '.pi', '.opencode', '.kiro', '.rovodev',
];







const SKILL_FINGERPRINTS = {
  harden: 'Make interfaces production-ready: error handling, empty states',
  optimize: 'Diagnoses and fixes UI performance across loading speed',
};





export function findProjectRoot(startDir = process.cwd()) {
  let dir = resolve(startDir);
  const { root } = { root: '/' };
  while (dir !== root) {
    if (
      existsSync(join(dir, 'package.json')) ||
      existsSync(join(dir, '.git')) ||
      existsSync(join(dir, 'skills-lock.json'))
    ) {
      return dir;
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(startDir);
}




export function loadLock(projectRoot) {
  const lockPath = join(projectRoot, 'skills-lock.json');
  if (!existsSync(lockPath)) return null;
  try {
    return JSON.parse(readFileSync(lockPath, 'utf-8'));
  } catch {
    return null;
  }
}









export function isImpeccableSkill(skillDir, { skillName, lock } = {}) {

  if (skillName && lock?.skills?.[skillName]?.source === 'pbakaus/impeccable') {
    return true;
  }
  const skillMd = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMd)) return false;
  let content;
  try {
    content = readFileSync(skillMd, 'utf-8');
  } catch {
    return false;
  }

  if (/impeccable/i.test(content)) return true;



  const unprefixed = skillName?.startsWith('i-') ? skillName.slice(2) : skillName;
  const fingerprint = unprefixed && SKILL_FINGERPRINTS[unprefixed];
  if (fingerprint && content.includes(fingerprint)) return true;
  return false;
}





export function buildTargetNames() {
  const names = [];
  for (const name of DEPRECATED_NAMES) {
    names.push(name);
    names.push(`i-${name}`);
  }
  return names;
}





export function findSkillsDirs(projectRoot) {
  const dirs = [];
  for (const harness of HARNESS_DIRS) {
    const candidate = join(projectRoot, harness, 'skills');
    if (existsSync(candidate)) {
      dirs.push(candidate);
    }
  }
  return dirs;
}







export function removeDeprecatedSkills(projectRoot, lock) {
  if (lock === undefined) lock = loadLock(projectRoot);
  const targets = buildTargetNames();
  const skillsDirs = findSkillsDirs(projectRoot);
  const deleted = [];

  for (const skillsDir of skillsDirs) {
    for (const name of targets) {
      const skillPath = join(skillsDir, name);



      let stat;
      try {
        stat = lstatSync(skillPath);
      } catch {
        continue;
      }

      if (stat.isSymbolicLink()) {


        const targetAlive = existsSync(skillPath);
        const isMatch = targetAlive
          ? isImpeccableSkill(skillPath, { skillName: name, lock })
          : true;
        if (isMatch) {
          unlinkSync(skillPath);
          deleted.push(skillPath);
        }
        continue;
      }


      if (isImpeccableSkill(skillPath, { skillName: name, lock })) {
        rmSync(skillPath, { recursive: true, force: true });
        deleted.push(skillPath);
      }
    }
  }

  return deleted;
}






export function cleanSkillsLock(projectRoot) {
  const lockPath = join(projectRoot, 'skills-lock.json');
  if (!existsSync(lockPath)) return [];

  let lock;
  try {
    lock = JSON.parse(readFileSync(lockPath, 'utf-8'));
  } catch {
    return [];
  }

  if (!lock.skills || typeof lock.skills !== 'object') return [];

  const targets = buildTargetNames();
  const removed = [];

  for (const name of targets) {
    const entry = lock.skills[name];
    if (!entry) continue;

    if (entry.source === 'pbakaus/impeccable') {
      delete lock.skills[name];
      removed.push(name);
    }
  }

  if (removed.length > 0) {
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
  }

  return removed;
}








export function cleanup(projectRoot) {
  const root = projectRoot || findProjectRoot();
  const lock = loadLock(root);
  const deletedPaths = removeDeprecatedSkills(root, lock);
  const removedLockEntries = cleanSkillsLock(root);
  return { deletedPaths, removedLockEntries, projectRoot: root };
}


if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const result = cleanup();
  if (result.deletedPaths.length === 0 && result.removedLockEntries.length === 0) {
    console.log('No deprecated Impeccable skills found. Nothing to clean up.');
  } else {
    if (result.deletedPaths.length > 0) {
      console.log(`Removed ${result.deletedPaths.length} deprecated skill(s):`);
      for (const p of result.deletedPaths) console.log(`  - ${p}`);
    }
    if (result.removedLockEntries.length > 0) {
      console.log(`Cleaned ${result.removedLockEntries.length} entry/entries from skills-lock.json:`);
      for (const name of result.removedLockEntries) console.log(`  - ${name}`);
    }
  }
}
