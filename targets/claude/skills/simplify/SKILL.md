---
name: simplify
description: Reduce a diff to its essential complexity, removing dead paths, over-engineering, premature abstraction, and incidental churn, without changing behavior.
scope: universal
backed-by: code-simplifier agent
---

# Simplify

Run after implementation, before review. Takes the current diff and proposes
removals and consolidations that preserve behavior while cutting complexity.

## When to activate

- Immediately after a feature or fix is implemented and tests pass.
- As step 4 of the `implement-review` workflow.
- When a diff feels larger or more clever than the problem warrants.

## What it looks for

- **Dead paths**: branches, params, or returns nothing reaches.
- **Premature abstraction**: interfaces/generics with a single caller; YAGNI.
- **Over-engineering**: configurability, indirection, or layering the task didn't ask for.
- **Incidental churn**: reformatting or renames unrelated to the change, which bloat review.
- **Duplicated logic**: only extract when the duplication is real (rule of three) and changes for the *same* reason.

## How to apply

1. Read the diff against its base ref.
2. Propose concrete simplifications, each with a one-line rationale.
3. Apply accepted ones and commit them **separately** so they're visible as
   simplification in review, not mixed into the feature commit.
4. For anything you choose *not* to simplify, say why (sometimes the verbose
   form is clearer; note it so review doesn't re-litigate).

In Claude Code this delegates to the `code-simplifier` subagent. In a
single-agent runtime (Codex/Amp), perform the same pass inline.

## Boundary

Simplify never changes behavior. If a "simplification" would alter what the code
does, that's a design change; route it back through planning, not through here.
