---
name: brainstorm-loop
summary: Generate many shape-distinct ideas, pre-mortem the frontrunners, then converge on one.
scope: universal
invokes: [brainstorm, premortem, converge]
ported-from: mol-brainstorm (Gas City formula)
---

# Workflow: Brainstorm Loop

For feature design and "how should we approach X" questions. Forces divergent
volume under a uniqueness constraint, then filters by failure analysis.

## Inputs

| Input | Source | Description |
|-------|--------|-------------|
| `problem` | caller | The problem statement. Use the task title if dispatched. |
| `context` | caller | Constraints and prior art that define exclusion zones. |

## Steps

### 1. brainstorm

Run `brainstorm`: produce many candidate approaches under one hard constraint.
No idea may take the same shape as any prior art or any earlier idea in this
session. Volume plus shape-uniqueness is what gets past the obvious answer.

**Exit:** a set of shape-distinct candidates.

### 2. premortem  (needs: brainstorm)

Run `premortem` on the top candidates: for each, assume it failed and list why.
Drop candidates whose failure modes are fatal or unmitigable.

**Exit:** a shortlist of candidates that survive failure analysis.

### 3. converge  (needs: premortem)

Run `converge` on the shortlist: pick one direction, state the trade-offs it
accepts, and record the runners-up so the decision is auditable later.

**Exit:** one chosen direction + rejected alternatives with reasons.
