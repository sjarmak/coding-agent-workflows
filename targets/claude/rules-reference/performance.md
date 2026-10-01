# Performance Optimization

## Model selection

Route by the task's reasoning demands, measured quality, and available budget.
Use configured model roles rather than hard-coded provider names or generations.

| Role | Typical work | Selection evidence |
| --- | --- | --- |
| Deep reasoning | Planning, architecture, ambiguous diagnosis, evaluation | Performance on representative decisions and failure cases |
| Execution | Implementing a resolved plan, focused debugging | Correctness, recovery behavior, and cost on the project workload |
| Mechanical | Bounded transforms and repetitive checks | Reliable adherence to explicit contracts and verification gates |

Do not assume the most expensive model is best for every task or that adding
process compensates for a model that fails the acceptance criteria. Compare
against the incumbent with matched tasks before changing a routing policy.

## Concurrency and context

Parallel work consumes context and tool capacity as well as output tokens.
Account for input, cached input, output, and tool costs using the provider's
actual usage records; caching discounts and quota accounting vary.

- Respect the runtime's concurrency limit. Default to at most three live agents,
  including the coordinator, and one delegation level unless configured otherwise.
- Dispatch independent work only when its benefit justifies coordination cost.
- Keep task context focused and preserve durable state before compaction.
- Scale review to the change; do not repeat a full panel after every small fix.

See [agent-collaboration.md](./agent-collaboration.md) for delegation and review
contracts. Measure user-visible latency and cost before optimizing a workflow;
use `perf-audit` for a bounded performance investigation.

## Context and reasoning budget

Leave context headroom for multi-file changes, complex debugging, and the final
verification pass. Before a large task approaches its context limit, persist
decisions, current evidence, and next steps in the repository's approved store.

Reserve extended reasoning for unresolved design and correctness questions.
Use an explicit plan for complex changes; add independent critique when it can
test a material assumption. Routine file edits do not need a panel.

## Build troubleshooting

Read the failure, identify the narrowest relevant check, fix incrementally, and
verify after each change. Use an available build-resolver role when helpful;
otherwise perform the same procedure directly. Do not hide failures behind
fallbacks or weaken a gate to make the build pass.
