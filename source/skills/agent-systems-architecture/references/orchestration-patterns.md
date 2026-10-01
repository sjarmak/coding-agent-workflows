# Orchestration Pattern Selection

Companion catalog to SKILL.md. Pick topology from the dependency structure of
the work, not from familiarity.

| Pattern | Use when | Failure mode to design for |
|---|---|---|
| Pipeline | Stages have real data dependencies; items independent of each other | One slow item stalls its own chain only — never add barriers between stages that don't need them |
| Fan-out / fan-in | Independent subtasks, results needed together once | Stragglers; partial failure (design for N-of-M acceptance, not all-or-nothing) |
| Supervisor / worker pool | Homogeneous, retryable work items from a queue | Poison items (retry cap + dead-letter); duplicate execution (idempotency) |
| Independent perspectives + adjudication | Confidence matters more than throughput: review, verification, judging | Correlated errors — perspectives must differ in lens/context, not just temperature |
| Blackboard / shared workspace | Emergent collaboration on one artifact, roles contribute opportunistically | Write conflicts and drift; needs ownership rules or it degrades to chaos |
| Hierarchical delegation | Task decomposes recursively; parent owns integration | Context loss at each hop — the handoff contract is the whole game |

## Handoff contract template

Every agent-to-agent handoff should answer, explicitly:

1. **Objective** — what done looks like, verifiable.
2. **Inputs** — files/data/refs, by path or ID, not by allusion.
3. **Constraints** — budgets, forbidden actions, scope fences.
4. **Output schema** — the exact shape expected back.
5. **Escalation** — what to do when blocked (and "wait forever" is not it).

## Verification topology rules

- Author ≠ reviewer, always; reviewer gets the artifact, not the author's
  narrative about it.
- Verify by execution where possible (run tests, run the binary, open the
  artifact); self-report is a claim, not evidence.
- Adversarial verification (prompt: refute this) beats confirmatory
  verification (prompt: check this) for anything that will be acted on.
- Diverse lenses (correctness / security / does-it-reproduce) catch what
  N identical verifiers cannot.

## Recovery design worksheet

For each failure mode: how is it **detected** (timeout, schema violation,
budget breach, heartbeat loss), what is the **recovery** (retry w/ cap,
re-plan, re-enter from checkpoint, dead-letter to human), and what is the
**blast radius** (what state could a half-finished attempt have corrupted)?
If any cell is "unclear", that is the design work remaining.
