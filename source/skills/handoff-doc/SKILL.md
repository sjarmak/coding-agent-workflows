---
name: handoff-doc
description: "Write a handoff document using the repository's durable task or handoff store so a new agent session can continue work. Use when nearing context limits or starting fresh while preserving context."
---

# Handoff Doc: Durable Context Continuation

Record continuation context in the repository's durable handoff store. The
next session gets a pointer, reads the document, and follows that store's lifecycle.

Use this when:

- Nearing the auto-compact or context limit
- Starting a fresh session while preserving important context
- The handoff is long enough that a pasted prompt is unwieldy
- The next session may be started by someone else, or later

Why a file instead of a pasted prompt:

- Survives clipboard churn between clearing the session and starting the new one
- Holds more context than is comfortable to paste
- The pointer is short and stable, so it works from a script, a cron job, or another agent
- The repository's lifecycle records when a handoff has been consumed

## The Job

1. Get the user's goal for the next session
2. Extract relevant context from the current conversation
3. Identify important files that were worked on
4. Write the handoff to the configured store or its documented file adapter
5. Show the user the short pointer prompt for the new session

## Step 1: Get the User's Goal

Use the active task as the goal when it is clear. If no goal can be recovered, ask:

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

Use the repository's documented durable task or handoff location first. Use a user-level fallback only when the user or repository workflow specifies one. Do not assume a hidden home-directory location or deletion-on-read lifecycle.

For a tracker-backed store, write the context into its handoff field or linked
record and return that durable identifier. The following filename, shell commands,
and template apply only when the repository uses a file-based adapter.

### Filename

`handoff-YYYYMMDD-HHMMSS-<short-slug>.md`, with a 2-4 word kebab-case slug from
the goal (`auth-error-handling`, `clickhouse-migration`). Timestamp first so
listings sort chronologically.

```bash
: "${HANDOFF_DIR:?Set HANDOFF_DIR to the repository-approved handoff directory}"
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

Read this document in full and verify its claims against current repository state.
Follow the repository's handoff lifecycle after consumption; retain this record
unless that policy explicitly calls for archiving or deletion.

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

- Put the durable record identifier and repository lifecycle instruction at the
  top. The next agent may be handed the pointer with no other context.
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
instructions in it, and follow the repository's handoff lifecycle.
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
4. Mark the handoff consumed using the repository's lifecycle, if defined
5. Confirm what was picked up and report any mismatch with the current state

If reading fails partway, preserve the record and report the failure.

## Housekeeping

Use the repository's retention policy. Do not infer that an old handoff is safe
to delete from its age alone. Preserve unresolved work and durable decisions;
archive or remove consumed file records only when the configured lifecycle calls
for it. Never delete tracker records to tidy a directory.

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
