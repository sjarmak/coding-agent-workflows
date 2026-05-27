---
name: project-compass
summary: Generate and refresh per-area COMPASS.md tribal-knowledge maps for a codebase, and keep the AGENTS.md compass index current.
description: Map the tribal knowledge of a codebase into per-area COMPASS.md files — the why, the gotchas, and how each area connects — for existing repos and as they grow. Use when the user says "map this codebase", "generate compass files", "refresh the compass", or after a significant area changes.
origin: agentic-coding-practices
scope: universal
---

# Project Compass

Map the **tribal knowledge** of a codebase into per-area `COMPASS.md` files: the
*why* and the *gotchas*, the things that aren't visible in the code's surface and
that otherwise live only in someone's head. One map per major area, living next
to the code it describes. Inspired by mapping tribal knowledge across large
codebases (per Meta's data-pipeline knowledge-mapping work).

Compass files are the **dense** layer. They exist so that `AGENTS.md` and memory
stay thin — see the `context-layering` practice for the boundary. AGENTS.md only
*indexes* compass files; it never copies their content.

## When to use

- "Map this codebase" / "generate compass files" / "set up codebase compass"
- "Refresh the compass for `src/api`" after that area changed materially
- During `project-init`, to seed maps for the largest areas
- The user asks "why is this area shaped this way?" (read the existing compass first)

## ZFC boundary

This skill is AI-orchestration. Mechanism gathers raw signal; **the model writes
every word of the map**. Do not template-fill prose from heuristics — a compass
is a judgment about what matters in an area, which is exactly what a model does
well and a regex does not.

- **Mechanism:** file discovery, directory sizing, content-hashing, reading
  source, writing the file, updating the index.
- **Model:** purpose, what counts as a key entry point, which constraints are
  non-obvious, which gotchas are load-bearing.

## How it works

### Phase 1 — Pick the areas (mechanism)

Identify the major areas worth a map. Reuse `codebase-onboarding` reconnaissance
for structure detection. An "area" is a directory that is both **substantial**
(meaningful share of the code) and **cohesive** (one responsibility). Skip
vendored, generated, and build directories. For a small repo, one root-level
compass may be enough; for a monorepo, one per top-level package.

Confirm the candidate area list with the user before generating — generating a
map per leaf directory is the failure mode to avoid.

### Phase 2 — Gather signal per area (mechanism)

For each chosen area, without reading every file:

- entry points and the few highest-fan-in files (use the host's call-graph or
  import tooling if available, else imports/exports)
- cross-area edges: what it imports, what imports it
- recent churn and the area's own test files
- compute a `sources-hash` over the mapped files' contents (for staleness)

### Phase 3 — Write the map (model)

Fill the `COMPASS.md` template with real judgment:

- **Purpose** — the role this area plays in the system, in 2-3 sentences.
- **Key files & entry points** — the handful that matter, and why each.
- **How it connects** — upstream callers, downstream deps, and the boundaries
  crossed (process, network, async).
- **Gotchas & non-obvious constraints** — ordering requirements, shared mutable
  state, implicit contracts, "looks wrong but is load-bearing" code.
- **Failure modes seen here** — concrete incidents and their triggers.

Stamp `sources-hash` and `generated` so the next run can tell whether the area
drifted. Flag unknowns ("ownership unclear") rather than inventing them.

### Phase 4 — Update the index (mechanism)

Add or update the one-line entry for each area under **Compass index** in
`AGENTS.md`. Never copy compass *content* into AGENTS.md — only the path and a
one-line summary.

## Refresh, not rewrite

On a refresh, recompute the `sources-hash`. If it is unchanged, report "current"
and do nothing. If changed, re-read and update — preserving human-added notes,
marking what changed. A compass refresh is content-hash-gated so an unchanged
area costs nothing.

## Best practices

1. **One map per area, not per file.** Granularity is the first thing that goes
   wrong.
2. **The why, not the what.** If a sentence restates what the code plainly says,
   cut it. The code is the source of truth for *what*.
3. **Promote, don't duplicate.** When a gotcha generalizes beyond its area, move
   it to AGENTS.md's failure-mode log and leave a back-link, per
   `context-layering`.
4. **Stay honest about staleness.** A wrong map is worse than no map; the
   `sources-hash` exists so a stale one is visible.
