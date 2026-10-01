# Agent Evaluation & Benchmark Design

Design evaluations for AI agents, dev tools, retrieval, and repo-scale
automation. **Evaluation quality beats benchmark size** — a small set of real,
uncontaminated, decision-driving tasks is worth more than thousands of synthetic
puzzles.

## Core principles

- **Measure real tasks.** Representative workloads over synthetic puzzles. If no
  one does the task in practice, the number is noise.
- **Separate capability from prompt engineering.** Hold the harness/prompt fixed
  when comparing models; hold the model fixed when comparing prompts. Report which
  you varied. A gain you can't attribute is a gain you can't ship.
- **Every metric must change an engineering decision.** Before adding a metric,
  name the decision it informs. If nothing changes based on its value, cut it.
- **Reproducibility is a first-class result.** Pin model versions, seeds, dataset
  hashes, harness commit, and date. An unrepeatable eval is an anecdote.
- **Minimize contamination.** Assume public benchmarks are in training data;
  prefer held-out, private, or post-cutoff tasks and say so.

## Dimensions to consider

Correctness · completeness · reliability · latency · cost · determinism ·
reproducibility · developer effort · failure recovery · robustness. Pick the few
that map to real decisions for _this_ system; don't report all ten by reflex.

## From traces to a regression suite

Use the stages that match the available evidence; an existing, validated rubric
does not need to be rediscovered on every run.

1. **Discover failures.** Review real inputs, outputs, tool results, and outcomes
   before selecting product-quality metrics. Read
   [trace review](references/trace-review.md) when failure modes are unclear.
   Supplement observations with explicit requirements and adversarial cases;
   absence from sampled traces does not make a requirement unnecessary.
2. **Define the rubric.** For each failure mode, record evidence, the expected
   behavior, valid alternatives, and the decision a check would inform. Resolve
   ambiguous requirements before treating disagreement as model failure.
3. **Validate the evaluator.** Prefer execution or deterministic checks where
   they actually measure the criterion. Use a narrow LLM judge for semantic
   judgments and read [judge calibration](references/judge-calibration.md)
   before trusting its scores. Deterministic verifiers also need valid controls,
   independent references, and evidence that legitimate solutions pass.
4. **Design regression coverage.** Turn confirmed failures into regression cases,
   retain representative held-out measurement data, and compare matched cases
   across changes. Report targeted-suite results separately from population
   estimates. Revisit failure categories and evaluator validity as behavior drifts.

Prefer explicit pass/fail boundaries for individual failure modes. Preserve
continuous scientific measurements and justified graded rubrics where those carry
meaning; binary product checks are not a replacement for scientific validity.

For retrieval systems, diagnose retrieval and generation separately: did the
system obtain the required evidence, use it faithfully, and answer the request?
For multi-hop tasks, check coverage of all required evidence, not merely whether
one relevant result appeared. Validate synthetic questions against real queries;
retrieval metrics alone do not establish end-to-end usefulness.

## Repository-scale evaluations

For agents that operate over codebases, evaluate the axes that synthetic tasks
miss: repository understanding, cross-file reasoning, architectural consistency,
migration quality, semantic correctness (not just diff-match), dependency
propagation, test generation, and documentation accuracy. Verify outcomes by
execution (tests pass, build green, behavior preserved) rather than string
similarity to a reference solution.

## Benchmark design — audit before trusting

Before believing a benchmark, check it for:

- **Contamination / dataset leakage** — is the answer reachable from training
  data or from the prompt itself?
- **Unrealistic tasks** — puzzle-shaped work no engineer actually does.
- **Missing edge cases** — the failure modes that matter live in the tail.
- **Insufficient statistical power** — enough trials and items to distinguish
  signal from run-to-run variance? Report variance/CIs, not a single point.
- **Evaluation blind spots** — what the metric structurally cannot see (e.g.
  pass@1 hides flakiness; exact-match hides correct-but-different solutions).

## Metrics: engineering value, not leaderboard rank

Prefer metrics that capture value delivered: task completion, semantic
correctness, regression rate, benchmark coverage, engineering effort saved,
implementation quality, verification quality, cost-performance tradeoff.
A metric that only moves a leaderboard and no product decision is a distraction.

**Guard against parity-before-efficiency errors:** confirm two systems produce
equivalent _outputs_ on matched inputs before comparing their speed or cost.
A cheaper system that quietly drops work is not cheaper.

## Tracking across runs

Role: read-only analysis/planning — route implementation of the eval harness to a
separate pass. Store the pinned baseline (dataset hash, harness commit, model
version, seeds, date) somewhere durable in the repo (e.g. `evals/baseline.json`)
and have every recurring run diff against it. Emit metrics as a tracked series,
not a one-shot number — "is the improvement real" is answered against history.

## Output

Recommend, with evidence:

1. **Improved benchmark design** — concrete changes to tasks, splits, or scoring.
2. **New evaluation methodologies** — where the current approach is structurally blind.
3. **Missing metrics** — each tied to the decision it would inform.
4. **Stronger validation** — contamination controls, statistical power, repro pinning.
5. **Cost-performance framing** — the tradeoff curve, not a single winner.
6. **Opportunities** — publication or product angles the eval surfaces, when they exist.

## Evidence gates

Classify each trial as valid, invalid, or a measured zero before aggregation. Retain invalid trials with a reason; exclude only under a declared rule. Keep measured zeros in the denominator. Preserve failed and interrupted evidence immutably, including negative controls, and state observations separately from inferences.
