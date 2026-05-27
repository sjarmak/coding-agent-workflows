---
summary: Track multi-step agent work in a durable, dependency-aware task store; prefer the lightest non-invasive backend (SQLite + JSONL) and only add heavier sync when you actually need it.
---
# Task Management

Multi-step agent work needs a **durable work record** that survives a context
window, a crashed session, or a handoff to another agent. Holding the plan only in
the conversation loses it the moment the context compacts. A task store is the
externalized memory of what is in flight, what is blocked, and what is done.

See [agent-collaboration.md](./agent-collaboration.md) for the autonomy rules around
*claiming* tasks; this file is about the store those claims live in.

## What a task store must do

- **Persist** tasks outside the conversation, in a form that survives restarts.
- **Model dependencies** — task B is blocked by task A — so a "ready queue" (nothing
  blocking it) can be computed rather than guessed.
- **Track a lifecycle** — open → in-progress → done/closed — with one status per task.
- **Stay diff-friendly** so the record lives in the repo and merges across agents and
  branches without a central server.

This is mechanism, not policy (see [patterns.md](./patterns.md) §ZFC): state and
lifecycle tracking belong in orchestration code. What goes *in* a task — its priority,
its difficulty — is a judgment to delegate to a model, not hardcode.

## beads

[beads](https://github.com/gastownhall/beads) (the `bd` CLI) is a dependency-aware
issue tracker built for AI coding agents. Tasks are stored as **JSONL** — the
git-friendly, mergeable source of truth — with a database alongside it for querying
the dependency graph and computing the ready queue. It is the fullest option: rich
dependency modelling, a ready-work queue, and an optional **Dolt** backend (a
git-for-data SQL database) for versioned, multiplayer, syncable task history across
machines.

That power has a cost. The Dolt backend pulls in a database dependency, and some
setups auto-install git hooks to keep the store synced. Both are fine when you need
cross-machine sync or a full audit trail of the task graph — and unnecessary weight
when you don't.

## beads_rust — the non-invasive default

For most projects, reach for the lighter, more self-contained option first.
[beads_rust](https://github.com/Dicklesworthstone/beads_rust) is a Rust
reimplementation that deliberately **freezes the architecture at SQLite + JSONL**: no Dolt dependency, no automatic git-hook installation, no
background daemon. It keeps the parts that earn their weight — the JSONL source of
truth and the dependency-aware ready queue — and drops the parts that reach into your
environment.

The non-invasive properties that make it a safe default:

- **SQLite + JSONL only** — one local file plus a mergeable text record, nothing to run.
- **No Dolt** — no external data-versioning database to install or operate.
- **No hook installs** — it does not modify your git hooks; nothing changes about your
  repo's behaviour just by adopting it.

## Choosing

Default to the lighter SQLite + JSONL setup (beads_rust). It is enough for a single
agent or a small team sharing a branch, and it touches nothing it doesn't own — which
is exactly what you want from a tool you're adding to an existing repo. This follows
[architecture.md](./architecture.md) §KISS/§YAGNI: take the simplest store that solves
the problem, and add the Dolt-backed full beads only when a concrete need appears —
multi-machine sync, or a versioned history of the task graph. Adopting the heavy
backend first is speculative weight.

Whichever you pick, the durable, dependency-aware, diff-friendly work record is the
point. The backend is an implementation detail you should be able to change without
rewriting how the agent plans its work.
