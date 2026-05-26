Structured debate and refinement using Agent Teams. Takes divergent findings (from /diverge or any independent research) and spawns a team where teammates advocate for different positions, debate trade-offs, and converge on a refined synthesis.

## Arguments

$ARGUMENTS — format: `[N] [path/to/diverge_output.md or inline topic]` where N is optional number of debaters (default: 3, min 2, max 5)

## Prerequisites

- Agent Teams must be enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)
- Input should be divergent findings — either a file path to prior /diverge output, a PRD with open tensions, or a description of competing approaches

## Parse Arguments

Extract:
- **team_size**: optional leading integer (default 3, min 2, max 5)
- **input**: path to a file with divergent findings, or inline description of the debate topic

## Phase 0: Validate Teams Availability

Check that Agent Teams is enabled. If not, inform the user:
```
Agent Teams is required for /converge. Enable it by adding to your Claude Code settings:
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
Or use /diverge for independent exploration without debate.
```

## Phase 1: Frame the Debate

**If a file path is provided**: read the file and extract the key tensions, divergence points, and competing recommendations.

**If inline input**: parse the competing positions from the description.

**If neither is clear**: ask the user what positions or findings should be debated.

Prepare a **debate brief** that includes:
- The core question or decision to be made
- 2-5 distinct positions to be advocated (one per teammate)
- Shared context and constraints all positions must respect
- Evaluation criteria: what makes one approach better than another?

Present the debate brief and position assignments to the user for confirmation.

## Phase 2: Spawn the Team

Create an agent team with the following structure:

**Team Lead (you)**: Moderator and synthesizer. You frame rounds, call for responses, and produce the final synthesis.

**Teammates**: Each assigned one position to advocate for. Their instructions:

```
You are a debate participant in a structured convergence exercise.

## Debate Brief
{debate_brief}

## Your Position: {position_name}
{position_description}

## Your Role
You are the advocate for this position. Your job is to:
1. Make the strongest possible case for your position
2. Identify weaknesses in other positions when they're shared
3. Acknowledge genuine strengths of competing positions (steel-man, don't straw-man)
4. Propose concrete compromises when positions partially overlap
5. Be willing to update your view if presented with compelling arguments

## Communication Rules
- When you receive a message from another teammate, respond substantively
- Challenge weak arguments but acknowledge strong ones
- If you genuinely think another position is better on a specific dimension, say so
- Focus on trade-offs, not absolutism — most positions have merit in some context

## Output Format for Each Round
- **Claim**: Your key argument this round (1-2 sentences)
- **Evidence**: Supporting reasoning or data
- **Concession**: What the other positions get right
- **Challenge**: Specific weakness in a competing position
- **Synthesis Offer**: How your position could incorporate the best of others
```

## Phase 3: Run Debate Rounds (2-3 rounds)

### Round 1: Opening Positions
Each teammate presents their strongest case. As lead, broadcast all opening positions so everyone can see them.

### Round 2: Challenges and Responses
Each teammate responds to the positions they find most compelling or most flawed. Direct them to engage with specific claims from Round 1.

### Round 3: Synthesis Proposals (optional — run if still divergent)
Each teammate proposes their best "combined" approach that incorporates insights from the debate. This is where compromise positions emerge.

**Moderation rules:**
- If a round produces consensus on a point, mark it as resolved and move on
- If a round surfaces a new tension, flag it for the next round
- Keep rounds focused — redirect tangents back to the evaluation criteria
- After Round 2, assess whether Round 3 is needed (skip if positions have already converged)

## Phase 4: Synthesize

After debate concludes, produce the convergence synthesis:

### Convergence Report Structure

**1. Resolved Points**
Positions where the team reached consensus through debate. Note what argument or evidence was decisive.

**2. Refined Trade-offs**
Tensions that weren't resolved but are now better understood. For each:
- The trade-off in precise terms
- What context or constraints would tip the balance one way vs the other
- What information would be needed to resolve it

**3. Emerged Positions**
New approaches that didn't exist before the debate — combinations or compromises that teammates proposed during synthesis rounds.

**4. Strongest Arguments**
The single most compelling argument from each position, preserved even if the overall position wasn't adopted.

**5. Recommended Path**
A concrete recommendation that:
- Incorporates resolved consensus points
- Makes explicit choices on unresolved trade-offs (with rationale)
- Flags which choices should be revisited with more data

**6. Debate Highlights**
Per-teammate: the single strongest contribution they made to the discussion.

## Phase 5: Update Artifacts

If the debate was based on a `/diverge` PRD:
- Update the PRD with refined requirements based on debate outcomes
- Mark resolved open questions as resolved
- Add new considerations surfaced during debate
- Save updated PRD and present path to user

If no PRD exists, offer to draft one from the convergence synthesis.

## Rules

- **Steel-man, don't straw-man**: teammates must engage with the strongest version of each position
- **The lead moderates, not advocates**: as team lead, stay neutral during rounds. Only take a position in the final synthesis.
- **Preserve dissent**: if a teammate remains unconvinced, include their dissent in the final report. Forced consensus is worse than honest disagreement.
- **2-3 rounds max**: debates have diminishing returns. If positions haven't moved by Round 3, synthesize with the tensions acknowledged.
- **Evaluation criteria are fixed**: don't let the debate shift the goalposts. If criteria need updating, that's a finding, not a mid-debate change.
- **Token awareness**: Teams are expensive. Keep rounds focused and don't let teammates repeat themselves.
