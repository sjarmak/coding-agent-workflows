---
name: code-graph
description: Navigate indexed code, trace callers and impact, and select Codegraph, specialist graph queries, or document graphs with explicit freshness and source evidence.
---

# Code graph navigation

Use for investigations that span files, call chains, or change impact. Read-only by default. Prefer the repository's code-search specialist for substantial investigations; pass the absolute repository path, revision, question, and acceptance criteria. Simple symbol lookups can stay local.

## Choose the graph by capability

- Codegraph: source navigation, callers, callees, and impact. Discover the actual exposed tools; prefer `codegraph_explore` with an explicit `projectPath`. Ask a focused question or name symbols. Older per-operation MCP names are not guaranteed.
- codebase-memory: arbitrary graph queries, cross-service edges, schema exploration, degree analysis, ADR or trace integration. Use the `codebase-memory` skill only if the needed capability is exposed.
- Graphify: persistent relationships across code, documents, papers, and other media. Use `graphify` for those questions when `graphify-out/` exists.
- No index or unavailable tool: use `rg`, file listings, and targeted source reads. Do not initialize an index just to answer a question.

## Evidence contract

1. Establish repository and revision. Respect pending-sync, disabled auto-sync, omitted source, and changed-on-disk warnings.
2. Use returned source as already read. Read disk only to fill a specific gap or resolve stale source. Edges can remain stale even when returned source is current.
3. Distinguish structural edges, inferred relationships, and runtime traces. Same-name symbols do not establish dispatch; missing edges do not prove dead code.
4. Follow the relevant caller and downstream paths, including error and lifecycle paths. Stop when evidence answers the question, not when every neighbor has been expanded.
5. Return source-cited findings, affected contracts, recommended change locations, and coverage limits. Do not repeat a graph query with a full-tree search unless the graph left a specific gap.

## CLI and setup

For a CLI-only environment inspect `codegraph --help` and `codegraph status --help` before choosing installed-version options. Setup is separate from navigation. `codegraph install --print-config codex` previews configuration; `install`, `init`, `index`, and `sync` can change configuration or state. Configure the chosen project and runtime only when setup is requested. Never copy another workstation's credentials or blanket permission list.
