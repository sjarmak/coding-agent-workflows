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

<!-- RULES_CATALOG -->

## Notes

- Paths are relative to the installed `.claude/` directory (`~/.claude/` for a
  user-level install).
- AGENTS.md-based agents (Codex, Amp, Aider, …) get the same on-demand shape from
  the thin `AGENTS.md` index over `AGENTS.full.md`; this skill is the Claude Code
  equivalent for the rules shipped under `.claude/rules/`.
