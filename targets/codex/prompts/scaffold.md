# Scaffold: Build-Order Planning

Take a chosen design (from `diverge-prototype` or any architecture decision) and
spawn N independent agents, each proposing a different build-order strategy. Each
produces a sequenced implementation plan with milestones, dependencies, and a
risk assessment; the results synthesize into one recommended build plan.

## Arguments

`[N] [path/to/design.md | inline description]`

- N is the number of strategies (default 4, min 2, max 6).
- Input is a path to a design doc/prototype/PRD, or an inline description of what
  needs to be built. Missing or unclear: ask the user to clarify before starting.

## Phase 1: Understand the Design

Read the design doc, prototype, or PRD provided. Extract the following:

- **Components to build**: every distinct module, service, or subsystem
- **Dependencies between them**: what requires what
- **External integrations**: third-party APIs, databases, services
- **Testing requirements**: what needs testing and at what level
- **Deployment needs**: infrastructure, environments, CI/CD

Prepare a **build brief** that summarizes:

- What needs to be built
- What exists already (if working within an existing codebase)
- What the constraints are (technical, timeline, team)

Present the build brief to the user and confirm before proceeding. Adjust if the user gives feedback.

## Phase 2: Spawn Sequencing Agents

Launch **all N agents in parallel** using the Agent tool. Each agent receives the build brief plus a unique **sequencing strategy** drawn from this pool (assign strategies 1 through N):

1. **"Riskiest-First"**: Start with the highest-uncertainty components. Front-load risk to learn early whether the approach works. Motto: "fail fast on the hard stuff."
2. **"Demo-able First"**: Start with the components that produce visible, testable output. Build stakeholder confidence early. Motto: "something to show every sprint."
3. **"Dependency-Topological"**: Strict dependency order. Build foundations first, layers on top. Nothing starts until its dependencies are complete. Motto: "no stubs, no mocks, each piece works when built."
4. **"Vertical Slice"**: Build one thin end-to-end path through the entire system first. Proves integration works before widening. Motto: "narrow and deep before wide."
5. **"Test Infrastructure First"**: Start with test harness, CI/CD, monitoring, observability. Build the ability to verify before building things to verify. Motto: "confidence before velocity."
6. **"Parallel Tracks"**: Identify independent work streams that can proceed simultaneously. Optimize for team throughput. Motto: "max parallelism, defined interfaces."

Each agent MUST produce:

- **Sequenced phase list**: ordered phases with: what is built, why this order, what is stubbed or mocked, estimated effort (use ranges when uncertain)
- **Dependency diagram**: what depends on what within their ordering
- **Risk assessment**: what could go wrong with this ordering, what gets deferred
- **First milestone**: what does "done with phase 1" look like and how do you verify it
- **Integration points**: where phases connect and how to test those connections

Agent prompt template (customize the strategy per agent):

```
You are a build-order planning agent. Given a design, you propose an implementation sequence using a specific strategy.

## Build Brief
{build_brief}

## Your Strategy: {strategy_name}
{strategy_description}
Motto: "{motto}"

Propose a complete build order for this design using your assigned strategy. Think carefully about sequencing trade-offs.

## Output Format
Return your plan in this exact structure:

### Strategy: {strategy_name}
Motto: "{motto}"

#### Sequenced Phase List
For each phase:
- **Phase N: {name}**
  - What is built: ...
  - Why this order: ...
  - What is stubbed/mocked: ...
  - Estimated effort: [range, e.g., 2-4 days]

#### Dependency Diagram
- {component} -> {component} (reason)
- ...

#### Risk Assessment
- Risk: {description} | Impact: {high/medium/low} | Mitigation: {approach}
- ...

#### First Milestone
- Definition of done: ...
- Verification method: ...

#### Integration Points
- Phase N <-> Phase M: {what connects, how to test}
- ...
```

Use `subagent_type: "general-purpose"` and do NOT use worktrees (planning only, no code).

## Phase 3: Compare Strategies

After ALL agents return, produce a unified analysis:

### 1. Strategy Comparison Table

| Dimension             | Strategy A | Strategy B | Strategy C | Strategy D |
| --------------------- | ---------- | ---------- | ---------- | ---------- |
| First thing built     | ...        | ...        | ...        | ...        |
| Time to first demo    | ...        | ...        | ...        | ...        |
| Risk front-loading    | ...        | ...        | ...        | ...        |
| Parallelism potential | ...        | ...        | ...        | ...        |
| Stub/mock debt        | ...        | ...        | ...        | ...        |
| Integration risk      | ...        | ...        | ...        | ...        |

### 2. Convergence Points

Where did multiple strategies agree on ordering? These are high-confidence sequencing decisions. If three or more strategies put the same component early, that is a strong signal.

### 3. Key Trade-offs

Where did strategies disagree? For each disagreement, articulate the specific trade-off:

- Strategy X puts {component} first because {reason}
- Strategy Y defers {component} because {reason}
- The trade-off is: {what you gain vs. what you risk}

### 4. Recommended Build Plan

Synthesize a recommended plan that combines the best insights from all strategies. For each sequencing choice, state:

- What is built in this phase
- Which strategy or strategies informed this choice
- Why this ordering was selected over alternatives

Save the full analysis to the working directory as `scaffold_{slugified_topic}.md`.

## Phase 4: Present

Present the recommended build plan and the comparison analysis. Then ask the user:

- Does this build order match your team capacity and timeline?
- Are there constraints I should factor in (team availability, hard deadlines, existing work in progress)?
- Ready to seed tasks and start implementing?

Remind the user: plans change. The value is not in predicting the future perfectly but in having thought through the trade-offs so you can adapt faster when reality diverges.

## Phase 5: Seed Tasks

If the user confirms the plan, convert the recommended build plan into a task
hierarchy in whatever tracker the project uses (issue tracker, project board, or
a task-tracking tool):

1. **Create the epic**: one parent item summarizing the full build.
2. **Create one task per phase** as children of the epic, each with a clear
   description and explicit verification criteria.
3. **Wire up dependencies** between phases where ordering matters, so the
   tracker can surface what's ready to start.
4. **Show the resulting graph / ordered list** and the first ready item; that's
   where the `implement-review` workflow (via `focus`) picks up.

Keep the seeding tracker-agnostic: the structure (epic → ordered phases with
dependencies and verifiable done-states) is what matters, not the specific tool.

## Rules

- **Independence is critical**: agents must NOT share context. Do not include other agents' plans in any agent's prompt.
- **All agents launch in a single parallel batch**: use one message with N Agent tool calls.
- **No code**: this is a planning skill, not an implementation skill. No files are created except the output markdown.
- **Concrete milestones**: every phase must have a verifiable "done" state. "Set up the database" is not done until you say how to verify it.
- **Acknowledge uncertainty**: if effort estimates are uncertain, say so with ranges. Never present a guess as a fact.
- **No filtering**: include all agent plans in the comparison, even if one strategy seems obviously weaker. The contrast is valuable.
- **Attribute insights**: when the recommended plan borrows from a strategy, name it.
- **The plan is not the territory**: remind the user that plans change; the value is in having thought through trade-offs.

## Pipeline Position

This skill sits after design selection and before focused implementation:

```
diverge-prototype or architecture decision -> scaffold (plan + seed tasks) -> focus (work through tasks)
```
