# Code Review

Comprehensive security and quality review of uncommitted changes:

1. Get changed files: git diff --name-only HEAD

2. For each changed file, check for:

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

**AI Slop & Erosion (HIGH)** — see the `anti-slop` rule (`rules/reference/anti-slop.md`), weight toward code that extends existing modules:

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
- Accessibility issues (a11y)

3. Generate report with:
   - Severity: CRITICAL, HIGH, MEDIUM, LOW
   - File location and line numbers
   - Issue description
   - Suggested fix

4. Block commit if CRITICAL or HIGH issues found

Never approve code with security vulnerabilities!

