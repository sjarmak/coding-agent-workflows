---
name: agent-harness-traceability
description: Capture, replay, summarize, and compare agent harness runs with immutable evidence, explicit telemetry provenance, paired statistics, and regression gates. Use for eval runners and reports, including hosted evaluations and custom harness comparisons; use agent-eval-design for designing a benchmark from scratch.
---

# Agent harness traceability

Shared by Claude Code and Codex.

Keep captured evidence immutable
and derive reports and scores separately. State what was observable, what was
inferred, and what the experiment can establish.

## Capture contract

Use a versioned envelope containing run, task, trial and attempt IDs, condition,
request, available raw response/transcript, timing, status, and errors. Retain
tool calls/results and subagent data when exposed. A hosted API response is
not necessarily its full internal transcript; record capture completeness.

- Preserve failed, interrupted, and cancelled attempts, including partial
  evidence and capture failures. Write incrementally and finalize atomically;
  cancellation must not erase completed trials or bias the sample.
- Represent unobserved metrics as `null` with named reasons in
  `telemetry_unavailable`. Distinguish missing from observed zero.
- Attach source and unit to tokens, credits, money, and timing. Sources may be
  provider-reported, derived with a stated formula, or unavailable. Meter deltas
  need time bounds and isolation from unrelated activity to support attribution.
- Bind an immutable receipt to question digest, condition/configuration,
  model identity, budgets, attempt identity, and captured artifact hashes.
  Specify canonical serialization for hashes. Model aliases and branch IDs
  alone are not immutable revisions; record exports/digests where possible.
- Store scores separately, linked by hash to the exact generation artifact,
  with scorer/judge version, configuration, expectation digest, and rationale
  where exposed. Re-scoring creates a new artifact, not an edited run.
- Declare failure-attribution and exclusion rules before examining results.
  Preserve all attempts; a wrong answer is not grounds for replacement.
  Infrastructure retries use new attempt IDs and keep lineage to the original.
- Raw does not mean unrestricted: omit credentials, control access and
  retention, and version any redacted derivative with provenance. Keep prompts,
  queries, results, and answers out of public reports by default.

## Execution and production import

Drive the actual supported product API. Keep compared arms on the same path
except for the declared intervention; use supported request fields rather than
assuming a model override header exists. Record task frame, concurrency, order,
environment, data snapshot/time, and server/client versions when exposed.
Prefer notifications or streaming when supported, otherwise bounded polling.
Persist remote job IDs before waiting; avoid resubmission after ambiguous errors.

Convert authorized production exports through a versioned adapter into the same
analysis envelope while retaining the original payload. Do not assume direct DB
access, share tokens, or a particular join schema. Distinguish artifact replay
(recomputing reports), deterministic tool-result playback, and live re-execution
(new costs, model nondeterminism, and potentially changed data).

## Summaries and comparisons

Compute outcomes, turns, answer size, observed tool errors, per-tool activity,
usage, and latency from captured evidence. Count recursive subagent activity
with ID-based deduplication and declared inclusive/exclusive usage semantics.
Depth limits or missing nested data mark totals incomplete, not zero.

Offer compact summary and ranked triage views, with detail/full views when
needed. Keep answer bodies opt-in. Apply filters consistently and label global
versus filtered totals. Preserve raw numeric precision; round only presentation.

Match by stable task ID, prompt/expectation version, condition, and repetition;
use text plus occurrence only as a documented fallback. Surface unmatched and
missing pairs. Report before, after, absolute and relative deltas; relative
change from zero is undefined and must not become an invented percentage.

Named threshold rules can flag status changes, tool errors, latency, context
pressure, cost, or output shape for inspection. They do not establish semantic
correctness. Declare thresholds and severity weights as configurable triage
policy, not diagnosis; use a versioned judge or reference-based scorer for
quality. Review within-condition variability before attributing a delta.

For retrieval-only evaluations, validate task scope and expected item identities
before execution. Score the full retrieval contract (for example, resource IDs
and ranges), not substring matches alone. Report both precision and recall,
with declared micro/macro aggregation and an explicit policy for empty expected
sets. Self-identify benchmark traffic through a supported client identifier or
request metadata, and retain join IDs when available. Report failed attempts
and their scoring treatment alongside successful-only performance aggregates.

## Statistical evidence

Choose the estimand and pairing before inspecting outcomes. Repeated trials of
the same task are not independent tasks; use task-clustered or hierarchical
intervals and preserve pairing. Repetition count depends on variability and
the decision's precision needs; three repetitions are a starting point, not
a guarantee of adequate power.

For positive cost/time values, report the geometric mean ratio as
`exp(mean(log(after / before)))`, with a 95% interval in ratio space. Define
within-task aggregation and task weighting. An interval entirely below 1
supports a reduction under that analysis; touching 1 is inconclusive. Do not
take a geometric mean of the log ratios themselves. Do not add arbitrary epsilons
to zeros or impute missing costs: report those cases, eligibility counts, and
absolute differences separately. Include arithmetic totals for total budget
impact; a typical-task ratio does not measure total spend saved.

Compare quality as paired absolute differences with intervals. Before promotion,
declare a permissible loss/non-inferiority margin and apply it to the interval
bound; lack of a significant difference is not equivalence. Report all attempts
and success rates alongside any successful-only latency/cost subset. Include
every measured cost the intervention moves without double-counting provider
totals and their components. Unknown cost prevents a complete savings claim.

## Hosted evaluation adapters

Capture non-secret instance identity, configuration exports or digests, task and
expectation snapshots, native job/conversation IDs, and raw returned fields.
Separate generation and judge usage, API duration and client wall time, and job
failure and judge failure. Keep units as returned; credits and currency are not
interchangeable. Record hidden model identity and internal telemetry as
unavailable. A hosted judge verdict establishes only its declared scope.

Define required evidence per claim. Missing cost telemetry can invalidate a cost
comparison while leaving useful quality observations. Preserve sealed and held-out
boundaries; do not load held-out labels for tuning.

## Regression gates and review

Scale gates to the task: deterministic contract tests for schemas, truncation,
state transitions, and artifact integrity; a small development smoke set for
known failures; paired evals for consequential promotion decisions. Freeze
baseline artifacts and scoring configuration. State blocking rules and precision
requirements before running. A review or skill invocation alone does not
authorize paid runs, prompt-set changes, or publishing model changes.

Report findings with artifact/file references, evidence availability, affected
claims, and concrete fixes. For verification, exercise interrupted capture,
unmatched tasks, missing/zero usage, nested double-counting, score hash mismatch,
and repeated-task pairing. Route new benchmark design to
[agent-eval-design](../agent-eval-design/SKILL.md). Instrumentation and loop
changes follow the repository's own architecture and supported tool contracts.
