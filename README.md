# coding-agent-workflows

Coding standards, agent roles, skills, and multi-step workflows that read the
same whether you drive Claude Code, Codex, Amp, or anything that reads an
`AGENTS.md`. One neutral source produces a native config for each agent, and the
agent-specific pieces stay scoped to the agents that need them.

Everything here is pre-rendered and committed. There is no build step to run
before you use it.

## Install

```bash
git clone https://github.com/sjarmak/coding-agent-workflows.git
cd coding-agent-workflows
```

Install for your agent:

```bash
./install.sh claude          # → ./.claude  (project-level; use `./install.sh claude ~` for user-level)
./install.sh codex           # → AGENTS.md in current dir + config into ~/.codex
./install.sh agents          # → just AGENTS.md (Amp, Aider, Gemini CLI, …)
```

Pass a destination as the second argument to target a specific project, for
example `./install.sh claude ~/work/myrepo`.

If you would rather not run a script, copy what you need: Claude Code reads a
`.claude/` directory, so copy `targets/claude/{rules,agents,skills,commands}`
into one; Codex reads an `AGENTS.md` at the repo root plus `~/.codex`, so put
`AGENTS.md` at your root and copy `targets/codex/{config.toml,agents,prompts}`
into `~/.codex`; every other `AGENTS.md`-aware agent needs only that one file at
your repo root.

## What's inside

`AGENTS.md` is the universal layer: principles, the agent roster, the skills,
and the full workflows, written as prose any agent can follow. `targets/claude/`
is the native Claude Code layout (`rules/`, `agents/`, `skills/`, `commands/`).
`targets/codex/` is the native Codex layout (`AGENTS.md`, `config.toml`,
`agents/*.toml`, `prompts/`).

### The workflows carry the part a style guide can't

A style guide tells you what good code looks like. The workflows tell you how to
get an agent there, as multi-step procedures that compose the skills into a
verify-gated pipeline:

- **implement-review**: plan, execute, simplify, then review as a hard gate before finalizing.
- **research**: diverge across angles, converge to a recommendation, pre-mortem it.
- **brainstorm-loop**: generate shape-distinct ideas, pre-mortem the frontrunners, converge.
- **decompose**: split large work into independently-reviewable units.
- **epic-review**: review the assembled whole at the integration boundary.

The review-as-a-gate step in `implement-review` is the load-bearing one: the
agent that wrote the code checks the diff against the acceptance criteria, with
authority to reject and retry from a fresh context.

### Code-erosion and token-discipline guards

Two guards keep agent output lean. The
[`slop-check`](./source/skills/slop-check/SKILL.md) skill scores a diff for
**erosion** (dead branches and redundant structure that accrue as code is
extended) and **verbosity**, mirroring the [SlopCodeBench](https://www.scbench.ai)
judge rubric — the same rubric backs the `anti-slop` rule
([`source/rules/common/anti-slop.md`](./source/rules/common/anti-slop.md)) and the
slop pass added to the `code-reviewer` agent and `review` skill. The
[`caveman`](./source/skills/caveman/SKILL.md) skill cuts conversational token use
~75% while preserving technical accuracy.

These pair well with [CodeGraph](https://github.com/colbymchenry/codegraph), a
local pre-indexed code knowledge graph (CLI + MCP) that cuts exploration tokens
and tool calls — orthogonal to the guards above, but the same goal: less slop,
fewer tokens.

## Provenance & license

MIT. Derived from [Everything Claude Code](https://github.com/affaan-m/everything-claude-code)
(MIT, Affaan Mustafa); the augmented-coding-patterns rule synthesizes the
[Augmented Coding Patterns](https://lexler.github.io/augmented-coding-patterns/)
catalog; the anti-slop rule and slop-check skill adapt the code-erosion rubric
from [SlopCodeBench](https://www.scbench.ai)
([SprocketLab/slop-code-bench](https://github.com/SprocketLab/slop-code-bench)).
See [NOTICE](./NOTICE).

---

<details>
<summary><b>Maintainer notes</b> (you don't need these to use the repo)</summary>

The committed `AGENTS.md` and `targets/` are generated from `source/`, the only
hand-edited layer. To change the bundle, edit `source/` and run:

```bash
npm run build      # regenerate AGENTS.md + targets/ from source/
npm run sanitize   # release gate: scan rendered output for paths, PII, internal jargon
npm run release    # build + sanitize
npm run check      # CI: fail if committed output drifted from source/
```

`source/manifest.json` is the scope map (`universal`, `claude`, or `codex`) that
decides where each artifact renders. `rule_overrides` marks an individual rule
file such as `hooks.md` as Claude-only, so it ships to `targets/claude/` but
stays out of the universal layer.

</details>
