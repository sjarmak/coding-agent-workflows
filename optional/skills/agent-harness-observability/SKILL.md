---
name: agent-harness-observability
description: "Design or audit agent harness observability: events, streaming recovery, metrics, tracing, usage accounting, and privacy."
---

# Agent harness observability

Locate companion skills by name in the current host's skill catalog. If a
companion skill is unavailable, use the provider's current help/schema and
official documentation; do not assume a missing skill or command exists.

Separate live events, operational
metrics, diagnostic traces, and product analytics. Identify which parts of the
harness are owned locally and which are a hosted service before proposing changes.

## Durable events and recovery

Define a versioned event contract for snapshots, turn/model activity, tool
activity, compaction, and terminal outcomes. Include run and attempt identity,
event identity, timestamp, ordering, and parent tool-call identity where relevant.

- Allocate sequence numbers at an authority shared by all writers to the run.
  Per-process counters do not establish ordering across parallel workers.
- Buffer fragmented tool-call arguments until structurally complete before
  dispatch. Record rejected, skipped, and cancelled calls as well as results.
- Commit durable state before publishing its completion event. Use an outbox
  or equivalent recoverable mechanism when delivery is required; an in-memory
  queue does not survive worker death or an exhausted save retry.
- For snapshot plus pub/sub, subscribe and buffer first, then read a consistent
  snapshot with a high-water sequence. Send the snapshot, discard buffered
  events already covered, and apply later events in order. Detect gaps and
  recover from durable state. Bound buffers and define overflow recovery.
- Ephemeral deltas need their own cursor/replay contract if they must survive
  reconnect; a completed-turn snapshot cannot recover mid-turn text by itself.
  Use a durable event log when that guarantee is needed.
- Persist terminal status before announcing it. Cleanup/finally/defer can help
  on ordinary exits, but cannot guarantee delivery after process death. A
  reconciler or lease recovery must resolve abandoned runs; reconnecting clients
  need a terminal snapshot even when the final publish was lost.
- Best-effort UI publishing has bounded retries and observable failures.
  Financial and audit records need durable delivery and consumer deduplication.

Test the races: commit before publish followed by process death, reconnect
during a turn, duplicate or out-of-order delivery, multiple writers, buffer
overflow, and cancellation while a tool is running.

## Metrics and attribution

Use request rate, errors, and duration per operation, plus in-flight gauges.
Useful measurements include model and tool latency, queue wait, full run time,
token usage, context pressure, compactions, run outcomes, quota rejection,
stream delivery failure, and transport error. Keep server processing time and
client wall time distinct.

Use bounded labels such as registered tool, workload, normalized model, and
status (`success`, `error`, `timeout`, `cancelled`). Derive status from both
context cancellation and returned errors. Count quota/validation rejections
separately from server failures. Do not put run IDs, prompts, SQL, arbitrary
model output, or user/tenant identifiers into metric labels.

Propagate workload attribution and run/attempt identity through tools and
subagents. Namespace shared collectors and queue/broker resources only where
isolation requires it; table names need not become metric labels. Count nested
usage once, with a documented inclusive/exclusive convention. Missing usage
is unavailable, not zero. Define numerator, denominator, and exclusions for
each alertable metric.

## Traces and privacy

Trace run, turn, model call, tool execution, compaction, persistence, and
publishing when those internals are owned. Correlate with structured logs and
persist trace references on the run. Across enqueue/worker boundaries, propagate
validated trace context or link the worker span to the request according to
the tracing system's async semantics. Record parentage for subagents.

Default span fields to IDs, registered names, sizes, durations, status, and
usage. Raw input previews, query text, results, prompts, and answers can contain
secrets or customer data. Truncation is not redaction. Store necessary raw
artifacts separately with scoped access, retention, and redaction rules; do
not treat hashing or a numeric/boolean type as proof of anonymity.

Product analytics should use an allowlisted schema. If the telemetry platform
requires numeric registries, preserve assigned IDs forever and never reuse
retired values. Map unknown values explicitly and observe schema drift.
Telemetry conventions are platform-specific; load the applicable platform
guidance before changing shared instrumentation.

Optional post-run intent categorization uses a model and a validated taxonomy,
not keyword heuristics. Version the categorizer, constrain data disclosure,
and persist/retry the job when analytics completeness matters. Record failures
and uncategorized runs so the apparent intent distribution is not biased.

## Usage and billing

Measure incurred usage separately from whether the product charges the user.
Use the actual product's billability policy; cancellation, truncation, or an
error does not imply a universal refund or charge rule.

When implementing accounting, use durable idempotent reservation, settlement,
and release keyed by logical operation, with an explicit retry/attempt policy.
Concurrent admission checks must prevent oversubscription. Defer-based release
alone cannot handle process death; reconcile expired reservations. Publish
billability analytics after durable settlement and use its exact reason code.
Do not recreate billing if the hosted provider already owns it.

## Audit output

For each finding, name the affected channel, evidence, failure/recovery scenario,
and proposed change. State what the client cannot observe or control. Route
loop/tool changes to [agent-harness-design](../agent-harness-design/SKILL.md)
and artifact comparison to
[agent-harness-traceability](../agent-harness-traceability/SKILL.md).
