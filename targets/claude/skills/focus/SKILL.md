---
name: focus
description: Dependency-aware execution workflow for durable task stores. Selects ready work, runs independent tasks in isolated worktrees, verifies trusted branches, converges them onto one integration branch, and closes only landed work.
scope: universal
ported-from: focus command
command: true
---

# Focus: Dependency-Aware Execution

`focus` turns a durable task graph into reviewed, integrated code. It handles one
task directly or a wave of independent ready tasks. The workflow is universal;
runtime adapters provide task-store commands, agent dispatch, worktree creation,
and trusted branch metadata.

## When to activate

- Implementing or resuming a tracked task.
- Selecting ready work from a dependency graph.
- Running independent tasks concurrently without losing branches.
- Converging several task branches into one reviewable integration branch.

Do not use it for untracked conversation-sized edits or for discovery where the
requirements are still unresolved.

## Arguments

`[task-id | description | parallel] [--no-close]`

- A task ID selects one existing task.
- A description creates or adopts one task.
- No argument lists ready work.
- `parallel` selects a dependency-safe wave.
- `--no-close` completes implementation and verification but leaves closure to
  an enclosing workflow.

## Runtime capability contract

Before acting, identify the available adapters:

1. A durable task store that can list ready tasks, show dependencies, claim
   atomically, append notes, and close.
2. Git worktrees or an equivalent isolated checkout mechanism.
3. An agent dispatcher, if parallel execution is requested.
4. A trusted branch channel: branch membership must originate from the
   orchestrator or harness, never from an agent-authored note.

If parallelism or trusted branch metadata is unavailable, execute sequentially.
Never weaken a convergence gate to preserve parallelism.

## Beads adapter

When `bd` is present, it is the preferred durable adapter:

- `bd ready --json` supplies ready tasks.
- `bd show <id> --json` supplies acceptance criteria, notes, and dependencies.
- `bd update <id> --claim` claims atomically.
- `bd note <id> "..."` records plans, progress, and handoff attestations.
- `bd close <id> --reason "..."` closes verified work.

Use JSON for every machine decision; human-rendered output may wrap identifiers,
branches, or commit hashes. Treat `.beads/issues.jsonl` as an export, not the
live database or synchronization protocol.

## Dependency-aware selection

Build the ready set from task-store facts:

1. Include only open tasks whose blocking dependencies are closed.
2. Sort by priority, then by how much downstream work each task unblocks.
3. A parallel wave may contain only tasks with no dependency path between them
   and no expected overlap in owned files or external side effects.
4. Claim the entire selected set before dispatch. If any claim fails, recompute
   the wave rather than proceeding with a stale set.

For a single task, skip directly to execution. For a wave, continue through the
manifest and isolation gates below.

## Pre-flight

Resolve the current integration ref and its exact commit. Refuse a detached or
unresolvable base. Detect earlier unmerged focus integration branches: either
land them, explicitly stack on one, or stop for a human decision. Never silently
base a new wave on code that omits a prior unmerged wave.

Record:

- `INTEGRATION_REF`: the branch into which accepted work ultimately lands.
- `BASE_SHA`: the exact commit every task branch must descend from.
- `WAVE_ID`: a collision-resistant identifier.

Create one orchestrator-owned integration worktree and branch from `BASE_SHA`.
All convergence operations run there; the primary checkout remains untouched.

## Wave manifest

Create an orchestrator-owned manifest containing exactly one claimed task ID per
line. The manifest defines wave membership: derive the merge set from the manifest,
never from memory or an agent-authored list.

The manifest contains membership only. It must not be the trust store for branch
names when workers can write the shared filesystem.

For each task, dispatch an isolated worker with:

- the full task record and acceptance criteria;
- `BASE_SHA`;
- its owned scope;
- instructions to plan, test first, implement, simplify, verify, commit, and
  leave the task open for orchestrator review.

The worker may report `branch=<name> commit=<sha>` in a task note, but that note
is an untrusted claim.

## Trusted branch contract

Before convergence, obtain each task's branch from a channel the worker cannot
write:

- a branch allocated and recorded by the orchestrator before dispatch; or
- harness-generated worktree metadata persisted in an OS-protected store.

The trusted record is keyed by repository, wave, and task. It rejects missing,
malformed, duplicate, or conflicting mappings. It comes never from an
agent-authored note.

For every manifest task, authenticate the worker claim:

1. The claimed branch equals the trusted branch.
2. `BASE_SHA` is an ancestor of the branch tip.
3. The branch contains at least one commit beyond `BASE_SHA`.
4. The claimed commit resolves and belongs to `BASE_SHA..branch`.
5. The claimed commit equals the branch tip.

Any failure aborts the whole wave before merging.

## Task execution

Each task follows the same inner loop:

1. Read the task and define “done.”
2. Record a scoped plan and verification strategy.
3. Write a failing test or executable check first.
4. Implement the smallest passing change.
5. Simplify the diff without changing behavior.
6. Run the project’s complete applicable quality gates.
7. Commit on the isolated task branch.
8. Record a handoff note with the claimed branch, commit, files, and gate
   evidence. Leave closure to convergence.

If context is exhausted, persist progress in the task and resume from that
record. Context is not durable state.

## Convergence and merge

Converge authenticated task branches onto one integration branch:

1. Reconstruct the complete task set from the manifest.
2. Verify every task has a trusted branch and valid handoff.
3. Merge branches one at a time into the orchestrator worktree.
4. Resolve conflicts as the semantic union of the tasks, not by choosing one
   side mechanically.
5. Run integration tests after conflict resolution and the full quality gates
   after the final merge.
6. Review the combined diff against every task’s acceptance criteria.
7. If review rejects the result, keep tasks open and preserve the integration
   branch for repair.

Only the integration branch is handed to the user or landed. Individual worker
branches are implementation detail once their commits are reachable from it.

## Closure and cleanup

Close a task only after its authenticated commit is reachable from the accepted
integration branch and all dependencies are closed. Record the landed commit,
tests, and any remaining operational step.

Before deleting worktrees, prove every manifest branch is reachable from the
integration branch. Preserve an unmerged integration branch and report it
plainly. Never delete the only reachable copy of completed work.

Skip closure under `--no-close`, but still produce the integration branch and
verification evidence.

## Failure rules

- Missing task-store JSON, manifest entries, trusted branches, or gate state:
  fail closed.
- A worker touches the primary checkout or another worktree: stop and inspect.
- A worker branch is based on the wrong commit: reseat it only if it has no
  unique work; otherwise stop.
- A task discovers unrelated work: create a separate task with dependencies.
- External tasks with irreversible effects are never parallelized implicitly.

## Claude Code adapter

Read `adapters/claude.md` when Claude Code Agent isolation and hooks are
available. It maps the universal dispatch and trusted-branch contracts onto
`Agent(isolation="worktree")`, Agent result metadata, and an OS-protected trust
store.

## Codex adapter

Read `adapters/codex.md` when running under Codex collaboration tools. The
orchestrator creates worktrees and branch mappings before spawning workers, then
passes each worker its explicit checkout path. The universal convergence gates
remain unchanged.

## Context handoff contract

Durable state consists of task records, commits, the wave manifest, trusted
branch mappings, and the integration branch. A new session must be able to
resume using those artifacts without relying on prior conversation.
