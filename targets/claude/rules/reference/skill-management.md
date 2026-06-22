---
summary: Discover, vet, and expose agent skills on demand with skillager, so the right skills are available per task without loading every skill into every chat.
---
# Skill Management

Skills proliferate. Pulled from project folders, packages, native agent skill
directories, and shared collections, they quickly outnumber what any one task
needs — and loading every skill body into every chat is exactly the context bloat
this bundle works to avoid (see [coding-practices discovery](./context-layering.md):
discoverable, but inert until pulled). The fix is the same here as for rules: keep
skills **searchable by metadata** and expose only the few a task actually needs.

## skillager

[skillager](https://pypi.org/project/skillager/) is a local CLI for discovering,
reviewing, searching, and exposing agent skills without loading them all. Install it
once as a user tool — it does not need to live inside every project:

```bash
uv tool install skillager      # or: pipx install skillager
skillager setup --agent codex  # discover + scan local/project/package/collection/native skills
```

Source and full guide: [github.com/jarmak-personal/skillager](https://github.com/jarmak-personal/skillager).

### The model: approval is not exposure

skillager keeps three choices separate, and that separation is the whole point:

- **Approval** — you reviewed a skill at its current content hash. Approved skills
  are *searchable*, not loaded.
- **Curation** — a project groups approved skills under tags (`workflows`, `release`).
- **Exposure** — only when you choose does skillager write a skill the agent can use.

Discovery and search stay **metadata-only** (`list`, `search`, `show`, `working`,
`doctor` do not print skill bodies). Nothing reaches the agent's context until you
expose it.

### Expose the least the task needs

| Mode | Agent sees | Use when |
| --- | --- | --- |
| `router` | one compact router that lists members, activates one on demand | a tag or a set of skills — breadth without loading bodies |
| `stub` | a tiny activation handle | a named skill you want available, body loaded only on use |
| `native` | the full reviewed skill body | a skill that is core to the project |

```bash
skillager expose --tag workflows --mode router --agent codex --scope project
```

Default to `router`/`stub` for breadth and reach for `native` only when a skill is
central — per [architecture.md](./architecture.md) §KISS/§YAGNI, expose the minimum
that solves the task, not the whole library.

### Works with this bundle

`.claude/skills/` is a native skill directory skillager scans, so the skills this
bundle ships are discoverable through it with no glue — review them once, then expose
per project on demand instead of loading the lot.

### Collections

Collections are user-global skill sources: a personal repo, a company-maintained one,
or a public set like [Superpowers](https://github.com/obra/superpowers). Tags are
project-local curation layered on top. This is how a team shares a vetted skill set
without each project vendoring it.

## Authoring skills

When you write a skill, validate its `SKILL.md` and `skillager.yaml` manifest with
[skillager-linter](https://pypi.org/project/skillager-linter/) — a standalone linter
that mirrors skillager's runtime manifest checks:

```bash
uvx skillager-linter path/to/skill
```

It catches malformed frontmatter, invalid manifest keys, and unsafe YAML before a
skill is shared. It can also back a CI or build check so a skill can't merge in a
broken or unscannable state.

## Non-invasive by default

skillager copies skills into project-local directories so you can inspect and
customize them, and it keeps mutating commands (`expose`, `review approve`) user-run
rather than auto-applied — delegate them to the agent only deliberately, via the
read-only allowlists it ships. Discovery, vetting, and exposure are explicit acts,
never a background install.
