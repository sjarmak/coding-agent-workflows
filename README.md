# coding-agent-workflows

Coding standards, agent roles, skills, and multi-step workflows that read the
same whether you drive Claude Code, Codex, Amp, or anything that reads an
`AGENTS.md`. One neutral source renders to a native config for each agent, and
the agent-specific pieces stay scoped to the agents that need them.

Everything is pre-rendered and committed. There is no build step between clone
and use, and installing is a plain file copy: no hooks, no daemons, nothing
running in the background.

## Install

```bash
git clone https://github.com/sjarmak/coding-agent-workflows.git
cd coding-agent-workflows
```

Then install for your agent:

```bash
./install.sh claude          # Claude Code config into ./.claude (project-level; `./install.sh claude ~` for user-level)
./install.sh codex           # AGENTS.md + AGENTS.full.md into the current dir, Codex config into ~/.codex
./install.sh agents          # AGENTS.md (thin index) + AGENTS.full.md (Amp, Aider, Gemini CLI, ...)
./install.sh init            # scaffold a thin, project-specific AGENTS.md (intention + pointers)
./install.sh upgrade         # re-install, then prune files dropped since the last install
./install.sh remove          # delete exactly what a prior claude install placed in .claude
```

Pass a destination as the second argument to target a specific project, for
example `./install.sh claude ~/work/myrepo`. The `claude` install writes a
manifest of every file it owns and backs up any pre-existing file it would
otherwise overwrite; `remove` undoes exactly that manifest, so a user-level
install never silently clobbers hand-authored config. A separate `fleet`
subcommand installs a machine-level conformance scanner into `~/.claude/fleet`;
it is the one mode that wires a hook, and it says so when it runs.

If you would rather not run a script, copy what you need: Claude Code reads a
`.claude/` directory, so copy `targets/claude/{rules,agents,skills,commands}`
into one. Codex reads `AGENTS.md` at the repo root plus `~/.codex`, so place
`AGENTS.md` + `AGENTS.full.md` at your root and copy
`targets/codex/{config.toml,agents,prompts,skills}` into `$CODEX_HOME` (falling
back to `~/.codex`). Every other
`AGENTS.md`-aware agent needs only those two files at your repo root.

## Layout

| Path | Contents |
| --- | --- |
| `AGENTS.md` | Thin always-loaded index; points by section into the full bundle |
| `AGENTS.full.md` | The full bundle: principles, agent roster, skills, workflows, as prose any agent can follow |
| `targets/claude/` | Native Claude Code layout: `rules/`, `agents/`, `skills/`, `commands/` |
| `targets/codex/` | Native Codex layout: `config.toml`, `agents/` (one standalone TOML per agent), `prompts/`, `skills/` |
| `source/` | The only hand-edited layer; everything above renders from it |

The index-plus-manual split keeps loaded context small: agents auto-load the
thin `AGENTS.md` and pull in sections of `AGENTS.full.md` only when a task
needs them. For an agent that can only ever read one file, copy
`AGENTS.full.md` as its `AGENTS.md`.

The rules cover architecture, coding style, testing, security, git and
development workflow, performance, context layering, task management, skill
management, and anti-slop, plus language specifics for Go, Python, TypeScript,
and Rust. Twenty-eight skills and seven workflows operationalize them. Claude
Code auto-discovers skills, agents, and commands but does not auto-load
`rules/`; the generated `coding-practices` skill indexes the rules so an agent
reads only the one it needs, on demand.

## Workflows

Each workflow is a multi-step procedure that composes the skills into a
repeatable sequence:

- **implement-review**: plan, execute, simplify, then review as a hard gate before finalizing.
- **research**: diverge across angles, converge to a recommendation, pre-mortem it.
- **brainstorm-loop**: generate shape-distinct ideas, pre-mortem the frontrunners, converge.
- **decompose**: split large work into independently reviewable units.
- **epic-review**: review the assembled whole at the integration boundary.
- **project-init**: recon a repo and fill in its thin `AGENTS.md` intention layer.
- **fleet-conformance**: audit every repo on a machine against the bundle.

