# Architecture Principles

> Adapted from the [Dartantic Architecture Best Practices](https://github.com/csells/dartantic/wiki/Architecture-Best-Practices). These are language-agnostic principles that apply to every project. For TDD specifics see [testing.md](./testing.md); for error handling and file organization basics see [coding-style.md](./coding-style.md).

## Design & Structure

### Single Responsibility Principle (SRP)

Every class, module, function, and file should have exactly one reason to change.

- If a change to feature A forces edits to a module named after feature B, SRP is broken.
- Split on _reasons to change_, not on line count alone.

### Separation of Concerns

Each module handles one distinct responsibility. Business logic, IO, presentation, and persistence live in different places.

### Don't Repeat Yourself (DRY)

Eliminate duplicated logic by extracting shared utilities and modules — but only after the duplication is real (three instances is the usual rule). Two similar-looking blocks that change for different reasons are not duplication; extracting them creates a false coupling.

### Clear Abstractions & Contracts

Expose intent through small, stable interfaces and hide implementation details. A caller should be able to use a module without reading its source.

### Low Coupling, High Cohesion

- **Cohesion**: things that change together live together.
- **Coupling**: modules know as little about each other as possible — ideally just a typed interface.

### Layered Architecture

Organize code into clear tiers where each layer depends only on the one(s) below it. Dependencies point one direction; no reverse arrows.

### Scalability & Statelessness

Prefer stateless services and horizontally-scalable components. Per-request state should live in the request, not in module-level variables.

## Code Quality

### KISS — Keep It Simple

Prefer the simplest solution that actually solves the problem. Complexity is a cost, not a feature.

### YAGNI — You Aren't Gonna Need It

Don't build for speculative future requirements. Add abstraction when the second or third use case arrives, not the first.

### Observability & Testability

Build in logging, metrics, and tracing from the start. If a component is hard to unit or integration test, that is a design smell — redesign before adding more test scaffolding.

### Write for Maintainability

Code should be clear and readable for future developers who do not have the current context in their heads.

## Error Handling & Data Integrity

### Don't Swallow Errors

Don't silently catch exceptions, fill in missing values with defaults to hide failures, or add timeouts whose only purpose is to mask bugs. All of those hide root causes.

- **Timeouts are allowed at trust boundaries** (external HTTP calls, DB queries, subprocess execution) for blast-radius control, but they must propagate a real error on firing — never swallow the result.
- Default values are allowed for _genuinely optional_ data, not as a way to ignore failed lookups.

See also: [coding-style.md §Error Handling](./coding-style.md).

### Eliminate Race Conditions

Prevent conditions that could drop, duplicate, or corrupt data. When you see shared mutable state across async boundaries, assume there is a race until you prove otherwise.

### Prefer Async Notifications Over Polling

When something needs to react to a change, use events, subscriptions, or webhooks. Polling is a last resort — it wastes work and introduces latency windows.

## Code Hygiene

### No Placeholder Code

This is production code, not a toy. No stub functions that `throw "not implemented"`, no fake return values waiting to be filled in, no TODO comments standing in for work that was in scope. If something is deliberately deferred, it gets a ticket and an explicit boundary — not a silent stub.

### No Comments for Removed Functionality

The source is not the place to keep history of what changed; that is what git is for. Delete removed code outright. No `// removed in v2` blocks, no commented-out alternatives "just in case."

### Prefer Non-Nullable Variables

Use nullability sparingly. A nullable type is a contract that every caller must handle the null case — that is expensive. Default to non-nullable and introduce null only where the absence of a value is semantically meaningful.

### Arrange Project Idiomatically

Structure projects the way the language and framework community expects: standard folder layout, recommended lints and static analysis enabled, appropriate `.gitignore`. A new contributor should recognize the shape of the project on sight. See the language-specific rules in `rules/<language>/` for details.

## Strategic Review

### First-Principles Check

Periodically assess your current architecture against the one you would design if you started over from scratch today. The delta is your accumulated drift — some of it is worth paying down, some is not, but you cannot make that call without seeing the delta.

Good triggers for a first-principles pass:

- Before a major feature that touches the core domain.
- When onboarding becomes consistently hard.
- When the same class of bug keeps recurring in different places.
