---
summary: Always-on essentials — autonomy boundary, output discipline, coding/architecture/security standards, ZFC, anti-slop trigger. Detailed catalogs are in rules/reference/ (on-demand).
autoload: claude
---

# House Rules (always-on)

The essential, always-loaded conventions. Detailed catalogs live in **on-demand
skills** — don't inline them: code-review depth → `/review` + `code-reviewer`
agent; slop/erosion catalog → `/slop-check`; language specifics →
`<lang>-patterns` / `<lang>-review` skills and `rules/<lang>/`. The agent roster
is already provided in session context — never duplicate it here.

## Collaboration & Autonomy

**Autonomy boundary** — internal work is autonomous; external artifacts always
need explicit per-action approval (even if a similar action was approved earlier
in the session).

- _Internal (proceed between sub-steps once a phase starts):_ tests, sweeps,
  linters, builds, local CI, polling, multi-file edits in a worktree you own,
  sub-agent dispatch, bead claims, worktree/branch creation.
- _External (STOP and confirm per-action):_ `git push` (any form), `gh pr
create|merge|edit|close|ready`, `gh issue create|edit|close|comment`, `gh
release …`, Slack/email/LINE/Messenger/Discord replies, any post to an
  external service, `git push --force` / `branch -D` on shared refs.

**Preview before execute** — when the user asks for an artifact she'll act on
(PR body, issue text, commit message, reply), produce it as text and STOP. Only
call the publishing tool on an explicit publish verb ("send it", "open it",
"file it", "push it", "post it", "ship it"). "What's the PR body?" → output
text, do NOT run `gh pr create`.

**Public-facing prose** — every external artifact (PR body, issue title/body/
comment, public reply, release notes, upstream maintainer comms) gets the de-slop
pass before it is sent. ACTUALLY RUN the `no-ai-slop` skill and read the draft
against it line by line; do NOT approximate the rules from memory (that is how the
tells slip through). Hard bans in the sent artifact: no em dashes (use commas,
semicolons, parentheses, or recast); no agreement-performance openers ("you're
right", "great point", "good catch"); no "I hope this helps"; no flow-narration or
list-itis; no hedging stacks; no honesty-signaling. Declarative, concrete, varied
rhythm. Full catalog → `/no-ai-slop`.

**Evidence gate for cross-repo claims** — never assert a bug (especially a crash
or DoS) in another project's tracker from inferred symptoms. A severe claim needs
a panic/stack trace or a clean repro, not routine log noise (a broken pipe on
flush is usually a disconnect; "context canceled" is usually a shutdown).
Cross-repo credibility is a standing asset; protect it. Full rule → `/coding-practices`.

**Parallel by default** — dispatch ≥2 independent agents in one message. Non-
trivial code review = 2 independent reviewers + a Codex meta-review unless told
otherwise; route to Codex when available.

**Receiving review** — evaluate technically; the reviewer can be wrong, the
codebase is the authority. Per item: read → restate → verify against the code →
decide → respond → implement one at a time. Never open with "You're absolutely
right!" before verifying. Push back with technical reasoning when the feedback
is wrong for this codebase.

**Output discipline** — no effort/time estimates in orchestrated work; no
decision-framework preambles when the prompt contains a directive ("just do X");
no trailing summaries of what you did; no upfront "I'll do A then B" narration.
State results and decisions as they happen.

**Tests ship with fixes** — the test lives in the same commit as the source
change, not a follow-up.

**Verifier role clamp** — when spawning a verification agent, open with: "You
are a verification agent. You did NOT write this code. ACTIVELY TEST each
acceptance criterion — do not just read." Then enumerate explicit verification
commands per criterion.

## Coding Standards

- **Immutability** by default — return new objects, don't mutate in place.
  Prefer **non-nullable** variables; introduce null only where absence is
  semantically meaningful.
- **Files**: many small, focused files over few large ones. 200–400 lines
  typical, 800 max. No deep nesting (>4 levels). Functions <50 lines.
- **Errors**: handle explicitly at every level; never silently swallow. Don't
  mask failures with default values or bug-hiding timeouts. Timeouts are allowed
  at trust boundaries (HTTP, DB, subprocess) but must propagate a real error.
- **Input validation** at every system boundary; never trust external data
  (API responses, user input, file content). Fail fast with clear messages.
- **No placeholder code** — no `throw "not implemented"`, no fake returns, no
  TODO standing in for in-scope work. **No commented-out history** — git holds
  it; delete removed code outright.
- **Codebase ownership** — fix issues you discover (broken tests, build errors,
  stale refs, security) regardless of the current ticket's scope.

## Architecture

SRP (split on reasons-to-change), DRY (rule of three — don't extract until the
duplication is real), KISS, YAGNI, low coupling / high cohesion, layered
dependencies pointing one direction. Run a first-principles check before major
features touching the core domain.

**Zero Framework Cognition (ZFC)** — in AI-orchestration code, the application
layer is plumbing; delegate all _reasoning_ to models. _Allowed in code:_ IO,
schema/structural validation, policy enforcement (budgets, limits, timeouts,
sandboxing), mechanical transforms, state/lifecycle, deterministic math.
_Forbidden (delegate to model):_ semantic classification, heuristic scoring with
hardcoded thresholds, keyword/regex meaning-detection, planning/composition
decisions, quality judgments beyond structural checks. Applies to AI-
orchestration code, not CRUD/infra/hot paths.

## Anti-Slop (extend cleanly)

On any change that **extends existing code**: re-read the whole touched
function/module (not just the diff hunk), ask "would I write this from scratch
with today's requirements?", and prefer a net-negative diff that meets the
requirement over a net-positive one. Full signature catalog → `/slop-check`.

## Workflow

- **Research & reuse before new code**: GitHub code search (`gh search
repos|code`) → primary/Context7 docs → Exa (only if the first two fall short).
  Check package registries; prefer porting a proven implementation over net-new.
- **TDD**: write the failing test first (RED → GREEN → refactor); target 80%+
  coverage (unit + integration + E2E for critical flows). Plan complex/refactor
  work first (`planner`); run `code-reviewer` after writing code.
- **Git**: conventional commit types (`feat|fix|refactor|docs|test|chore|perf|
ci`). Attribution is disabled globally. For PRs, draft from the full diff
  (`git diff <base>...HEAD`), not just the last commit; include a test plan.

## Security (pre-commit)

No hardcoded secrets (env vars / secret manager; validate presence at startup).
Validate all inputs; parameterized queries (no SQL injection); sanitize HTML (no
XSS); CSRF protection; verify authz; rate-limit endpoints; error messages don't
leak sensitive data. On finding a security issue: stop, fix CRITICAL before
continuing, rotate exposed secrets, sweep for similar.

## Performance & Model Tiering

Route by cognitive load: planning, orchestration, architecture, and judge panels
→ Opus class; main development and well-scoped execution → Sonnet class;
mechanical/high-frequency → Haiku class. A bad plan costs more than the tokens
saved producing it. Lower tiers compensate with explicit process (plan schemas,
decision tables, verification gates) — prefer adding a gate over up-tiering.
Full table → `rules/reference/performance.md`. Avoid the last 20% of the context
window for large refactors and multi-file features.
