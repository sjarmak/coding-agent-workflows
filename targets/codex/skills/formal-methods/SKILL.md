---
name: "formal-methods"
description: "Find bugs and verify behavioral properties with TLA+, Lean, and executable models. Use for concurrency, lifecycle, or critical core-logic audits, explicit formal verification requests, and counterexample-driven regression testing."
---

# Formal Methods for Bug Finding and Verification

Establish a specific property and connect the evidence to the actual implementation. Start with one bounded subsystem. Keep ordinary tests and review; formal modeling is selective, not a prerequisite for every change.

## Choose the evidence

| Question | Preferred approach | Claim supported |
| --- | --- | --- |
| Can events interleave incorrectly? | TLA+ with TLC | Counterexample, or completed exploration of the configured finite model |
| Does pure core logic satisfy a general contract? | Lean | The stated theorem for the modeled definitions, under audited assumptions |
| Does the real API preserve invariants across actions? | Property-based state-machine testing | Tested generated sequences against implementation |
| Does production code agree with an executable model? | Differential testing | Agreement for exercised inputs; not a proof of equivalence |

Use existing repository tools and models first. Check primary documentation for the pinned tool version before introducing commands or dependencies. Missing tools, resource limits, or incomplete exploration are unresolved checks, never passes. Do not rewrite production code into Lean merely to enable an audit.

## Establish the contract

Derive properties from requirements, callers, and observable behavior independently of the implementation. If the requirement is ambiguous, make the ambiguity explicit before treating a behavior as a bug.

For each property, record:

- Intended behavior and relevant source locations.
- Inputs, state, transitions, and observable outputs.
- Safety invariant or progress condition; progress needs explicit scheduling/fairness and external-response assumptions.
- Environmental assumptions, excluded behavior, and evidence required for acceptance.

Examples include at-most-once settlement, obsolete responses never overwriting current state, bounded resource accounting, and eventual cleanup after cancellation under stated scheduling assumptions. Specify whether cancellation means requested or acknowledged; these are different contracts.

## Model the implementation faithfully

Map model state and transitions to production functions and synchronization boundaries. Preserve relevant awaits, callbacks, transaction boundaries, crashes, retries, duplicate events, and out-of-order responses. Do not hide a read/await/write race inside one atomic transition.

Use the smallest domains that expose the interaction, then vary bounds where useful. Explain abstractions, including differences between mathematical integers and machine arithmetic, clocks, exceptions, and external side effects. Record how outputs or runtime traces will be compared with the model. Trace validation and differential tests strengthen correspondence but do not prove it for all executions.

## Run and challenge the check

### TLA+ / TLC

- Preserve the specification, configuration, tool version, command, and full result.
- Check initial states and enabled actions; demonstrate representative successful and failure scenarios are reachable.
- State constants, finite domains, state/action constraints, fairness, and whether exploration completed. Constraints may exclude precisely the executions of interest.
- Check safety, deadlock, and liveness as appropriate; distinguish intended terminal states from unintended deadlocks. Explain any disabled checks.
- A completed finite-model check is not an unbounded proof. Simulation, timeouts, or interrupted runs support only their reported partial evidence.

### Lean

- Pin the toolchain and dependencies; build the actual theorem targets and preserve commands/results.
- Inspect theorem statements and definitions against the contract. Show meaningful inputs satisfy the preconditions; reject impossible assumptions and circular specifications.
- Audit transitive theorem dependencies with `#print axioms theoremName`. Reject `sorryAx` (including admitted proofs) and unapproved axioms. A successful build alone is insufficient.
- Record the accepted axiom baseline and trusted computing base. Disclose compiler-backed evaluation or other mechanisms expanding trust beyond kernel proof checking; do not call them kernel-only assurance.
- Distinguish proofs about handwritten models from proofs about production code. Name the unproved translation/correspondence boundary, or identify verified extraction/refinement evidence that closes it.

For either approach, challenge important properties with a historical bug or deliberately faulty variant in an isolated workspace. Confirm the check detects the violation. Never weaken a property, add an axiom, or remove an execution solely to make the check pass. A specification change needs a requirement-based reason and review.

## Turn a counterexample into a fix

Minimize the failing sequence and map each step back to production behavior. Reproduce it against real implementation code with controlled scheduling, barriers, fake clocks, or injected external failures; avoid sleep-based race tests.

Classify evidence as:

- **Reproduced defect:** the real implementation violates the agreed property.
- **Model-only counterexample:** the model violates it; implementation correspondence remains unconfirmed.
- **Unresolved suspicion:** a plausible concern without a completed reproducer or counterexample.

For authorized fixes, capture a failing regression test first, apply the fix, and rerun the regression and affected model/proof checks. If replay is impossible, explain the gap and retain the finding as model-only. If the model permits impossible behavior, refine it using evidence from the implementation, then rerun. Do not manufacture a production bug from an abstraction artifact.

## Preserve evidence and prevent drift

Keep maintained specifications, checker configurations, and replay/conformance tests alongside the subsystem using repository conventions. Link properties to implementation locations and the checked revision. Changes to either side require rerunning affected checks and reviewing correspondence; stale proof output does not cover new code.

For an adopted subsystem, wire small reproducible checks into its existing quality gate. Run larger explorations separately with explicit resource bounds. Enforce checks actually adopted by the project; exploratory proof attempts do not silently become repository-wide merge requirements.

Report each property's statement, scope, command/artifact, result, assumptions, bounds, and production correspondence. Use precise outcomes: reproduced violation, tested, finite-model checked, proved about the model, proved about implementation with stated trust boundary, or unresolved. Do not summarize these as an unqualified “formally verified.”

## Pilot evaluation

When introducing this workflow, choose one real subsystem with concurrency or stable core logic and an observable contract. Record existing review/test findings before formal exploration. Compare additional reproduced defects, false positives, historical or seeded bugs detected, and model maintenance effort after a real change. Keep model-only findings separate from confirmed bug counts. A seeded defect demonstrates sensitivity, not general effectiveness.

## Primary references

- [TLA+ industrial experience](https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf): model checking concurrent designs.
- [Cedar's verification-guided development](https://aws.amazon.com/blogs/opensource/lean-into-verified-software-development/): Lean models plus differential testing of production code.
- [Lean axiom audit](https://lean-lang.org/doc/reference/latest/Axioms/): assumptions and transitive dependencies.
- [Hypothesis stateful testing](https://hypothesis.readthedocs.io/en/latest/stateful.html): generated action sequences against an implementation.
