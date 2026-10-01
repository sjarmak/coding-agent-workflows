---
name: codeprobe
description: Assess repositories, mine and validate evaluation tasks, calibrate curators, run isolated agent comparisons, and interpret results through the installed codeprobe CLI.
---

# Codeprobe evaluation workflow

Requires a separately installed `codeprobe` CLI and any selected runtime, provider credentials, or scorer dependencies. Inspect `codeprobe --help`, version, and the relevant subcommand help; do not import private Python implementation modules. Use `agent-eval-design` for study validity and `agent-harness-traceability` for evidence provenance.

## Select the stage

| Need | CLI surface | Procedure |
| --- | --- | --- |
| Repository readiness | assess | Check build/test reproducibility, history, task diversity, and licensing before mining. |
| Comparison setup | experiment | Record the hypothesis, control/treatment configurations, task population, repetitions, and cost ceiling before runs. |
| Real tasks | mine | Read [mining](references/codeprobe-mine.md); isolate instructions from ground truth and scorers. |
| Curator qualification | calibrate | Read [calibration](references/codeprobe-calibrate.md); keep holdout independence and do not weaken CI validity gates to pass. |
| Infrastructure drift | check-infra | Read [preflight](references/codeprobe-check-infra.md); preserve capability snapshots and credential-expiry evidence. |
| Agent execution | run | Read [execution](references/codeprobe-run.md); inspect a dry-run first, use explicit backend and budget, isolate each task. |
| Statistical conclusions | interpret | Read [analysis](references/codeprobe-interpret.md); distinguish failed validity from a valid negative result. |
| Navigation microtasks | probe | Generate exact-answer tasks only for supported languages; verify ground truth and do not equate navigation scores with engineering quality. |
| Session feedback | ratings | Record, summarize, or export only user-supplied ratings; subjective ratings complement behavioral results. |

## Execution contract

Reference commands describe the audited CLI surface; installed help and schemas take precedence. Run readiness diagnostics explicitly when needed: Markdown command snippets never execute themselves. A missing provider does not block offline interpretation of already-produced results.

Preserve command, exit code, stdout/stderr, configuration, task IDs, revisions, seeds, timing, costs, and artifact paths. Parse event records separately from terminal envelopes; do not infer success from the last progress event. Follow the installed `--json` contract and treat nonzero exit or `ok: false` as failure, even if a report file exists.

For a full integration check, use a disposable environment and repository fixture: assess → mine a bounded task set → validate tasks → dry-run → execute → interpret. Exercise the actual CLI and capture failures at each transition. Paid runs and credential setup stay within the requested scope; missing prerequisites are reported rather than mocked into a successful live test. Do not expose hidden tests or oracle diffs to the evaluated agent.
