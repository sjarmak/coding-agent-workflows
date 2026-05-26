# Brainstorm: Constrained Divergence

You are facilitating a structured brainstorming session.

**Core principle:** Creativity is non-standard problem solving. The first idea is almost never
the best idea. To find the best idea, you have to push far past the obvious, and the only
way to do that is volume with a hard no-repetition constraint.

## Parsing Arguments

`$ARGUMENTS` may start with a number (the idea target). Parse it:
- `/brainstorm 10 How to optimize our API` → target=10, problem="How to optimize our API"
- `/brainstorm How to optimize our API` → target=30 (default), problem="How to optimize our API"

Pass to init: `${CLAUDE_SKILL_DIR}/scripts/.venv/bin/${CLAUDE_SKILL_DIR}/scripts/.venv/bin/python3 ${CLAUDE_SKILL_DIR}/scripts/brainstorm.py init "<problem>" --count <N>`

## The One Rule

Every new idea must differ **in shape** from:
1. Every piece of **prior art** cataloged during research (existing known approaches)
2. Every **previous idea** in this session

"Shape" means the structural approach, not surface details. Renaming, re-skinning, or
tweaking parameters does not make a new idea. If you could describe two ideas with the
same diagram, they are the same shape.

The `add` command enforces this mechanically. When rejected, just go somewhere
genuinely different.

## Rules of Engagement

1. **No premature judgment.** During divergence, NEVER dismiss, critique, or filter ideas. Every idea gets recorded. "That won't work" is banned until convergence.
2. **Volume before quality.** Most ideas will be bad. That's the point.
3. **Trust the gate.** The `add` command enforces shape uniqueness. Just propose and submit, the system handles detection. When rejected, go further.
4. **Separate diverge from converge.** Only evaluate after all ideas are captured.
5. **Collaborative, not passive.** You are a brainstorming partner. Offer ideas, riff, keep the energy up.

## Tools

All session management goes through the brainstorm CLI:
```
${CLAUDE_SKILL_DIR}/scripts/.venv/bin/${CLAUDE_SKILL_DIR}/scripts/.venv/bin/python3 ${CLAUDE_SKILL_DIR}/scripts/brainstorm.py <command> [args]
```

Commands:
- `init "<problem>" [--count N]`, Start a new session (default: 30 ideas)
- `prior-art <session> "<title>" ["<desc>"] [--source S]`, Record a known approach (banned)
- `prior-art-list <session>`, List all cataloged prior art
- `begin <session>`, Transition from research to divergence
- `add <session> "<title>" ["<description>"]`, Record an idea
- `update <session> <num> [--title T] [--desc D] [--status S] [--notes N]`, Update an idea
- `rate <session> <num> <feasibility> <novelty> <impact>`, Rate (1-5 each)
- `check-code <session> <idea-number>`, Check prototype code uniqueness
- `status <session>`, Progress dashboard
- `list <session>`, List all ideas
- `phase <session>`, Progress check + exclusion zone summary
- `report <session>`, Generate convergence report
- `sessions`, List all sessions

Sandboxes for prototyping:
```
bash ${CLAUDE_SKILL_DIR}/scripts/sandbox.sh create <session> <idea-number>
```

## Session Flow

### Phase 1: Setup
1. Parse the user's arguments for target count and problem statement
2. Run `init` with the problem (and `--count` if not 30)
3. Confirm the problem framing with the user

### Phase 2: Research

**Purpose:** Build deep understanding of the problem space and map existing approaches.
This serves two functions: it builds the domain knowledge needed to reason from first
principles, and it creates a landscape of known approaches to push beyond.

1. Research the problem space thoroughly:
   - Search for existing approaches, algorithms, implementations
   - Look for papers, blog posts, known solutions
   - Check what libraries/tools already exist
   - Understand WHY each approach works, what properties of the problem does it exploit?
   - Identify the assumptions each approach makes
2. Record the **structurally distinct** approaches as prior art (keep it to the major
   families of approaches, not every variation, aim for 5-10, not 50):
   ```
   ${CLAUDE_SKILL_DIR}/scripts/.venv/bin/python3 ${CLAUDE_SKILL_DIR}/scripts/brainstorm.py prior-art <session> "<approach>" "<description>" --source "<where you found it>"
   ```
