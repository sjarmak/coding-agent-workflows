# Augmented Coding Patterns

A working taxonomy for collaborating with AI coding agents, synthesized from
the [Augmented Coding Patterns](https://lexler.github.io/augmented-coding-patterns/)
catalog (51 patterns / 10 anti-patterns / 15 obstacles) and mapped onto the
skills and workflows in this repo. The catalog names the *why*; the skills are
the *how*. Where a pattern is already implemented here, it's cross-referenced.

## Core patterns this repo operationalizes

- **Chain of Small Steps / Focused Agent / Chunking**: break work into one
  scoped unit at a time and keep the agent on it. → `focus` skill, `implement-review` workflow.
- **Cast Wide / Take All Paths / Parallel Implementations**: explore multiple
  approaches with uncorrelated context before committing. → `diverge`, `brainstorm`, `research` workflow.
- **Feedback Flip / Feedback Loop / Refinement Loop**: have the agent critique
  the work behind a hard gate, then iterate. → `review` / `code-review` as the gate in `implement-review`; `epic-review` at the boundary.
- **Knowledge Document / Ground Rules / Reference Docs / Reminders**: keep a
  centralized, durable spec the agent reads every session. → this `AGENTS.md` and the `rules/` tree are exactly that.
- **Context Management / Noise Cancellation / Semantic Anchors**: control what
  the agent sees; cut irrelevant detail; label things consistently. → `focus`'s context-handoff contract; the verifier role clamp in `agent-collaboration.md`.
- **Happy to Delete**: reward removing code, not just adding it. → `simplify` skill.
- **Offload Deterministic / Yak Shave Delegation**: delegate routine, judgment-free
  work; keep human attention on core decisions. → matches the ZFC split in `patterns.md`.
- **Extract Knowledge / JIT Docs / Knowledge Checkpoint**: capture insights and
  decisions as you go, not retrospectively. → `architecture-decision-records`, `distill`.
- **Borrow Behaviors / Reverse Direction**: adapt proven patterns from existing
  code; ask the agent to explain code back to validate understanding. → `codebase-onboarding`.
- **Point the Target / Contextual Prompts / Check Alignment**: specify precisely
  what "done" means and verify outputs against project standards. → acceptance-criteria checks in `implement-review` step 5.

## Anti-patterns to actively prevent

These are failure modes the workflows are designed to block. Name them when you
catch one.

- **AI Slop**: accepting careless output without review. *(Blocked by the review gate.)*
- **Tell Me a Lie / Unvalidated Leaps**: accepting confident-but-wrong claims, or
  trusting large reasoning jumps without checking intermediate steps. *(Blocked by verifier role clamp: test, don't read.)*
- **Flying Blind**: proceeding without understanding what the agent did or why.
- **Silent Misalignment**: assuming shared understanding instead of verifying it.
- **Perfect Recall Fallacy**: assuming the agent remembers prior sessions; it doesn't
  without an explicit durable record. *(Mitigated by `focus`'s handoff contract.)*
- **Sunk Cost**: continuing a flawed approach because of prior investment. *(The
  reject → fresh-context-retry loop in `implement-review` is the deliberate counter.)*
- **Answer Injection**: feeding the agent a predetermined answer, defeating independent analysis.
- **Distracted Agent**: scattered instructions that derail focus.
- **Obsess Over Rules**: fixating on guidelines while losing the actual goal.

## Obstacles to plan around (inherent limits, not bugs)

Set expectations accordingly; these don't get "fixed," they get managed:

- **Context Rot / Limited Context Window / Selective Hearing**: assumptions go
  stale and long prompts lose detail. Keep specs current; re-anchor often.
- **Compliance Bias / Obedient Contractor**: the agent tends to agree rather than
  push back. The `agent-collaboration.md` "receiving code review" rule explicitly
  counters this on the agent's side; you must counter it on yours.
- **Degrades Under Complexity / Limited Focus**: performance drops on large,
  intricate work. → decompose first (`decompose` workflow).
- **Hallucinations / Non-Determinism / Black Box**: fabricated APIs, inconsistent
  runs, opaque reasoning. → verify against reality, never against memory.
- **Excess Verbosity**: unnecessarily long output. → terseness is a practice, not
  a nicety: cut fluff, keep technical substance. The `caveman` skill (Claude,
  opt-in) is one concrete lever for this when token budget matters.
- **Negative Bleedthrough**: earlier bad output contaminates later responses. → a
  fresh context beats a polluted one; prefer handoff over pushing through.
