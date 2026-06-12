---
description: "Scan every repo on the machine for guardrails, testing, and observability conformance; audit the deltas semantically; produce a fleet report; and propose canary-first remediation."
---

# Workflow: Fleet Conformance

Keep best practices applied across **all** projects without per-repo manual
intervention, and produce one report that answers: what guardrails, testing
setup, and observability does each repo have, and is anything drifting?

The split is strict (ZFC): a mechanical scanner gathers structural facts;
this workflow supplies every judgment. Never re-derive by hand a fact the
scanner already reports, and never push a semantic judgment down into the
scanner.

Rationale (Amdahl's-law framing): human review is the serial bottleneck of
shipping. Every check moved out of episodic human attention into the scanner
and this scheduled audit shrinks that serial fraction — the point is not more
process, it is fewer things only a human ever notices.

## When to run

- On its weekly schedule (the default cadence)
- The user asks "are my projects on track?" / "fleet status" / "audit my repos"
- After a bundle release, before rolling it out to consuming repos

## Steps

### 1. Mechanical scan

Run the scanner (installed at `~/.claude/fleet/bin/fleet-scan.mjs`):

```
node ~/.claude/fleet/bin/fleet-scan.mjs
```

It writes `~/.claude/fleet/fleet.json` (registry), rotates the previous run
to `fleet-prev.json`, and emits `fleet-status.md` (at-a-glance table). Per
repo it records: context layer (AGENTS.md/CLAUDE.md), `.claude/` + bundle
manifest + bundle drift, pre-commit, CI test gate, coverage / mutation /
fuzz configs, strict typing, structured-logging and error-tracking deps,
tier marker, and 30-day activity. Class A/B/C/scratch is deterministic
layer-counting, not judgment.

### 2. Delta triage

Diff `fleet.json` against `fleet-prev.json`. Triage only what changed or is
flagged — do not re-audit the whole fleet every run:

- New repos (auto-registered by the git-template or SessionStart hooks)
- Class transitions, lost guardrails (a gate that was ✓ and is now ✗)
- Bundle drift = true (installed bundle differs from source)
- **Promotion candidates**: class B/C repos with sustained 30-day activity —
  active work without instrumentation is the highest-risk state

### 3. Semantic audit (flagged repos only)

For each triaged repo, judge what the scanner cannot. Audit lenses:

- **Doc–reality drift** — does AGENTS.md/CLAUDE.md describe gates, commands,
  or invariants that no longer exist in the repo (or vice versa)?
- **Validation theater** — do the detected gates actually bind? A CI workflow
  that runs tests but ignores the exit code, a coverage config with no
  threshold, a pre-commit that auto-fixes and never fails.
- **Default-value tests** — tests that would still pass if the implementation
  ignored its inputs (asserting `0`/`""`/`false`/first-enum, the type's
  default; same literal passed for two different parameters). Mutation
  testing is the mechanical backstop; where the scanner shows no mutation
  config on a class-A repo, weigh proposing one.
- **Surrender types** — exported types where every field is optional;
  invalid states representable.
- **Mixed diffs** — recent PRs/commits that combine refactor with behavior
  change (judged from history, not assumed).
- **Observability blind spots** — for repos that are services: errors that
  vanish (no error tracking), logs that can't be correlated, no health
  surface. For libraries/CLIs, absence is fine — say so rather than nag.

Spawn one reviewer per flagged repo in parallel where the runtime supports
subagents; otherwise audit sequentially. Verify before reporting: a finding
must cite the file or commit it rests on.

### 4. Fleet report

Write one report to `~/.claude/fleet/reports/<date>.md`, ledger-style:

1. **Fleet table** — embed or link `fleet-status.md`
2. **What changed** — the triaged deltas, one line each, in plain language
3. **Findings** — semantic-audit results with file references
4. **Decisions needed** — the short list the user must rule on: promotions,
   gate additions, scratch-marking, bundle rollout. Each item is a yes/no
   with a recommendation; no item without a recommendation.

The report is the user-facing artifact. Optimize it for a two-minute read.

### 5. Remediation — canary first, approval always

Proposals, never unilateral changes:

- **Bundle rollout (proving grounds)**: when bundle drift is fleet-wide
  (i.e. the bundle moved, not one repo's copy), upgrade ONE canary repo
  first — a class-A repo with strong gates. Run `install.sh claude` there,
  then the repo's own full gate (`make check` or equivalent). Only after
  the canary passes, propose rollout to the rest as individual diffs.
  A failed canary is a bundle bug: fix the bundle, don't ship the break.
- **Instrumentation PRs**: for approved promotion candidates, run
  `project-init` to scaffold the context layer and propose the minimal gate
  set (CI test job, pre-commit) matching the repo's stack. Tests and gates
  ship in the same change.
- **Scratch-marking**: for repos the user confirms are throwaway, write
  `.repo-tier` = `scratch` so they leave the attention list permanently.

All git pushes, PR creation, and anything outward-facing gets explicit
per-action approval. Edits inside a repo follow that repo's own AGENTS.md.

### 6. Postmortem loop (only when a repo went off-track)

If the audit finds a repo where agent work ran in the wrong direction —
gates removed to make something pass, drift between plan and result,
repeated corrections that didn't stick — write a postmortem before any fix:
timeline of events, every correction issued, every decision made, and what
guardrail would have caught it earliest. Then route the prevention to its
one correct home: project-specific lessons via `failure-mode-capture` into
that repo's AGENTS.md; fleet-wide lessons as a proposed bundle rule/workflow
change (which then rides the canary path of step 5). The postmortem is the
mechanism that makes the fleet better every time it fails — skipping it
converts the same failure into a recurring one.
