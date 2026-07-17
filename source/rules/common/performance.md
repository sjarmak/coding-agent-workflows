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

## Extended Thinking + Plan Mode

Extended thinking is enabled by default, reserving up to 31,999 tokens for internal reasoning.

Control extended thinking via:
- **Toggle**: Option+T (macOS) / Alt+T (Windows/Linux)
- **Config**: Set `alwaysThinkingEnabled` in `~/.claude/settings.json`
- **Budget cap**: `export MAX_THINKING_TOKENS=10000`
- **Verbose mode**: Ctrl+O to see thinking output

For complex tasks requiring deep reasoning:
1. Ensure extended thinking is enabled (on by default)
2. Enable **Plan Mode** for structured approach
3. Use multiple critique rounds for thorough analysis
4. Use split role sub-agents for diverse perspectives

## Build Troubleshooting

If build fails:
1. Use **build-error-resolver** agent
2. Analyze error messages
3. Fix incrementally
4. Verify after each fix
