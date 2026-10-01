---
name: "agent-systems-architecture"
description: "Conceptual architecture for agent systems — planning, execution, orchestration, verification, recovery, lifecycle, communication, scheduling, and composability. Use when designing or reviewing agent orchestrators, multi-agent pipelines, or background-agent systems. The questions are about roles, state, and control flow, not code style, prompt wording, framework APIs, or measuring agent performance."
---

# Agent Systems Architecture

Design agent systems as **control systems**, not as prompt collections. The
architecture is the set of roles, state transitions, and verification gates —
the model inside each role is replaceable; the structure is what you own.

## Stance

Reasoning lives in models; structure lives in code. Application code does IO,
schema validation, policy enforcement (budgets, timeouts, sandboxing),
lifecycle, and deterministic transforms. Semantic judgment — classification,
planning, quality assessment — is delegated to a model. Hardcoded heuristics
that imitate judgment are the primary architecture smell: they encode today's
model's weaknesses as permanent structure, and capability growth strands them.

## The core loop

Every agent system is some arrangement of one loop: **plan → act → observe →
verify → update state**. Architectural questions are questions about this loop:

- Who plans, and at what granularity? Replanning cadence beats plan quality —
  a mediocre plan revised on evidence outperforms a perfect plan executed blind.
- What is the action space? Tools define it. Least privilege per role: a
  verifier that can edit files is a design error, not a convenience.
- Where does verification happen, and is it independent? **Author ≠ reviewer**
  is the load-bearing invariant. Never accept self-report; verify by execution
  (tests run, build green, artifact inspected).

## Lifecycle as an explicit state machine

Enumerate the states an agent or work item can occupy and the legal
transitions between them. Every state must be **re-enterable from persisted
state** — crash recovery is re-entry, not repair. Corollaries:

- Effects are idempotent or guarded; assume at-least-once execution.
- Progress is checkpointed at state boundaries, not held in conversation.
- Every state has an exit: timeouts and dead-letter escalation to a human are
  states, not exceptions. An agent that can wait forever eventually will.

## Orchestration — choose the topology by the dependency structure

- **Pipeline** when stages have data dependencies; no barriers where none exist.
- **Fan-out/fan-in** for independent subtasks; a barrier only where a stage
  truly needs all prior results.
- **Supervisor/worker** when work items are homogeneous and failure-retryable.
- **Independent perspectives + adjudication** when confidence matters more
  than throughput (review panels, adversarial verification).

Coordination uses explicit message contracts — typed handoffs with declared
schemas — never shared mutable state or "the other agent will figure it out."
The handoff document is the API between contexts; design it like one.

## Scheduling and budgets are policy, not vibes

Concurrency caps, token/cost budgets, deadlines, and retry limits belong in
the plumbing as enforced policy. A budget the model is merely told about is a
suggestion; a budget the harness enforces is an invariant.

## Composability

An agent role is a function: declared inputs, declared outputs, no hidden
state. Systems compose when roles can be rearranged without rewriting their
internals. If adding a role requires editing three other roles, the
boundaries are wrong. Prefer fewer, sharper roles over many overlapping ones —
role sprawl is the agent-system form of concept duplication.

## Output

For a design or review, deliver:

1. **Role map** — each role's responsibility, action space, and model tier.
2. **State machine** — states, transitions, re-entry story, escalation exits.
3. **Verification topology** — where independent checks sit; what is verified
   by execution vs accepted on self-report.
4. **Failure analysis** — per failure mode: detection, recovery, blast radius.
5. **Policy surface** — budgets/caps/timeouts and where each is enforced.
6. **Capability-growth check** — what breaks or becomes redundant when the
   underlying models get materially better.
