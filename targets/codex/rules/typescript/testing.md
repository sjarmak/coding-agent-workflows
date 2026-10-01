---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Testing

> This file extends [common/testing.md](../common/testing.md) with TypeScript/JavaScript specific content.

## Property-Based Testing

Hegel (`@hegeldev/hegel` on npm, exact pin) for pure logic: parsers, codecs,
reducers, arithmetic. Existing fast-check suites stay. See the
`property-testing` skill for the API and `common/testing.md` for when a
property test is required.

## E2E Testing

Use **Playwright** as the E2E testing framework for critical user flows.

## Agent Support

- **e2e-runner** - Playwright E2E testing specialist
