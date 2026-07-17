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
