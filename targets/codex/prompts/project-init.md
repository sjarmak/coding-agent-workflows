# Workflow: Project Init

Stand up the **context layers** for a project so an agent has the right knowledge
in the right place from day one. The output is a thin, pointer-style `AGENTS.md`
(intention + an empty failure-mode log + references) and seed `COMPASS.md` maps
for the largest areas. It deliberately does **not** write the memory layer
(`CLAUDE.md` / instincts) — see `context-layering` for why each fact gets one home.

This is a runtime-neutral spec. Any orchestrator can drive it; the steps that
require judgment are delegated to the model (ZFC).

## When to run

- Setting up a new or existing repo for agent-assisted work
- The user says "set up AGENTS.md" / "initialize agent context" / "set up compass"
- Adopting this bundle in a project that has no intention layer yet

## Steps

### 1. Reconnaissance

Run `codebase-onboarding` Phases 1-3 to detect stack, structure, entry points,
and conventions. This is shared signal for both outputs below. Do not yet write
any file.

### 2. Scaffold the thin AGENTS.md

From the recon, instantiate the `AGENTS.project.md` template at the repo root:

- **What this project is** — fill *intention*: the invariants and non-obvious
  constraints a capable agent would otherwise get wrong. Not a README restatement.
- **Failure-mode preventions** — leave empty with its format note; entries arrive
  later via `failure-mode-capture`.
- **References** — point `{{BUNDLE_REF}}` at where the bundle was installed
  (`./.claude` for Claude Code, the bundle's `AGENTS.md`/`rules` otherwise),
  `{{PROJECT_DOCS}}` at the repo's own docs.

If an `AGENTS.md` already exists, **enhance, don't overwrite**: preserve its
content, slot existing project rules into the right sections, and call out what
was added. Honor the boundary — move anything that is really area-detail into a
compass file (step 3) and anything host-specific toward memory.

Keep it under the ~120-line target. If recon produced more than fits, that is
signal the excess belongs in compass files, not AGENTS.md.

### 3. Seed compass maps

Run `project-compass` for the few largest, most cohesive areas (confirm the list
with the user first — not every directory). Write one `COMPASS.md` per area and
populate the **Compass index** in AGENTS.md with one line each.

For a small repo, a single root compass may suffice; skip this step if the code
is small enough that AGENTS.md references plus the code itself are sufficient.

### 4. Memory-boundary pass

First, **check whether `CLAUDE.md` is a symlink to `AGENTS.md`** (or vice versa).
If it is, this is a deliberate single-source project per `context-layering`: there
is no separate memory layer to reconcile. Keep the one file complete and
organized; do not propose a split, and skip the rest of this step.

Otherwise, read any existing `CLAUDE.md` / instincts. For each fact, confirm it
sits in the right layer per `context-layering`: project-wide preventions promoted
into AGENTS.md (and removed from memory), area detail into compass, host/session
state left in memory. Report any overlap you resolved; do not silently rewrite
memory — propose the promotions and let the user confirm.

### 5. Report

Summarize what was created, the area list mapped, and any boundary decisions
made. List the maintenance commands the project now has: `failure-mode-capture`
(append a prevention), `project-compass` (refresh a map). No automation is
installed — maintenance is explicit and user-driven.
