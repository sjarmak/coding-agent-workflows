---
name: "scix-mcp"
description: "Research scientific literature with an available SciX or ADS-compatible scholarly provider, including full-text evidence, citation traversal, and provenance."
---

# Scholarly research adapter

Requires a configured scholarly search provider. Discover the exposed search, retrieval, citation, working-set, and synthesis capabilities; do not assume a fixed corpus size, tool count, or tool prefix. A local SciX MCP can expose capabilities beyond the public service.

1. Establish discipline, date bounds, inclusion criteria, and whether the question asks for discovery, a specific paper, or synthesis. Resolve authors and identifiers carefully.
2. Search lexical terms and conceptual variants. Record query and filters; compare semantic matches with exact technical terms. Avoid treating rank or citation count as quality.
3. Retrieve paper metadata and full text when the claim requires methods, equations, or limitations. Keep DOI, bibcode, arXiv ID, version, and source URL as provided. Abstract-only sources remain explicitly limited.
4. Traverse references for prior work and citations for replications, critiques, or later corrections. Distinguish absence of indexed citations from absence of influence.
5. Maintain a bounded working set with inclusion/exclusion reasons. Cite original evidence in synthesis and separate findings from inference. Generated synthesis is not independent corroboration.
6. Return a cited answer or evidence table with accessible text coverage and unresolved conflicts. Use primary publisher, repository, or arXiv pages when the provider is unavailable; do not fabricate full-text access.

Store or share provider working sets only within the requested scope. Never copy machine-local service paths or credentials into a shared skill.
