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
  source, writing the file, updating the index. The hash is computed by
  `compass-hash.mjs` (ships in this skill dir), never by the model.
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
- **record the exact set of files this map is written from** (area-relative
  paths). This list, not "everything in the directory", is what the staleness
  stamp hashes — so choose the files that actually inform the map.

### Phase 3 — Write the map (model)

Fill the `COMPASS.md` template with real judgment:

- **Purpose** — the role this area plays in the system, in 2-3 sentences.
- **Key files & entry points** — the handful that matter, and why each.
- **How it connects** — upstream callers, downstream deps, and the boundaries
  crossed (process, network, async).
- **Gotchas & non-obvious constraints** — ordering requirements, shared mutable
  state, implicit contracts, "looks wrong but is load-bearing" code.
- **Failure modes seen here** — concrete incidents and their triggers.

Stamp the frontmatter so the next run can test drift without a model: write the
`sources` list, then compute the hash mechanically and write `sources_hash` +
`generated`. Flag unknowns ("ownership unclear") rather than inventing them.

Compute the hash with the shipped helper, never by hand:

```
node <path-to-skill>/compass-hash.mjs path/to/COMPASS.md
```

Fill `sources` first, then run the helper: with the list present but the hash
still a placeholder it reports `drifted` and prints the actual hash to paste in.
Re-run until it reports `current`. The helper is the one implementation of the
hash — the fleet scanner imports the same functions, so a map verified here is
verified identically machine-wide.

The stamp has a deliberate blind spot, and naming it is the point: the hash only
sees the files in `sources`. A new file added to the area, or a whole new area
with no map at all, is invisible to it — the same reason an incremental index
misses a moved symbol. That gap is closed by the periodic full pass (Phase 1
re-run), not by the hash. Do not pretend the hash covers it.

### Phase 4 — Update the index (mechanism)

Add or update the one-line entry for each area under **Compass index** in
`AGENTS.md`. Never copy compass *content* into AGENTS.md — only the path and a
one-line summary.

## Refresh, not rewrite

On a refresh, run `compass-hash.mjs` over the area's `COMPASS.md` and act on the
status it returns:

- **current** — the mapped files are unchanged. Report and do nothing; this
  costs no model tokens, which is the whole point of the stamp.
- **drifted** — a mapped file changed. Re-read the sources and update the map,
  preserving human-added notes and marking what changed. Then re-stamp.
- **orphaned** — a mapped file is gone (the area moved or shrank). Reconcile the
  `sources` list against what exists now, update the map, re-stamp.
- **unstamped** — a legacy map with no machine-readable stamp (or one written
  before this format). Add the `sources` list and stamp it on this pass.

Point the helper at a whole repo to test every map at once (`node
compass-hash.mjs <repo>`); it exits non-zero if any map is drifted or orphaned,
so it can gate a pre-commit hook or CI. A compass refresh is hash-gated: an
unchanged area is free, and only what actually drifted gets rewritten.

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
