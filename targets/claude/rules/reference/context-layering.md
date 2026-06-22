---
summary: The four context layers an agent reads, and the one-fact-one-layer rule that keeps AGENTS.md thin and free of conflict with memory.
---
# Context Layering

An agent working in a project reads from four distinct layers. Each owns a
different kind of knowledge. The single rule that keeps them useful is: **a given
fact lives in exactly one layer.** Duplication across layers is how these files
rot — they drift out of sync, contradict each other, and bloat the context window.

## The four layers

| Layer | Owns | Scope | Refreshed by | Volatility |
|-------|------|-------|--------------|------------|
| **Bundle** (`rules/`, `skills/`, `workflows/`, `agents/`) | Universal practices and procedures | every project | pulling the bundle repo | stable |
| **`AGENTS.md`** | Project *intention* + *failure-mode preventions* + *pointers* | whole repo, thin | curated by hand; appended by `failure-mode-capture` | slow |
| **Compass files** (`COMPASS.md` per area) | Tribal knowledge: the *why*, the gotchas, how an area connects | one code area | `project-compass`, when the area changes | tracks the code |
| **Memory** (`CLAUDE.md`, instincts) | Host- and session-specific commands, preferences, learned habits | this machine / this agent | onboarding and learning systems | volatile |

## What AGENTS.md is for

AGENTS.md is the **intention and failure-mode-prevention layer**. It carries only
what exists nowhere else:

- **Project intention** — what this codebase is for, the invariants that must
  hold, the non-obvious constraints. Not a README restatement; the things a
  competent agent would otherwise get wrong.
- **Failure-mode preventions** — short "don't do X here, it breaks Y" entries,
  accumulated from real incidents.
- **Pointers** — where to find everything else: the installed bundle, the
  compass index, project docs.

It does **not** inline coding standards, architecture descriptions, or area-level
detail. Those live in the bundle and in compass files, and AGENTS.md links to
them. Target ceiling: ~120 lines, hard ceiling ~200. If it grows past that, the
excess belongs in a compass file or was never project-specific to begin with.

## What compass files are for

A `COMPASS.md` maps the tribal knowledge of one code area — the *why* and the
*gotchas*, not the *what* (the code is the source of truth for *what*). They live
next to the code they describe, one per major area, and carry a content-hash of
their mapped sources so staleness is detectable. AGENTS.md indexes them; it does
not duplicate their content.

## The one-fact-one-layer rule

- A lesson that is **specific to this project and generalizes across the repo**
  belongs in AGENTS.md. When such a lesson appears in memory, **promote it** into
  AGENTS.md and **remove it from memory** — never store it in both.
- A lesson **specific to one code area** belongs in that area's compass file.
- A **universal** practice belongs in the bundle, not in any one project's files.
- **Host- or session-specific** state (local commands, personal preferences)
  stays in memory and never migrates to AGENTS.md.

When two layers describe the same fact, that is a defect to resolve, not a
redundancy to tolerate. The `failure-mode-capture` command runs a dedup guard
against memory before appending, precisely to enforce this.

## Single-source projects

Some projects deliberately collapse the intention and memory layers into one
physical file — most commonly by making `CLAUDE.md` a **symlink** to `AGENTS.md`,
so every agent reads the same content under whichever name it expects. There, the
one-fact-one-layer rule is satisfied by construction: there is only one file.

Before proposing to split or dedup these layers, **check whether the memory file
is a symlink to `AGENTS.md`** (or vice versa). If it is, do not break it — keep
the single file complete and well-organized (intention, then failure-modes, then
operational notes), and treat the absence of a separate memory file as the
project's choice, not a defect.
