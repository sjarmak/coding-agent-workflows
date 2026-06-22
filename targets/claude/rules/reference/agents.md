# Agent Orchestration

Specialized sub-agents handle focused work; a primary agent coordinates them.
The roles below ship in this repo. How they're invoked depends on the host:
Claude Code dispatches them as subagents, Codex via `agents/*.toml`, others by
following the role description in this file. The orchestration doctrine is the
same everywhere.

## Roles

| Role | Scope | Purpose | When to use |
|------|-------|---------|-------------|
| code-reviewer | universal | Code quality & maintainability review | After writing/modifying code |
| security-reviewer | universal | Vulnerability detection | Auth, input handling, secrets, endpoints |
| architect | universal | System design & scalability | Architectural decisions |
| code-simplifier | universal | Reduce complexity without changing behavior | After implementation, before review |
| planner | universal | Implementation planning | Complex features, refactoring |
| tdd-guide | universal | Test-driven development | New features, bug fixes |
| refactor-cleaner | host-specific | Dead-code cleanup | Code maintenance |
| go / typescript / python / rust -reviewer | host-specific | Language-idiomatic review | Per-language projects |
| build-error-resolver, go / rust -build-resolver | host-specific | Fix build/compile errors | When the build fails |

"Host-specific" roles lean on tooling that doesn't translate cleanly across
agents; they ship for Claude Code and degrade to inline review elsewhere.

## Immediate Agent Usage

Reach for a specialized role without being asked:

1. Complex feature request → **planner**
2. Code just written/modified → **code-reviewer**
3. Bug fix or new feature → **tdd-guide**
4. Architectural decision → **architect**

## Parallel by Default

Run independent agents concurrently, not in sequence:

```
GOOD: one dispatch, three agents in parallel:
  1. security analysis of the auth module
  2. review of the cache layer
  3. type/contract check of the shared utilities

BAD: agent 1, then agent 2, then agent 3, for work that has no dependency between them.
```

When the host supports a single batched dispatch (e.g. multiple subagent calls
in one turn), use it. See `agent-collaboration.md` for the full parallel-by-default rule.

## Multi-Perspective Analysis

For high-stakes or ambiguous problems, split into independent reviewer roles so
blind spots in one are caught by another:

- factual / correctness reviewer
- senior-engineer (design & maintainability) reviewer
- security reviewer
- consistency reviewer
- redundancy / dead-code reviewer

Where a second model is available (e.g. routing one reviewer to a different
provider), use it; uncorrelated reviewers catch more than duplicates of the same model.
