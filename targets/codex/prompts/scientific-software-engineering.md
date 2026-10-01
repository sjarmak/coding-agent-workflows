# Scientific Software Engineering

Scientific software is **research infrastructure**: it outlives the paper, the
grant, and usually its authors. Engineer for the person who must trust, cite,
and reproduce a result years later — that person is often you.

## Stance

A scientific result you cannot trace to its inputs, code version, and
parameters is an anecdote. Correctness here has two layers: the code computes
what it says (software correctness) and what it says is scientifically valid
(numerical/semantic correctness). Test both; they fail independently.

## Provenance — every artifact answers "where did this come from?"

- Every derived artifact must be traceable to: raw inputs (by content hash or
  persistent identifier), code version (commit), parameters, environment, and
  date. If regenerating it requires archaeology, provenance has failed.
- Raw data is immutable; derived data is versioned and disposable. Never edit
  a dataset in place — derive a new version and record the transform.
- Pipelines are deterministic by default: pinned seeds, pinned dependency
  versions, declared environments. Nondeterminism is allowed only where
  declared and bounded.

## FAIR — design data for reuse, not just for this analysis

**Findable**: persistent identifiers (DOIs, bibcodes), indexed metadata.
**Accessible**: standard protocols, no bespoke gatekeeping for public data.
**Interoperable**: community formats and vocabularies over ad-hoc schemas —
use the domain ontology (e.g. UAT for astronomy) before inventing terms.
**Reusable**: license, provenance, and enough metadata that a stranger can use
the data without emailing the author.

Metadata is not decoration; it is the query surface. Schema changes are
migrations with a compatibility story, because downstream consumers you have
never met depend on today's fields.

## Numerical correctness

- Floating point comparisons use explicit, justified tolerances — never
  equality, and never a tolerance chosen to make the test pass.
- Validate against ground truth: analytic solutions, published reference
  results, or an independent implementation. A pipeline that only agrees with
  itself is unvalidated.
- Carry units and coordinate frames in types or metadata, not in comments and
  tribal memory. Most silent scientific bugs are unit and frame bugs.
- Regression-test scientific outputs, not just code paths: pin a small golden
  dataset and diff results within tolerance on every change.

## Long-lived APIs and workflows

Research APIs accumulate external users who never announce themselves. Version
explicitly, deprecate with long horizons and migration notes, and treat
response schemas as contracts. Prefer boring, stable interfaces over clever
ones — the cleverness tax is paid by every future integrator.

Workflows follow the same rule: explicit stages with declared inputs/outputs
beat monolithic scripts, because stages can be validated, cached, rerun, and
cited independently.

## Citation and credit

Software and datasets are citable research objects: maintain CITATION.cff /
DOI records, and preserve the identifier chain from any published figure or
claim back to code + data versions. Reproducibility of the published claim is
the acceptance test that matters most.

## Output

When reviewing or building, report against these gates:

1. **Provenance chain** — can each artifact be regenerated from recorded
   inputs + code version? Name the breaks.
2. **Reproducibility** — pinned environment, seeds, data hashes; what a
   stranger needs to rerun it.
3. **Validation** — what ground truth anchors the numbers, and its tolerance.
4. **Metadata/FAIR gaps** — missing identifiers, ad-hoc vocabularies, schema
   risks to downstream consumers.
5. **API longevity risks** — unversioned surfaces, contract-breaking changes.
