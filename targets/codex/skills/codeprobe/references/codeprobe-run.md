---
name: codeprobe-run
description: Execute eval tasks against an AI coding agent using the codeprobe CLI. Spawns isolated per-task sessions, scores with automated tests, and emits NDJSON events plus a terminal envelope. Triggers on run eval, run tasks, benchmark agent, evaluate agent, score agent, compare agents. Use this when the agent needs to produce scored results on a mined or scaffolded task suite.
user-invocable: false
---

# codeprobe run (autonomous agent contract)

Run an eval suite against an AI coding backend, scoring each task with the
configured scorer. Emits a dual output surface on non-TTY stdout: NDJSON
per-task events followed by a terminal envelope.

## Environment checks

- Run explicitly when needed: `codeprobe doctor --json`

If doctor reports failures (missing backends, bad credentials, permission
issues), resolve them first. Do not retry `codeprobe run` until doctor
reports `ok: true`.

## Bare invocation

Minimum viable call. `--json` collapses the dual-surface output into a single
envelope — recommended for agents that only want the final verdict:

```bash
codeprobe run <path> --json --agent claude
```

Dry-run to estimate resource requirements without spawning any agent:

```bash
codeprobe run <path> --dry-run --json --agent claude
```

With a cost ceiling and suite filter:

```bash
codeprobe run <path> --json --agent claude --max-cost-usd 5.0 --suite <suite.toml>
```

For airgapped runs, pair with the offline preflight:

```bash
codeprobe run <path> --json --agent claude --offline --offline-expected-run-duration 2h
```

## Output surface (NDJSON + envelope, non-TTY default)

On non-TTY stdout, the default output is a **dual surface** per §7.2 + §5.4:

- Per task, one or more JSON records with `"record_type": "event"` are written
  as newline-delimited JSON (NDJSON).
- The final record has `"record_type": "envelope"` and contains the aggregate
  run summary (per-config score summaries, totals, cost).

Pass `--json` to collapse this into a single terminal envelope (no per-task
events). Pass `--json-lines` to force NDJSON mode even when `--json` would
otherwise be selected from `CODEPROBE_JSON`.

## JSON fields to parse

Terminal envelope shape (emitted with `--json` or as the last NDJSON
record). Top-level keys are exactly the `Envelope` dataclass fields in
`src/codeprobe/cli/envelope.py`:

```json
{
  "record_type": "envelope",
  "ok": true,
  "command": "run",
  "version": "<codeprobe version>",
  "schema_version": "1",
  "exit_code": 0,
  "data": {
    "command_schema_version": "1",
    "experiment": "...",
    "configs": [
      {
        "label": "...",
        "tasks": 10,
        "scored_count": 9,
        "mean_score": 0.72,
        "perfect": 4,
        "cost_usd": 3.21,
        "quota_error_count": 0,
        "infra_failure_count": 1,
        "errored_count": 1
      }
    ],
    "total_tasks": 10,
    "total_cost_usd": 3.21,
    "tenant": "<tenant or null>",
    "tenant_source": "<flag|env or null>"
  },
  "error": null,
  "warnings": [],
  "next_steps": []
}
```

Parse `ok`. On `false`, inspect `error.code`; `error` is a single object
with `code` / `message` / `kind` / `terminal` / `next_try_flag` /
`next_try_value` / `diagnose_cmd` / `message_for_agent` / `detail`, not an
array. On `true`, read `data.configs[]`. `mean_score` and `perfect` cover
the scored population only (`scored_count`); check `quota_error_count`,
`infra_failure_count`, and `errored_count` before treating two configs as
comparable.

Per-task event shape (NDJSON stream):

```json
{
  "record_type": "event",
  "event": "task_done",
  "task_id": "...",
  "score": 1.0,
  "duration_seconds": 12.3,
  "cost_usd": 0.42
}
```

## Error handling

Only the codes below may surface. Cross-reference `src/codeprobe/cli/error_codes.json`.

| Code | Kind | Retryable? | Action |
|---|---|---|---|
| NO_EXPERIMENT | diagnostic | yes (with fix) | Select an experiment with `--config` or run `codeprobe experiment new`. |
| AMBIGUOUS_EXPERIMENT | prescriptive | yes (with fix) | Pass `--config <experiment-id>` explicitly. |
| NO_TASKS | diagnostic | no | The suite has no runnable tasks; adjust suite or mine more. |
| NO_SUITE_MATCH | diagnostic | yes (with fix) | Re-issue with a valid `--suite` path. |
| INVALID_PERMISSION_MODE | prescriptive | yes (with fix) | Adjust config; permission-mode must be one of the accepted modes. |
| UNKNOWN_BACKEND | prescriptive | yes (with fix) | Re-issue with `--agent <valid>` — see doctor output for installed backends. |
| NO_BACKENDS_CONFIGURED | diagnostic | no | No backend installed; install one before retrying. |
| OFFLINE_PREFLIGHT_FAILED | diagnostic | no | Credential TTL too short; refresh creds or drop `--offline`. |
| OFFLINE_NET_ATTEMPT | diagnostic | no | Component attempted network IO while offline; inspect and fix config. |
| CANARY_PROOF_FAILED | diagnostic | no | Canary indicates unreliable env; run `codeprobe doctor`. |
| CANARY_PROOF_REQUIRED | prescriptive | yes (with fix) | Enable canary proof and retry. |
| CANARY_MISMATCH | diagnostic | no | Env drift; do not auto-retry — surface to caller. |
| CANARY_GATE_FAILED | diagnostic | no | Canary gate blocked; inspect run artifacts. |
| CAPABILITY_DRIFT | diagnostic | no | Capability snapshot mismatch; run `codeprobe check-infra drift`. |
| TRACE_OVERFLOW_FIRED | prescriptive | yes (with fix) | Re-run with `--trace-overflow truncate` or raise the budget. |
| TRACE_BUDGET_EXCEEDED | prescriptive | yes (with fix) | Re-run with a higher `--trace-overflow` mode or disable trace. |
| BUDGET_EXCEEDED | diagnostic | **TERMINAL — do not retry** | Cost/time budget intentionally terminal. A human must explicitly raise the budget. |
| INTERRUPTED | diagnostic | **TERMINAL — do not retry** | SIGINT/SIGTERM halted the run. Partial results preserved under `.codeprobe/runs/<run-id>`. |
| LLM_UNAVAILABLE | diagnostic | yes (bounded) | Transient provider outage; one retry permitted. |

## Retry policy

- Maximum retry depth per error chain: **2**. After two consecutive errors
  sharing the same code, stop and surface the envelope to the caller.
- Terminal errors (BUDGET_EXCEEDED, INTERRUPTED) are **never** retried —
  treat `terminal: true` in the envelope as a hard stop signal.
- Do not mutate `--max-cost-usd` or `--timeout` on retry; budget changes are
  human-authorized only.
- Between retries, re-inspect the pre-loaded doctor envelope. If doctor now
  reports failing checks, stop retrying and escalate.
