# Property-Based Testing

An example test pins the inputs the author thought of. A property test states
what must hold for every input, lets the library generate inputs, and shrinks
a failure to the smallest input that still breaks it. All Hegel libraries and
Hypothesis share the same core model: internal shrinking on the choice
sequence, health checks, and a database of failing examples that replays
first on the next run.

## When it is required

Pure logic gets a property test in the RED step, next to the example tests,
not after. Missing one is a MEDIUM, non-blocking review finding. Shapes:

- parsers, encoders, decoders, serializers
- arithmetic, units, money, time, geometry
- ordering, dedup, merge, diff, set operations
- state machines, reducers, schedulers
- any function with an inverse or a reference implementation

I/O glue, controllers and wiring do not need one. A property test never
replaces the explicit boundary cases from `common/testing.md`; it adds the
inputs nobody listed.

## Property catalog

| Property | Statement | Typical target |
| --- | --- | --- |
| Round-trip | `decode(encode(x)) == x` | codecs, serializers, parsers with printers |
| Idempotence | `f(f(x)) == f(x)` | normalizers, formatters, dedup |
| Invariant | a fact about the output holds for every input | sort output is ordered and same length |
| Commutativity, associativity | argument order or grouping does not change the result | merge, union, money arithmetic |
| Monotonicity | larger input never gives smaller output | pricing, scoring, time arithmetic |
| Differential oracle | `fast(x) == simple(x)` | optimized code against a naive version |
| Metamorphic | a known change to the input gives a known change to the output | search: adding a matching doc grows results |
| No crash | every generated input returns a value or a typed error | parsers on arbitrary bytes |
| State machine | every rule sequence keeps the model and the real system in agreement | caches, connection pools, editors |

State the property in the test name. `bad_sort_preserves_length` says what
failed; `test_sort_2` does not.

## Tools and pins

Hegel is in beta and allows breaking changes on minor versions. Pin the exact
version. New tests only: a suite already on proptest, rapid, fast-check or
jqwik stays on it.

| Language | Package | Installed reference snapshot, 2026-09-26 | Prior pilot |
| --- | --- | --- | --- |
| Rust | crate `hegeltest`, imported as `hegel` | `hegeltest = "=0.47.4"` (dev-dependency), rust 1.86+ | yes |
| TypeScript | `@hegeldev/hegel` | `"@hegeldev/hegel": "0.4.7"` (edit package.json; `npm install` writes a caret), Node 20.11+ | yes |
| Go | `github.com/hegeldev/hegel-go` | `v0.9.9` | module path only |
| C++ | `github.com/hegeldev/hegel-cpp` | pin the tag you build | no |
| Java | `github.com/hegeldev/hegel-java` | pin the release | no |
| OCaml | `github.com/hegeldev/hegel-ocaml` | pin the release | no |
| Python | `hypothesis` | current release, exact pin per project policy | mature, no pilot needed |

These pins record the installed reference reviewed for this bundle; they are
not a claim about the latest release. Before adopting a pin, verify its API and
runtime requirements against the package registry and primary documentation.

The crate named `hegel` on crates.io and the npm package named `hegel` are
unrelated projects. Go byte and string inputs at parser boundaries keep
native `go test -fuzz`; Hegel covers structured properties.

## Writing one

Rust:

```rust
use hegel::generators as gs;
use hegel::TestCase;

#[hegel::test]
fn rle_round_trip(tc: TestCase) {
    let input = tc.draw(gs::vecs(gs::integers::<u8>()));
    assert_eq!(rle_decode(&rle_encode(&input)), input);
}
```

TypeScript with vitest:

```ts
import { test } from "vitest";
import * as hegel from "@hegeldev/hegel";
import * as gs from "@hegeldev/hegel/generators";

test("rle round trip", () =>
  hegel.test((tc) => {
    const input = tc.draw(gs.arrays(gs.integers({ minValue: 0, maxValue: 255 })));
    expect(rleDecode(rleEncode(input))).toEqual(input);
  }));
```

Python:

```python
from hypothesis import given, strategies as st

@given(st.lists(st.integers(0, 255)))
def test_rle_round_trip(data):
    assert rle_decode(rle_encode(data)) == data
```

