# Architecture Review Loop

Prior state → judgment → delta → ledger. Architecture review is judgment, so
there is no mechanical scanner; prior state comes from the repository's
authoritative tracker and the last report.

**Provenance is the point.** Every finding is traceable end to end: report line →
bead ID → ADR (if a decision was made) → the commit/PR that resolved it. Every
state change (new, resolved, dropped, superseded) carries a written reason. A
future session must be able to reconstruct _why the project evolved the way it
did_ from the ledger alone.

## Steps

### 1. Load prior state (mechanical)

Use the repository's authoritative task tracker to list open and closed
architecture findings, then read the latest dated report from the repository's
documented review ledger location. If the tracker or ledger location is not
documented, inspect the repository instructions before choosing a location.

Also read `docs/adr/README.md` in the repo if present — settled decisions are
not findings, and a finding that re-litigates an accepted ADR is noise unless
new evidence is cited.

### 2. Run the review (judgment)

Invoke the `repo-architecture-review` skill on the repo. Pass the prior state
into the review context so it labels findings NEW / UNCHANGED / RESOLVED rather
than reporting from scratch.

### 3. Fingerprint & dedup (mechanical)

Fingerprint = `<module-or-path>:<finding-type>` (e.g.
`internal/dispatch:duplicated-concept`). Store it in the bead as a label
(`fp:<fingerprint>`). Then:

- Finding fingerprint matches an **open** bead → UNCHANGED; append a `bd note`
  only if the evidence materially changed.
- Matches a **closed** bead → it regressed or was mis-closed; reopen with a note
  citing the new evidence, don't file a duplicate.
- No match → NEW; candidate for filing.
- Open `arch-review` bead with no matching finding this run → candidate for
  RESOLVED; verify against the code (commit/PR) before proposing closure.

### 4. Write the dated report (ledger)

`<repository-review-ledger>/<repo>-<date>.md`:

1. **Delta summary** — N new / N unchanged / N resolved, one line each with
   bead IDs.
2. **New findings** — evidence, effort, risk, leverage rank (from the review).
3. **Resolved** — what closed each one (commit, PR, or bead ID of the fix).
4. **Decisions needed** — each a yes/no with a recommendation: file this bead,
   close that one, record this as an ADR. No item without a recommendation.

### 5. Apply on approval

Bead mutations follow the decisions-needed gate — propose, then apply what the
user approves:

- NEW → `bd create` with labels `arch-review`, `repo:<repo>`, `fp:<fingerprint>`;
  description carries the evidence and a link to the report.
- RESOLVED → `bd close` with a note naming the resolving commit/PR.
- Accepted structural decision → record via `architecture-decision-records`
  (`docs/adr/`), and note the ADR number on the bead.

In a concurrent worker system, never race unrelated work: create or close only
tracker items tagged `arch-review` that this loop owns.

## Cadence

Run on a cadence appropriate to repository change volume, or after a large
merge. Choose cadence from repository ownership and release practice rather
than assuming a particular scheduler. Periodically run systems-thinking first
when a strategic direction has changed, so the review uses the current meaning
of leverage.
