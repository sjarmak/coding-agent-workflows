---
name: review
description: Review a non-trivial code change for correctness, security, maintainability, and unnecessary complexity. Use after implementation and before a PR or release; use simplify or slop-check for narrower cleanup questions.
---

# Code review

Apply the `code-review` skill as the base procedure. Map each acceptance criterion
to a check, run the relevant tests, and inspect failure paths; reading a diff alone
is not verification.

Review the complete diff and surrounding call paths. Verify behavior against repository instructions, tests, interfaces, data contracts, and failure handling. Look for semantic regressions, boundary violations, races, security issues, swallowed errors, missing validation, unintended side effects, duplicated logic, and unnecessary complexity.

Use reviewer roles and tools actually available in the environment. Independent reviewers help with substantial changes, but prompts should name explicit risks and acceptance criteria. Do not pin unavailable model names, require an absent provider, or treat reviewer count as a quality guarantee.

For every finding, cite the file and behavior, verify it against source, and classify severity and confidence. Fix confirmed critical and high-impact defects; resolve medium findings when they improve correctness or maintainability without expanding scope. Record false positives with the evidence that disproved them.

The review does not authorize paid evaluations, external publication, pushes, merges, or messages. Report what was checked, commands run, findings fixed or deferred, and environment limitations.
