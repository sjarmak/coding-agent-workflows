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
./install.sh agents          # portable instructions, skills, references, and language rules
./install.sh init            # scaffold a thin, project-specific AGENTS.md (intention + pointers)
./install.sh upgrade         # Claude: re-install, then prune previously owned files
./install.sh codex-upgrade   # Codex: re-install, then prune previously owned files
./install.sh remove          # delete exactly what a prior claude install placed in .claude
```

Pass a destination as the second argument to target a specific project, for
example `./install.sh claude ~/work/myrepo`. The `claude` install writes a
manifest of every file it owns and backs up any pre-existing file it would
otherwise overwrite; `remove` undoes exactly that manifest, so a user-level
install never silently clobbers hand-authored config. Codex records ownership
inside `$CODEX_HOME` and backs up collisions before copying; `codex-upgrade`
prunes only previously owned files. Symlinked artifact paths are skipped; a
symlinked Codex install root is rejected. Portable installs place universal
skills in `.agents/skills/` and rules in `.agents/rules/`. A separate `fleet`
subcommand installs a machine-level conformance scanner into `~/.claude/fleet`;
it is the one mode that wires a hook, and it says so when it runs.

If you would rather not run a script, copy what you need: Claude Code reads a
`.claude/` directory, so copy `targets/claude/{rules,agents,skills,commands}`
into one. Codex reads `AGENTS.md` at the repo root plus `~/.codex`, so place
`AGENTS.md` + `AGENTS.full.md` at your root and copy
`targets/codex/{config.toml,agents,prompts,skills,rules}` into `$CODEX_HOME` (falling
back to `~/.codex`). For other agents, use the `agents` installer so the
procedures and supporting resources are available alongside the index. Copying
only the two Markdown files provides an overview, not the complete skill bundle.

## Layout

| Path | Contents |
| --- | --- |
| `AGENTS.md` | Thin always-loaded index; points by section into the full bundle |
| `AGENTS.full.md` | The full bundle: principles, agent roster, skills, workflows, as prose any agent can follow |
| `targets/claude/` | Native Claude Code layout: `rules/`, `agents/`, `skills/`, `commands/` |
| `targets/codex/` | Native Codex layout: `config.toml`, `agents/` (one standalone TOML per agent), `prompts/`, `skills/`, `rules/` |
| `source/` | Hand-edited practices, manifest, and dependency/provenance catalog |
| `optional/skills/` | Opt-in skills excluded from default installations |

The index-plus-manual split keeps loaded context small: agents auto-load the
thin `AGENTS.md` and pull in sections of `AGENTS.full.md` only when a task
needs them. For an agent that can only ever read one file, copy
`AGENTS.full.md` as its `AGENTS.md`.

The rules cover architecture, coding style, testing, security, git and
development workflow, performance, context layering, task management, skill
management, and anti-slop, plus language specifics for Go, Python, TypeScript,
and Rust. The [manifest](source/manifest.json) is the current inventory of
skills and workflows. Claude loads the small always-on rule set from `rules/`;
the generated `coding-practices` skill indexes the detailed common rules under
`rules-reference/` for on-demand reading.

## Skill surface and ownership

The [catalog](source/catalog.json) records each shipped skill's origin,
collection, and required skills, plus rule-to-skill dependencies. Validation
checks those records against the manifest and runtime scope. `requires` means
the referenced skill or resource must ship for the advertised procedure to work,
including a selected protocol; it does not mean invoking it on every run.
Categories describe ownership and
purpose; they do not imply that every skill should run on every task.

- **Core:** portable implementation, review, research, testing, and documentation
  workflows, including `property-testing` and `no-ai-slop`.
- **Engineering:** repository hygiene, measured performance investigations, and
  browser QA. Load these when the task calls for them.
- **Agent systems:** eval design, traceability, and reliability protocols. These
  carry evidence contracts without assuming a particular product or service.
- **Runtime:** native mechanisms such as Codex's goal-driven `ultracode` loop
  and Claude-specific workflow accelerators.
- **Optional:** personal interaction modes. `caveman` remains available under
  `optional/skills/caveman`; copy that folder into a supported native skill
  directory only when wanted. It is no longer installed by default.

Project commands, datasets, service credentials, and domain-specific verifier
procedures belong in project-local skills or separately maintained collections.
Promote a practice only when its assumptions can be stated without those local
contracts. An installed skill is not evidence of recent invocation; absence
from a runtime directory is not sufficient reason to retire it.

When reconciling a live skill back into this bundle, review its complete body
and resources, preserve attribution, declare dependencies, and remove local
paths and work-specific examples. Update the catalog and render all targets.
Do not bulk-copy the entire installed environment into the shared core.

## Audited capabilities

The [surface inventory](source/surface-inventory.json) accounts for every named
skill found in the 2026-10-01 cross-project audit, including hidden collections,
plus runtime-managed plugins and tool integrations. Each entry has a disposition,
a reason, and a concrete coverage target. `npm run validate` rejects missing
shipped-skill records and broken coverage targets. This is a reviewed snapshot,
not live usage telemetry; future audits must reconcile newly installed skills too.

The bundle includes **impeccable** with its scripts and design references,
**code-graph** alongside the Codegraph rule and code-search role, **graphify**,
specialist graph queries, session search, documentation lookup, codeprobe,
framework patterns, visual explanation and Tufte charts, and research procedures.
Overlapping names map to maintained procedures rather than duplicate instructions.
Project-specific service commands and private deployment contracts remain local.

[Tool integrations](docs/tool-integrations.md) explains prerequisites and fallbacks.
External CLIs, MCP servers, paid providers, and provider-owned plugins are explicit
dependencies: installing the bundle does not install or enable those services.
Load skill bodies on demand; the larger catalog is not a direction to run every
procedure or add every tool to a project.

## Workflows

The [code-search specialist](docs/code-search.md) handles substantial code
investigations in either client, using Codegraph when available and returning
source citations and change guidance to the main agent.

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
[`no-ai-slop`](./source/skills/no-ai-slop/SKILL.md) skill edits prose
while preserving the writer's intent and voice. The optional
[`caveman`](./optional/skills/caveman/SKILL.md) mode changes conversational style;
it is separate from prose editing and is not a default engineering practice.

## Companion tools

The `skill-management` rule describes metadata-first discovery and selective
exposure, with skillager as one available adapter. The `task-management` rule
honors the consuming repository's authoritative tracker and backend. Neither
installing this bundle nor creating a handoff migrates a project's task store.

## CI and architecture page

CI (`.github/workflows/check.yml`) fails any push or PR where the committed
`AGENTS.md`, `AGENTS.full.md`, or `targets/` drift from a fresh render of
`source/`, then sanitize-scans the rendered output for stray paths, PII, and
internal jargon, validates scopes and dependencies, and runs the regression
suite. A LikeC4 model under `architecture/` deploys to
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
deciding where each artifact renders; `source/catalog.json` records provenance
and skill dependencies. `rule_overrides` marks individual rules
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
