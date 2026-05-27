---
name: review
description: Multi-model code review of uncommitted changes. Spawns parallel reviewers across providers (Anthropic reuse/quality/efficiency + Codex grounded review) so blind spots in one model are caught by another. Use after writing or modifying code, before opening a PR, or when /simplify alone feels insufficient. Codex consistently catches semantic bugs that pattern-matching reviewers miss, keep it in the loop on anything non-trivial.
---

# Multi-Model Code Review

Cross-provider review of uncommitted changes. The premise: any single model has consistent blind spots, so a parallel quartet (three Anthropic specialists plus Codex / GPT-5) catches more real bugs than three Anthropics alone. Empirically, codex caught a real correctness bug on PR #470 (sharing `bulkTargetForAgent` between scale_check and work_query paths) that all three Anthropic reviewers missed.

## Phase 1: Identify Changes

Run `git diff` (or `git diff HEAD` if there are staged changes) to see what changed. If there are no git changes, review the most recently modified files that the user mentioned or that you edited earlier in this conversation.

If the diff is large, write it to `/tmp/review-diff.txt` once and reference that path in each agent prompt, agents can read the file directly instead of receiving the diff inline.

## Phase 2: Launch Four Reviewers in Parallel

Send a single message with four `Agent` tool calls so they run concurrently.

### Agent 1: Code Reuse (general-purpose)

Look for existing utilities and helpers that the new code duplicates. Common locations: utility directories, shared modules, files adjacent to the changed ones, and the language's standard library. For each new function, search the codebase for an existing one that does the same thing. Flag inline logic that could use an existing utility, hand-rolled string manipulation, manual path handling, custom environment checks, ad-hoc type guards, ad-hoc subprocess calls.

### Agent 2: Code Quality (general-purpose)

Hacky patterns to flag:

- **Redundant state**: state that duplicates existing state, cached values that could be derived, observers that could be direct calls
- **Parameter sprawl**: new parameters added to a function instead of generalizing or restructuring existing ones
- **Copy-paste with slight variation**: near-duplicate code blocks that should be unified
- **Leaky abstractions**: exposing internal details that should be encapsulated, or breaking existing abstraction boundaries
- **Stringly-typed code**: raw strings where constants, enums, or branded types already exist
- **Unnecessary comments**: comments narrating what the code does (well-named identifiers already do that) or referencing the task, keep only non-obvious WHY (hidden constraints, subtle invariants, workarounds)
- **Boundary violations**: directories or modules with architectural rules (search for `boundary_test.go`, `arch-test`, ESLint `no-restricted-imports`, etc.) that the change might violate
- **Slop & erosion** (`rules/common/anti-slop.md`): single-implementer interfaces / single-entry registries / factories returning a constant (overengineering), caching of constants or parallelism for tiny collections (premature optimization), narration comments and echo docstrings (documentation noise), success-booleans / generic error messages / retries that swallow failures (error obscuring), silent fallbacks and auto-correction (hidden behavior), and unrequested features or no-op validation (spec deviation). Weight toward code that **extends** an existing module — apply the erosion test: _would this look like this if written from scratch with today's requirements?_

### Agent 3: Efficiency (general-purpose)

- **Unnecessary work**: redundant computations, repeated file reads, duplicate API calls, N+1 patterns
- **Missed concurrency**: independent operations run sequentially when they could run in parallel
- **Hot-path bloat**: new blocking work added to startup or per-request hot paths
- **Recurring no-op updates**: state updates inside loops that fire unconditionally, add a change-detection guard
- **Unnecessary existence checks**: pre-checking before operating (TOCTOU anti-pattern), operate directly and handle the error
- **Memory**: unbounded data structures, missing cleanup, listener leaks

### Agent 4: Codex Grounded Review

Codex reads the actual files and gives a grounded second-opinion across a different model family. It's particularly good at catching:

