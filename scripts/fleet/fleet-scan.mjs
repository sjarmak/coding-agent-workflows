#!/usr/bin/env node
// fleet-scan.mjs — mechanical fleet-conformance scanner.
//
// ZFC boundary: this script reports STRUCTURAL facts only (file existence,
// config parsing, git plumbing output). Every semantic judgment — "is this
// repo on track?", "does this test suite actually test anything?" — belongs
// to the fleet-conformance workflow's audit pass, not here.
//
// Output:
//   ~/.claude/fleet/fleet.json       full machine-readable registry
//   ~/.claude/fleet/fleet-prev.json  previous run (rotated automatically)
//   ~/.claude/fleet/fleet-status.md  mechanical at-a-glance table
//
// Config: ~/.claude/fleet/config.json  { roots, maxDepth, exclude, bundlePath }

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();
const FLEET_DIR = path.join(HOME, '.claude', 'fleet');
const CONFIG_PATH = path.join(FLEET_DIR, 'config.json');

const DEFAULT_CONFIG = {
  roots: [HOME, path.join(HOME, 'projects')],
  maxDepth: 2,
  // Path-pattern excludes (regex, tested against the absolute repo path).
  // Worktrees are excluded structurally (.git is a file). User entries in
  // config.json EXTEND this list (union); roots/maxDepth/bundlePath REPLACE.
  // The '/\\.' entry gates hook-registered hidden dirs; walk() already skips them.
  exclude: [
    '/test_repos/', '/vendor/', '/node_modules/', '/go-path/', '/gopath/', '/go/',
    '/build/', '/scratch/', '-worktrees', '/\\.', '/Downloads/',
  ],
  bundlePath: path.join(HOME, 'agentic-coding-practices'),
};

function loadConfig() {
  fs.mkdirSync(FLEET_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');
    return DEFAULT_CONFIG;
  }
  let user;
  try {
    user = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error(`${CONFIG_PATH} is not valid JSON: ${err.message}`);
    process.exit(1);
  }
  return {
    ...DEFAULT_CONFIG,
    ...user,
    exclude: [...new Set([...DEFAULT_CONFIG.exclude, ...(user.exclude ?? [])])],
  };
}

const exists = p => { try { fs.accessSync(p); return true; } catch { return false; } };
const readIf = p => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const isDir = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

function git(repo, args) {
  try {
    return execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000,
    }).trim();
  } catch { return null; }
}

// --- discovery ---------------------------------------------------------------

function discoverRepos(config) {
  const found = new Map();
  const excludeRes = config.exclude.map(e => new RegExp(e));
  const excluded = p => excludeRes.some(re => re.test(p + '/'));

  function walk(dir, depth) {
    if (depth > config.maxDepth || excluded(dir)) return;
    const gitPath = path.join(dir, '.git');
    if (exists(gitPath)) {
      // .git as a FILE means a linked worktree — skip; the primary checkout
      // is scanned instead. .git as a dir is a real repo.
      if (isDir(gitPath)) found.set(dir, true);
      return; // never descend into a repo looking for nested repos
    }
    if (depth === config.maxDepth) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) walk(path.join(dir, e.name), depth + 1);
    }
  }

  for (const root of config.roots) if (isDir(root)) walk(root, 0);

  // Repos registered passively by the git-template / SessionStart hooks.
  const known = readIf(path.join(FLEET_DIR, 'known-repos.list'));
  if (known) {
    for (const line of known.split('\n')) {
      const p = line.trim();
      if (p && isDir(path.join(p, '.git')) && !excluded(p)) found.set(p, true);
    }
  }
  return [...found.keys()].sort();
}

// --- per-repo checks (all structural) -----------------------------------------

function fileGrep(p, re) {
  const c = readIf(p);
  return c !== null && re.test(c);
}

function anyWorkflowMatches(repo, re) {
  const wfDir = path.join(repo, '.github', 'workflows');
  if (!isDir(wfDir)) return { count: 0, match: false };
  const files = fs.readdirSync(wfDir).filter(f => /\.ya?ml$/.test(f));
  return { count: files.length, match: files.some(f => fileGrep(path.join(wfDir, f), re)) };
}