Generators: Rust `hegel::generators` has `integers`, `floats`, `booleans`,
`text`, `binary`, `vecs`, `hashmaps`, `tuples`, `just`, `sampled_from`,
`one_of`, `optional`, `recursive`, `from_regex`, `emails`, `urls`, `uuids`,
`date_strings`, and `#[hegel::composite]` for custom shapes.
TypeScript `@hegeldev/hegel/generators` has the same set in camelCase plus
`record` and `composite`. Reject an input with `tc.assume(cond)`; a filter
that rejects most inputs trips the FilterTooMuch health check, so narrow the
generator instead.

## Budget, seed, replay

Default budget is 100 valid cases. Raise it per test only with a measured
reason, never globally.

| | Rust | TypeScript | Python |
| --- | --- | --- | --- |
| Budget | `#[hegel::test(test_cases = 500)]` or `HEGEL_TEST_CASES=500` | `hegel.test(fn, { testCases: 500 })` | `@settings(max_examples=500)` |
| Seed | `#[hegel::test(seed = Some(42))]` or `HEGEL_SEED=42` | `{ seed: 42 }` | `@seed(42)` |
| Verbose | `verbosity = hegel::Verbosity::Verbose` shows every draw and the shrink chain | `verbosity: hegel.Verbosity.Verbose` shows phases only | `@settings(verbosity=Verbosity.verbose)` |
| Replay a blob | `#[hegel::reproduce_failure("...")]` under `#[hegel::test]`, printed on failure | none printed; replay comes from the database only | `@reproduce_failure(...)` printed on failure |

The Rust attribute takes `seed = Some(42)`; the macro docs show `seed = 42`,
which does not compile. A compiled-in seed wins over `HEGEL_SEED`. The
TypeScript library reads no `HEGEL_*` settings from the environment.

## Example database and CI

Failures are stored under `./.hegel/examples/` (Hypothesis: `.hypothesis/`)
relative to the test runner's working directory. On the next run the Reuse
phase replays the stored example first and fails in well under a second
without generating. Rust keys the entry on the test path; TypeScript keys it
on the test function's source text, so editing the body drops the entry.

Gitignore both directories. Under `CI`, `GITHUB_ACTIONS`, `GITLAB_CI`,
`BUILDKITE`, `CIRCLECI` and the other detected variables, both libraries
disable the database and derandomize: every CI run generates the same
sequence, and a failure shrinks and reports but is not stored.

Because CI never keeps the example, the shrunk failure must live in the
suite: see the next section.

## Shrink, then pin

A property failure produces a minimal example. In the same commit as the fix:

1. Add the shrunk example as an explicit test. Rust: a plain `#[test]` with
   the literal input, or `#[hegel::explicit_test_case]`. TypeScript: a plain
   `test` with the literal. Python: `@example(...)` on the property.
2. Keep the property; it still guards the next shape of the bug.
3. Rerun with the database disabled (`HEGEL_DATABASE=disabled`, or
   `database: Database.disabled`) to confirm the pinned test fails before the
   fix and passes after it, independent of stored state.

This is the "tests ship with fixes" rule applied to generated failures.

## Health checks

FilterTooMuch, TooSlow, TestCasesTooLarge and LargeInitialTestCase fail the
test rather than silently reducing coverage. Fix the generator or the test;
suppress a check only with a reason in the commit message.

## Verifier use

A verification agent writes the properties from the spec before reading the
implementation, runs them with the language's library, and reports each
shrunk counterexample as a reproduced defect with the literal input. A
passing property run at the default budget is evidence, not proof; say so
in the evidence table.

## Rough edges observed in the pilot

- TypeScript prints no reproduction blob and exposes no `phases`,
  `databaseKey`, `printBlob` or stateful step settings, although libhegel has
  them.
- TypeScript Verbose output shows phase markers, not draws.
- `npm install` pins with a caret; correct package.json by hand.
- A malformed `HEGEL_TEST_CASES` panics at settings creation in Rust.
- The first Rust build downloads a prebuilt libhegel and takes about 15s.
