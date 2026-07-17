---
name: research-project
description: "Run the diverge → converge → premortem pipeline to produce a risk-annotated PRD"
argument-hint: '[N] "topic or feature description"'
allowed-tools: ["Agent", "Read", "Write", "Glob", "Grep"]
---

# Research Project: Diverge → Converge → Premortem

Run the complete PRD creation pipeline as a single invocation. This chains three skills in sequence, passing outputs between them.

## Arguments

`[N] "research question or topic"`

- N is the agent count for the diverge stage (default 3).
- The topic is the research question or feature to investigate.

## Execution

### Step 1: Diverge

Invoke the `/diverge` skill with the provided arguments. This spawns N independent research agents and produces a PRD.

Wait for the PRD file to be created (format: `prd_{slugified_topic}.md`).

### Step 2: Converge

Invoke the `/converge` skill, passing the PRD file path from Step 1.

This runs a structured debate to refine the PRD and resolve tensions.

### Step 3: Premortem

Invoke the `/premortem` skill, passing the refined PRD from Step 2.

This runs prospective failure analysis and annotates the PRD with risks and mitigations.

## Output

Present the final risk-annotated PRD path and a brief summary:

- Key decisions from convergence
- Top 3 risks from premortem
- Recommended next step (usually `/prd-build <prd-path>`)

## Rules

- Do NOT ask questions between steps, flow continuously
- Do NOT skip steps, all three must run
- If a step fails, report the error and stop (do not proceed with incomplete input)
- Each step produces files, pass file paths, not inline content
