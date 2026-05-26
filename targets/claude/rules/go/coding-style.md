---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---

# Go Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Go specific content.

## Formatting

- **gofmt** and **goimports** are mandatory — no style debates

## Design Principles

- Accept interfaces, return structs
- Keep interfaces small (1-3 methods)

## Error Handling

Always wrap errors with context:

```go
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}
```

## Project Layout

> See [common/architecture.md §Arrange Project Idiomatically](../common/architecture.md).

- **Scaffold**: `go mod init <module-path>` at repo root. Match the module path to the repo URL.
- **Layout**: keep it flat. `cmd/<binary>/main.go` for entry points, `internal/<package>/` for code you don't want importers touching, `pkg/<package>/` only if you genuinely intend to expose it. No Java-style deep nesting.
- **Required toolchain**: `gofmt`/`goimports` (already above), **`go vet`**, **`staticcheck`**, **`golangci-lint`** with at least `errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused`, `gosimple`, `errorlint`.
- **.gitignore essentials**: `bin/`, `vendor/` (unless vendoring intentionally), `*.test`, `*.out`, `coverage.out`, `coverage.html`, `.env`

## Reference

See skill: `golang-patterns` for comprehensive Go idioms and patterns.
