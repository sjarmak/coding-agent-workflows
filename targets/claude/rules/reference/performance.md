# Performance Optimization

## Model Selection Strategy

This is the routing table of record; other rules reference it rather than
restating the tiers. Route by cognitive load, not by task size. The tiers are
roles. Model families name them here because the routing outlives any one
generation's version numbers; map them onto your provider's equivalents.

**Opus class** (deepest reasoning):
- Planning, orchestration, and decomposition
- Architectural decisions and first-principles checks
- Adoption review and judge panels
- Research and analysis

**Sonnet class** (main execution):
- Main development work
- Executing a plan produced by a higher tier
- Complex coding tasks carrying explicit process (schemas, checklists, gates)

**Haiku class** (mechanical, high-frequency):
- Lightweight agents invoked often
- Worker agents running well-bounded mechanical steps

Planning and orchestration sit in the top tier: a bad plan costs more downstream
than the tokens saved producing it, and a cheap orchestrator fans its mistakes
out across every worker it dispatches. Push execution down instead. Lower tiers
compensate with explicit process — prefer adding a verification gate over
up-tiering.

## Concurrency and Context Are the Bill

Usage scales with **agents x turns x context**, not with tasks completed. Every
live agent re-sends its whole conversation on every turn, and cached input is
metered at or near full rate, so a long-running agent parked at a large context
costs the same each turn whether or not anything new happened.

Measured on 2026-09-05: a weekly Codex allowance was consumed in 4h51m — 8,847
model responses, mean context 133K tokens, 1.18B billed tokens, of which only
22.4M were new content (98.4% was context re-read). The week before had run the
same 8,000-odd responses over 37 hours. The delta was concurrency (10-15 live
threads vs 1-2), not work done.

The three levers, in order of effect:

1. **Cap concurrency and depth.** At most 3 agents live at once; a subagent
   never spawns its own subagents. Depth-2 spawning is what multiplies a 4-slot
   default into 15 threads.
2. **Cap context.** Compact well below the model's ceiling — the cost of one
   compaction is repaid within a handful of turns at a 200K context.
3. **Route effort down.** Subagents run at medium effort unless the task is
   genuinely hard; reasoning tokens were a minor term (908K of 3.28M output) but
   effort also drives turn count.

## Context Window Management

Avoid last 20% of context window for:
- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

Lower context sensitivity tasks:
- Single-file edits
- Independent utility creation
- Documentation updates
- Simple bug fixes

## Deep Reasoning and Plan Mode

Reserve extended-reasoning budget for the tasks that need it: architectural
decisions, multi-file features, and debugging complex interactions. Most agents
expose an extended-thinking or reasoning-effort control and a plan mode; consult
your agent's settings for how to enable them and how much budget to allow.

For complex tasks requiring deep reasoning:
1. Turn on the deepest reasoning mode your agent offers.
2. Use a plan mode to structure the approach before editing.
3. Run multiple critique rounds for thorough analysis.
4. Use split-role sub-agents for diverse perspectives where the runtime supports them.

## Build Troubleshooting

If build fails:
1. Use **build-error-resolver** agent
2. Analyze error messages
3. Fix incrementally
4. Verify after each fix
