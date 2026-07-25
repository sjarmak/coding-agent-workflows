---
name: dashboard
summary: Generate a self-contained HTML status page for the current repo (or a rollup across several), scoped to the question the user actually asked.
description: "Generate an HTML dashboard of project status and recent outputs, scoped to what the user asks about. Use when the user asks for a dashboard or project status, asks what is blocking a release, what needs attention, or where work was left off, or wants a visual read on a repo instead of scrolling terminal output. Renders a self-contained page to .dashboard/index.html, plus a rollup mode across several repos."
scope: universal
---

# Dashboard

Answer a status question about a repo with a page instead of a wall of terminal
output. The model decides what matters and writes the answer; a shipped renderer
turns that into HTML. The page is a **snapshot**, generated on demand, stamped
with its own generation time and honest about the age of every panel.

## When to use

- "dashboard" / "show me project status" / "what's going on in this repo"
- "what's blocking the release", "what needs me", "where did I leave off"
- A rollup across several checkouts: "dashboard across these repos"
- An explorable overview of what a project *contains*: "show me the skills and
  resources here", "map what's in this repo", "what can this project do"
- Not for: answering one narrow factual question (just run the command), or
  anything that needs live-updating state (this writes a static file).

## ZFC boundary

Mechanism gathers and renders; **the model decides and writes**. Do not encode
what counts as important into the renderer, and do not hand-write HTML.

- **Mechanism:** running read-only commands, the allowlist gate
  (`allowlist.mjs`), all markup, layout, escaping, staleness arithmetic,
  severity ordering (`render.mjs`), reading and writing the profile.
- **Model:** which panels answer this question, which panel *kind* fits each
  collector's output, what the written answer says, what belongs in needs-attention
  and in what order of severity.

## Invocation

Bare, the model picks a sensible default set for the repo. With a question, the
panels are whatever answers that question and nothing else.

| Form | Behavior |
|------|----------|
| `dashboard` | default panel set for this repo |
| `dashboard <question>` | whatever shape and contents answer the question |
| `dashboard --run <panel>` | same, but that panel's collector executes fresh |
| `dashboard rollup <path> <path> …` | one page, one collapsible section per repo |

## Phase 0 — Workspace (mechanism)

Work in `.dashboard/` at the repo root. On first use create it along with a
self-ignoring `.gitignore` containing a single `*` line, so the directory stays
untracked without ever editing the project's own `.gitignore`.

```
.dashboard/
  .gitignore     # a single line: *
  profile.json   # cached capability discovery (never committed)
  index.html     # the rendered page, overwritten each run
```

## Phase 1 — Profile (mechanism)

Read `.dashboard/profile.json` if it exists. If it does not, discover the repo's
capabilities once and write it. Discovery answers stable questions only: which
VCS, whether a task store is present, the package manager, how tests are invoked
if that is knowable from config. It caches *what exists*, never *what to show*.

```json
{
  "schema": 1,
  "project": "spoon-knife",
  "discovered_at": "2026-07-25",
  "capabilities": {
    "vcs": "git",
    "task_store": "bd",
    "package_manager": "cargo",
    "test_command": "cargo nextest run"
  },
  "collectors": {
    "ci": {
      "cmd": "gh run list --limit 5 --json status,conclusion,workflowName",
      "kind": "table",
      "allowlist_prefix": "gh run list",
      "learned": "2026-07-25"
    }
  }
}
```

Re-verify cheaply on later runs (the recorded tool still exists, the repo is
still a repo). A capability that has disappeared is removed from the profile, not
worked around silently.

## Phase 2 — Choose the shape, then the contents (model)

The intent picks the shape first. Getting this wrong produces a page that is
technically correct and useless: a status readout answers "how is it doing", and
no arrangement of status panels answers "what is in here".

| Shape | The question behind it | Page |
|-------|------------------------|------|
| **status** | how is this repo doing right now | panels of current state |
| **rollup** | what needs me across these repos | one status section per repo |
| **atlas** | what does this project contain, let me explore it | searchable, filterable catalog |

Signals for **atlas**: the ask is about understanding, inventory, capability, or
navigation ("what's in here", "show me the skills", "map the resources", "what
can this do"), and the useful answer is a browsable structure rather than a
number that changes hour to hour.

Then pick the contents. A narrow question gets a narrow page: three panels that
bear on the release beat nine that cover the repo. With no question at all,
default to **status** with a panel set drawn from the profile's capabilities.

## Phase 3 — Collect (mechanism, gated)

**Read-only by default.** Nothing that builds, writes, installs, or mutates runs
unless the user named it with `--run` in this invocation.

For an **atlas**, collection is *reading*, not running: the manifest or config
that declares what ships, the frontmatter of each resource, the directory
structure, and the declared edges between resources (what invokes what, what
depends on what). Use the file-reading tools for this. The allowlist governs
stored shell commands and has nothing to say about reading a file. Read what the
project *declares* about itself before inferring from filenames — a manifest that
lists 29 skills is authority; a directory with 30 entries in it is a hint.

Built-in collectors, all read-only:

- **Code & VCS** — `git status --porcelain`, `git log`, `git branch -vv`,
  `git worktree list`, `git stash list`, `git rev-list --count` for
  ahead/behind, `git for-each-ref` for branch age.
- **Work queue & agents** — the task store's read verbs (`bd ready`,
  `bd blocked`, `bd show`), TODO/FIXME density via `rg --count`, and whatever
  in-flight agent, background-task, or worktree state the host exposes.

Everything else is **learned**. When the question needs a collector that does not
exist, work out a read-only command that answers it, then gate it:

```
node <skill-dir>/allowlist.mjs "gh run list --limit 5 --json status"
  exit 0 -> render the panel AND append it to profile.collectors
  exit 1 -> ask the user to approve this one run; never store it
```

