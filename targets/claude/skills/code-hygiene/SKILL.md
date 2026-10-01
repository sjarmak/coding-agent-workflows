---
name: code-hygiene
description: "Periodic code-hygiene audit of a repository or subsystem: low-value or implementation-coupled tests, test-only production seams, dead code, placeholders, commented-out history, swallowed errors, stale references, and oversized units. Read-only by default; produces an evidence ledger, then fixes one coherent batch at a time. Use for scheduled code audits, \"hygiene pass\", \"prune the tests\", \"find dead code\", or before a subsystem refactor. Not for reviewing a single diff (-> code-review, slop-check) or architecture ROI (-> repo-architecture-review)."
---

# Code Hygiene

A periodic sweep for the cruft that accumulates between reviews. It has one
value bar and two modes. **Audit** is read-only and ends in a ledger with
evidence for every candidate. **Cleanup** applies one coherent batch from an
audited ledger, proves nothing lost coverage, and stops. Run audit alone unless
cleanup was asked for.

The test half is adapted from OpenClaw's `test-audit` skill
(github.com/openclaw/openclaw, `.agents/skills/test-audit`, MIT). The
production half applies the same evidence discipline to non-test code.

When the audit includes performance, combine this skill with `perf-audit`.
Both can use the same ledger shape; a hygiene-only audit does not need a benchmark.

## Before judging anything

Read the repository's root and scoped `AGENTS.md` / `CLAUDE.md` files first;
they may declare contracts, generated files, or deliberate holds. Then, for each
candidate, read the complete unit and its owner: entry points, callers, callees,
siblings, overlapping tests, CI routing, and `git log -L` / `git blame` history.
A thing that looks dead may be reached by reflection, a CLI entry point, a
plugin registry, a config string, a cron/order file, or another repository.
Search the whole workspace for the name, not just the package.

## What to hunt

### Tests

- assertion-free coverage probes; tests that only check "did not throw";
- self-comparisons: the expected value is produced by the code under test;
- copied fixtures, manifests, or export lists that restate the source;
- exact source, import, or string greps where a behavior check exists;
- private helper or call-shape tests duplicated at a real boundary;
- the same contract asserted at every layer it crosses;
- mocks that implement the behavior being asserted, or one mock standing in
  for several different APIs;
- fixtures that supply what the owner should produce (ordering, receipts,
  persistence into a store the real path never writes);
- negative controls that pass for an unrelated reason (a different guard
  rejects first; the rejected path is unreachable);
- names that promise more than the assertions check;
- regression tests that never demonstrably failed on the unfixed code;
- skipped, xfail, or quarantined tests with no named clearing condition.

### Production code

- test-only seams: exports, flags, injection hooks, reset functions, or
  wrappers with no production caller;
- dead code: functions, modules, branches, config keys, CLI flags, and scripts
  with no reachable caller;
- placeholders: `not implemented`, fake returns, TODO/FIXME standing in for
  in-scope work;
- commented-out code blocks (git holds history);
- swallowed errors: bare `except`/`catch` that continues, errors replaced by
  defaults, timeouts that hide a failure instead of raising;
- stale references: docs, comments, and config naming paths, commands, beads,
  or flags that no longer exist;
- duplicated logic that has reached three copies (rule of three);
- oversized units: files past 800 lines, functions past 50, nesting past 4
  levels. Report these; splitting is a separate refactor, not hygiene.

## Retention bar

Keep a test or seam when it independently guards a public API, protocol,
config, migration, storage, security, platform default, generated artifact, or
cross-repository contract. Also keep observable call ordering, regressions with
a credible failure mode, and a source grep when it is the cheapest guard that
fails on a contract change and survives an identifier-only rename. Slow or
static is not a reason to delete. A retained test that fails on the baseline is
a possible product bug: record it as a defect, never delete it.

## Audit mode (read-only)

1. **Pin a baseline.** Record the commit SHA, the test command, and each test
   file's pass/fail result. List baseline failures separately.
2. **Split into lanes** along production-owner boundaries (not file prefixes),
   so every file belongs to exactly one lane. One lane per agent if fanning out.
3. **Fill the ledger** for each lane in the format in [LEDGER.md](LEDGER.md).
   Judge by assertions and callers, not names. Every candidate needs every
   evidence field; a missing field means it stays `R` or `?`.
4. **Rank.** Report a few high-confidence candidates over a long speculative
   list. Order by what the cleanup unlocks: production code that can go.
5. **Stop.** Do not edit source, tests, or config in audit mode.

## Cleanup mode

Take one lane or one owner-boundary batch from a finished ledger.

- Never edit while the test runner is active in the checkout.
- Delete test-only seams together with the tests that needed them. Do not keep
  compatibility aliases for code with no production caller.
- Move a retained regression to its owning boundary rather than duplicating it.
- Prefer a net-negative diff. Never add replacement tests that restate the
  implementation.
- For each contract whose only proof moved or merged, make one deliberate
  mutation in the production owner, confirm the keeper goes red, and restore
  the source byte for byte.
- Validate with the repository's own commands: focused tests for the owner and
  siblings, then the full suite, then the formatter/linter, then
  `git diff --check`. Report `git diff --numstat` with production and test
  lines separated.
- Commit, push, or open a PR only under the repository's normal authority rules.

## Handoff

Report, in this order:

- repository, pinned SHA, lanes, and baseline pass/fail;
- counts by mark (R / F / C / D / ?), plus the top candidates with evidence;
- production code each deletion would unlock;
- retained false positives and why they stay;
- product defects found (baseline failures, swallowed errors that hide a real
  failure), each as a follow-up, not fixed inside the audit;
- commands actually run.
