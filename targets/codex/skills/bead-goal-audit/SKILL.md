---
name: "bead-goal-audit"
description: "Audit a durable task store against project goals, identify duplicates and stale or orphaned work, and propose evidence-backed closures or merges."
---

# Task and goal audit

Use the existing task backend; Beads is one adapter, not a prerequisite. Discover its help and configured storage before querying. Read-only unless the user asks to apply changes.

1. Snapshot open tasks, statuses, parent links, dependencies, and recent updates. Inspect backend diagnostics if available. Age thresholds identify review candidates, not automatic closure rules.
2. Read the goal layer: epics, project plans, ADRs, accepted requirements, and delivered changes. Map each task to its parent and goal; distinguish missing linkage from genuinely obsolete work.
3. Inspect stale in-progress tasks for active owners or resumable sessions. Verify claimed completion against landed code and acceptance evidence.
4. Compare suspected duplicates semantically, preserving distinct acceptance criteria and dependencies. Do not use title similarity alone to merge tasks.
5. Produce a table of task ID, proposed action, goal, evidence, survivor ID where relevant, and dependency effects. Include missing tasks or goals when a gap is real.
6. When applying authorized cleanup, use backend operations, retain history, rewire dependencies, and re-read the affected records. Prefer closure with a reason over deletion. Never close a task merely because its branch exists.

For Beads, inspect available `status`, `list`, `stale`, `lint`, dependency, and duplicate commands with installed help; versions differ. Do not invent flags or run a credentialed semantic duplicate service implicitly.
