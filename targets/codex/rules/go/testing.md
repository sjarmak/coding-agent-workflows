---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go Testing

> This file extends [common/testing.md](../common/testing.md) with Go specific content.

## Framework

Use the standard `go test` with **table-driven tests**.

## Race Detection

Always run with the `-race` flag:

```bash
go test -race ./...
```

## Coverage

```bash
go test -cover ./...
```

## Property-Based Testing

Hegel (`github.com/hegeldev/hegel-go`, exact pin) for structured properties:
round-trips, invariants, state machines. Native `go test -fuzz` stays for
byte and string inputs at parsers and boundaries. See the `property-testing`
skill for the API and `common/testing.md` for when a property test is required.

## Reference

Optional extension, when separately installed: `golang-testing` for detailed Go testing patterns and helpers.