- Semantic bugs that depend on cross-file invariants
- Helper functions that work for one caller but break another (the `bulkTargetForAgent` class of bug)
- Mismatches between code and existing test assertions

Pass codex the diff inline (or `/tmp/review-diff.txt`) plus a focused list of correctness questions, not "review this." Frame specific risks and ask codex to verify or refute each one against the source.

**Invocation:** Use the `codex` CLI directly via `Bash` (custom subagent types are not supported by the Agent tool). Run in the background so it executes concurrently with the other agents:

```bash
codex exec -s danger-full-access -m gpt-5.4 --color never -C <repo-root> \
  -o /tmp/codex-review.txt \
  - <<'PROMPT'
<your correctness questions referencing /tmp/review-diff.txt>
PROMPT
```

Read `/tmp/codex-review.txt` after it completes. Verify the output shows `model: gpt-5.4` (not a Claude model). If codex is unavailable (auth failure, CLI missing), continue with the other reviewers and note in the final summary that codex was skipped.

## Phase 3: Copilot/GPT Grounded Review

Copilot provides a third-provider perspective via the GitHub Copilot CLI. The point is cross-provider coverage, so **the call MUST pin a non-Claude model**: Copilot CLI's own default is `claude-sonnet-4.6`, which defeats the purpose entirely. Always pass `--model gpt-5.3-codex` (or another GPT family model if the user asks).

Pass copilot the diff inline (or `/tmp/review-diff.txt`) plus the same correctness-focused questions you gave codex. Asking the same questions of two different non-Claude model families is the whole point: when both agree, the finding is solid; when they disagree, dig deeper before fixing.

### Preferred: `copilot-companion:copilot-rescue` subagent

Use the `copilot-companion:copilot-rescue` subagent_type when available. The wrapper script already defaults to `gpt-5.3-codex`, handles `--cwd <repo>` for file-access scope, and strips boilerplate from the output. When the prompt references files in a specific repo, the agent will pass `--cwd <repo>` so Copilot can read them.

### Fallback: direct CLI invocation

If the subagent is not registered (`Agent type 'copilot-companion:copilot-rescue' not found`), invoke `copilot` directly via `Bash`, but **you MUST pass `--model gpt-5.3-codex`** explicitly, or Copilot CLI silently runs claude-sonnet-4.6:

```bash
copilot --model gpt-5.3-codex \
  -p "<prompt referencing /tmp/review-diff.txt and correctness questions>" \
  --allow-all-tools --log-level=error
```

If you need file access outside the cwd, add `--add-dir <path>` (repeatable) or run from the target repo.

**Concrete failure this guards against:** on PR #535, running `copilot -p` without `--model` produced a claude-sonnet-4.6 review that still caught a real cross-file bug (pool vs named-session count routing), but the cross-provider signal was compromised and the bug was only caught because the GitHub Copilot auto-review on the PR later flagged it independently. Always verify the output's `Breakdown by AI model:` line reports a GPT family model.

If Copilot is unavailable entirely (auth failure, CLI missing), skip silently and note in the summary.

The four parallel calls in Phase 2 + this fifth call should all go in a single message so they run concurrently.

## Phase 4: Aggregate and Fix

Wait for all reviewers to complete. Aggregate findings and fix each one directly. For each finding:

- **Verify before fixing.** Reviewers can be wrong (especially when guessing without source). Read the relevant code yourself before applying a "fix" that might break things.
- **Don't argue with false positives**: note them and skip.
- **When two reviewers disagree**, the one with file:line refs and a verifiable claim wins over the one making generic assertions.

## Phase 5: Summarize

Briefly report: what each reviewer flagged, what was fixed, what was a false positive (with the verification source), and whether any reviewer was blocked. Keep it under 200 words unless the user asks for detail.

## When NOT to use

- Trivial changes (one-line typo fixes, comment edits, dependency bumps)
- Pure formatting changes
- Large rewrites where reviewers would drown in noise, break the change up first

For trivial cases use `/simplify` or skip review entirely.
