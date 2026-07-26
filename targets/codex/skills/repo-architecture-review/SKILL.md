---
name: "repo-architecture-review"
description: "Review a repository for long-term architectural leverage rather than code quality — system structure, module boundaries, dependency graph, coupling, and drift. Produces a ranked set of highest-ROI improvements with evidence, effort, and risk. Use when asked to review the architecture, assess a codebase's structure/design, find where complexity is concentrated, or decide what to refactor next. NOT for style, naming, formatting, or line-level bugs (use a code-review skill for those)."
---

# Repository Architecture Review

Analyze a repository from the perspective of **long-term architecture**, not code
quality. The goal is to maximize engineering leverage — the ratio of future work
made easier to effort spent — not to produce the largest refactor.

## Operating principles

- Assume the existing developers are competent. A design you don't understand
  usually encodes a constraint you haven't found yet.
- Explain **why** a design exists before proposing an alternative. If you can't
  state the force it solves, you're not ready to change it.
- Prefer understanding over editing. Most of the value is in the map, not the diff.
- Optimize for **conceptual** simplicity (fewer concepts to hold in your head),
  not fewer lines.
- Favor **deleting a concept** over introducing a new abstraction.
- A small, targeted structural improvement beats a large rewrite almost always.

## Investigate before judging

Build a mental model first. Read, don't skim; trace one real request/data path
end to end. Study:

- system architecture and the dependency graph (what depends on what, and cycles)
- public APIs and module/package boundaries
- information flow and where it bottlenecks through a single choke point
- ownership boundaries (who changes what, and where changes ripple)
- test organization, build system, docs, and examples
- repository history when available — churn hotspots and repeated reverts reveal
  where the architecture fights its developers

Prefer evidence you can point to (a file, a `grep` count, an import cycle, a
commit pattern) over impressions.

## What to look for

Duplicated concepts · unnecessary coupling · hidden abstractions · information
bottlenecks · inconsistent APIs across similar surfaces · the same implementation
pattern re-hand-rolled in N places · architectural drift (structure no longer
matching intent) · scalability limits · opportunities for shared infrastructure.

## Rank by leverage, not size

For each candidate improvement, score it so the ranking is defensible:

- **Reach** — how many modules / future changes it unblocks or simplifies.
- **Effort** — realistic implementation cost (S / M / L).
- **Risk** — blast radius and reversibility.

Leverage ≈ reach ÷ effort, discounted by risk. A cheap change that removes a
concept touched everywhere outranks an expensive rewrite that improves one corner.
Recommend the top few, not everything you found.

## Avoid recommending

Formatting, naming preferences, style changes, speculative abstractions
("might need this later"), framework churn, or rewrites justified by taste rather
than leverage. If a finding wouldn't change how the next ten features get built,
cut it.

## Persisting findings (recurring runs)

Role: read-only analysis/planning — route execution of accepted findings to a
separate implementation pass (author ≠ reviewer).

When run on a cadence, don't re-report from scratch. Before reporting, load prior
state: a task tracker's open items tagged for architecture review on this repo, or
the last dated report. Give each finding a stable fingerprint (module path +
finding type) and label it **NEW / UNCHANGED / RESOLVED** against that state.
Accepted findings become tracked tasks plus a line in a dated report; close the
tasks for resolved findings. Structural decisions that get accepted belong in an
ADR so a later run doesn't re-litigate them.

## Output

1. **Architecture summary** — how the system is actually structured, in a few
   paragraphs someone could orient from.
2. **Major strengths** — what's working and should be protected.
3. **Highest-leverage improvements** — ranked by engineering ROI, most valuable first.
4. **Evidence** — for each recommendation, the concrete observation supporting it
   (file paths, cycles, duplication counts, churn).
5. **Effort** — expected implementation cost per recommendation (S / M / L).
6. **Risks** — what could go wrong, and how reversible each change is.
7. **Leave unchanged** — components that are fine as-is, so the reader knows the
   review was scoped, not exhaustive-by-omission.
