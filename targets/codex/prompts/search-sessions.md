# /search-sessions — Search past agent sessions

Use an installed `city-search` command or an equivalent local transcript index. Confirm the CLI with `city-search --help`; this skill does not install or rebuild it. Search is a disposable projection,
not current authority: verify historical claims against the canonical work
record or destination before acting. Transcript content stays local.

## Preflight

```bash
city-search health --json
```

Check `updated_at` and `parse_errors` before interpreting absent results.
Missing or stale coverage is not evidence that a conversation never happened.
Report a failed read; do not rebuild shared state or run CASS repair commands.
The configured index owner controls refreshes; preserve original transcript sources.

## Find relevant sessions

Current workspace and recent matches:

```bash
city-search sessions --workspace "$(pwd)" --json --limit 5
```

Direct search:

```bash
city-search search "error message or subsystem" --json --limit 5
```

## Inspect a hit

Search emits one metadata object per line. Use its exact `source`, `line`, and
`digest` for a preserved citation, even if the original file changed or vanished:

```bash
city-search view '<source>' -n <line> --digest '<digest>' --json
city-search expand '<source>' -n <line> --digest '<digest>' -C 3 --json
```

## If expected history is missing

```bash
city-search health --json
```

## Tips

- Start with an exact error string, workspace path, or subsystem name.
- Search accepts exact `--provider`, `--workspace`, and `--session` filters.
- Inspect only the strongest hits; do not export transcript text to analytics.
- Check prior sessions before re-debugging an unfamiliar failure.
