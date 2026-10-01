# Calibrating an LLM evaluator

Use this reference when a semantic judge informs model comparisons, aggregate quality claims, or release decisions.

Define one observable failure mode per check with evidence-based pass/fail rules and legitimate alternatives. Have domain experts label clear passes, failures, and boundary cases; record uncertainty and adjudicate consequential disagreements. Prefer deterministic checks when they measure the actual property.

Separate prompt examples, development disagreements, and held-out final data. Group related traces or near-duplicates to prevent leakage. Put only prompt examples in the judge prompt, request structured verdicts with evidence, and treat evaluated content as data rather than instructions. Version rubric, prompt, model snapshot, parameters, and dataset.

For binary labels, define pass as positive and report TPR, TNR, false-pass rate, false-fail rate, confusion matrix, class denominators, uncertainty, and relevant slices. Choose thresholds from error costs, not universal targets. Inspect disagreements for rubric ambiguity, reference errors, missing context, and judge errors. Revalidate after material prompt, model, or distribution changes.

For comparative evaluations, use matched inputs and inspect style or length bias. A pass-rate correction using sensitivity and specificity estimates a population rate only when calibration transfers; do not clip out-of-range results or apply it under drift without investigating.
