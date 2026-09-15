# Ruling Capture

A user says "always expand a delete command before running it" or "route that
kind of review to a different model" or "stop asking, just do it and tell me
after." That is a ruling: a standing decision meant to bind every future
session, issued in conversation and recorded nowhere. When the session ends it
is gone, and the next session cheerfully does the thing it was told not to.

A ruling is durable only when a future session can find and apply it without
access to the conversation that produced it.

## How this differs from the two nearby skills

`failure-mode-capture` starts from an incident and requires a concrete
consequence. Its own text says that a rule without one "is a style preference,
and belongs in the bundle or a code review, not here." Many rulings are exactly
that: a preference, a priority call, a scope boundary, a judgment about how the
user wants to work. Real, binding, and outside that skill's stated scope.

`context-layering` says where a fact belongs and sets the ceiling on
`AGENTS.md`. It does not say how a ruling gets out of the conversation and into
a file. This skill is that procedure, for the specific case where the source is
the user talking rather than a bug.

Rule of thumb: a bug taught you something, use `failure-mode-capture`; a person
told you something, use this.

## Where a ruling goes

Into the tracked document that owns its subject. That might be a conventions
file, an architecture decision record, a runbook, or an area's `COMPASS.md`.
Create a focused document when none owns the subject yet.

The main instructions file gets a one-line pointer and nothing more: what the
rule is about, and the path to the document holding it. See
[TEMPLATE-pointer.md](TEMPLATE-pointer.md) for the line and
[TEMPLATE-ruling-doc.md](TEMPLATE-ruling-doc.md) for the document.

Putting the full text inline because that file is always loaded charges every
unrelated session for it, forever. That is how an instructions file grows past
the ceiling `context-layering` sets.

### What may stay inline

One test: would someone *not* working in this area still need this text in
front of them before acting? If no, it is a pointer. If yes, it may stay, and
it should still be short. Hard safety gates and guards on destructive actions
are the usual yes, because a pointer gets read too late to help.

## What does not count as recorded

A ruling that lives only in the transcript, a scratch file, or a session-local
memory store is not recorded. Those vanish, are invisible to another person or
agent, and do not turn up in a search of the documentation tree. Until the
ruling is in a tracked file that survives the session, the work is unfinished.

## ZFC boundary

- **Mechanism:** read the candidate documents, write the ruling and the
  pointer, run the durability checker, search the tree to confirm the ruling is
  findable.
- **Model:** decide whether a statement is a standing ruling or a one-off
  instruction, which document owns the subject, whether it belongs inline,
  how to phrase it, and what its scope boundary is.

## Procedure

1. Confirm it is standing, not local to this task. "Use tabs in this file" is an
   instruction; "we use tabs" is a ruling. Ask if it is genuinely ambiguous.
2. Find the document that owns the subject, or create a focused one.
3. Write the ruling, why it exists, and what it does not cover. Keep the user's
   own wording for the ruling itself where you can; a paraphrase drifts.
4. Add the one-line pointer to the main instructions file.
5. Delete any long-form copy of the same ruling left inline.
6. Search the tree the way a future session would, and confirm the ruling comes
   back.

## Checking

`check-rulings-durability.sh` is a heuristic aid, not a linter. It flags two
things a human then judges:

```sh
./check-rulings-durability.sh [--max-lines N] MAIN_INSTRUCTIONS_FILE DOCS_DIRECTORY
```

- A paragraph longer than `--max-lines` (12 by default) containing words like
  "always", "never", "must", "ruling" or "policy", with no Markdown pointer
  within three lines. A ruling that was inlined instead of pointered.
- A Markdown file under the docs directory that the main instructions file never
  references. A ruling document nobody will find.

It exits 1 when it has warnings and 2 on a usage or path error. Both checks
produce false positives by design; they are review targets, not verdicts.

The proximity window is three lines and knows nothing about subjects, so a
pointer belonging to an unrelated rule that close will suppress the warning. In
a densely pointered instructions file the inline check runs quiet. Its tests
pin that behavior rather than pretending otherwise.