The gate is mechanical and non-negotiable: never persist a command that exits
non-zero, and never hand-wave past it because the command looks harmless. Its
scope is honest and limited — it stops a stored command from quietly becoming a
different command between runs; it is not a sandbox.

Record `collected_at` for every panel from when its command actually ran. If a
collector fails, say so in that panel rather than omitting it; a missing panel
reads as "nothing to report", which is a different claim.

## Phase 4 — Render (mechanism)

Write the payload as JSON to a temp file **outside the repo**, then render.
The payload is not kept; only `index.html` lands on disk.

```
node <skill-dir>/render.mjs <payload.json> .dashboard/index.html
```

The renderer validates the payload and fails loudly on any mismatch. Fix the
payload; do not route around it.

### Payload

```json
{
  "schema": 1,
  "project": "spoon-knife",
  "generated_at": "2026-07-25T13:42:00Z",
  "question": "what's blocking the release",
  "answer": "Two beads block the milestone, both waiting on the same auth refactor.\n\nNothing is in flight against it.",
  "attention": [
    { "text": "bd-142 blocked 6 days, no owner", "severity": "high", "ref": "bd-142" }
  ],
  "panels": [
    {
      "id": "git",
      "title": "Working tree",
      "kind": "stat",
      "source": "git status --porcelain",
      "collected_at": "2026-07-25T13:41:00Z",
      "stale_after_minutes": 30,
      "data": { "items": [
        { "label": "unpushed", "value": 3, "state": "warn", "hint": "vs origin/main" }
      ] }
    }
  ]
}
```

`answer` is two to four sentences answering the exact question asked. `attention`
is ranked by `severity` (`high` / `medium` / `low`); the renderer orders it, so
supply severities rather than pre-sorting. Both are optional and are omitted from
the page when absent — an empty needs-attention list is better left out than
padded.

### Panel kinds

Every collector's output maps onto one of six. Pick by the shape of the data.

| Kind | `data` | Use for |
|------|--------|---------|
| `stat` | `items: [{label, value, state?, hint?}]` | a few headline numbers |
| `list` | `items: [{text, state?, meta?}]` | ranked or flat item lists |
| `table` | `columns: [], rows: [[]], row_states?: []` | several fields per row |
| `timeline` | `events: [{when, text, meta?}]` | anything ordered by time |
| `log` | `lines: []` | raw command output worth showing verbatim |
| `diff` | `lines: []` | patch text, colored by leading `+`/`-` |

`state` is one of `ok` / `warn` / `bad` / `neutral`. Unknown values render
neutral rather than becoming markup.

### Rollup

For several repos, send `repos` instead of `panels`; each entry takes its own
`name`, optional `path` and `answer`, optional `attention`, and its own `panels`.
The top-level `answer` covers the whole set. Each repo renders as a collapsible
section with a severity dot and a count.

### Atlas

For an explorable catalog, send `catalog` instead of `panels`. The renderer emits
every entry as static HTML and adds one inline script that filters what is
already on the page, so search and facets work offline and the full catalog
survives with scripting disabled.

```json
{
  "schema": 1,
  "project": "agentic-coding-practices",
  "generated_at": "2026-07-25T13:42:00Z",
  "question": "what is in this project",
  "answer": "Five layers ship from one source tree, rendered per agent.",
  "catalog": {
    "search_placeholder": "by name or description",
    "facets": [
      { "key": "scope", "label": "Scope", "values": ["universal", "claude"] },
      { "key": "type", "label": "Type", "values": ["skill", "agent", "workflow"] }
    ],
    "groups": [
      {
        "name": "Skills",
        "note": "Invoked by name; universal ones also render into AGENTS.md prose.",
        "items": [
          {
            "name": "grill-me",
            "summary": "Interview until every design fork has a decision",
            "facets": { "scope": "universal", "type": "skill" },
            "badges": ["universal"],
            "detail": "Optional longer text, shown when the row is expanded.",
            "relations": [{ "label": "invoked by", "targets": ["research", "decompose"] }],
            "path": "source/skills/grill-me/SKILL.md"
          }
        ]
      }
    ]
  }
}
```

Rules the renderer enforces, so build the payload to match:

- A facet key must be alphanumeric (it becomes part of an attribute name) and
  every key is declared once in `facets`.
- An item may only use a declared facet key, and only a value listed for that
  key. This is what guarantees no filter chip can match zero rows by accident.
- Groups and items are non-empty. An empty group is a fact about the project;
  say it in `answer`, do not render a blank section.

Choose groups the way someone exploring would look for things, and put the
relationships in `relations` — the edges between resources are the part a
directory listing cannot show. Search covers name, summary, and badges, so put
the words someone would actually type into those three fields.

## Phase 5 — Deliver

Print the `file://` path to `index.html`, and on hosts that can display a local
file inline, hand it back so it renders in place. Where inline display is not
available, the printed path is the whole delivery — say so plainly instead of
claiming the page was shown.

## Rules

- The page is a snapshot. Never describe it as live, and never let a panel imply
  currency it does not have; that is what `collected_at` is for.
- Pick the shape from the intent, not from habit. Status panels bolted onto an
  inventory question are the main failure mode here.
- An atlas states what the project declares. If the manifest and the directory
  disagree, show both and say which is authoritative rather than quietly
  reconciling them.
- Never write anything into the repo outside `.dashboard/`.
- Never widen a collector from read-only to executing because it would give a
  better panel. `--run` is the user's call, per invocation.
- No panel for a capability the repo lacks. Nine mostly-empty panels are worse
  than three that answer the question.

## Verification

`allowlist.test.mjs` and `render.test.mjs` ship next to the modules and run on
plain node with no dependencies. Run both after changing either module.
