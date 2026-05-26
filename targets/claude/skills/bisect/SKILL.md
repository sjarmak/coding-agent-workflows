Binary search for root cause. Defines a search space and pass/fail oracle, then iteratively tests midpoints — halving the space each step until the root cause is isolated. Works across git history, configuration, dependencies, or code modules.

## Arguments

$ARGUMENTS — format: `"description of the bug or regression"` with optional flags

## Parse Arguments

Extract:
- **bug_description**: the quoted or unquoted description of the symptom or regression

If the bug description is missing or unclear, ask the user to clarify before proceeding.

## Phase 1: Define the Search Space

Work with the user to establish four things before starting the search loop.

**1. The symptom** — what is broken? What does failure look like? Get a concrete, observable description (error message, wrong output, crash, performance degradation).

**2. The search dimension** — where to search. Determine which applies:
- **Git history**: a known-good commit and a known-bad commit (classic git bisect)
- **Configuration space**: a set of config keys that might cause the issue
- **Dependency versions**: which dependency upgrade broke things
- **Code modules**: which module is responsible for the regression

**3. The test oracle** — how to determine pass/fail at each midpoint:
- A specific test command (`npm test`, `pytest tests/foo.py`, `go test ./...`, etc.)
- A behavior check (does endpoint X return 200? does the build succeed?)
- A manual check (agent reads code or output and assesses)

**4. Known bounds** — the "good" end and "bad" end of the search space.

For git history bisect, run:
```bash
git log --oneline <good_commit>..<bad_commit>
```
to enumerate the search space. Count the candidates and report: "Search space: N commits. Expected steps: ceil(log2(N))."

For configuration bisect, list all changed config keys between the working and broken state. For dependency bisect, list all upgraded packages with old and new versions sorted by update date.

Present the search space summary to the user and confirm before proceeding. Adjust if the user gives feedback.

## Phase 2: Binary Search Loop

Execute the bisect algorithm. This is strictly sequential — each step depends on the previous result.

```
iteration = 0
while search_space > 1:
    iteration += 1
    midpoint = calculate_midpoint(search_space)

    # Spawn a test agent at the midpoint
    agent = spawn_test_agent(midpoint, test_oracle)
    result = agent.run()  # PASS or FAIL

    if result == FAIL:
        # Bug exists at midpoint — narrow to the first half
        bad_bound = midpoint
    else:
        # Bug absent at midpoint — narrow to the second half
        good_bound = midpoint

    report_progress(iteration, midpoint, result, remaining_space)
```

### Git History Bisect

At each midpoint commit, spawn an agent with `subagent_type: "general-purpose"` that:
1. Uses `isolation: "worktree"` to run in an isolated copy of the repo checked out at the midpoint commit
2. Runs the test oracle inside the worktree
3. Reports PASS or FAIL with evidence (test output, error message, or behavioral observation)
4. Removes the worktree when done (`git worktree remove /tmp/bisect-<short_sha>`)
5. Does NOT modify the main working tree

### Configuration Bisect

Sort the changed config keys into a list. At each step:
1. Split the remaining keys into two halves
2. Apply only the first half of changes (revert the second half to known-good values)
3. Run the test oracle
4. PASS means the bug is in the reverted half; FAIL means it is in the applied half

### Dependency Bisect

Sort dependencies by update date. At each step:
1. Split the remaining upgrades into two halves
2. Revert the second half to their old versions
3. Run the test oracle
4. PASS means the culprit is in the reverted half; FAIL means it is in the applied half

### Progress Reporting

After each iteration, report to the user:
```
Step N: Testing [midpoint identifier]
Result: PASS / FAIL
Remaining search space: M candidates
Narrowed to: [new bounds description]
```

### Inconclusive Results

If a midpoint produces an inconclusive result (flaky test, build failure unrelated to the bug, untestable state), stop and ask the user:
- **Skip**: mark this midpoint as untestable and pick an adjacent point
- **Abort**: stop the bisect and report findings so far

## Phase 3: Root Cause Identification

Once the search space narrows to a single item (one commit, one config key, one dependency):

1. **Identify the root cause** — state the specific commit, config change, or dependency that introduced the regression
2. **Analyze the change** — read the diff or changelog and explain WHY it caused the failure. For git bisect, run `git show <culprit_commit>` and walk through the relevant hunks
3. **Propose a fix** — suggest a concrete remediation: revert, patch, pin version, or redesign
4. **Check for related issues** — search the codebase for similar patterns that might harbor the same bug

## Phase 4: Report

Present the final report:

**Root Cause**
The specific change that introduced the regression, with a one-line summary.

**Bisect Log**
A table of every step: iteration number, midpoint tested, result (PASS/FAIL), remaining search space after that step.

**Analysis**
Why the identified change caused the regression. Include relevant code snippets or config values.

**Fix Options**
Ranked remediation paths:
1. Immediate fix (revert or pin)
2. Proper fix (patch the root cause)
3. Long-term fix (redesign if the pattern is fragile)

**Search Efficiency**
How many steps were taken versus the theoretical minimum of ceil(log2(N)). Note any skipped midpoints.

## Rules

- **Sequential by necessity**: each step depends on the previous result. Do NOT parallelize the bisect loop.
- **Non-destructive**: test agents must NOT modify the main working tree. Use git worktrees for git bisects. Clean up worktrees after each step.
- **Clear oracle**: if the test oracle is ambiguous or produces inconsistent results, stop and clarify with the user before continuing.
- **Report every step**: the user should see the search narrowing in real time. Never batch multiple steps silently.
- **Bail out option**: if the search hits an inconclusive result, ask the user whether to skip or abort.
- **Maximum depth**: cap at 20 iterations (covers 2^20 = ~1M candidates). If the search space is larger, ask the user to narrow the bounds first.
- **Worktree hygiene**: always remove temporary worktrees, even on failure. Run `git worktree prune` at the end of a git bisect.
- **No file modification**: the bisect skill is read-only and diagnostic. It identifies the root cause and proposes a fix but does not apply changes unless the user explicitly asks.

## Pipeline Position

Standalone debugging tool. Does not chain with the ideation-to-implementation pipeline:
```
bug report / regression → /bisect → root cause + fix proposal
```
