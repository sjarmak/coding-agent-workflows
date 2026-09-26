# Code Knowledge Graphs

When a repo has a code knowledge-graph tool available (a symbol/edge index exposed
as MCP tools or a CLI), prefer it over raw grep/glob for **structural** questions —
callers, callees, impact / blast radius, symbol lookup, area exploration. It returns
precise edges in a fraction of the tokens a text scan costs. Grep/glob stays the
right tool for non-code: config, docs, comments, string literals.

## Routing when more than one graph tool is available

Two overlapping graph tools are easy to conflate; give each a lane and don't use
both for the same question.

- **Default to the fixed-verb navigator** for everyday "who calls X / what does X
  call / what's the blast radius / show me this area." The tool with dedicated
  caller/callee/impact/explore verbs is the cheapest path and the one to reach for
  first.
- **Reserve the query-language graph** (arbitrary Cypher/SQL over the graph,
  cross-service or HTTP-call edges, degree analytics like dead-code and fan-in/out,
  architecture rollups, decision/trace ingestion) for what the fixed verbs cannot
  express. It is the specialist, not the default.
- **Keep heavy, source-dumping exploration in a sub-agent, not the main context
  window.** Tools that return large contiguous code sections crowd out the main
  task; run them behind an explorer agent and let it return the conclusion.

## Freshness is not free

Graph indexes are usually built and refreshed **manually**, and go stale silently
between runs. Treat any graph result as possibly stale and confirm against the
actual code when the answer is load-bearing. Wire a refresh — a commit/merge hook
or a scheduled sweep — rather than trusting the index to be current; an unmaintained
graph quietly answers yesterday's question.
