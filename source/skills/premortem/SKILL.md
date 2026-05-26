Prospective Failure Narratives. Spawns N independent agents, each writing a narrative from the future where the project FAILED for a different root cause. No agent sees others' failure stories. A lead agent then synthesizes all failure narratives into a structured risk registry with severity ratings and mitigations.

Based on Gary Klein's premortem technique: "prospective hindsight" — imagining an event has already occurred — increases the ability to identify reasons for future outcomes by ~30%. Starting from "it failed" bypasses the planning fallacy and optimism bias that normally prevent teams from envisioning failure modes.

## Arguments

$ARGUMENTS — format: `[N] [path/to/design.md or inline description]` where N is optional failure-lens count (default: 5, min 3, max 7)

## Parse Arguments

Extract:
- **agent_count**: the optional leading integer (default 5, min 3, max 7)
- **input**: path to a design document, architecture doc, PRD, or project plan — or an inline project description

If the input is missing or unclear, ask the user to clarify before proceeding.

## Phase 1: Frame the Project

**If a file path is given**: read it and extract the key design decisions, architecture, dependencies, and assumptions.

**If inline**: parse the project description.

Prepare a **project brief** that includes:
- What is being built
- Key technical decisions
- Dependencies (internal and external)
- Timeline constraints
- Team context (if available)
- Critical assumptions

Present the project brief to the user and confirm before proceeding. Adjust if the user gives feedback.

## Phase 2: Spawn Failure Agents

Launch **all N agents in parallel** using the Agent tool. Each agent gets the same project brief and a unique **failure lens** — a category of failure they must explore.

### Standard Failure Lenses

Select N from the following (always include lenses 1-3, then fill remaining slots in order):

1. **Technical Architecture Failure** — the core technical approach was wrong (scaling limits, fundamental design flaw, performance cliff, wrong data model)
2. **Integration & Dependency Failure** — external dependencies failed or changed (API deprecation, library vulnerability, vendor shutdown, incompatible upgrade)
3. **Operational Failure** — the system works in dev but fails in production (deployment complexity, monitoring gaps, incident response blind spots, data migration corruption)
4. **Scope & Requirements Failure** — we built the wrong thing (misunderstood requirements, missed stakeholder needs, wrong assumptions about user behavior)
5. **Team & Process Failure** — the people-side failed (knowledge silos, handoff gaps, testing shortcuts, documentation debt)
6. **Security & Compliance Failure** — security breach, data leak, regulatory violation, access control gap
7. **Scale & Evolution Failure** — works at current scale but breaks at 10x (database bottleneck, cost explosion, architectural ceiling)

Each agent MUST:

1. Write a **narrative** (not a bullet list) — a story from 6 months in the future, in past tense, describing how and why the project failed through their lens
2. Be specific: name real components from the project brief, describe the sequence of events
3. Identify the **root cause** (the earliest decision that, if changed, would have prevented this failure)
4. Identify **warning signs** that would have been visible early
5. Propose **mitigations** — concrete changes to the current design that would prevent this failure mode
6. Use `subagent_type: "general-purpose"` (they may need web search for realistic failure scenarios)
7. NOT be told what other agents are exploring

Agent prompt template (customize the lens per agent):
```
You are a failure analyst conducting a premortem exercise.

## Project Brief
{project_brief}

## Your Failure Lens: {lens_name}
{lens_description}

## Instructions
It is 6 months from now. This project has FAILED. Your job is to write the postmortem — but you're writing it BEFORE the project starts, not after.

Write a narrative (2-3 paragraphs) describing:
1. What happened — the sequence of events that led to failure
2. The root cause — the earliest decision or assumption that, if changed, would have prevented this
3. Warning signs — signals that were (or would have been) visible early on
4. Mitigations — concrete changes to the current design/plan that would prevent this failure

Be SPECIFIC. Reference actual components, decisions, and dependencies from the project brief. Don't write generic risks — write THIS project's risks.

## Output Format
### Failure Narrative: {lens_name}

**What happened:**
[2-3 paragraph narrative in past tense]

**Root cause:**
[Single sentence identifying the earliest causal decision]

**Warning signs:**
- [Concrete, observable signals]

**Mitigations:**
- [Specific changes to current design/plan]

**Severity:** [Critical / High / Medium / Low]
**Likelihood:** [High / Medium / Low]
```

## Phase 3: Synthesize into Risk Registry

After ALL agents return, produce the following synthesis:

### 1. Risk Registry Table

| # | Failure Lens | Severity | Likelihood | Risk Score | Root Cause | Top Mitigation |
|—-|——————-|—————|——————|—————-|——————|————————|

Risk Score = Severity x Likelihood where Critical=4, High=3, Medium=2, Low=1 for severity and High=3, Medium=2, Low=1 for likelihood. Sort by risk score descending.

### 2. Cross-Cutting Themes

Where did multiple failure lenses identify the same underlying vulnerability? These are the highest-priority risks. For each theme:
- Which lenses surfaced it
- Why this convergence increases confidence that the risk is real
- The combined severity if this vulnerability is exploited

### 3. Mitigation Priority List

All mitigations ranked by:
- How many failure modes they address
- The severity of those failure modes
- Implementation cost (Low / Medium / High)

### 4. Design Modification Recommendations

The top 3-5 concrete changes to the current design that would most reduce overall risk, synthesized from the individual mitigations. For each:
- What to change
- Which failure modes it addresses
- Expected effort

### 5. Full Failure Narratives

Include all narratives for reference, grouped by lens.

Save the full output to a file `premortem_{slugified_topic}.md` in the working directory.

## Phase 4: Present and Act

Present the risk registry and top recommendations to the user. Ask:
- Do any of these failure modes feel especially likely or especially surprising?
- Should we modify the design based on these findings before proceeding to implementation?
- Would you like to deep-dive on any specific failure mode or mitigation?

## Pipeline Position

Sits between /converge and /diverge-prototype as a risk gate:
```
/converge (decision) -> /premortem (risk check) -> /diverge-prototype (build)
```

## Rules

- **Independence is critical**: agents must NOT share context. Each failure lens explores independently. Do not include other agents' narratives in any agent's prompt.
- **All agents launch in a single parallel batch**: use one message with N Agent tool calls.
- **Narratives, not bullet lists**: the story format triggers deeper causal reasoning than lists. Agents must write prose narratives.
- **Specific, not generic**: every failure must reference actual components from the project brief. Reject generic risks.
- **No optimism**: agents are instructed that the project HAS FAILED. They cannot hedge with "but it might work out."
- **Preserve all narratives**: even unlikely failures contain useful signal. Do not filter or discard any agent's output.
- **Attribute findings**: always note which lens produced which risk in the synthesis.
- **Be honest about confidence**: if the risk registry is weak in an area, say so.
