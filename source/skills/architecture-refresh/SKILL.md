---
name: architecture-refresh
description: Audit architecture diagrams against current source, repair model drift, and validate existing LikeC4 or equivalent architecture publishing workflows.
---

# Architecture refresh

Read the repository's architecture model, views, diagrams, and publishing configuration. Use the existing format and source layout; do not impose a new diagramming tool merely to run this audit.

1. Build an evidence table: modeled element, intended responsibility, delivery status, source link, actual implementation, discrepancy. Survey entry points, packages, service boundaries, storage, external calls, and CI. Use `code-graph` for indexed code relationships.
2. Trace representative end-to-end flows. Check relationship direction, trust and deployment boundaries, omitted subsystems, stale names, and planned features presented as implemented. Let source evidence determine drift, not keyword counts.
3. Update the model and views together, retaining meaningful scope and avoiding a diagram of every function. Link elements to stable source locations and distinguish built, planned, and inferred structures.
4. Use the repository-pinned LikeC4 or equivalent CLI to validate and export locally. Inspect installed help and package scripts before choosing flags. Check source links, view IDs, generated assets, and the rendered navigation at desktop and narrow widths.
5. For publishing changes, inspect existing CI permissions, branch/path triggers, artifact paths, and link checks. Prepare a local preview and follow the user's publishing authorization. Do not propagate workflows to unrelated repositories or deploy merely because a diagram was refreshed.

Report content changes separately from rendering or deployment changes. A successful renderer does not prove architectural accuracy.
