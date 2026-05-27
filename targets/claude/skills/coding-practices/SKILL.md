---
name: coding-practices
summary: Discovery index for this project's coding-practice rules; load it to find the right rule, then read that rule file on demand.
description: Index of this project's coding-practice rules — architecture, coding style, testing, security, git workflow, task management, context layering, anti-slop, performance, and language-specific rules. The rules ship as files under .claude/rules/ and are NOT auto-loaded into context; invoke this skill when you need the project's standards for a task, then open the specific rule file it points to. Keeps the standards discoverable without loading all of them by default.
origin: agentic-coding-practices
scope: claude
---

# Coding Practices Index

This project's coding standards live as individual rule files under
`.claude/rules/`. They are **not** loaded into context automatically — that keeps
the context window lean and nothing active that you didn't ask for. Read the one
rule relevant to your current task, when you need it. This skill is the catalog of
what's available and where to find it.

## How to use

1. Match your task to a rule in the catalog below — e.g. touching a task tracker →
   `task-management`; extending existing code → `anti-slop`; adding an endpoint or a
   migration → `security` plus the language rule.
2. Read that file with your file tool. Read only the rule you need.
3. Apply it, and re-read on demand. Don't pull the whole rulebook into context.

## Rule catalog

### Common (all languages)

- `.claude/rules/common/agent-collaboration.md` — Agent Collaboration
- `.claude/rules/common/agents.md` — Agent Orchestration
- `.claude/rules/common/anti-slop.md` — Anti-Slop & Code Erosion
- `.claude/rules/common/architecture.md` — Architecture Principles
- `.claude/rules/common/augmented-coding-patterns.md` — Augmented Coding Patterns
- `.claude/rules/common/coding-style.md` — Coding Style
- `.claude/rules/common/context-layering.md` — The four context layers an agent reads, and the one-fact-one-layer rule that keeps AGENTS.md thin and free of conflict with memory.
- `.claude/rules/common/development-workflow.md` — Development Workflow
- `.claude/rules/common/git-workflow.md` — Git Workflow
- `.claude/rules/common/hooks.md` — Hooks System
- `.claude/rules/common/patterns.md` — Common Patterns
- `.claude/rules/common/performance.md` — Performance Optimization
- `.claude/rules/common/security.md` — Security Guidelines
- `.claude/rules/common/skill-management.md` — Discover, vet, and expose agent skills on demand with skillager, so the right skills are available per task without loading every skill into every chat.
- `.claude/rules/common/task-management.md` — Track multi-step agent work in a durable, dependency-aware task store; prefer the lightest non-invasive backend (SQLite + JSONL) and only add heavier sync when you actually need it.
- `.claude/rules/common/testing.md` — Testing Requirements

### go

- `.claude/rules/go/coding-style.md` — Go Coding Style
- `.claude/rules/go/hooks.md` — Go Hooks
- `.claude/rules/go/patterns.md` — Go Patterns
- `.claude/rules/go/security.md` — Go Security
- `.claude/rules/go/testing.md` — Go Testing

### python

- `.claude/rules/python/coding-style.md` — Python Coding Style
- `.claude/rules/python/hooks.md` — Python Hooks
- `.claude/rules/python/patterns.md` — Python Patterns
- `.claude/rules/python/security.md` — Python Security
- `.claude/rules/python/testing.md` — Python Testing

### typescript

- `.claude/rules/typescript/coding-style.md` — TypeScript/JavaScript Coding Style
- `.claude/rules/typescript/hooks.md` — TypeScript/JavaScript Hooks
- `.claude/rules/typescript/patterns.md` — TypeScript/JavaScript Patterns
- `.claude/rules/typescript/security.md` — TypeScript/JavaScript Security
- `.claude/rules/typescript/testing.md` — TypeScript/JavaScript Testing

### rust

- `.claude/rules/rust/coding-style.md` — Rust Coding Style
- `.claude/rules/rust/hooks.md` — Rust Hooks
- `.claude/rules/rust/patterns.md` — Rust Patterns
- `.claude/rules/rust/security.md` — Rust Security
- `.claude/rules/rust/testing.md` — Rust Testing

## Notes

- Paths are relative to the installed `.claude/` directory (`~/.claude/` for a
  user-level install).
- AGENTS.md-based agents (Codex, Amp, Aider, …) already have these rules inlined in
  `AGENTS.md`; this index is for hosts that load rules on demand rather than reading
  one big file.
