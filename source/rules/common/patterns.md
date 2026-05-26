# Common Patterns

## Skeleton Projects

When implementing new functionality:

1. Search for battle-tested skeleton projects
2. Use parallel agents to evaluate options:
   - Security assessment
   - Extensibility analysis
   - Relevance scoring
   - Implementation planning
3. Clone best match as foundation
4. Iterate within proven structure

## Design Patterns

### Repository Pattern

Encapsulate data access behind a consistent interface:

- Define standard operations: findAll, findById, create, update, delete
- Concrete implementations handle storage details (database, API, file, etc.)
- Business logic depends on the abstract interface, not the storage mechanism
- Enables easy swapping of data sources and simplifies testing with mocks

### API Response Format

Use a consistent envelope for all API responses:

- Include a success/status indicator
- Include the data payload (nullable on error)
- Include an error message field (nullable on success)
- Include metadata for paginated responses (total, page, limit)

### Zero Framework Cognition (ZFC)

In AI-orchestration code, the application layer is pure plumbing.
ALL reasoning is delegated to AI models.

**Allowed in orchestration code (mechanism):**

- IO, file operations, subprocess execution
- Schema/structural validation (JSON shape, required fields)
- Policy enforcement (budgets, rate limits, timeouts, sandboxing)
- Mechanical transformations (template substitution, formatting)
- State management and lifecycle tracking
- Deterministic math (arithmetic aggregation, statistical summation)

**Forbidden in orchestration code (policy — delegate to model):**

- Semantic classification (difficulty, quality, complexity)
- Heuristic scoring with hardcoded thresholds for semantic properties
- Keyword/regex matching for meaning detection
- Planning or composition decisions
- Quality judgments beyond structural checks

**Allowed exceptions (document why):**

- Duplicate/similarity detection with calibrated thresholds
  (mechanical comparison, not semantic judgment)
- Deterministic ranking with explicit tiebreaker rules
  (transparent arithmetic, not hidden judgment)

**The correct flow:**

1. Gather raw context (IO only)
2. Call AI model for decisions
3. Validate structure of response
4. Execute mechanically

**Why:** Coded heuristics (regex, keyword matching, scoring functions) break on
edge cases that models handle naturally. ZFC applications are resilient because
model capabilities improve over time; hardcoded logic doesn't.

**Cost optimization:** Decompose work into cognitive tiers. Route routine
decisions to cheaper models (Haiku), moderate complexity to Sonnet, and deep
reasoning to Opus. ZFC makes this routing natural because reasoning is already
externalized.

**Meta-application:** When building tools that help users build AI systems,
ZFC applies at BOTH levels — the tool's own orchestration code AND the
patterns/defaults the tool embeds in its outputs. A hardcoded heuristic
in a tool doesn't just affect the tool — it shapes how users perceive
the domain through that tool's lens.

> **Language note**: ZFC applies specifically to AI-orchestration code, not
> traditional CRUD logic, infrastructure code, or performance-critical hot
> paths where model latency is unacceptable.
