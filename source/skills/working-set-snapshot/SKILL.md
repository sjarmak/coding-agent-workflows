---
name: working-set-snapshot
summary: Keep a short working-set file current during a session, and wire a PreCompact hook that requires it, snapshots it with a content hash, and warns when it goes stale or stops changing.
description: Preserve curated session state across context compaction. The agent maintains a short working-set file (doing / decided / blocked / next); a hook fires at the pre-compaction boundary, blocks a bounded number of times until the file exists, snapshots it with a content hash and cheap boundary facts, then warns if the file is stale or unchanged across three boundaries. Use when a session is long enough to compact, when state keeps getting lost across compaction, or when the user says "write the working set" / "set up the compaction hook".
origin: agentic-coding-practices
scope: universal
---

# Working-Set Snapshot

Compaction compresses a conversation without knowing which parts were
load-bearing. A decision made an hour ago and a paragraph of tool output are
equally eligible to be summarized away. The fix is a small file the agent writes
and keeps current, and a mechanical hook that refuses to let compaction proceed
until it exists.

The split matters. The hook does file IO, hashing, and timestamps, and makes no
judgment about content. The agent makes every judgment about what goes in the
file. Nothing in the script tries to infer what mattered.

This complements `handoff-doc`, which writes a document on purpose when you
choose to end a session. The working set covers the boundary you do not choose.

## The file the agent maintains

Four sections, kept short. The full contract is in
[STATE-FILE-CONTRACT.md](STATE-FILE-CONTRACT.md), which is worth shipping next
to the script so the agent can read it.

- **Doing** — the task in progress, in enough detail to resume mid-step.
- **Decided** — decisions already made and not to be relitigated, with the reason.
- **Blocked** — what is stuck and on what.
- **Next** — the immediate next action.

Update it when any of those four change, not on a timer. A file that exists and
never changes is the failure mode the hook's hash check is looking for.

## What the hook does at each boundary

1. If the working-set file is missing, return `continue: false` with an
   instruction to write it. It does this at most `--block-ceiling` times (2 by
   default) and then lets compaction through. An unbounded block wedges the
   session.
2. Otherwise, copy the file to a timestamped snapshot stamped with the time, a
   SHA-256 of the content, and, when Git is available, the branch, the head, and
   the count of dirty paths.
3. Warn without blocking if the file has not been touched in `--stale-minutes`
   (90 by default), or if its content hash is identical across the last three
   snapshots. Warnings never block, because there is no further turn in which
   the agent could act on a block.

## Install the hook

Copy `working-set-snapshot.sh` and `STATE-FILE-CONTRACT.md` somewhere stable and
make the script executable:

```sh
mkdir -p "$HOME/.local/share/working-set-snapshot"
cp working-set-snapshot.sh STATE-FILE-CONTRACT.md "$HOME/.local/share/working-set-snapshot/"
chmod +x "$HOME/.local/share/working-set-snapshot/working-set-snapshot.sh"
```

This is the one part of this bundle that wires a hook. Nothing installs it for
you; add the entry yourself when you want it.

Claude Code reads a `hooks` object from its `settings.json`, at either user or
project level. Codex reads `.codex/hooks.json`. Both currently accept
the same PreCompact JSON shape, so the same entry works in either, and there is
no harness-specific implementation:

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "$HOME/.local/share/working-set-snapshot/working-set-snapshot.sh --state-file $HOME/project/working-set.md --snapshot-dir $HOME/project/.working-set-snapshots"
          }
        ]
      }
    ]
  }
}
```

Merge that entry into an existing file rather than replacing it. Use absolute
paths, because a harness may run the hook from a directory you did not expect.
The `command` string goes through a shell, so `$HOME` expands; if your harness
runs hook commands without a shell, write the paths out in full.

Every setting has a flag and an environment variable: `--state-file`
(`WSS_STATE_FILE`), `--snapshot-dir` (`WSS_SNAPSHOT_DIR`), `--block-ceiling`
(`WSS_BLOCK_CEILING`), `--stale-minutes` (`WSS_STALE_MINUTES`), and `--vcs-dir`
(`WSS_VCS_DIR`). With no arguments the script reads `working-set.md` in the
hook's working directory and writes to `.working-set-snapshots/` beside it.

## Adapting another harness

The script reads one JSON object on stdin and writes one on stdout:

```json
{"continue": false, "suppressOutput": false, "systemMessage": "Write the working set, then retry compaction."}
```

Only `session_id` is read from the input, and only to label the snapshot file.
Missing fields, extra fields, empty input, and malformed JSON are all tolerated.

An adapter translates three things: your harness's pre-compaction event into an
invocation, its event payload into JSON on stdin, and the returned `continue`
and `systemMessage` into an allow-or-defer response. If your harness cannot
defer compaction at all, surface `continue: false` as a visible instruction to
the agent at the last boundary that still holds a turn.

Git is opportunistic. Without it, or outside a work tree, the branch, head, and
dirty-path fields are stamped `unavailable` and the snapshot is written anyway.
Bash, Python 3, and standard Unix utilities are the only requirements.

## Test

`./working-set-snapshot.test.sh` runs four behavioral tests: bounded blocking on
a missing file, snapshot and hash outside a Git repository, the staleness
warning, and the frozen-content warning. It creates its own fixtures and needs
no configuration.
