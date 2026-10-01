# Development Workflow

> This file extends [common/git-workflow.md](./git-workflow.md) with the full feature development process that happens before git operations.

Use the Recommended Workflow for tool choices. The implementation loop is
understand, define acceptance criteria, claim tracked work, implement, verify,
review, and integrate. Scale planning to the uncertainty and size of the task.

## Feature Implementation Workflow

0. **Research & Reuse** _(mandatory before any new implementation)_
   - **GitHub code search first:** Run `gh search repos` and `gh search code` to find existing implementations, templates, and patterns before writing anything new.
   - **Library docs second:** Use Context7 or primary vendor docs to confirm API behavior, package usage, and version-specific details before implementing.
   - **Exa only when the first two are insufficient:** Use Exa for broader web research or discovery after GitHub search and primary docs.
   - **Check package registries:** Search npm, PyPI, crates.io, and other registries before writing utility code. Prefer battle-tested libraries over hand-rolled solutions.
   - **Search for adaptable implementations:** Look for open-source projects that solve 80%+ of the problem and can be forked, ported, or wrapped.
   - Prefer adopting or porting a proven approach over writing net-new code when it meets the requirement.

1. **Plan First**
   - Use **planner** for complex features and refactors; resolve a small task inline
   - Resolve acceptance criteria, dependencies, and risks before implementation
   - Record multi-step work in Beads, our recommended tracker, or the project's existing authoritative tracker; use `focus` for ready-task execution
   - Write only the design documents needed to resolve uncertainty; a small task does not need a PRD and several redundant plans
   - Claim work before editing; give independent workers explicit ownership and respect the Agent Collaboration concurrency bound

2. **TDD Approach**
   - Use **tdd-guide** for substantive behavior changes
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)
   - Verify 80%+ coverage

3. **Code Review**
   - Use **code-reviewer** agent immediately after writing code
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible
   - Give the reviewer acceptance criteria and runnable verification commands; evaluate findings against the actual code
   - Check the integrated result, including real browser interactions for frontend changes; use `impeccable` for design and `browser-qa` for verification

4. **Commit & Push**
   - Update the task with verification evidence and remaining blockers; distinguish implemented, verified, committed, and published states
   - Close tracked work only after its acceptance and integration requirements hold
   - Publish when authorized; detailed commit messages
   - Follow conventional commits format
   - See [git-workflow.md](./git-workflow.md) for commit message format and PR process
