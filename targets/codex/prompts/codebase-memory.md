# Specialist graph queries

Use `code-graph` for normal source navigation. This adapter needs a configured graph provider exposing the requested capability; installation of this skill does not supply an MCP server.

1. Discover the available tools and inspect their schemas. Do not assume a fixed tool count or legacy Codegraph operation names.
2. Scope every query to the repository, service, and revision. Discover labels, relationship types, and property keys before writing Cypher or another query language.
3. Start with bounded read-only queries. Paginate large result sets and report truncation. Never interpolate untrusted strings into query syntax where parameters are supported.
4. For cross-service traces, distinguish static HTTP_CALLS-like edges from observed runtime calls and inferred URL matches. Show the endpoint and source evidence at each boundary.
5. Use fan-in/fan-out or isolated nodes to propose inspection candidates, not as automatic quality scores. Check framework registration, reflection, dynamic imports, exports, generated code, and tests before declaring a function unused.
6. For architecture summaries, group by real ownership and dependency boundaries; cite examples and graph freshness. For ADR or trace ingestion, identify the intended store, provenance, and write scope before mutating it.

If schema or source freshness is unavailable, label graph conclusions provisional and verify the relevant source. Fall back to targeted source search when the provider cannot answer; do not install a server or upload repository content implicitly.
