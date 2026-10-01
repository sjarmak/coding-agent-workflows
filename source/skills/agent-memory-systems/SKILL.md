---
name: agent-memory-systems
description: "Conceptual models for agent memory — episodic/semantic/procedural stores, retrieval, consolidation, forgetting, compression, indexing, persistence, and context management. Use when designing or reviewing memory architectures for agents, deciding what to store and how to retrieve it, or evaluating whether memory actually improves agent behavior. NOT for generic database schema design or session context compaction mechanics."
---

# Agent Memory Systems

Memory is not storage. Memory is a **policy for what future contexts should
contain** — every design question reduces to: what should a future agent see,
when, and at what cost of being wrong?

## The taxonomy — three stores with different physics

- **Episodic** — what happened: events, sessions, outcomes, with time and
  context attached. Write-cheap, retrieval-hard, decays fast in value.
- **Semantic** — what is true: distilled facts, preferences, entity knowledge.
  Write-expensive (requires distillation), retrieval-friendly, must handle
  contradiction and staleness.
- **Procedural** — how to act: learned strategies, corrections, skills.
  Rarest and highest-value; usually earned from repeated episodic evidence.

Do not blend them in one undifferentiated store: they have different write
paths, retrieval keys, decay rates, and failure modes. Most memory-system
incoherence traces to treating everything as one pile of text chunks.

## The lifecycle: write → consolidate → retrieve → use → reinforce or forget

Design the whole loop; a system with only "write" and "retrieve" is a cache,
not a memory. Consolidation (episodic → semantic distillation) is a scheduled
background process, not an inline write-path step. Reinforcement means
retrieved-and-useful memories gain standing; retrieved-and-ignored ones lose it.

## Retrieval is the bottleneck

The value of memory is bounded by retrieval quality, not storage quality.

- Retrieval keys are chosen **at write time**: store facts in the vocabulary
  future queries will use, or they are write-only.
- Precision beats recall in agent contexts: an irrelevant memory injected into
  context is not neutral — it misdirects. Score the cost of a wrong injection,
  not just the hit rate.
- Layer retrieval modes deliberately (recency, entity, semantic similarity,
  explicit lookup); one embedding index is rarely the whole answer.

## Forgetting is a feature

An append-only memory converges to retrieval poison. Design deletion:

- **Decay** — unreinforced episodic memory ages out.
- **Supersession** — new facts replace old ones explicitly, keeping the
  pointer (X, formerly Y) when the history matters.
- **Contradiction resolution** — detect conflicts at write time; a store that
  can hold "user prefers X" and "user prefers not-X" without noticing will
  eventually act on the wrong one.

## Compression preserves pointers

Summaries are lossy; that is their job. The design rule: compress content,
keep **provenance** — every distilled fact should point back to the episodes
that support it, so confidence can be audited and bad distillations unwound.

## Context management — the last mile

Injection policy is part of the memory system: what gets loaded always (small,
high-confidence, identity-level), what loads on-demand (task-relevant), and
what never auto-loads (bulk episodic). Budget context like money; memory that
demands the whole window pays for itself with degraded reasoning.

## Evaluation — prove memory helps

Memory systems are seductively easy to build and rarely validated. Evaluate
against a no-memory baseline on longitudinal tasks:

- Downstream task effect (did behavior improve?) — not retrieval metrics alone.
- Retrieval precision/recall on labeled queries, plus injection-harm rate
  (how often a retrieved memory made the outcome worse).
- Staleness behavior: seed contradictions and measure whether the system acts
  on the superseded fact.
- Cross-session contamination: memory must not leak private or task-specific
  context into places it doesn't belong.

## Output

1. **Store model** — which of episodic/semantic/procedural exist, their
   schemas, and the write path into each.
2. **Lifecycle map** — consolidation, reinforcement, and forgetting policies;
   what runs inline vs scheduled.
3. **Retrieval design** — modes, keys, injection policy, context budget.
4. **Failure analysis** — contradiction, staleness, poison-injection, leakage.
5. **Evaluation plan** — baseline comparison and the metrics that would show
   memory is earning its cost.
