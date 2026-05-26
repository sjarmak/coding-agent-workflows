---
name: decompose
summary: Break a large piece of work into independently-shippable, reviewable units with explicit dependencies.
scope: universal
invokes: [brainstorm, review]
ported-from: mol-decompose (Gas City formula)
---

# Workflow: Decompose

For work too large for one implement-review pass. Produces a dependency-ordered
set of units, each small enough to implement and review on its own.

## Inputs

| Input | Source | Description |
|-------|--------|-------------|
| `epic` | caller | The large body of work to break down. |
| `context` | caller | Acceptance criteria, constraints, target architecture. |

## Steps

### 1. map

Read the epic and its acceptance criteria. Identify the natural seams, the points
where work can be split so each piece is independently testable and reviewable.
Split on *reasons to change* and on *what can ship alone*, not on line count.

**Exit:** a list of candidate units with one-line scopes.

### 2. order  (needs: map)

Establish dependencies between units (which must land before which). Flag units
that can run in parallel. Each unit should have its own acceptance criteria
derived from the epic's.

**Exit:** a dependency-ordered (DAG) breakdown; parallelizable units marked.

### 3. review-decomposition  (needs: order)

Run `review` over the breakdown itself as a gate: does the union of the units
actually cover the epic's acceptance criteria? Are any units still too large to
implement-review in one pass? Is any "unit" actually two reasons-to-change
glued together? Reject and re-split if so.

**Exit:** a breakdown whose units each fit one `implement-review` pass and whose
union covers the epic.

## Hand-off

Each resulting unit is then driven through the `implement-review` workflow,
independently, in dependency order.
