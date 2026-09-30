# Code Knowledge Graphs

Delegate substantial code investigations to **code-search**: questions spanning
files, tracing behavior, or assessing change impact. Pass the absolute repository
root, question, success criteria, revision/worktree when relevant, and existing
findings. Keep simple symbol lookups in the parent. The specialist returns a
concise cited answer and change guidance; the parent makes edits.

## Tool routing

- Prefer Codegraph's `codegraph_explore` for indexed code, with an explicit
  `projectPath`. Name the relevant symbols or ask a focused natural-language
  question. Use the returned source, call paths, and impact information together.
  Discover the actual tools; do not assume older per-operation tools exist.
- Treat source returned by the graph as already read. Follow up only for a
  specific gap. Graph edges are navigation evidence; ambiguous name matches do
  not prove runtime dispatch or correctness.
- Use `rg` and targeted reads for strings, configs, docs, unindexed code, and
  gaps or failures in graph results. If no index exists, continue with these
  tools without initializing one or asking the user to do so.
- Use another available graph tool for capabilities the first lacks, such as
  arbitrary graph queries or document relationships. Avoid duplicate searches.

## Freshness

Follow the tool's freshness signals rather than assuming a refresh mechanism.
For Codegraph, inspect pending-sync, auto-sync-disabled, and changed-on-disk
warnings. Current full source returned for a changed file is usable; if omitted,
read the flagged file directly. Its indexed edges and prior line numbers may
still be stale. Reuse previously returned source only when present in your own
context. Cite current evidence and explain any remaining coverage limits.
