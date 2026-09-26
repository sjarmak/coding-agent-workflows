# Verification Loop

Use the repository's configured quality gates. Preserve real exit statuses and enough output to diagnose failures; do not pipe a checker through `head` or `tail` and treat the pipeline's status as the check's result. Capture logs first if output needs summarizing. Missing tools and skipped checks are not passes.

## Establish what must hold

For significant behavioral changes, list acceptance properties and connect each to relevant code and tests. For state/concurrency changes include event ordering, ownership, cancellation, retries, and cleanup where applicable. For core logic include boundary conditions and input/output contracts. Derive expectations from requirements, not from the implementation under test.

Use the `formal-methods` skill for targeted modeling when required by the task or justified by risk. Ordinary changes need proportionate tests, not mandatory Lean/TLA+ projects. Keep existing coverage requirements; coverage measures executed code, not whether the right property was asserted.

## Run applicable gates

1. **Build:** use the project's build command; resolve failures before claiming readiness.
2. **Types and lint:** run configured checkers and report unresolved errors.
3. **Tests:** run affected unit, integration, and critical-flow tests; check the project's coverage threshold (80% where required). For fixes, record the regression failing before the fix and passing after it.
4. **Behavioral properties:** run adopted property-based, conformance, model, or proof checks affected by the change. Follow the formal-methods evidence rules for bounds, reachability, axioms, and implementation correspondence. Replay relevant counterexamples against real code.
5. **Security:** run configured scanners and review affected security boundaries. Report secret locations with values redacted; do not print matching credential lines. Keyword searches alone do not establish security.
6. **Diff:** inspect the whole task diff, including staged and new files, against the appropriate base. Check for unintended behavior, missing error paths, and model/test drift. Do not substitute the previous commit's diff for the current task.

A tool timeout or incomplete model exploration is unresolved. A Lean build does not establish proof integrity without theorem/axiom review. Neither a finite-model check nor differential tests establish unbounded correctness of production code.

## Report evidence

For each applicable gate, report PASS, FAIL, or NOT RUN with its command, result, and any limitation. Mark inapplicable checks N/A with a reason. Give test counts and measured coverage when available.

For significant behavioral properties, add a compact evidence table:

| Property | Code/model scope and revision | Evidence command/artifact | Result | Assumptions and gaps |
| --- | --- | --- | --- | --- |

Distinguish tested behavior, finite-model checking, proofs about a model, and proofs linked to implementation. State configured bounds and whether exploration completed, or the theorem and audited dependencies. Identify what establishes correspondence to production code. No tool run means no verification claim.

Separate reproduced defects from model-only counterexamples and untested suspicions. Readiness requires applicable mandatory gates to pass and unresolved acceptance-critical issues to be resolved or explicitly accepted by the user. Report optional exploratory checks separately; don't invent new approval requirements for routine work.

## Rerun when evidence changes

Rerun affected gates after a meaningful edit, failed check, or changed assumption. Once checks pass, avoid repeating them without a new reason. Existing hooks can assist but do not replace evidence for the current revision; do not assume a particular agent's hooks or slash commands are installed.
