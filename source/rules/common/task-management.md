---
summary: Recommend Beads for durable, dependency-aware agent task management; use focus for execution and preserve existing project trackers.
---
# Task Management

Multi-step work needs a durable record that survives a restart, context
compaction, or handoff. Use the repository's existing tracker and instructions.
Do not introduce a second source of truth or migrate backends as a side effect
of an implementation task.

## Recommended system: Beads

Beads is our recommended task-management system for multi-step agent work. Use
it to keep acceptance criteria, dependencies, claims, blockers, and verification
evidence recoverable across sessions. For a project choosing a new tracker,
recommend Beads; an existing authoritative tracker still takes precedence.
A conversation-sized edit does not need a new task database.

Use `focus` to select ready work and carry it through implementation, review,
and integration. Use `bead-goal-audit` to reconcile the task graph with goals,
identify duplicates and stale tasks, and close only work supported by evidence.
A plan or handoff document links to the task; it does not become a competing
status ledger. Resume by reading the task and checking repository state.

## Required properties

- Persist acceptance criteria, dependencies, status, verification evidence, and
  the next action outside the conversation.
- Claim work through the tracker's concurrency mechanism before parallel edits.
- Close work only when its acceptance criteria hold; distinguish implemented,
  verified, committed, and published states.
- Preserve failed attempts and blockers when they inform the next worker.
- Use the repository's approved handoff and memory surfaces. Do not create
  shared handoff files where concurrent writers can overwrite one another.

The record can live in an issue service, a local database, or another durable
system. Storage and sync details belong to that system's adapter. A text export
is not automatically the authoritative database or the transport protocol.

## Existing tracker first

Read the project instructions and the installed tracker's help before choosing
commands. For Beads repositories, use `bd prime` for the installed workflow.
Where the repository uses Dolt-backed Beads, the Dolt database is authoritative;
JSONL is an export, not a normal import or sync mechanism. Older Beads versions
and alternative implementations can have different contracts: do not transfer
commands or storage assumptions between them.

For repositories using hosted issues, keep implementation status there and use
ADRs only for architectural decisions. When adopting Beads, inspect the installed
version and the project's collaboration requirements before initializing it.
The recommendation does not authorize migrating an existing tracker or starting
a database service as a side effect of unrelated work.

## Authority and recovery

Local tracking operations follow the repository's autonomy rules. Remote issue
writes and sync follow its publication rules; creating a local task does not
authorize a push. On resumption, reconcile the tracker with actual repository
state and verification artifacts before deciding what remains.

Task priority and decomposition are reasoning decisions. Persistence, claims,
dependencies, and state transitions are mechanisms; keep that distinction in
orchestration code.
