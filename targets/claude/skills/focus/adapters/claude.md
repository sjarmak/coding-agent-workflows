# Claude Code adapter

Use Claude Code's `Agent` tool with `isolation="worktree"` and name every worker
`focus-<task-id>`. Pass `BASE_SHA` and the full task JSON in the prompt.

The trusted branch must come from the Agent tool result's harness-generated
`worktreeBranch`, not from worker prose or task notes. Persist Agent results with
a `PostToolUse(Agent)` hook into a fixed trust-store directory keyed by
repository and task.

Protect both the recorder and trust-store directory with Claude Code's
OS-level `sandbox.filesystem.denyWrite`, set
`sandbox.allowUnsandboxedCommands=false`, and ensure the sandbox dependencies
are installed. Workers may read trusted mappings during convergence but cannot
write them through shell commands, interpreters, or file tools.

Fail closed when:

- an Agent was not named `focus-<task-id>`;
- the result has no valid `worktreeBranch`;
- a mapping conflicts with an existing mapping; or
- the sandbox is disabled.

Keep direct manifest-write guards as defense in depth, not as the trust
boundary.
