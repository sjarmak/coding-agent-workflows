---
name: "skill-comply"
description: "Evaluate whether agents follow skills, rules, or role instructions using varied prompts, recorded tool traces, and independently reviewed behavioral specifications."
---

# Instruction compliance evaluation

This is an adapter to a separately installed skill-comply application, not a copy of that application's runtime. Its observed implementation uses Claude's streaming tool traces; do not promise native support for another agent without verifying an adapter.

1. Select the instruction file and define the observable behavior it requires. Separate mandatory steps from recommendations and conditions.
2. Generate scenarios at supportive, neutral, and competing prompt strengths. Review generated specifications and scenarios for circular tests, contradictions with higher-priority instructions, and accidental hints.
3. In the installed application's own environment, inspect `python -m scripts.run --help`. Its `scripts.run` module is application-relative, not bundled here. Resolve supported models, output location, runtime prerequisites, and budget before running.
4. Inspect what dry-run actually does. Scenario/spec generation can still call models; a dry-run is not a promise of zero cost.
5. Run isolated agent sessions against controlled fixtures. Preserve prompts, instruction hashes, model/runtime versions, stdout/stderr, tool traces, and classifier configuration.
6. Classify the meaning of tool actions with a model or human review; check temporal ordering mechanically. Audit classifier mistakes and include raw trace evidence for disagreements.
7. Report compliance by scenario class with denominators, failures, missing telemetry, and uncertainty. A role being invoked is not evidence that it performed its internal workflow correctly. Do not convert a failed score automatically into a new hook or stronger instruction.

If the application is unavailable, design the study with `agent-eval-design` and record that no execution occurred. Use `agent-harness-traceability` for reproducible artifacts.
