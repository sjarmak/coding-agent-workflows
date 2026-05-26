# Workflow: Research

For open questions and design decisions where the obvious answer may be wrong.
Three phases, each a distinct cognitive mode, kept separate so one doesn't
contaminate the next.

## Inputs

| Input | Source | Description |
|-------|--------|-------------|
| `question` | caller | The topic or decision to research. |
| `context` | caller | What's known, constraints, prior art. |

## Steps

### 1. diverge

Run `diverge`: spawn independent investigation angles with uncorrelated
context, so findings aren't anchored to a single framing. Breadth first; the
goal is to surface options and evidence, not to decide.

**Exit:** multiple independent findings, each with its own evidence.

### 2. converge  (needs: diverge)

Run `converge`: reconcile the divergent findings into a single synthesis with a
recommended direction. Name the trade-offs explicitly; don't hide the ones the
recommendation loses on.

**Exit:** one recommended direction + its trade-offs, traceable to the findings.

### 3. premortem  (needs: converge)

Run `premortem` on the recommendation: assume it shipped and failed, then
enumerate the most likely failure modes and what would have to be true for each. Feed the
serious ones back as constraints on the direction.

**Exit:** a direction that has survived its own failure analysis, with the known
risks written down.

## Note

Research output is decision support, not artifacts. Capture the *decision and
its rationale* (see the `architecture-decision-records` skill); the intermediate
exploration is ephemeral.
