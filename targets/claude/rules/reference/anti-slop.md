# Anti-Slop & Code Erosion

> Operationalizes [architecture.md](./architecture.md) (KISS, YAGNI, SRP, Don't Swallow Errors, No Placeholder Code) and [coding-style.md](./coding-style.md). Those files state the principles; this file lists the **detectable signatures** so they can be scanned for at review time. It is an index, not a re-statement — do not copy these bullets back into the principle files.
>
> Adapted from [SlopCodeBench](https://www.scbench.ai) (`SprocketLab/slop-code-bench`), whose LLM-judge rubric scores code on two _lower-is-better_ axes:
>
> - **Erosion** — verbosity, dead branches, and redundant structure accumulated as code is extended across requirement changes.
> - **Verbosity** — unnecessary complexity and bloat.
>
> Treat every line of code as a liability until proven otherwise.

## The Core Failure Mode

Coding agents rarely fail by writing _wrong_ code. They fail by **patching their way into slop**: each new requirement adds a branch, a wrapper, a defensive check, or a "just in case" abstraction, until the module is unreadable. Early design decisions compound across a run. The remedy is to **extend cleanly or refactor** — never bolt on.

## Erosion Review Trigger (BEHAVIORAL RULE)

Any change that **extends existing code** (not greenfield) earns a slop pass before it is considered done:

- Re-read the whole touched function/module, not just the diff hunk.
- Ask: _"If I wrote this from scratch with today's requirements, would it look like this?"_ The delta is erosion — pay it down now, while context is fresh.
- Prefer deleting and consolidating over adding. A net-negative diff that meets the requirement beats a net-positive one.
- On non-trivial extensions, run the **slop-check** skill.

## Anti-Pattern Catalog

Group by reason-to-change. Each item is a signature to flag, with its SlopCodeBench criterion name in parentheses for traceability. **Severity is contextual** — judge whether the pattern hides a bug or merely adds noise.

### Documentation noise

- Comments that narrate flow ("Step 1:", "First, we…") right before code that says the same thing (`narration_comments`).
- Docstrings that restate the function name in a sentence, adding no params/returns/edge-cases/context (`echo_docstrings`).
- Entry/exit logging in short (<20-line) functions that yields no diagnostic value (`entry_exit_logging`).

### Overengineering (the YAGNI signatures)

- An interface / ABC / protocol with exactly one implementer (`lonely_interface`, `one_subclass_hierarchy`, `interface_per_class`).
- A registry / dispatch table / strategy with a single entry, or set once and never varied (`single_entry_registry`, `strategy_never_varies`).
- A factory that always returns the same concrete type with no branching (`factory_returns_constant`).
- A class whose every method just delegates to an inner object's same-named method (`delegation_only_class`).
- Wrappers around primitives or `Optional`/`Result` types that add no validation, behavior, or real optionality (`unnecessary_type_wrappers`, `unnecessary_monadic_wrappers`).

### Premature optimization

- Memoization/caching on functions that do simple arithmetic, string ops, or return constants (`cache_for_literals`).
- Threading/async/multiprocessing for small collections where overhead exceeds benefit (`parallel_small_collection`).
- Lazy initialization for values that are always accessed anyway (`lazy_always_accessed`).

### Defensive antipatterns (over-handling)

- Code handling inputs the spec says won't occur / are out of scope (`handling_excluded_cases`).
- Null-coalescing / defaults on values from constructors, required params, or guaranteed sources (`default_on_required_field`, `null_coalescing_abuse`).
- The same variable null-checked repeatedly in close proximity (`redundant_null_check`).
- Cloning inputs/outputs everywhere to mask mutation instead of fixing it (`defensive_cloning_hiding_mutation`).
- Coercion that lets wrong types pass silently (`type_coercion_hiding_mismatches`).

### Hidden behavior (surprises for the caller)

- Auto-creating missing resources (dirs, files, tables) without logging it happened (`silent_resource_creation`).
- Behavior-changing parameters defaulted so callers trigger modes unknowingly (`implicit_default_parameters`).
- Fallback chains that hide which path won, masking primary failure (`silent_fallbacks`).
- Silently fixing bad config/input — clamping, auto-correcting — instead of failing or warning (`auto_correction_without_warning`).

### Error obscuring (extends "Don't Swallow Errors")

- Returning success booleans or sentinel/magic values instead of raising rich errors (`boolean_success_flags`, `sentinel_values_as_errors`).
- Replacing specific errors with generic messages, destroying root-cause detail (`error_message_destruction`).
- Retry loops that discard intermediate failures and hide flakiness (`retry_loops_hiding_failures`).
- Calling a function whose return value matters and ignoring it (`ignoring_return_values`).
- Slicing/truncating data to fit a limit with no log or validation (`silent_truncation`).
- Parsers that accept malformed input by guessing, hiding the producer's bug (`lenient_parsing`).

### Incomplete implementation (extends "No Placeholder Code")

- Half-implemented generated scaffolding left in place (`scaffold_remnants`).
- Functions returning placeholders instead of real behavior (`stub_implementations`).

### Spec deviation

- Features, flags, or options not mentioned anywhere in the spec (`unrequested_features`).
- Validation that contradicts the spec/domain, or runs but never changes outcomes (`validation_mismatch`, `validation_theater`).
- Normalization that discards domain meaning and silently corrupts data (`domain_blind_normalization`).

### Control flow & debuggability

- Async callbacks nested inside each other, obscuring order (`nested_async_flows`).
- Implicit state machines built by mutating a `state` variable across branches (`inline_state_machines`).
- Important diagnostics logged at a level filtered out in production (`log_level_hiding`).
- No correlation/request IDs in async or distributed flows (`correlation_id_absence`).

### Reinvention (extends development-workflow.md §Research & Reuse)

- Reimplementing standard-library / well-known-library utilities by hand (`handrolled_standard_operations`).
- Raw strings for modes/states/types where enums or constants belong (`stringly_typed_logic`).

## How to apply this (ZFC boundary)

These are **semantic** judgments — "is this abstraction premature?", "does this validation do anything?". Per [patterns.md](./patterns.md), do **not** encode them as regex/keyword matchers; hardcoded matchers break on the edge cases models handle naturally. SlopCodeBench itself uses an LLM judge for exactly this reason.

- **Hooks may _trigger_** a slop review after an extending change — they must not _make_ the call.
- **The judgment belongs to a model** — the `code-reviewer` agent, the `review` quality lens, or the `slop-check` skill.
