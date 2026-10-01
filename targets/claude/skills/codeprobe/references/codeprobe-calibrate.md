---
name: codeprobe-calibrate
description: Run the codeprobe calibration gate and emit a curator profile when the R11 validity thresholds are met. Compares two curators over a holdout and enforces minimum tasks, minimum repos, and Pearson correlation before accepting. Triggers on calibrate curator, calibration gate, validity gate, curator profile, r11 gate, pearson correlation. Use this when a new curator version needs to be qualified before it is used in mining or scoring pipelines.
user-invocable: false
---

# codeprobe calibrate (autonomous agent contract)

Gate a curator version against a holdout set. A profile is emitted only when
three validity conditions are met: holdout size, repo diversity, and Pearson
correlation against the reference curator. Any failure exits non-zero without
writing a profile.

## Environment checks

- Run explicitly when needed: `codeprobe doctor --json`

If doctor reports provider-related failures (e.g. `LLM_UNAVAILABLE`), calibrate
will almost certainly fail as well. Resolve doctor first.

## Bare invocation

Minimum viable call. `--curator-version` is required:

```bash
codeprobe calibrate <holdout_path> --json --curator-version <id>
```

Emit the profile to a specific path:

```bash
codeprobe calibrate <holdout_path> --json --curator-version <id> --out <profile.json>
```

Adjust acceptance thresholds for an exploratory run (defaults are the R11
thresholds of 0.6 correlation / 100 tasks / 3 repos — do NOT relax in CI):

```bash
codeprobe calibrate <holdout_path> --json --curator-version <id> --threshold 0.6 --min-tasks 100 --min-repos 3
```

## JSON fields to parse

Top-level keys are exactly the `Envelope` dataclass fields in
`src/codeprobe/cli/envelope.py`:

```json
{
  "record_type": "envelope",
  "ok": true,
  "command": "calibrate",
  "version": "<codeprobe version>",
  "schema_version": "1",
  "exit_code": 0,
  "data": {
    "command_schema_version": "1",
    "profile": {
      "correlation_coefficient": 0.72,
      "calibration_confidence": 0.72,
      "holdout_size": 120,
      "holdout_repos": [ "..." ],
      "produced_at": "<ISO 8601 UTC>",
      "curator_version": "..."
    },
    "out_path": "<abs-path or null>"
  },
  "error": null,
  "warnings": [],
  "next_steps": []
}
```

Parse `ok`. A `true` envelope means the gate PASSED and `data.profile` is the
emitted calibration profile (`calibration_confidence` is the canonical alias
of `correlation_coefficient` for downstream surfaces). A rejected gate never
emits a profile: the command exits 2 with `ok: false` and `error.code` of
`CALIBRATION_REJECTED` (`error` is a single object, never an array).

## Error handling

Only the codes below may surface. Cross-reference `src/codeprobe/cli/error_codes.json`.

| Code | Kind | Retryable? | Action |
|---|---|---|---|
| CALIBRATION_REJECTED | diagnostic | no | Increase holdout size / repo diversity, or accept the curator is not qualified. Do not auto-retry with a lowered threshold — that defeats the gate. |
| METADATA_INVALID | diagnostic | no | Holdout rows are malformed; fix data and re-run. |
| METADATA_MISSING | diagnostic | no | Required metadata columns are missing from the holdout. |
| LLM_UNAVAILABLE | diagnostic | yes (bounded) | Provider outage; one retry permitted. |
| INTERRUPTED | diagnostic | **TERMINAL — do not retry** | Signal halted the run; stop. |

## Retry policy

- Maximum retry depth per error chain: **2**. After two consecutive errors
  sharing the same code, stop and surface the envelope to the caller.
- Terminal errors (INTERRUPTED) are **never** retried.
- CALIBRATION_REJECTED is a validity signal, not a transient error. Treat it
  as terminal-for-this-holdout even though the error code itself is diagnostic
  — retrying the same inputs will produce the same rejection.
- Never mutate `--threshold`, `--min-tasks`, or `--min-repos` on retry.
  Those values encode the R11 validity contract; changing them is a human
  decision that must live in configuration, not in retry logic.
