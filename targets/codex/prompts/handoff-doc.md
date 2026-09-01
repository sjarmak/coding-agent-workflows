# Handoff Doc: File-Based Context Continuation

Write a handoff document to a handoff directory instead of pasting a prompt. The
next session gets a one-line pointer, reads the document, and deletes it once the
context is absorbed.

Use this when:

- Nearing the auto-compact or context limit
- Starting a fresh session while preserving important context
- The handoff is long enough that a pasted prompt is unwieldy
- The next session may be started by someone else, or later

Why a file instead of a pasted prompt:

- Survives clipboard churn between clearing the session and starting the new one
- Holds more context than is comfortable to paste
- The pointer is short and stable, so it works from a script, a cron job, or another agent
- Deletion by the reader is the signal that the handoff was consumed

## The Job

1. Get the user's goal for the next session
2. Extract relevant context from the current conversation
3. Identify important files that were worked on
4. Write the handoff document to the handoff directory
5. Show the user the short pointer prompt for the new session

## Step 1: Get the User's Goal

If the user did not provide a goal with the command, ask:

```
What do you want to continue working on in the new session?
```

## Step 2: Extract Relevant Context

Analyze the current conversation and extract information from your own
perspective, writing in first person ("I did...", "I found...").

Include:

- **What was accomplished**: major implementations, fixes, or changes made
- **Key decisions**: architecture choices, patterns chosen, libraries selected
- **Important discoveries**: APIs, methods, patterns found in the codebase
- **Constraints and preferences**: user-specified requirements, patterns to follow
- **Caveats and limitations**: edge cases, known issues, things to watch out for
- **Open questions**: unresolved issues or decisions needed
- **Plans or specs**: if a plan was created, summarize the key points
- **State of the working tree**: uncommitted changes, branch name, failing tests,
  half-finished edits. The next session cannot see any of this and will otherwise
  rediscover it the expensive way.

Exclude:

- Implementation minutiae (variable names, storage keys) unless critical
- File-by-file change logs; describe capabilities and behavior instead
- Routine tool calls and their outputs
- Casual conversation
- Secrets, tokens, credentials. Never write these to the handoff file.

Format: bullets, first person, plain sentences. Light markdown headers are fine;
this is a document being read, not a prompt being pasted. No code fences around
whole sections, though short inline snippets are fine. Use workspace-relative
paths. Be concise but comprehensive: this file is the only thing the next session
gets.

## Step 3: Identify Relevant Files

Collect files that were explicitly mentioned by the user, read during the session,
edited or created during the session, or referenced as important for the task.

- At most 10 files in the primary list; prioritize the most critical
- Additional files go in a secondary list, uncapped but keep it sane
- Workspace-relative paths, most important first
- Name a directory instead of listing many files from it

## Step 4: Write the Handoff Document

### Directory

Default: `$HOME/.agent-handoffs/`, overridable with `HANDOFF_DIR`. On Claude Code,
`$HOME/.claude/handoffs/` is the conventional location and is equally fine. Create
it if missing. Use a project-local `.claude/handoffs/` only if the user asks or the
repo already has that directory, and if you do, confirm it is gitignored before
writing.

### Filename

`handoff-YYYYMMDD-HHMMSS-<short-slug>.md`, with a 2-4 word kebab-case slug from
the goal (`auth-error-handling`, `clickhouse-migration`). Timestamp first so
listings sort chronologically.

```bash
HANDOFF_DIR="${HANDOFF_DIR:-$HOME/.agent-handoffs}"
mkdir -p "$HANDOFF_DIR"
HANDOFF_FILE="$HANDOFF_DIR/handoff-$(date +%Y%m%d-%H%M%S)-<slug>.md"
```

Fill the timestamp, working directory, and branch from the actual environment
rather than guessing:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
pwd
git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "n/a"
git status --porcelain 2>/dev/null | head -20
```

### Document Template

Write with a quoted heredoc (`'HANDOFF_EOF'`) so nothing in the body is expanded
by the shell:

```bash
cat > "$HANDOFF_FILE" << 'HANDOFF_EOF'
# Handoff: <short title>

Read this document in full, then delete it:

    rm <absolute path to this file>

Delete it only after you have absorbed the context below and are ready to work.
The deletion is the signal that this handoff was consumed: do not leave it behind,
and do not re-read it later. If anything here contradicts what you find in the
code, the code wins; this document was written at the timestamp below and may have
gone stale.

## Session metadata
- Written: <ISO timestamp>
- Working directory: <absolute path>
- Branch: <branch name, or n/a>
- Uncommitted changes: <yes/no + one-line summary>

## Goal for this session
<the user's goal, verbatim where possible, plus any context they added>

## Key files
<path> <path> <path>

Other relevant files: <plain paths>

## What I did and found
- I ...
- I ...

## Decisions and constraints
- ...

## Caveats and open questions
- ...

## Suggested first steps
1. ...
2. ...
HANDOFF_EOF
```

Rules for the document:

- The delete instruction goes at the very top, with the file's own absolute path
  written out literally. The next agent may be handed the path with no other context.
- On an agent that resolves `@path` mentions, prefix the Key files entries with `@`
  so they resolve when the next agent reads the document.
- Never include secrets, tokens, or credentials.
- One handoff per file. Do not append to an existing handoff.

## Step 5: Give the User the Pointer

Print the path and the exact prompt for the new session:

```
Handoff written to <dir>/handoff-20260901-143022-auth-error-handling.md

Clear the session (or start a new one in this directory), then paste:

Read <dir>/handoff-20260901-143022-auth-error-handling.md, follow the
instructions in it, and delete the file once you have absorbed it.
```

Also summarize in one or two sentences what the handoff covers, so the user can
tell at a glance whether it captured the right thing before clearing.

Optionally copy just that pointer line to the clipboard (`pbcopy` on macOS,
`xclip -selection clipboard` or `wl-copy` on Linux, `clip.exe` on WSL). The
document itself is never copied; that is the point of this variant.

## Reading Side: What the Next Session Does

1. Read the file in full before doing anything else
2. Open the files listed under Key files as needed for the actual task
3. Verify anything load-bearing against the current code. The document is a claim
   about a past state, not ground truth.
4. Delete the file with `rm <path>`
5. Confirm to the user what was picked up, and that the handoff file was removed

Do not delete the file before reading it, and do not delete it if reading fails
partway. Say so instead, so the context is not lost.

## Housekeeping

Handoffs are short-lived; a pile of them means some were never consumed.

```bash
ls -lt "${HANDOFF_DIR:-$HOME/.agent-handoffs}"/*.md 2>/dev/null
find "${HANDOFF_DIR:-$HOME/.agent-handoffs}" -name 'handoff-*.md' -mtime +14 -print
```

Prune stale ones (older than 14 days) when the directory gets noisy, and tell the
user which files you are about to remove before removing them. If the user wants a
record of past handoffs instead, have the reading side move the file to an
`archive/` subdirectory rather than deleting it. Deletion is the default; the
archive is opt-in.

## Quick Reference

Minimal:

```
/handoff-doc continue implementing the feature
```

Interactive:

```
/handoff-doc
> What do you want to continue working on?
Add unit tests for the auth service
> [writes the handoff file, prints the pointer prompt]
```
