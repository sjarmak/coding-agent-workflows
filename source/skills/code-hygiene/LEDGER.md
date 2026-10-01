# Hygiene ledger format

One ledger per lane, as markdown. Fan-out audits must use this exact shape so
lanes can be merged and compared across runs.

```markdown
# Hygiene ledger: <repo> / <lane>

- SHA: <full sha>
- Baseline: <test command> -> <passed>/<failed>/<skipped>; failing files: <list or none>
- Scope: <paths in this lane>

| # | Mark | Kind | Location | Finding | Evidence | Unlocks | Validate with |
|---|------|------|----------|---------|----------|---------|---------------|
| 1 | D | test | path/to/test_x.py::test_name | expected value computed by the helper under test | owner proof: tests/test_api.py::test_round_trip covers the same contract; blame: added with the helper in abc1234 | removes `_debug_render` export (no prod caller: `rg -n _debug_render` shows only tests) | `pytest tests/test_api.py -q` |
```

## Marks

- `R` retain: name the contract and the failure it catches.
- `F` fix in place: the contract is real but the check is vacuous or wrong.
- `C` consolidate: name the keeper that absorbs it.
- `D` delete: name the proof that remains, or why no contract exists.
- `?` unresolved: evidence incomplete; say what is missing.
- `BUG` product defect: baseline failure or hidden failure; follow-up only.

## Kinds

`test`, `seam`, `dead`, `placeholder`, `commented-out`, `swallowed-error`,
`stale-ref`, `duplication`, `oversize`, `perf` (from perf-audit).

## Evidence rules

- Every `D` and `C` row cites a search command and its result for callers
  (for example `rg -n '\bname\b' --glob '!**/test*'` returned nothing), plus
  the remaining proof or the reason none is needed.
- History: the commit that introduced it and why, when it matters.
- A row without evidence is `?`, never `D`.
