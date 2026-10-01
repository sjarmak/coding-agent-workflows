---
name: codeprobe-check-infra
description: Diagnose mined-task infrastructure for drift and offline readiness. Compares metadata.json capability snapshots to live capabilities and runs credential-TTL preflight for airgapped runs. Triggers on check infra, capability drift, preamble drift, offline preflight, credential ttl, airgapped run readiness. Use this before running mined tasks that were produced on a different machine or weeks ago.
user-invocable: false
---

# codeprobe check-infra (autonomous agent contract)

Pre-run diagnostics for mined task directories and airgapped environments.
Splits into two primary subcommands: `drift` (capability snapshot vs live) and
`offline` (credential TTL vs expected run duration).

## Environment checks

- Run explicitly when needed: `codeprobe doctor --json`
- Run explicitly when needed: `codeprobe check-infra offline --json`

`doctor` gives the overall readiness state; `check-infra offline --json`
pre-warms the credential-TTL surface so the agent can decide up front whether
an offline run is viable. If the offline envelope reports `ok: false` with
`error.code` of `OFFLINE_PREFLIGHT_FAILED`, do NOT attempt an offline run
before resolving.

## Bare invocation

Capability drift against a specific task directory:

```bash
codeprobe check-infra drift <task_dir> --json
```

Tolerate drift (emit warning instead of failing):

```bash
codeprobe check-infra drift <task_dir> --json --allow-capability-drift
```

Offline credential preflight for an anticipated 2-hour run:

```bash
codeprobe check-infra offline --json --expected-run-duration 2h
```

Restrict the offline check to a single backend:

```bash
codeprobe check-infra offline --json --backend claude
```

## JSON fields to parse

Top-level keys are exactly the `Envelope` dataclass fields in
`src/codeprobe/cli/envelope.py`. Parse `ok`; on `false` inspect `error.code`
(`error` is a single object, never an array).

Drift:

```json
{
  "record_type": "envelope",
  "ok": true,
  "command": "check-infra drift",
  "version": "<codeprobe version>",
  "schema_version": "1",
  "exit_code": 0,
  "data": {
    "command_schema_version": "1",
    "task_dir": "<abs-path>",
    "has_drift": false,
    "snapshot_count": 4,
    "live_count": 4,
    "added": [ "..." ],
    "removed": [ "..." ]
  },
  "error": null,
  "warnings": [],
  "next_steps": []
}
```

Detected drift without `--allow-capability-drift` surfaces as `ok: false`
with `error.code` of `CAPABILITY_DRIFT`, not as a `data` field.

Offline:

```json
{
  "record_type": "envelope",
  "ok": true,
  "command": "check-infra offline",
  "version": "<codeprobe version>",
  "schema_version": "1",
  "exit_code": 0,
  "data": {
    "command_schema_version": "1",
    "expected_run_duration": "2h",
    "backend_filter": [ "claude" ]
  },
  "error": null,
  "warnings": [],
  "next_steps": []
}
```

A TTL shortfall surfaces as `ok: false` with `error.code` of
`OFFLINE_PREFLIGHT_FAILED`; the per-backend TTL detail rides on
`error.detail`.

## Error handling

Only the codes below may surface. Cross-reference `src/codeprobe/cli/error_codes.json`.

| Code | Kind | Retryable? | Action |
|---|---|---|---|
| CAPABILITY_DRIFT | diagnostic | no | Run `codeprobe doctor --capabilities`; re-mine or re-baseline if intentional. |
| METADATA_MISSING | diagnostic | no | Target task_dir has no metadata.json; stop. |
| OFFLINE_PREFLIGHT_FAILED | diagnostic | no | At least one backend's credential TTL is too short; rotate/refresh credentials. |
| OFFLINE_NET_ATTEMPT | diagnostic | no | Component attempted network IO while offline; fix config. |
| STALE_USER_HOME_SKILL | diagnostic | yes (with fix) | Re-install the referenced skill bundle per remediation. |
| DOCTOR_CHECKS_FAILED | diagnostic | no | Cross-surfaced from doctor; resolve those checks first. |
| INTERRUPTED | diagnostic | **TERMINAL — do not retry** | Signal halted the command; stop. |

## Retry policy

- Maximum retry depth per error chain: **2**. After two consecutive errors
  sharing the same code, stop and surface the envelope to the caller.
- Terminal errors (INTERRUPTED) are **never** retried.
- Drift errors almost always need a human decision (re-mine vs accept-drift).
  Do not auto-retry with `--allow-capability-drift` unless the caller asked
  for it — that flag changes semantics, not transient state.