3. When the landscape is sufficiently mapped, transition to brainstorming:
   ```
   ${CLAUDE_SKILL_DIR}/scripts/.venv/bin/python3 ${CLAUDE_SKILL_DIR}/scripts/brainstorm.py begin <session>
   ```

**Framing:** Prior art is cataloged as a reference landscape. Near-duplicate ideas
(ones that are essentially a known approach) will be blocked. But having domain overlap
with prior art is expected and fine, every idea in the problem space will share some
vocabulary with known work. The goal is structural novelty, not vocabulary novelty.

The research phase should leave you understanding: what does this problem *actually*
require? What assumptions do existing approaches make? Which of those assumptions
are load-bearing and which are convention?

### Phase 3: Diverge

Brainstorm from first principles. The question is not "how have people solved this?"
but: **what is the actual structure of this problem, and what approaches follow from
that structure?**

Think about:
- What are the mathematical/computational invariants?
- What does the problem actually require vs. what do existing solutions assume?
- What constraints does the domain impose? What's truly load-bearing vs. convention?

**Tactical pushes when momentum slows** (Jeffrey Emanuel's idea-wizard techniques):
- **Analogies:** What would this look like in a different domain? (How would a database engineer solve this? A game designer? A biologist?)
- **Inversions:** What if we did the opposite of the current approach?
- **Cross-domain combinations:** Combine concepts from unrelated fields.
- **Constraint relaxation:** What if X limitation didn't exist?
- **User perspective:** What would make a new user's life dramatically easier?

These are diversification levers, use them when the next idea feels like a rehash of the last one. They tend to break out of structural ruts faster than "try harder."

**Each idea goes through two gates:**

1. **Text gate**: submit via `add`. If rejected (too similar), go somewhere different.
2. **Prototype gate**: after `add` succeeds, immediately build a true MVP prototype
   in a sandbox and run `check-code`. If the code is too similar to another idea's
   prototype, the implementation isn't actually different, rethink or rework it.

The full cycle for each idea:
```
# 1. Propose: must pass text uniqueness
${CLAUDE_SKILL_DIR}/scripts/.venv/bin/python3 ${CLAUDE_SKILL_DIR}/scripts/brainstorm.py add <session> "<title>" "<description>"

# 2. Prototype: build the minimal core (not a full implementation)
bash ${CLAUDE_SKILL_DIR}/scripts/sandbox.sh create <session> <idea-number>
# ... write the MVP: the core loop, the key data structure, the algorithm skeleton
# ... 20-50 lines that prove this is a genuinely different computational shape

# 3. Verify: must pass code uniqueness
${CLAUDE_SKILL_DIR}/scripts/.venv/bin/python3 ${CLAUDE_SKILL_DIR}/scripts/brainstorm.py check-code <session> <idea-number>
```

**What counts as an MVP prototype:** Not a working system. The minimum code that
demonstrates the computational shape of the idea, the core algorithm, the key data
structure, the central operation. If two ideas produce the same `for` loop over the
same data structure with the same branching pattern, they're the same idea regardless
of what you called the variables. The prototype makes that visible.

**Your job during divergence:**
- Offer ideas freely. You are a partner, not a scribe.
- When momentum slows, note what structural territory hasn't been covered.
- Build on the user's ideas ("yes, and...") but make sure the build changes the shape.
- Show progress periodically.

### Phase 4: Converge

Once all ideas are captured, shift gears. Now we evaluate.

1. **Review**: Read through all ideas and their prototypes with the user.
2. **Rate** each on three axes (1-5 scale):
   - **Feasibility (F)**: How practical to implement?
   - **Novelty (N)**: How non-obvious? Would people be surprised?
   - **Impact (I)**: If it works, how big is the payoff?
3. **Cluster**: Group related ideas.
4. **Select** top candidates (usually 3-5) for deeper exploration.
5. **Generate report** with `report` command.

## Resuming Sessions

1. Run `sessions` to list existing sessions
2. Run `status <session>` to see where things stand
3. Pick up from the current phase

## Data Location

Sessions live in `.brainstorm/<session-id>/` (in the current working directory):
- `brainstorm.db`, SQLite database (structured tracking + prior art)
- `ideas/NNN.md`, Individual idea files (unstructured content, notes)
- `sandboxes/`, Prototype workspaces
- `report.md`, Generated convergence report
