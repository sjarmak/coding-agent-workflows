---
name: "reliability-pass"
description: "Six bounded protocols that test a coding-agent system and leave an artifact: authority boundary, recovery fault-injection, trace review, eval comparison. Use when asked whether a system, recovery path, or permission boundary actually holds."
---

# Reliability Pass

A claim about reliability is worth what its **retained artifact** is worth.
Each protocol below converts one question into a bounded run that leaves
something inspectable behind. They are templates, not universal thresholds:
when local conditions force a different pass condition, **record the deviation**
rather than editing the condition silently.

## Version identity, first and always

Keep every protocol output with the evaluated system revision. A result without
version identity is not a current result — it is a historical note that will be
cited as if it were current. Name the agent, model, harness, and tool-policy
revision in the artifact, not just in conversation.

## Pick the protocol from the decision

| The decision | Protocol |
| --- | --- |
| Which reliability controls are missing? | minimum reliability pass |
| Can ordinary credentials perform a destructive action? | authority-boundary test |
| Does recovery avoid missing or duplicated effects? | recovery fault injection |
| Does a trace support the claimed attribution? | failure-trace review |
| Is a candidate better on the target workload? | evaluation comparison |
| Does routing improve results within budget and deadline? | allocation-policy replay |

## The minimum pass, in dependency order

Six controls, ordered by what depends on what — not by claimed return. Inputs:
one representative task family, one pinned revision of agent + model + harness +
tool policy, a small repeated-run budget, a named reviewer, an output directory.

1. Execute the same representative tasks **more than once** and retain each result.
2. Verify outcomes through execution or another decision-relevant oracle.
3. Run the agent with an **ordinary identity that lacks destructive authority**.
4. Persist task state outside the model context and **retry one interrupted run**.
5. Retain the raw action trace and have a reviewer **reconstruct one failure**.
6. Record cost and elapsed time beside quality, then **name the incumbent**.

The pass succeeds only when all six leave inspectable artifacts tied to the same
revision. **A failed step is the next engineering target and must not be averaged
away by the other five.** Write to `minimum-pass/<date>-<revision>/`: manifest,
repeated-run results, oracle output, authority-denial record, interrupted-run
record, raw trace with reviewer attribution, cost/time summary.

## The three that catch the most in practice

**Authority boundary.** Enumerate the credentials, network paths, tools, and
*indirect control planes* the ordinary process holds. Attempt one destructive
action against a safe target using exactly those, including an
instruction-injection variant wherever untrusted content reaches the agent.
Then attempt the same action through the intended escalation path with a
separate short-lived identity and an attributable approval. Then **probe
adjacent destructive actions** — the common failure is that escalation quietly
granted a broad administrative session. Passing means: ordinary identity denied,
narrow escalation completed only the approved action, decision attributable,
neighbours still unavailable.

**Recovery fault injection.** Identify the completion claim's durable state,
external effects, retry boundary, and dedup key. Record a **baseline** trace and
terminal artifact first. Inject one realistic fault at a declared event boundary
(worker loss, timeout, stale lease, duplicated delivery, response loss after an
external write). Restore through the **production** recovery path — hand-repairing
state invalidates the run unless manual recovery is the thing under test. Then
diff recovered against baseline and inspect the external systems directly for
missing or duplicated effects. The trace must make the injected fault and the
recovery reconstructable by someone who was not there.

**Failure-trace review.** Sample one failed task and give the reviewer the raw
ordered events, revisions, tool IO, state transitions, and terminal artifact —
**blinded to the original label, with post-hoc narrative excluded**. Ask for the
first supported failure, its downstream effects, the missing evidence, and the
narrowest taxonomy label that fits. Resolve disagreement by locating the missing
or ambiguous event, not by preference. When the record cannot distinguish
competing mechanisms, the finding is a **schema or taxonomy defect**, and fixing
that is the output of the run.

## Comparison and routing protocols

**Evaluation comparison.** Declare the incumbent, candidate, task population,
quality margin, resource budget, and required precision before execution.
Run matched tasks through equivalent environments, preserve every attempt, and
separate invalid trials from observed failures. Use the
[traceability contract](../agent-harness-traceability/SKILL.md) for pairing,
intervals, missing telemetry, and immutable scores. Report quality alongside cost
and latency; do not promote on a successful-only subset.

**Allocation-policy replay.** Freeze representative task arrivals, available
worker capacity, budgets, and deadlines. Replay incumbent and proposed routing
against the same evidence. Record eligibility, assignments, queue delay,
completion, quality, resource consumption, and misses. Separate observed outcomes
from modeled counterfactuals: historical traces cannot establish how an unobserved
model would perform. Follow promising replay with a bounded live comparison under
the same authority and budget limits before claiming an operational improvement.

## Working the skill

1. Name the decision, then pick the protocol. If no protocol matches, say so
   rather than bending one.
2. Pin and write down the revision under test before the first run.
3. Run the procedure as written; log any deviation and its reason in the artifact.
4. Report per-step outcomes. Do not collapse them into a single score or a
   percentage — the failed step is the finding.
5. State plainly what the pass does **not** establish. One fault placement, one
   task family, one revision.

Done when: the artifact directory exists, every step in the protocol has a
recorded outcome or a recorded deviation, the revision is named inside the
artifact, and any step that failed is written down as the next target rather
than absorbed by the ones that passed.

## Boundaries with other skills

- Recovery mechanism design belongs to the repository architecture; this
  skill tests a specified mechanism rather than inventing one.
- Designing an eval or benchmark from scratch, contamination control,
  statistical validity → `agent-eval-design`. `evaluation-comparison` here is
  the bounded head-to-head run, not the study design.
- Turning a failure that already happened into a durable prevention →
  `failure-mode-capture`.
