---
description: "Implement a tracked task, simplify it, independently verify acceptance criteria, and close only after integration requirements hold."
---

# Workflow: Implement + Verified Review

The default per-task loop separates implementation from the decision that the
work is complete. Use `focus` for execution, `simplify` for unnecessary
complexity, and an independent reviewer for the acceptance gate. Follow the
project's task store and runtime capabilities.

## Inputs

| Input | Source | Description |
| --- | --- | --- |
| `task` | caller | Tracker ID or written description with acceptance criteria. |
| `base_ref` | project | Agreed comparison base for the complete change. |
| `test_command` | project | Existing verification command; if absent, determine appropriate checks from the repository and task. |

## 1. Establish acceptance and ownership

Read the task, dependencies, prior attempts, and project instructions. Confirm
what must hold before closure and where the change must land. Claim tracked
work before editing. Use Beads when choosing a new durable tracker; preserve an
existing authoritative tracker.

## 2. Implement and verify

Run `focus` with `--no-close` so the outer gate owns closure. Reuse the review
and verification evidence produced there rather than launching a duplicate
panel. Add regression tests with fixes and property tests for relevant pure
logic. Execute the project's checks and exercise changed behavior.

An empty test command is not permission to skip verification. For documentation
or configuration, use appropriate render, link, schema, or structural checks.
Record unavailable checks as gaps and resolve gaps that block acceptance.

## 3. Simplify the integrated change

Run `simplify` on the complete diff. Remove unnecessary structure without
changing required behavior. Re-run affected checks after edits. Keep tests with
their fixes; a separate simplification commit is useful only when it improves
reviewability.

## 4. Independent acceptance gate

Use the `code-reviewer` role and `code-review` procedure. The reviewer did not
write the change: give it the task, comparison base, current working-tree state,
acceptance criteria, and explicit commands to run. Include uncommitted changes
in the review when present. Apply the Agent Collaboration review-panel size;
one coordinated review of the integrated result is the default.

The reviewer must check actual behavior and artifacts, not the implementer's
summary. Skipped tests, unwired functions, and documentation that contradicts
the implementation do not satisfy acceptance. Reject missing requirements,
blocking correctness or security findings, and missing verification evidence.

Evaluate each finding against the code. Fix valid findings, re-run affected
checks, and re-review the changed portion. Record unresolved blockers in the
task. A fresh-session retry is useful when context is exhausted or attempts
repeat; it is not required for every ordinary review fix.

If independent review is unavailable, perform an explicit diff-versus-criteria
self-review and record that limitation. Do not describe it as independent
verification. If the project requires an independent gate, keep the task open
until that gate is met.

## 5. Integrate and close

Commit the verified change and integrate it into the required branch. Record
commands and results, review findings and disposition, commit identity, and any
remaining limitations. Distinguish local verification from publication; push or
publish when authorized. Close only when the task's acceptance and integration
requirements hold. An implementation report alone does not close the task.
