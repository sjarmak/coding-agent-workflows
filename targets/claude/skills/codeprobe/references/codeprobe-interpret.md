---
name: codeprobe-interpret
description: Analyze eval results from codeprobe runs. Compares configurations statistically, ranks by score and cost-efficiency, and produces actionable recommendations in JSON or pretty text. Triggers on interpret results, analyze eval results, compare configurations, rank agents, score regression, plot regression. Use this when the agent needs to turn a `codeprobe run` output directory into structured analysis.
user-invocable: false
---

# codeprobe interpret (autonomous agent contract)

Turn a results directory (or mined-tasks directory in `--regression` mode) into
a structured analysis envelope. Reporting-only: no side effects on the target
data.

## Environment checks

- Run explicitly when needed: `codeprobe doctor --json`

`doctor` is the single source of truth for environment readiness. Interpret is
read-only, so most doctor failures (missing backends, credentials) do NOT block
this command. Still, if doctor reports a corrupt `.codeprobe` state, resolve it
before interpreting.

## Bare invocation

```bash
codeprobe interpret <results_path> --json
```

Regression mode (per-task score over commit history from `codeprobe mine --refresh`):

```bash
codeprobe interpret <tasks_path> --json --regression --results <results_path>
```

Alternative serialization via `--format`:

```bash
codeprobe interpret <results_path> --format csv    # CSV on stdout (pretty mode)
codeprobe interpret <results_path> --format html   # writes <experiment>_report.html
```

`--format html` writes the HTML report file in every output mode. In envelope
mode (the non-TTY default, or `--json`) the envelope carries the file's
location as `data.html_report_path`; the key is present even on a
`VALIDITY_FAILED` (exit 2) envelope, so the validity-stamped report is still
discoverable. `--format csv` and `--format json` shape stdout in pretty mode
only; the envelope's report payload is always JSON.

## JSON fields to parse

Top-level keys are exactly the `Envelope` dataclass fields in
`src/codeprobe/cli/envelope.py`:

```json
{
  "record_type": "envelope",
  "ok": true,
  "command": "interpret",
  "version": "<codeprobe version>",
  "schema_version": "1",
  "exit_code": 0,
  "data": {
    "command_schema_version": "1",
    "experiment": "...",
    "has_results": true,
    "is_partial": false,
    "completion_ratio": 1.0,
    "validity": { "passed": true },
    "report": { "summaries": [], "rankings": [], "comparisons": [], "tasks": [] }
  },
  "error": null,
  "warnings": [],
  "next_steps": []
}
```

Parse `ok`. On `false`, inspect `error.code`; `error` is a single object
(`code` / `message` / `kind` / `terminal` / `diagnose_cmd` / ... fields),
not an array. On `true`, branch on `data.has_results`: when `false`, `data`
carries only a `message` ("Run 'codeprobe run' first"); when `true`,
`data.report` holds the full JSON report (per-config `summaries`, sorted
`rankings` with `rank == 1` on top, pairwise `comparisons`, per-task rows in
`tasks`). Gate on `data.validity.passed` before quoting any score: a
failing infra-validity gate emits `ok: false` with `exit_code: 2` and the
same `data` block spliced in.

## Error handling

Interpret is reporting-only, so the error surface is small. Only the codes
below may surface. Cross-reference `src/codeprobe/cli/error_codes.json`.

| Code | Kind | Retryable? | Action |
|---|---|---|---|
| NO_TASKS | diagnostic | no | Target results dir has no tasks; check the path. |
| METADATA_MISSING | diagnostic | no | Structural integrity problem; stop and surface. |
| METADATA_INVALID | diagnostic | no | Structural integrity problem; run `codeprobe validate --strict` first. |
| INTERRUPTED | diagnostic | **TERMINAL — do not retry** | Signal halted the run; stop. |

## Retry policy

- Maximum retry depth per error chain: **2**. After two consecutive errors
  sharing the same code, stop and surface the envelope to the caller.
- Terminal errors (INTERRUPTED) are **never** retried.
- Because interpret is read-only, "retry" almost always means the upstream data
  is wrong. Fix the data (re-run `codeprobe run` or `codeprobe validate`)
  rather than loop on the same inputs.
