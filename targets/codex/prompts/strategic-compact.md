# Strategic compaction

Use when a long session is approaching its host's context limit or changing phases.
Use actual context telemetry when available; tool-call counts and slower responses
are not reliable measures of remaining tokens. Do not assume a particular window
size, hook API, or `/compact` command exists in every runtime.

1. Prefer a coherent boundary: exploration to an accepted plan, completion of a
   milestone, or a change of subsystem. Avoid interrupting an unresolved edit or
   failure investigation if the host permits finishing that bounded step.
2. Write a compact working set using `working-set-snapshot` or `handoff-doc`:
   objective, accepted decisions, user constraints, revision/worktree, edited
   files, verification evidence, unresolved failures, and next concrete action.
3. Record evidence locations rather than dumping all tool output. Separate facts
   from hypotheses and preserve the original task when a recent message merely
   steers it. Do not promote unverified session guesses into permanent rules.
4. Check that the next agent can resume from those files. Commit status and
   artifact paths matter; a plan that points at vanished temporary files is not
   durable state.
5. Use the host's documented compaction mechanism when available. Re-read the
   working set and relevant project instructions afterward, then continue the
   same task without rerunning completed work solely because context changed.

Disk files and Git state persist independently of a conversation, but the host's
summary retention guarantees vary. Do not claim all preferences or tool results
survive automatically. Load skills and references on demand, avoid duplicate
reads, and bound query results by the current question. Measure context savings
in the actual harness rather than importing unsupported reduction percentages.
