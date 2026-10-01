# Testing Requirements

## Minimum Test Coverage: 80%

Test Types (ALL required):
1. **Unit Tests** - Individual functions, utilities, components
2. **Integration Tests** - API endpoints, database operations
3. **E2E Tests** - Critical user flows (framework chosen per language)

## Test-Driven Development

MANDATORY workflow:
1. Write test first (RED)
2. Run test - it should FAIL
3. Write minimal implementation (GREEN)
4. Run test - it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

## Robust Test Values

A test that asserts a type's default value can pass without the code under
test doing anything: `get(1) == 0` succeeds even if `insert` never stored
the value. Choose inputs and expectations that make silent no-ops fail:

- **Non-default values** — non-zero numbers, non-empty strings/collections,
  not-the-first enum variant, in both inputs and expected outputs
- **Distinct values per argument** — `insert(1, 2)`, never `insert(1, 1)`;
  identical literals hide swapped or reused arguments
- **Cover the boundaries** — empty/null, numerical limits, special cases,
  and every logic path; parameterized/table tests keep this cheap
- **Fuzz parsers and boundary code** — anything that consumes external input

The mechanical backstop is **mutation testing** (Stryker, mutmut, pitest,
cargo-mutants): the mutant that drops the store survives exactly the weak
tests this section bans. Prefer adding a mutation gate over arguing about
individual test values in review.

## Property-Based Testing (required for pure logic)

Example tests pin the cases the author thought of. A property test states
what must hold for every input, lets the library generate inputs, and
shrinks a failure to the smallest input that still breaks it. It is
required, not optional, for pure logic:

- parsers, encoders and decoders, serializers (round-trip: decode(encode(x)) == x)
- arithmetic, units, money, time (invariants, commutativity, monotonicity)
- ordering, dedup, merge, diff (idempotence, length and membership preservation)
- state machines and reducers (every rule sequence keeps the invariant)
- any function with a reference implementation or inverse (differential oracle)

Tools, one per language, chosen for a shared Hypothesis-style core
(internal shrinking, health checks, a failing-example database):

| Language | Library | Note |
| --- | --- | --- |
| Rust, Go, C++, TypeScript, Java, OCaml | **Hegel** (hegel.dev) | one core for six languages; beta, pin the exact version |
| Python | **Hypothesis** | Hegel has no Python library |
| Go byte/string inputs at boundaries | native `go test -fuzz` | keeps the fuzz rule above; Hegel for structured properties |

Rules:

- New tests only. Suites already on proptest, rapid, fast-check or jqwik
  stay on them; do not migrate.
- Default budget of 100 valid cases. Raise it per test only with a
  measured reason.
- The example database (`.hegel/` for Hegel, `.hypothesis/` for
  Hypothesis) is gitignored. CI disables it and derandomizes.
- A shrunk failing example becomes an explicit pinned regression test in
  the same commit as the fix ("tests ship with fixes"), so the regression
  outlives the database.
- Review: pure logic in a diff with no property test is a MEDIUM,
  non-blocking finding.
- Verification: the verifier writes properties from the spec before
  reading the implementation and runs them as property tests.

Install commands, generator APIs, seed replay and per-language examples
live in the `property-testing` skill.

## Troubleshooting Test Failures

1. Use **tdd-guide** agent
2. Check test isolation
3. Verify mocks are correct
4. Fix implementation, not tests (unless tests are wrong)

## Agent Support

- **tdd-guide** - Use PROACTIVELY for new features, enforces write-tests-first
