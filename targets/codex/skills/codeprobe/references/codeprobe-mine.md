---
name: codeprobe-mine
description: Mine eval tasks from a repository's history using the codeprobe CLI. Extracts real code-change tasks from merged PRs/MRs with ground truth, test scripts, and scoring rubrics. Triggers on mine tasks, extract tasks, propose tasks, benchmark my repo, eval my repo, discover tasks. Use this when the agent needs to produce a reusable task suite from a codebase.
user-invocable: false
---

# codeprobe mine (autonomous agent contract)

Mine real eval tasks from a repository's merge history. The resulting task
directories contain instruction.md, test.sh, metadata.json, and the ground-truth
diff required for automated scoring.

## Environment checks

Run the following diagnostics explicitly when applicable and inspect their results:

- Run explicitly when needed: `codeprobe doctor --json`
- Run explicitly when needed: `codeprobe check-infra offline --json`

If doctor's envelope reports `ok: false`, resolve the flagged checks before
invoking `codeprobe mine`. If check-infra offline reports a TTL shorter than the
expected mining duration, either extend credentials or omit `--offline` at call
time.

## Bare invocation

Minimum viable call. Always pair `--json` with `--no-interactive` for agents —
the default CLI is TTY-interactive:

```bash
codeprobe mine <repo_path> --json --no-interactive --goal general --count 5
```

For MCP/tool-benefit task mining:

```bash
codeprobe mine <repo_path> --json --no-interactive --goal mcp --count 10
```

When the repo has no merged PRs (squash-only history) the default narrative
source is undetectable and mining fails loudly. In that case, pass a commit-
based narrative source explicitly:

```bash
codeprobe mine <repo_path> --json --no-interactive --narrative-source commits
```

## Supported language matrix

`codeprobe mine` supports Python, Go, and JavaScript/TypeScript repositories
only — test-command generation exists solely for this matrix. Comprehension
mining (`--goal navigation` / `--task-type architecture_comprehension`) is
Python-only (import-graph static analysis). Any other primary language fails
fast with UNSUPPORTED_LANGUAGE before PR scanning starts. Do not retry the
same repo; pick a supported repository, or for comprehension on a Go/JS-TS
repo re-run with `--goal quality`.

## JSON fields to parse

`--json` emits a single terminal envelope on stdout. Top-level keys are
exactly the `Envelope` dataclass fields in `src/codeprobe/cli/envelope.py`:

```json
{
  "record_type": "envelope",
  "ok": true,
  "command": "mine",
  "version": "<codeprobe version>",
  "schema_version": "1",
  "exit_code": 0,
  "data": {
    "command_schema_version": "1",
    "tasks_dir": "<abs-path or null>",
    "task_count": 5,
    "goal": "<goal or null>",
    "tenant": "<tenant or null>",
    "tenant_source": "<flag|env or null>",
    "comprehension_consensus": null,
    "experiment_created": true,
    "experiment_dir": "<abs-path or null>",
    "llm_spend": { "calls": 0, "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0, "cost_unknown_calls": 0, "cost_source": "calculated" },
    "rejections": { "quality": 0, "min_files": 0, "subsystem": 0, "extraction": 0, "total": 0 }
  },
  "error": null,
  "warnings": [ { "code": "<CODE>", "message": "...", "detail": {} } ],
  "next_steps": [ { "summary": "...", "command": "..." } ]
}
```

On failure `ok` is `false`, `exit_code` is non-zero, and `error` is a single
object (never an array):

```json
{
  "record_type": "envelope",
  "ok": false,
  "command": "mine",
  "version": "<codeprobe version>",
  "schema_version": "1",
  "exit_code": 2,
  "data": null,
  "error": {
    "code": "<CODE>",
    "message": "...",
    "kind": "prescriptive",
    "terminal": false,
    "next_try_flag": "--narrative-source",
    "next_try_value": "commits",
    "diagnose_cmd": null,
    "message_for_agent": null,
    "detail": {}
  },
  "warnings": [],
  "next_steps": []
}
```

Parse `ok`. On `false`, inspect `error.code`; when `error.kind` is
`"prescriptive"`, retry with `error.next_try_flag` set to
`error.next_try_value`; when `"diagnostic"`, run `error.diagnose_cmd` (if
set) and stop unless the table below says otherwise. On `true`, read
`data.tasks_dir` and `data.task_count`.

Zero-yield mining still exits 0 with `ok: true` (emptiness is data, not an
error), so branch on `data.task_count`, never on `ok` alone. When mining
under-delivers (`task_count` of 0, or fewer tasks than requested with
candidates filtered), `data.rejections` carries per-filter rejection counts,
`warnings` gains a `MINE_SHORTFALL` entry, and `next_steps[0].command` is an
executable remediation command derived from the dominant rejection filter.
Execute it instead of proceeding to `codeprobe run` against an empty suite.
`data.rejections` is absent on a full-yield mine.

## Error handling

Only the codes below may surface from this command. Look them up in
`src/codeprobe/cli/error_codes.json` for the authoritative description and
remediation pattern.

| Code | Kind | Retryable? | Action |
|---|---|---|---|
| NARRATIVE_SOURCE_UNDETECTABLE | prescriptive | yes (with fix) | Re-run with explicit `--narrative-source commits` or `--narrative-source commits+rfcs`. |
| GOAL_UNDETECTABLE | diagnostic | yes (with fix) | Pass an explicit `--goal`; re-run. |
| INVALID_GIT_URL | prescriptive | yes (with fix) | Re-issue with a well-formed `<repo_path>` (absolute local dir or valid git URL). |
| CLONE_FAILED | diagnostic | yes (bounded) | Inspect credentials/network; retry once more. Stop after second failure. |
| OFFLINE_PREFLIGHT_FAILED | diagnostic | no | Resolve preflight output from pre-loaded `check-infra offline` envelope; do not retry blindly. |
| METADATA_MISSING | diagnostic | no | Structural problem in the target repo or cached fixture; stop and surface to caller. |
| LLM_UNAVAILABLE | diagnostic | yes (bounded) | Treat as transient provider outage; retry once. |
| UNSUPPORTED_LANGUAGE | diagnostic | no | Repo's primary language is outside the Python/Go/JavaScript-TypeScript matrix (or comprehension mining on a non-Python repo). Pick a supported repository; for comprehension use a Python repo or `--goal quality`. |
| INTERRUPTED | diagnostic | **TERMINAL — do not retry** | User/signal halted the run. Partial output is preserved on disk; `error.diagnose_cmd` carries the exact `codeprobe mine <path> --resume` command for a later continuation. Exit. |

## Retry policy

- Maximum retry depth per error chain: **2**. After two consecutive errors
  sharing the same code, stop and surface the envelope to the caller.
- Terminal errors (INTERRUPTED, BUDGET_EXCEEDED) are **never** retried.
- Do not auto-change flags on retry unless `error.next_try_flag` /
  `error.next_try_value` explicitly tell you which flag to set (e.g.
  NARRATIVE_SOURCE_UNDETECTABLE → `--narrative-source commits`). Arbitrary
  flag mutation is out of scope.
- Between retries, re-read the pre-loaded doctor envelope; if doctor now
  reports failing checks, stop.