The review-as-a-gate step in `implement-review` is the load-bearing one: the
reviewing agent checks the diff against the acceptance criteria with authority
to reject and retry from a fresh context.

## Project context layers

`install.sh init` plus the `project-init` workflow set up four layers, each
owning one kind of knowledge so no fact is stored twice: the **bundle**
(universal practices, installed once), a thin per-project **`AGENTS.md`**
(intention and failure-mode preventions, with pointers to the rest), per-area
**`COMPASS.md`** files (the why, the gotchas, kept fresh with a content hash),
and agent **memory** (host- and session-specific state). Maintenance is
explicit, not automated: the `failure-mode-capture` skill appends a prevention
to `AGENTS.md`, and `project-compass` refreshes a map when an area changes. The
boundary rules live in the `context-layering` practice.

## Two kinds of slop, two separate guards

Code slop and writing slop never share a tool. The
[`slop-check`](./source/skills/slop-check/SKILL.md) skill scores a diff for
erosion (dead branches and redundant structure that accrue as code is extended)
and verbosity, mirroring the [SlopCodeBench](https://www.scbench.ai) judge
rubric; the same rubric backs the anti-slop rule in
[`source/rules/common/`](./source/rules/common/) and the slop pass in the
`code-reviewer` agent. The
[`writing-voice`](./source/skills/writing-voice/SKILL.md) skill guards prose
(articles, docs, READMEs) against telltale AI writing patterns. Separately, the
[`caveman`](./source/skills/caveman/SKILL.md) skill cuts conversational token
use by roughly 75% while preserving technical accuracy.

## Companion tools

Two rules point at external tools chosen for the same reason the bundle is
built the way it is: capability without background weight.
[skillager](https://github.com/jarmak-personal/skillager) (the
`skill-management` rule) discovers, vets, and exposes agent skills on demand,
so a session loads only the few a task needs.
[beads_rust](https://github.com/Dicklesworthstone/beads_rust) (the
`task-management` rule) is a dependency-aware task store frozen at SQLite plus
JSONL, with the fuller [beads](https://github.com/gastownhall/beads) as the
upgrade path when a project needs multi-machine sync.

## CI and architecture page

CI (`.github/workflows/check.yml`) fails any push or PR where the committed
`AGENTS.md`, `AGENTS.full.md`, or `targets/` drift from a fresh render of
`source/`, then sanitize-scans the rendered output for stray paths, PII, and
internal jargon. A LikeC4 model under `architecture/` deploys to
[an interactive architecture page](https://sjarmak.github.io/coding-agent-workflows/)
on every push that touches it.

## Related

- [agent-workflows](https://github.com/sjarmak/agent-workflows): twenty-one
  experimental multi-agent workflow skills for Claude Code (parallel research,
  debate, stress-testing, review). The experimental sibling; this repo carries
  the curated, agent-neutral set.

## Maintainer notes

`AGENTS.md`, `AGENTS.full.md`, and `targets/` are generated; edit `source/`
only, then run:

```bash
npm run build      # regenerate AGENTS.md + AGENTS.full.md + targets/ from source/
npm run sanitize   # scan rendered output for paths, PII, internal jargon
npm run validate   # structural validation of the rendered bundle
npm run release    # build + sanitize + validate
npm run check      # CI gate: fail if committed output drifted from source/
```

`source/manifest.json` is the scope map (`universal`, `claude`, or `codex`)
deciding where each artifact renders; `rule_overrides` marks individual rules
as agent-specific, and `templates` lists project-scaffolding files that ship
verbatim into each target.

## Provenance and license

MIT. Derived from
[Everything Claude Code](https://github.com/affaan-m/everything-claude-code)
(MIT, Affaan Mustafa). The augmented-coding-patterns rule synthesizes the
[Augmented Coding Patterns](https://lexler.github.io/augmented-coding-patterns/)
catalog; the anti-slop rule and `slop-check` skill adapt the code-erosion
rubric from [SlopCodeBench](https://github.com/SprocketLab/slop-code-bench).
See [NOTICE](./NOTICE).
