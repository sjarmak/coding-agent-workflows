---
compass_area: "build — render pipeline & gates"
area_path: "build/"
generated: "2026-07-17"
# Staleness stamp — machine-readable so a refresh can test drift without a model.
# `sources` are area-relative paths (relative to THIS file's directory): the exact
# files the map below was written from. `sources_hash` is the canonical hash over
# their contents (see ../source/skills/project-compass/compass-hash.mjs). Recompute:
#   node ../source/skills/project-compass/compass-hash.mjs COMPASS.md
sources_hash: "sha256-16:dfb2b79bf85d22db"
sources:
  - check.mjs
  - render.mjs
  - sanitize.mjs
  - validate.mjs
---

# Compass: build — render pipeline & gates

> Tribal-knowledge map for `build/`. The *why* and the *gotchas* — not the *what*;
> read the code for *what*. This is a dogfood map: the bundle uses its own
> `project-compass` machinery on itself, and the frontmatter stamp above makes its
> staleness testable by `compass-hash.mjs`.

## Purpose

`build/` turns the hand-edited `source/` layer into everything the bundle ships,
then guards that the committed output stays honest, safe to publish, and internally
consistent. It is mechanism only: no content decision lives here. What renders where
is decided by `source/manifest.json`; what the prose *says* lives in `source/`.

## Key files & entry points

- **`render.mjs`** — the renderer, and the one place the scope map is executed. Reads
  `source/manifest.json`, walks `source/`, and emits four artifacts: `AGENTS.md`
  (thin always-loaded index), `AGENTS.full.md` (full text, read on demand),
  `targets/claude/` (native Claude layout), `targets/codex/` (native Codex layout).
- **`check.mjs`** — drift gate. Snapshots the committed output, re-renders in place,
  diffs. Fails if they differ (someone edited generated output, or forgot
  `npm run build` after editing `source/`), then restores the snapshot.
- **`sanitize.mjs`** — release gate. Scans *rendered* output for content that must
  never leave the machine (home paths, PII, internal jargon, private MCP refs).
  Mandatory before sharing externally.
- **`validate.mjs`** — integrity gate. Catches breakage render will happily ship: a
  skill that will not register, `$ARGUMENTS` in a SKILL.md, an unresolved
  workflow `invokes:`, a host path in the universal output.

## How it connects

- **In:** `source/` + `source/manifest.json`. The manifest's scope map
  (`rules`/`agents`/`skills`/`workflows`/`templates` + `rule_overrides`) drives every
  placement decision; `render.mjs` holds none of its own.
- **Out:** `AGENTS.md` + `AGENTS.full.md` at repo root, and `targets/`. `install.sh`
  copies these into a consuming project or user config; nothing downstream reads
  `source/` directly.
- **Shared:** `compass-hash.mjs` (under `source/skills/project-compass/`) computes this
  map's own stamp and is imported by the fleet scanner, so a map verifies identically
  here and machine-wide. There is one implementation of the hash.
- **Gate wiring:** `.githooks/pre-commit` runs `check` + `validate`; the `release`
  npm script runs `build` + `sanitize` + `validate`.

## Gotchas & non-obvious constraints

- **`source/` is the ONLY hand-edited layer.** `targets/` and both `AGENTS*.md` are
  generated and carry a "do not edit" banner; edit them and `check.mjs` fails. Fix by
  editing `source/` and re-running `npm run build`.
- **The autoload dedup (`render.mjs` ~226-228).** Files marked `autoload: claude` are
  skipped when building `AGENTS.full.md`'s Principles, because `house-rules.md` is a
  target-specific *consolidation* of the per-topic rule files; inlining it would
  duplicate their text. The same flag routes common rules: `autoload` → `rules/common/`
  (Claude auto-loads it), everything else → `rules/reference/` (on-demand).
- **`sanitize` scans rendered output, not `source/`, on purpose.** Provenance notes in
  source frontmatter are stripped at render, so they must not trip the gate. Its ERROR
  list is maintainer-specific: a fork that does not replace it passes silently on leaks
  it was never written to catch (the file says so).
- **`validate`'s host-path check covers only the agent-neutral surface** (`AGENTS.md`/
  `full` + `targets/codex`), never `targets/claude` — Claude-scoped files legitimately
  reference `~/.claude` paths in context. That is precisely why `hooks.md` is
  claude-scoped rather than universal.
- **`$`-prefixed manifest keys** (`$comment`, `$schema`) are skipped everywhere via the
  `name.startsWith('$')` guards; they are documentation, not entries.

## Failure modes seen here

- Editing generated output, or forgetting `npm run build` after a `source/` edit →
  `check.mjs` prints `STALE generated output` and lists the drifted files. Run the
  build and commit.
- A skill missing frontmatter `name`/`description`, or a workflow `invokes:` naming an
  unshipped target → `validate` ERROR. Both classes reached consuming projects silently
  before this gate existed.
- The 5 standing `validate` warnings (`research`→`diverge`/`converge`,
  `brainstorm-loop`→`converge`, `decompose`→`review`, `epic-review`→`review`) are
  accepted graceful-degradation points, not defects: universal workflows invoking a
  Claude-only accelerator that the step degrades around in prose.
