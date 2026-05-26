Essence Extraction via Progressive Compression. Takes a large artifact and runs it through a chain of compression agents where each must compress the previous output by ~50% while preserving the most important information. The key insight: the DROPS at each compression layer — what each agent chose to cut — reveal the priority hierarchy. The waste product IS the signal.

## Arguments

$ARGUMENTS — format: `[path/to/artifact.md or inline text]`

## Parse Arguments

Extract:
- **artifact_source**: a file path or inline text

If the argument looks like a file path (contains `/` or ends in a common extension), treat it as a path and read the file. Otherwise, treat the entire argument as inline text.

If no argument is provided, ask the user what artifact they want to distill.

## Phase 1: Ingest the Artifact

1. Read the file or parse inline text
2. Measure its size (word count, section count)
3. If it is very short (< 500 words), tell the user it is already concise enough — distill works best on substantial artifacts. Offer to proceed anyway if they insist.
4. Present a summary of what will be compressed:
   - Source (file path or "inline text")
   - Word count
   - Number of sections/headers
   - A 2-3 sentence description of the artifact's apparent purpose
5. Confirm with the user before proceeding. Adjust if the user gives feedback.

## Phase 2: Run Compression Chain

Run 4 sequential compression agents. Each one:
1. Receives the previous agent's output (or the original artifact for agent 1)
2. Must compress it to roughly 50% of its length
3. Must explicitly list what it DROPPED and why
4. Must preserve the most important information in its judgment

Agent prompt template for each stage:
```
You are a compression agent. Your job is to compress the following text to roughly 50% of its current length while preserving the most important information.

## Input ({word_count} words)
{previous_output}

## Instructions
1. Read the input carefully
2. Identify what is MOST important (load-bearing claims, decisions, data, actionable items)
3. Identify what is LEAST important (context that can be inferred, repetition, hedging, examples that illustrate already-clear points)
4. Produce a compressed version at roughly {target_word_count} words
5. List EXPLICITLY what you dropped and why

## Output Format

### Compressed ({target_word_count} words target)
[Your compressed version]

### Dropped
| What was cut | Why | Importance (1-5) |
|-------------|-----|-----------------|
| [specific content] | [reason] | [how important was it really] |

### Compression Decisions
- Hardest cut: [what was most painful to remove and why]
- Easiest cut: [what was clearly noise]
- What I'd restore first if given 25% more space: [...]
```

Run agents SEQUENTIALLY — each depends on the previous output:
- Agent 1: Original -> ~50%
- Agent 2: ~50% -> ~25%
- Agent 3: ~25% -> ~12%
- Agent 4: ~12% -> ~6% (the "elevator pitch")

Track the full drop log from every agent for use in Phase 3.

## Phase 3: Analyze the Priority Hierarchy

After all 4 compression stages complete, produce a full analysis with these sections:

**1. The Essence**
The final ~6% compressed version — the irreducible core of the artifact.

**2. Priority Hierarchy**
Classify every piece of content by how many compression rounds it survived:
- **Tier 1 (Core)**: survived all 4 compressions — the absolute essentials
- **Tier 2 (Important)**: survived 3 compressions — important but not irreducible
- **Tier 3 (Supporting)**: survived 2 compressions — adds value but not critical
- **Tier 4 (Context)**: survived 1 compression — background/context
- **Tier 5 (Noise)**: dropped in round 1 — likely not load-bearing

**3. Compression Difficulty Map**
What was hardest to cut at each stage. These are the areas where priority is ambiguous or contested — the interesting boundaries.

**4. Restoration Order**
If you could add things back one at a time from the essence outward, what order would you restore? This is the true priority ranking of the artifact's content.

Save the full analysis to `distill_{slugified_topic}.md` in the working directory.

## Phase 4: Present

Show the user:
- The final essence (Tier 1)
- The priority hierarchy (all 5 tiers)
- The hardest cuts (areas of ambiguity)
- The restoration order

Then ask: does this priority ranking match your intuition? Where does it diverge?

## Rules

- **Sequential by design**: each agent must see only the previous agent's output, not the original. Compression judgments at each layer only work with the material at hand.
- **Explicit drops**: every agent must say what they cut and why. The drops are the point.
- **No padding**: compressed output should not add new information, hedging, or meta-commentary about the compression process.
- **~50% target is approximate**: within 40-60% is fine. Do not pad to hit a word count.
- **Preserve structure**: when compressing, prefer keeping structure (headers, lists) and cutting content within sections, rather than flattening structure.
- **No filtering**: include all drop data in the analysis, even when agents disagree about importance. Tension between layers is signal.
- **Be honest about ambiguity**: if the priority hierarchy has unclear boundaries, say so. The difficulty map exists for this reason.

## Pipeline Position

Versatile — works after any phase that produces a large artifact:
```
/diverge synthesis -> /distill -> priority hierarchy
/converge report  -> /distill -> decision essence
Research notes    -> /distill -> core findings
Design doc        -> /distill -> essential requirements
Meeting notes     -> /distill -> action items and decisions
```