function detectTesting(repo) {
  const pkg = readIf(path.join(repo, 'package.json'));
  const pyproject = readIf(path.join(repo, 'pyproject.toml')) || '';
  const frameworks = [];
  if (pkg && /"test"\s*:/.test(pkg)) frameworks.push('npm-test');
  if (/\[tool\.pytest/.test(pyproject) || exists(path.join(repo, 'pytest.ini')) ||
      exists(path.join(repo, 'conftest.py')) || exists(path.join(repo, 'tests', 'conftest.py'))) frameworks.push('pytest');
  if (exists(path.join(repo, 'go.mod')) &&
      git(repo, ['ls-files', '*_test.go'])) frameworks.push('go-test');
  if (exists(path.join(repo, 'Cargo.toml'))) frameworks.push('cargo-test');

  const ci = anyWorkflowMatches(repo, /\b(test|check|lint|vet|coverage)\b/i);

  const coverageConfig =
    fileGrep(path.join(repo, 'pyproject.toml'), /\[tool\.coverage|--cov/) ||
    exists(path.join(repo, '.coveragerc')) || exists(path.join(repo, 'codecov.yml')) ||
    (pkg !== null && /coverage/.test(pkg)) ||
    fileGrep(path.join(repo, 'Makefile'), /coverage|-cover\b/) ||
    fileGrep(path.join(repo, 'vitest.config.ts'), /coverage/) ||
    fileGrep(path.join(repo, 'vitest.config.js'), /coverage/);

  const mutationConfig =
    exists(path.join(repo, 'stryker.conf.json')) || exists(path.join(repo, 'stryker.config.mjs')) ||
    /\[tool\.mutmut/.test(pyproject) ||
    fileGrep(path.join(repo, 'Makefile'), /mutants|mutmut|stryker/) ||
    exists(path.join(repo, '.cargo-mutants.toml'));

  const fuzzTargets =
    isDir(path.join(repo, 'fuzz')) ||
    (exists(path.join(repo, 'go.mod')) && !!git(repo, ['grep', '-l', '--max-count=1', 'func Fuzz', '--', '*_test.go']));

  let strictTypes = null; // null = not applicable
  if (exists(path.join(repo, 'tsconfig.json'))) {
    strictTypes = fileGrep(path.join(repo, 'tsconfig.json'), /"strict"\s*:\s*true/);
  } else if (/\[tool\.mypy/.test(pyproject) || exists(path.join(repo, 'mypy.ini'))) {
    strictTypes = /strict\s*=\s*[Tt]rue/.test(pyproject) || fileGrep(path.join(repo, 'mypy.ini'), /strict\s*=\s*[Tt]rue/);
  }

  return {
    frameworks, ciWorkflows: ci.count, ciHasTestGate: ci.match,
    coverageConfig, mutationConfig, fuzzTargets, strictTypes,
  };
}

// Dependency-name detection is a calibrated mechanical lookup (documented
// ZFC exception): it reports which known libraries are declared, nothing more.
const LOG_LIBS = /\b(pino|winston|bunyan|structlog|loguru|zap|zerolog|slog-|logrus)\b/;
const ERR_LIBS = /\b(@sentry\/|sentry-sdk|sentry-go|rollbar|bugsnag|honeybadger)\b/;

function detectObservability(repo) {
  const deps = [
    readIf(path.join(repo, 'package.json')),
    readIf(path.join(repo, 'pyproject.toml')),
    readIf(path.join(repo, 'requirements.txt')),
    readIf(path.join(repo, 'go.mod')),
  ].filter(Boolean).join('\n');
  return { structuredLogging: LOG_LIBS.test(deps), errorTracking: ERR_LIBS.test(deps) };
}

function detectBundle(repo, bundlePath) {
  const manifestPath = path.join(repo, '.claude', '.coding-agent-workflows-manifest');
  const manifest = readIf(manifestPath);
  if (!manifest) return { installed: false, drift: null };
  if (!isDir(path.join(bundlePath, 'targets', 'claude'))) return { installed: true, drift: null };
  let drift = false;
  for (const rel of manifest.split('\n').map(s => s.trim()).filter(Boolean)) {
    const installed = readIf(path.join(repo, '.claude', rel));
    const source = readIf(path.join(bundlePath, 'targets', 'claude', rel));
    if (installed !== source) { drift = true; break; }
  }
  return { installed: true, drift };
}

function detectPreCommit(repo) {
  if (exists(path.join(repo, '.pre-commit-config.yaml'))) return true;
  // A configured hooks dir only counts if it actually contains a pre-commit
  // hook. What that hook enforces is a semantic question for the audit pass.
  const hooksPath = git(repo, ['config', 'core.hooksPath']);
  const dir = hooksPath
    ? (path.isAbsolute(hooksPath) ? hooksPath : path.join(repo, hooksPath))
    : path.join(repo, '.git', 'hooks');
  return exists(path.join(dir, 'pre-commit'));
}

function scanRepo(repo, config) {
  const tierFile = (readIf(path.join(repo, '.repo-tier')) || '').trim() || null;
  const lastCommit = git(repo, ['log', '-1', '--format=%cI']);
  const commits30d = parseInt(git(repo, ['rev-list', '--count', '--since=30.days', 'HEAD']) || '0', 10);
  const claudeMdPath = path.join(repo, 'CLAUDE.md');
  let claudeMdSymlink = false;
  try { claudeMdSymlink = fs.lstatSync(claudeMdPath).isSymbolicLink(); } catch { /* absent */ }

  return {
    path: repo,
    name: path.basename(repo),
    tier: tierFile,
    git: { lastCommit, commits30d },
    guardrails: {
      agentsMd: exists(path.join(repo, 'AGENTS.md')),
      claudeMd: exists(claudeMdPath),
      claudeMdSymlink,
      claudeDir: isDir(path.join(repo, '.claude')),
      settingsHooks: fileGrep(path.join(repo, '.claude', 'settings.json'), /"hooks"/),
      preCommit: detectPreCommit(repo),
      bundle: detectBundle(repo, config.bundlePath),
    },
    testing: detectTesting(repo),
    observability: detectObservability(repo),
  };
}

// --- classification (deterministic arithmetic, no judgment) -------------------

function classify(r) {
  if (r.tier === 'scratch') return 'scratch';
  const g = r.guardrails, t = r.testing;
  const layers = [
    g.agentsMd || g.claudeMd,
    g.claudeDir || g.bundle.installed,
    t.ciHasTestGate || g.preCommit,
  ].filter(Boolean).length;
  return layers === 3 ? 'A' : layers >= 1 ? 'B' : 'C';
}

// --- output -------------------------------------------------------------------

function statusTable(repos) {
  const flag = b => (b ? '✓' : '✗');
  const lines = [
    '# Fleet status (mechanical scan)', '',
    `Generated: ${new Date().toISOString()}  ·  repos: ${repos.length}`, '',
    '| Repo | Tier | AGENTS | .claude | Bundle | In sync | Pre-commit | CI gate | Coverage | Mutation | Strict | Obs | 30d commits |',
    '|------|------|--------|---------|--------|-------|------------|---------|----------|----------|--------|-----|-------------|',
  ];
  for (const r of repos) {
    const g = r.guardrails, t = r.testing, o = r.observability;
    lines.push(`| ${r.name} | ${r.class} | ${flag(g.agentsMd || g.claudeMd)} | ${flag(g.claudeDir)} | ${flag(g.bundle.installed)} | ${g.bundle.drift === null ? '–' : flag(!g.bundle.drift)} | ${flag(g.preCommit)} | ${flag(t.ciHasTestGate)} | ${flag(t.coverageConfig)} | ${flag(t.mutationConfig)} | ${t.strictTypes === null ? '–' : flag(t.strictTypes)} | ${flag(o.structuredLogging || o.errorTracking)} | ${r.git.commits30d} |`);
  }
  const active = repos.filter(r => r.class !== 'scratch' && r.git.commits30d > 0);
  const uninstrumented = active.filter(r => r.class === 'B' || r.class === 'C');
  lines.push('', '## Attention (active in last 30 days, not fully instrumented)', '');
  if (uninstrumented.length === 0) lines.push('None — all active repos are Tier A or marked scratch.');
  for (const r of uninstrumented) lines.push(`- **${r.name}** (${r.class}, ${r.git.commits30d} commits): ${r.path}`);
  lines.push('');
  return lines.join('\n');
}

function main() {
  const config = loadConfig();
  const repoPaths = discoverRepos(config);
  const repos = repoPaths.map(p => {
    const r = scanRepo(p, config);
    return { ...r, class: classify(r) };
  });

  const registry = {
    generatedAt: new Date().toISOString(),
    bundlePath: config.bundlePath,
    summary: {
      total: repos.length,
      byClass: repos.reduce((acc, r) => { acc[r.class] = (acc[r.class] || 0) + 1; return acc; }, {}),
    },
    repos,
  };

  const out = path.join(FLEET_DIR, 'fleet.json');
  if (exists(out)) fs.copyFileSync(out, path.join(FLEET_DIR, 'fleet-prev.json'));
  fs.writeFileSync(out, JSON.stringify(registry, null, 2) + '\n');
  fs.writeFileSync(path.join(FLEET_DIR, 'fleet-status.md'), statusTable(repos));

  console.log(`Scanned ${repos.length} repos → ${out}`);
  console.log(`Classes: ${JSON.stringify(registry.summary.byClass)}`);
}

main();
