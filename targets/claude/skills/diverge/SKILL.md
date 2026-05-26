Multi-perspective divergent research. Spawns N independent agents with uncorrelated context windows to explore a question from different angles, then auto-synthesizes findings into a unified analysis and PRD.

## Arguments

$ARGUMENTS — format: `[N] "research question or topic"` where N is optional (default: 3)

## Parse Arguments

Extract:

- **agent_count**: the optional leading integer (default 3, min 2, max 7)
- **research_prompt**: the quoted or unquoted research question/topic

If the research prompt is missing or unclear, ask the user to clarify before proceeding.

## Phase 1: Frame the Research

Before spawning agents, frame the research space. Write a short research brief (3-5 bullet points) that:

- States the core question
- Lists known constraints or context from the conversation
- Identifies 2-3 dimensions of exploration (e.g., technical feasibility, workflow design, prior art)

Present this to the user and confirm before proceeding. Adjust if the user gives feedback.

## Phase 2: Spawn Independent Agents

Launch **all N agents in parallel** using the Agent tool. Each agent MUST:

1. Have a **unique research lens** — assign each a distinct angle, perspective, or methodology. Examples:
   - "Prior art and industry patterns" (what exists, what others do)
   - "First-principles technical design" (bottom-up from constraints)
   - "User experience and workflow" (developer ergonomics, day-in-the-life)
   - "Failure modes and risks" (what can go wrong, edge cases)
   - "Scale and evolution" (how this grows, maintenance burden)
   - "Contrarian/devil's advocate" (challenge assumptions, explore alternatives)

2. Receive the same research brief but with their unique lens clearly stated

3. Be instructed to:
   - Research independently (web search, codebase exploration, reasoning)
   - Produce a structured output with: Key Findings (3-5), Concrete Recommendations (2-3), Open Questions, and a Confidence Assessment
   - NOT be told what other agents are exploring
   - Think creatively within their lens — surprising or non-obvious insights are more valuable than safe ones

4. Use `subagent_type: "general-purpose"` (they need web search, file access, etc.)

5. Do NOT use worktrees (research only, no code changes)

Agent prompt template (customize the lens per agent):

```
You are a research agent exploring a question from a specific perspective.

## Research Brief
{research_brief}

## Your Lens: {lens_name}
{lens_description}

Explore this question deeply from your assigned perspective. Use web search, read relevant files in the codebase, and reason carefully.

## Output Format
Return your findings in this exact structure:

### Perspective: {lens_name}

#### Key Findings
1. [Finding with supporting evidence or reasoning]
2. ...
(3-5 findings)

#### Concrete Recommendations
1. [Actionable recommendation with rationale]
2. ...
(2-3 recommendations)

#### Open Questions
- [Questions your research surfaced but couldn't resolve]

#### Confidence Assessment
- Overall confidence: [High/Medium/Low]
- What would increase confidence: [specific next steps]

#### Surprise Factor
- [1-2 insights that were unexpected or counterintuitive]
```

## Phase 3: Synthesize

After ALL agents return, produce a unified analysis:

### Synthesis Structure

**1. Convergence Points**
Where did multiple agents independently arrive at similar conclusions? These are high-confidence signals.

**2. Divergence Points**
Where did agents disagree or propose conflicting approaches? Highlight the tension and what drives it.

**3. Unique Insights**
Novel findings that came from only one agent's lens but are valuable. Flag the "surprise factor" items.

**4. Consolidated Recommendations**
Merge and prioritize all recommendations. For each:

- State the recommendation
- Note which agents support it (and from what angle)
- Flag any dissenting views
- Assign priority: must-have / should-have / nice-to-have

**5. Open Questions & Risks**
Aggregated unknowns that need resolution before moving to implementation.

**6. Per-Agent Highlights**
For each agent, include a 2-3 sentence summary of their most distinctive contribution.

## Phase 4: Draft PRD

Based on the synthesis, draft a mini-PRD markdown file:

```markdown
# PRD: {topic}

## Problem Statement

{1-2 paragraphs from synthesis}

## Goals & Non-Goals

### Goals

- ...

### Non-Goals

- ...

## Requirements

Each requirement MUST include verifiable acceptance criteria — a concrete condition that can be checked by running a command, reading output, or inspecting behavior. "Works correctly" is not verifiable. "Returns 200 with JSON body containing 'id' field" is.

### Must-Have

- Requirement: ...
  - Acceptance: {specific, testable condition}
- ...

### Should-Have

- Requirement: ...
  - Acceptance: {specific, testable condition}
- ...

### Nice-to-Have

- Requirement: ...
  - Acceptance: {specific, testable condition}
- ...

## Design Considerations

{Key tensions and trade-offs from divergence points}

## Open Questions

{From synthesis}

## Research Provenance

{Which lenses contributed, key convergence/divergence summary}
```

Save the PRD to the working directory as `prd_{slugified_topic}.md`.

Present the full synthesis AND the PRD path to the user. Ask if they want to refine the PRD before using it with `/diverge-prototype`.

## Rules

- **Independence is critical**: agents must NOT share context. Do not include other agents' findings in any agent's prompt.
- **All agents launch in a single parallel batch**: use one message with N Agent tool calls.
- **No filtering**: include all agent findings in the synthesis, even contradictory ones. Tension is signal.
- **Attribute insights**: always note which lens produced which finding.
- **Be honest about confidence**: if synthesis is weak in an area, say so.
