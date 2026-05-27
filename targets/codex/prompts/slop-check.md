# Slop & Erosion Check

A focused LLM-judge pass that scores a change the way [SlopCodeBench](https://www.scbench.ai) scores agents: on **Erosion** (verbosity, dead branches, redundant structure that piles up as code is extended) and **Verbosity** (unnecessary complexity), both _lower-is-better_. The premise: agents rarely write _wrong_ code — they patch their way into slop, and early design decisions compound across changes.

This is the accumulated-cruft axis. For correctness and reuse, use the review skill; for security, the security-review skill. They compose.

## When to use

- After a change that **extends** existing code across one or more requirement shifts.
- Before opening a PR on a non-greenfield change.
- When a function/module has grown over several edits and feels heavy.
- Skip for trivial diffs (typo, one-line fix, formatting, dependency bump) — there is no erosion surface.

## Phase 1: Map the surface (extended vs. greenfield)

Get the diff: `git diff` (or `git diff HEAD` with staged changes; or the files just edited if no git changes). For large diffs, write once to `/tmp/slop-diff.txt` and reference the path.

Split the changed code into two buckets — this drives the weighting:

- **Extended surface** (HIGH weight): hunks inside functions/modules that already existed. This is where erosion lives.
- **Greenfield surface** (normal weight): entirely new files/functions.

For the extended surface, **read the whole enclosing function/module**, not just the hunk — erosion is only visible against the surrounding code.

## Phase 2: Judge against the rubric (the model judges, not regex)

The rubric is the catalog in the `anti-slop` rule (`rules/common/anti-slop.md`, the SlopCodeBench 45-criterion judge, grouped). These are **semantic** judgments — do not grep for them; read and reason. For a large or cross-file diff, dispatch a general-purpose reviewer with a role clamp ("You are a verification agent; you did NOT write this code; actively read the enclosing modules") and the anti-slop catalog; otherwise judge directly.

For each touched region, walk the catalog groups and record concrete hits with `file:line`:

- Documentation noise · Overengineering · Premature optimization
- Defensive over-handling · Hidden behavior · Error obscuring
- Incomplete implementation · Spec deviation · Control-flow/debuggability · Reinvention

The decisive test for the extended surface: **"If this were written from scratch with today's requirements, would it look like this?"** Everything that exists only because of how the code grew — not because the requirements demand it — is erosion.

## Phase 3: Score

Report two qualitative scores (SlopCodeBench computes exact 0–1 numbers via its judge harness; here, justify a band with the evidence):

- **Erosion: low / medium / high** — how much of the extended surface is cruft (dead branches, redundant structure, defensive scaffolding) versus requirement-driven.
- **Verbosity: low / medium / high** — how much could be deleted or consolidated without losing behavior.

Bias toward "this could be smaller." A net-negative refactor that meets the spec is the target state.

## Phase 4: Report and (optionally) fix

```
## Slop & Erosion Report

Erosion:   medium   — 3 of 5 extended functions carry defensive checks for spec-excluded inputs
Verbosity: high     — auth/ added a single-entry strategy registry and two echo docstrings

### Findings (highest-leverage first)
[EROSION]   src/auth/session.py:88  single_entry_registry — `HANDLERS` dict has one entry; inline the call, drop the dispatch table.
[VERBOSITY] src/auth/token.py:41    echo_docstrings — docstring restates the function name; delete or add the actual contract.
[OVERHANDLING] src/auth/token.py:55 handling_excluded_cases — spec says token is always present; the `if token is None` branch is dead.

### Net recommendation
Consolidate the registry and delete the dead branch → ~30 fewer lines, one fewer abstraction. No behavior change.
```

If the user asked to fix ("clean it up", "apply"), apply the consolidations directly, smallest-blast-radius first, and re-read each touched function after editing to confirm no behavior changed. Otherwise stop at the report — edits to apply are the user's call unless requested.

## Boundary

- **The model judges, regex does not.** Per the patterns rule (ZFC), never reduce these criteria to keyword/regex matchers — they break on the edge cases a model reads correctly. A hook may _trigger_ this skill after an extending change; it must not _make_ the judgment.
- **Don't manufacture findings.** If the extended surface is clean, say so — "Erosion: low, no actionable findings" is a valid and common result. Inventing slop to fill a report is itself noise.
