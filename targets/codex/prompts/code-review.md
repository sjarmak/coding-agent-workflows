# Code Review

Comprehensive security and quality review of uncommitted changes:

1. Inspect the task's diff against its intended base, including staged and untracked files. For uncommitted work use `git diff HEAD` and `git status --short`; read relevant new files explicitly.

2. For risky changes, establish behavioral properties from requirements and callers, not just the implementation. Identify safety properties (what must never happen) and progress properties (what must eventually happen, under which assumptions).

Map each property to affected functions, shared state, and tests. For cancellation, retries, ownership, persistence, authorization, or shared-state transitions, attempt a violating execution. Trace across awaits, callbacks, transactions, and callers outside the diff. Prefer a deterministic regression test; use the `formal-methods` skill when interleavings or general logical guarantees justify modeling. Ordinary edits do not require a formal model.

3. For each changed file, check for:

**Security Issues (CRITICAL):**

- Hardcoded credentials, API keys, tokens
- SQL injection vulnerabilities
- XSS vulnerabilities
- Missing input validation
- Insecure dependencies
- Path traversal risks

**Code Quality (HIGH):**

- Functions > 50 lines
- Files > 800 lines
- Nesting depth > 4 levels
- Missing error handling
- console.log statements
- TODO/FIXME comments
- Missing JSDoc for public APIs

**AI Slop & Erosion (HIGH)** — see the `anti-slop` rule (`rules-reference/anti-slop.md`), weight toward code that extends existing modules:

- Overengineering: single-implementer interfaces, single-entry registries, factories returning a constant
- Documentation noise: narration comments, docstrings that restate the function name
- Premature optimization: caching constants, parallelism for tiny collections
- Error obscuring: success booleans / sentinel values instead of raised errors, retries swallowing failures
- Hidden behavior: silent fallbacks, auto-correction without warning
- Spec deviation: unrequested features, validation that never changes an outcome

**Best Practices (MEDIUM):**

- Mutation patterns (use immutable instead)
- Emoji usage in code/comments
- Missing tests for new code
- Pure logic (parsers, codecs, round-trips, arithmetic, ordering, state machines) without a property test; non-blocking
- Accessibility issues (a11y)

4. Generate report with:

   - Severity: CRITICAL, HIGH, MEDIUM, LOW
   - File location and line numbers
   - Issue description
   - Suggested fix
   - Violated property and evidence: reproduced implementation defect, model-only counterexample, or untested suspicion
   - Reproduction command or trace, assumptions, and remaining uncertainty

Do not present a model-only counterexample as a confirmed implementation bug. When a formal check succeeds, review the specification, reachable scenarios, abstraction boundaries, and correspondence to the code. A proof of the wrong requirement is not acceptance evidence. Distinguish confidence from impact; a severe hypothetical consequence does not establish a confirmed defect.

5. Block commit for confirmed CRITICAL or HIGH findings. Report unresolved high-impact risks explicitly; do not silently approve a required property whose check failed or could not run.

Never approve code with security vulnerabilities!
