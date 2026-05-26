# coding-agent-workflows

A curated, **agent-neutral** set of coding practices — rules, agent roles,
skills, and multi-step workflows — for working with AI coding agents. Use the
same standards and workflows whether you drive Claude Code, Codex, Amp, Cody, or
anything that reads `AGENTS.md`, with agent-specific pieces kept where they're
relevant.

Everything is **pre-rendered and committed** — there's no build step to run.

## Install

```bash
git clone https://github.com/sjarmak/coding-agent-workflows.git
cd coding-agent-workflows
```

Then install for your agent:

```bash
./install.sh claude          # → ./.claude  (project-level; use `./install.sh claude ~` for user-level)
./install.sh codex           # → AGENTS.md in current dir + config into ~/.codex
./install.sh agents          # → just AGENTS.md (Amp, Cody, Aider, Gemini CLI, …)
```

Pass a destination as the second argument to target a specific project, e.g.
`./install.sh claude ~/work/myrepo`.

Prefer no script? Just copy what you need:

- **Claude Code** — copy `targets/claude/{rules,agents,skills,commands}` into a `.claude/` directory.
- **Codex** — put `AGENTS.md` at your repo root; copy `targets/codex/{config.toml,agents,prompts}` into `~/.codex`.
- **Amp / Cody / Aider / Gemini CLI / other** — put `AGENTS.md` at your repo root. That single file is the whole integration.

## What's inside

- **`AGENTS.md`** — the universal layer: principles, agent roster, skills, and full workflows, as prose any agent can follow.
- **`targets/claude/`** — native Claude Code layout: `rules/`, `agents/` (subagents), `skills/`, `commands/`.
- **`targets/codex/`** — native Codex layout: `AGENTS.md`, `config.toml`, `agents/*.toml`, `prompts/`.

### The workflows (the part a generic style guide won't give you)

Multi-step procedures that compose the skills into a verify-gated pipeline:

- **implement-review** — plan → execute → simplify → review *as a hard gate* → finalize
- **research** — diverge → converge → premortem
- **brainstorm-loop** — divergent volume → premortem → converge
- **decompose** — split large work into independently-reviewable units
- **epic-review** — review the assembled whole at the integration boundary

## Provenance & license

MIT. Derived from [Everything Claude Code](https://github.com/affaan-m/everything-claude-code)
(MIT, Affaan Mustafa); the augmented-coding-patterns rule synthesizes the
[Augmented Coding Patterns](https://lexler.github.io/augmented-coding-patterns/)
catalog. See [NOTICE](./NOTICE).

---

<details>
<summary><b>Maintainer notes</b> (you don't need these to <i>use</i> the repo)</summary>

The committed `AGENTS.md` and `targets/` are generated from `source/` — the only
hand-edited layer. To change the bundle: edit `source/`, then:

```bash
npm run build      # regenerate AGENTS.md + targets/ from source/
npm run sanitize   # release gate: scan rendered output for paths/PII/internal jargon
npm run release    # build + sanitize
npm run check      # CI: fail if committed output drifted from source/
```

`source/manifest.json` is the scope map (`universal` | `claude` | `codex`) and
decides where each artifact renders; `rule_overrides` can mark an individual
rule file (e.g. `hooks.md`) as Claude-only so it stays out of the universal layer.

</details>
