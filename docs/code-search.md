# Code search specialist

`code-search` handles substantial repository investigations automatically: flows
across files, locating an implementation, and assessing change impact. Simple
symbol lookups stay in the parent. It investigates thoroughly, returns a concise
source-cited handoff, and suggests edit points and relevant tests. The parent
makes changes.

The design adapts the bounded Code Finder used by Sourcegraph Deep Search:
explicit repository scope and success criteria, focused retrieval, source
citations, and stopping when the question is answered. It uses the locally
available Codegraph index first, then fills concrete gaps with file reads,
scoped code search, git history, or primary documentation.

## Maintain and install

- Edit `source/agents/code-search.md` for the shared instructions and Claude
  settings. Claude uses Sonnet with high effort and a 45-turn ceiling; the body
  budgets 18 turns for a focused question and 40 for a survey, and reserves the
  last fifth of either for writing the handoff.
- Optional `source/agents/<name>.codex.toml` files hold native Codex settings.
  The renderer appends them verbatim after the shared role body. Do not repeat
  `name`, `description`, or `developer_instructions`. Codex parses their syntax.
  This role uses `gpt-6-sol`, high reasoning, and a read-only sandbox default.
- Run `npm run build`, `npm test`, `npm run sanitize`, `npm run validate`, and
  `npm run check`. Generated files belong in the same change as their sources.
- Copy `targets/claude/agents/code-search.md` into the personal Claude `agents`
  directory, and `targets/codex/agents/code-search.toml` into each active Codex
  home's `agents` directory. Existing installations can copy just this role.
- Ensure the host's always-loaded instructions include the delegation rule from
  `source/rules/common/code-graph.md`. Claude also needs access to the Codegraph
  MCP server's `codegraph_explore` tool. New sessions avoid discovery caches.

## Delegate

Give the specialist the absolute repository root, question, success criteria,
revision/worktree if relevant, and findings already established. For example:

> Trace how a request reaches the query executor. Identify the permission check,
> failure path, callers affected by changing the request type, and existing
> tests to extend. Return source citations and unresolved gaps. Do not edit.

Use the named `code-search` subagent in hosts that expose native role selection.
Claude also supports `claude --agent code-search`. If a Codex integration exposes
only generic subagents, pass the installed role's `developer_instructions` as
the delegation prompt; this does not apply its native model or sandbox settings.

## Boundaries and acceptance

Read-only is both a role contract and a best-effort host setting. Claude omits
editing tools but Bash remains capable of writes. Codex may reapply the parent's
live sandbox and permission policy to a child. Neither configuration is a
security boundary against arbitrary commands or external MCP side effects.

Acceptance checks cover native discovery, a real indexed investigation, a
missing-index fallback, and stale-source handling. Inspect execution traces for
the selected role, graph usage, source citations, bounded stopping, and absence
of repository writes. Tests read during an investigation must not be reported as
passing unless executed. A missing index must not cause automatic indexing.

Native configuration references:
[Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
and [Claude subagents](https://code.claude.com/docs/en/sub-agents).
