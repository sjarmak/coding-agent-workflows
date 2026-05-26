# Workflow: Implement + Self-Review

The default per-task loop. A single agent implements a change via `focus`, then
runs `simplify` and `code-review` as a **hard verification gate** before
finalizing. The gate checks that the work actually fulfills what was asked, not
just that the code is stylistically clean.

This is a runtime-neutral spec. It originated as an orchestration *formula* run
by worker agents; the runtime-specific task-tracker and retry calls have been
replaced with neutral equivalents so any orchestrator (a Claude Code session, a
Codex run, an Amp thread, or a shell loop) can drive it.

## Inputs

| Input | Source | Description |
|-------|--------|-------------|
| `task` | caller | The unit of work: a tracker ID, an issue, or a written description. |
| `base_ref` | caller | Base git ref for diff comparison. Default: `main`. |
| `test_command` | project | Command to verify the work. Empty = skip. |

## Steps

The steps form a DAG; each lists what it depends on. An orchestrator runs them
in dependency order and stops at the gate if it rejects.

### 1. load-context

Understand the work before touching code. Read the task's description,
acceptance criteria, and any linked context. If a prior attempt was rejected,
read the rejection reason and target the specific issue it called out.

**Exit:** you can state what "done" looks like for this task.

### 2. focus  (needs: load-context)

Run the `focus` skill on the task: plan the implementation, execute the plan
step by step, verify against acceptance criteria. Follow the skill's workflow;
don't override it. If your context fills up, commit progress and hand off to a
fresh session rather than degrading.

**Exit:** `focus` has completed its plan → execute → verify cycle.

### 3. run-tests  (needs: focus)

Run `test_command`. If it's empty, skip. If tests fail: read the output, fix
the implementation, commit the fix, re-run. **Do not proceed until tests pass.**

**Exit:** tests pass, or no test command is configured.

### 4. simplify  (needs: run-tests)

Run the `simplify` skill on the diff to remove unnecessary complexity, dead
paths, and over-engineering. Commit simplifications as a **separate** commit so
they're visible in review.

**Exit:** simplifications applied + committed, or explicitly rejected with a reason.

### 5. review: THE GATE  (needs: simplify)

Review your own work as a hard verification gate, in two parts:

1. **Run `code-review` on the diff** (`git diff {base_ref}...HEAD`).
2. **Verify the diff against the task.** Re-read the acceptance criteria, then
   check the actual diff, not what you *remember* implementing. A test that was
   added but skipped/xfail'd does not count. A function stubbed but not wired
   into the public API does not count. A doc that doesn't match the code does
   not count.

**Reject if ANY of these hold:**
- An acceptance criterion is not actually implemented in the diff.
- `code-review` flagged a blocking issue (correctness, security, data-loss).
- Tests that should exist are missing.
- The implementation diverges from the task without justification.

**On reject:** record a specific, actionable rejection reason on the task and
hand it back to the queue (or to a fresh session). Do **not** patch it in this
same session; the reject-then-fresh-retry loop is deliberate: a clean context
re-reads the rejection reason at step 1 and tries again. This is what keeps a
single agent from rationalizing its own half-done work.

**On pass:** proceed to finalize.

**Exit:** rejection recorded + handed back, OR an explicit pass decision.

### 6. finalize  (needs: review)

Commit any remaining changes. Record a summary on the task (what was done, key
decisions, files changed, "self-reviewed with simplify + code-review,
acceptance criteria verified"). Mark the task complete.

**Exit:** work committed, task closed.

## Why the gate is separate from implementation

The agent that wrote the code is the worst judge of whether it's done; it
remembers intent, not the diff. Forcing an explicit diff-vs-criteria check, with
reject authority, catches the most common agentic failure mode: confidently
reporting "done" on work that compiles but doesn't satisfy the ask. The
reject-then-fresh-context-retry loop is the cheap, reliable fix.
