# Hooks

Claude Code runs shell commands on lifecycle events, configured under `hooks` in
`~/.claude/settings.json` (user level) or `.claude/settings.json` (project
level). Each event maps to a list of matchers and commands. Hooks are a Claude
Code mechanism; other agents have their own automation surface.

## Events

The events Claude Code exposes (consult your version's documentation for the
authoritative current set — it grows across releases):

- **PreToolUse** — before a tool runs; can inspect, block, or rewrite the call (validation, policy, guardrails).
- **PostToolUse** — after a tool runs; the place for auto-format, lint, and structural checks on the edited file.
- **UserPromptSubmit** — when a prompt is submitted; inject context or gate the turn.
- **Notification** — on notifications (permission prompts, idle alerts).
- **Stop** — when the main agent finishes a response; the final-verification gate.
- **SubagentStop** — when a dispatched subagent finishes.
- **SessionStart** — at session start; bootstrap context (for example a repo-conformance nudge).
- **PreCompact** — before context compaction.
- **WorktreeCreate** — when a git worktree is created; install dependencies so a fresh worktree is runnable.

A hook that exits non-zero (or emits structured output) can block the action and
feed its message back to the model. That is what makes PreToolUse and Stop useful
as enforcement gates rather than just side effects: a PostToolUse formatter is a
side effect, but a Stop hook that fails the turn until tests pass is a gate.

## Permissions, not a skip flag

To let specific tools run without a prompt, allowlist them under
`permissions.allow` in `~/.claude/settings.json` (for example an exact command
prefix or an MCP tool name). Prefer a scoped allowlist to disabling permission
checks wholesale, and never reach for a blanket skip-permissions flag on real
work.

Enable auto-accept only for trusted, well-defined plans; disable it for
exploratory work where a wrong tool call is costly.
