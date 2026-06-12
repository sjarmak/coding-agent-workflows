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

## Troubleshooting Test Failures

1. Use **tdd-guide** agent
2. Check test isolation
3. Verify mocks are correct
4. Fix implementation, not tests (unless tests are wrong)

## Agent Support

- **tdd-guide** - Use PROACTIVELY for new features, enforces write-tests-first
