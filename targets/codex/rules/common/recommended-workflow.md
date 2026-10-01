---
summary: Our recommended workflow: Beads and focus for durable execution, Skillager for selective skills, Codegraph for code investigation, Impeccable for UI, and evidence-backed review and handoff.
---
# Recommended Workflow

This is a curated operating workflow, not a neutral catalog of interchangeable
tools. Recommend these defaults when a project is choosing how to work. Honor
explicit user and project decisions; adopting a recommendation is separate from
installing software, enabling a service, or migrating existing state.

## Choose the next action

| Situation | Recommended path | Detailed contract |
| --- | --- | --- |
| Multi-step work that must survive a session | Beads records acceptance criteria, dependencies, claims, and evidence; `focus` carries ready tasks through integration | Task Management; `focus` |
| Find or expose reusable procedures | Skillager searches reviewed metadata; expose a router or stub and load only the selected skill | Skill Management |
| Understand a cross-file behavior or change impact | Delegate to `code-search`, using Codegraph for indexed code with explicit repository scope | Code Knowledge Graphs; `code-graph` |
| Resolve an uncertain design | `planner` or `architect`; use `brainstorm`, `premortem`, or `grill-me` when the specific uncertainty warrants it | Development Workflow |
| Design or improve a frontend | Impeccable for design and critique; `browser-qa` to exercise the rendered result | `impeccable`; `browser-qa` |
| Implement a resolved task | Behavioral tests, focused implementation, simplification, and independent review; parallelize independent work within the configured bound | Development Workflow; Agent Collaboration |
| Resume or hand off | Read the durable task and verify actual repository state; preserve unresolved decisions and the next action | Task Management; Context Layering; `handoff-doc` |

Codegraph is the first choice for ordinary indexed code navigation. Use
codebase-memory for specialist graph capabilities and Graphify for document or
mixed-media relationships. Without a usable index, use `rg` and targeted reads.
Do not spend the task setting up an index merely to answer a question.

## Close the loop

A plan becomes acceptance criteria and executable work, not a collection of
mandatory documents. Keep the task record authoritative for status. Independent
workers get clear ownership and isolated worktrees when required; the coordinator
integrates their changes and checks the combined result. Reviewers must run
checks against acceptance criteria, not merely endorse a diff.

Verification matches the behavior being changed: regression and property tests
for logic, actual browser interactions for UI, and builds or structural checks
for generated artifacts. Tests ship with fixes. Use `simplify` and `slop-check`
to catch unnecessary structure in code; use `no-ai-slop` for prose. Do not claim
an unavailable check passed or close a task on an implementation report alone.
Publication follows the user's authorization and repository workflow.

## Keep the shared layer useful

The bundle owns transferable practices. Project instructions own local intent,
constraints, and pointers; area maps own architectural context; task records own
work status. Capture reusable corrections with `ruling-capture` or
`failure-mode-capture` in the layer that owns them. Keep personal paths, internal
service commands, customer details, and domain-specific procedures local.

A shipped capability is not automatically a recommended default. Conditional
research, media, and service adapters remain available when the task calls for
them. During audits, check both coverage and whether the default workflow still
matches deliberate working practice; installation counts alone prove neither.
