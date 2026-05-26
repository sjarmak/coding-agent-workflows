# agentic-coding-practices

A curated, **agent-neutral** set of coding practices — rules, agent roles,
skills, and workflows — distilled from heavy day-to-day agentic-coding use and
extended from [Everything Claude Code](https://github.com/affaan-m/everything-claude-code).

The point: best practices that transfer **regardless of coding agent**, with
agent-specific content kept where (and only where) it's relevant.

## How it works

One hand-edited source, rendered to each agent's native format:

```
source/                  ← THE ONLY THING YOU EDIT
├── manifest.json        scope map: universal | claude | codex (the one place that decides where things go)
├── rules/               common principles + go / python / typescript / rust
├── agents/              reviewer / architect / simplifier / build-resolver roles
├── skills/              focus, simplify, code-review, distill, verification-loop, …
└── workflows/           ← the headline: codified multi-step procedures (runtime-neutral)

  ↓ npm run build  (build/render.mjs)

AGENTS.md                universal entry point — Codex, Amp, Cody, Aider, Gemini CLI, anything
targets/claude/          native Claude Code layout (rules, agents, skills, commands)
targets/codex/           native Codex layout (AGENTS.md, config.toml, agents/*.toml, prompts/)
```

**Never edit `AGENTS.md` or `targets/` by hand** — they're generated. `npm run check`
fails CI if they drift from `source/`.

### Scope tiers

| Scope | Renders to | For |
|-------|-----------|-----|
| `universal` | `AGENTS.md` prose **+** both targets | Practices any agent can follow as instructions |
| `claude` | `targets/claude/` only | Uses the Skill tool, subagents, or hooks |
| `codex` | `targets/codex/` only | Codex-specific prompt/agent forms |

Universal skills **degrade to prose** in `AGENTS.md` so a non-Claude agent still
gets the practice, just without the lazy-load mechanism.

## Workflows (the part you can't get from a generic style guide)

Runtime-neutral ports of orchestration formulas — multi-step DAGs that compose
the skills into a verify-gated pipeline:

- **implement-review** — plan → execute → simplify → review *as a hard gate* → finalize
- **research** — diverge → converge → premortem
- **brainstorm-loop** — divergent volume → premortem → converge
- **decompose** — split large work into independently-reviewable units
- **epic-review** — review the assembled whole at the integration boundary

## Use it

```bash
npm run build        # regenerate AGENTS.md + targets/
npm run sanitize     # release gate: scan for paths/PII/internal jargon
npm run release      # build + sanitize
```

- **Claude Code:** copy `targets/claude/*` into a project `.claude/` (or `~/.claude/`).
- **Codex:** point at this repo's `AGENTS.md`; copy `targets/codex/*` into `.codex/`.
- **Amp / Cody / Aider / Gemini CLI / other:** they read `AGENTS.md` directly.

## Provenance & license

MIT. Derived from ECC (MIT, Affaan Mustafa); see [NOTICE](./NOTICE).
