# Working-set file contract

The working-set file is a small, living handoff maintained by the agent during a session. Keep the newest and most important facts first. Use Markdown with these four sections (extra detail is fine when it is genuinely load-bearing):

```markdown
# Working set

## Doing
The current objective and the concrete work in progress.

## Decided
Decisions already made, including constraints and reasons that must survive.

## Blocked
Anything preventing progress, who or what can unblock it, and relevant evidence.

## Next
The next few executable actions in order.
```

The agent—not the hook—authors and refreshes this file whenever the working state changes. Choosing what matters is a judgment call. The hook only checks that the file exists, copies it, hashes it, and records deterministic boundary facts; it must not invent priorities or summarize the conversation.

Automatic context compaction compresses the available conversation indiscriminately to fit a smaller context. This file serves a different purpose: it is the agent's deliberate selection of the state that is load-bearing for continuing the work. A good working set is brief, current, and actionable. It does not attempt to reproduce the transcript.
