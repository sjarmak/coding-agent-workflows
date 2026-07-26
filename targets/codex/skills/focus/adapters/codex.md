# Codex adapter

Codex collaboration workers share the filesystem and do not implicitly provide
a private branch-allocation channel. The root orchestrator therefore creates
each task worktree and branch before dispatch and records the mapping before any
worker starts.

For every selected task:

1. Create a uniquely named branch from `BASE_SHA`.
2. Create an explicit worktree for that branch.
3. Record repository + wave + task + branch in the orchestrator manifest.
4. Spawn a worker and pass the exact worktree path, task JSON, and `BASE_SHA`.
5. Require the worker to run every command inside that worktree and return only
   a branch-tip attestation.

Because the orchestrator chose the branch, a worker note cannot select a
different branch. At convergence, independently verify branch equality,
ancestry, real work, attested commit membership, and tip equality.

If a runtime cannot constrain a worker to the assigned checkout, use sequential
execution. Worktree isolation is a correctness boundary, not merely a
performance optimization.
