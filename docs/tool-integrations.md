# Tool integrations

The bundle distributes procedures and resource files. It does not install external
executables, register MCP servers, copy credentials, enable plugins, or start
services. Discover tools in the current runtime and inspect their schemas or CLI
help before execution. A configured server name is not proof that it is callable.
Use repository-pinned dependencies when available and official documentation for
version-dependent setup. Record unavailable prerequisites rather than simulating a
successful integration.

| Capability | Tool or service | Bundled procedure | Availability and fallback |
| --- | --- | --- | --- |
| Code navigation | Codegraph | `code-graph`, code-search role, graph rule | Explicit project scope and freshness; `rg` and targeted source reads without an index. Configuration preview: `codegraph install --print-config codex`. |
| Specialist code graphs | codebase-memory MCP | `codebase-memory` | Discover schema and query capabilities; no assumed legacy tool names. Source inspection is the fallback. |
| Document and mixed-media graphs | Graphify / graphifyy | `graphify` | Existing graph queries; requested local code extraction or configured semantic backend. No automatic hook installation. |
| Local session history | city-search | `search-sessions` | Health, workspace filters, preserved source/line/digest citations. No automatic repair or transcript upload. |
| Skill discovery | Skillager (recommended), skillager-linter; Skills CLI for upstream discovery | Skill Management rule, `skill-stocktake` | Metadata-first search and review; exposure is a separate operation. Generated router IDs belong to the installation. |
| Compliance evaluation | skill-comply | `skill-comply` | Separate application and supported agent runtime; inspect generation costs even in dry-run. |
| Agent evaluation | codeprobe | `codeprobe` | Versioned CLI contracts, capability diagnostics, budgets, calibration, task isolation, and terminal result validation. |
| Library documentation | Context7 | `documentation-lookup` | Resolve library and version, query docs; official versioned docs or local source are fallback. |
| OpenAI documentation | openaiDeveloperDocs | `documentation-lookup` plus provider-owned `openai-docs` | Use available official docs tools and current product guidance; do not bundle a frozen provider setup manual. |
| Web research | browser/search, Exa, Firecrawl | `deep-research` | Primary-source retrieval and evidence ledger; discovery of schemas instead of assumed names. |
| Scientific literature | SciX / ADS-compatible provider | `scix-mcp` | Bibliographic identity, full-text limits, citation traversal. Primary paper pages are fallback. |
| Digest evidence | Code Intelligence Digest or supplied snapshots | `digest-workflow-research` | Preserve corpus identity, publication dates, recommendation evidence, and inaccessible sources. |
| Durable research | Temporal plus a deployed research Worker/client | `run-durable-research` | Deployment-specific request schema and health checks; synchronous research is explicitly not durable. |
| Observability | Honeycomb or equivalent telemetry backend | `agent-harness-observability`, `agent-harness-traceability` | Discover datasets/schema and query narrow time ranges. Separate measured events from inferred behavior; do not upload local transcripts implicitly. |
| Browser automation | agent-browser, Playwright, available browser MCP | `browser-qa`, `e2e-testing`, `impeccable` | Inspect supported runtime and existing tests; capture actual screenshots and interaction results. Missing browser is a verification gap. |
| Architecture diagrams | LikeC4 or repo-selected diagram tool | `architecture-refresh` | Existing model and pinned build scripts; local validation before separately authorized deployment. |
| Task stores | Beads (recommended); existing project tracker takes precedence | `focus`, `bead-goal-audit`, Task Management rule | Discover the backend and preserve history; no mandatory migration to a new service. |
| Agent config scanning | AgentShield or equivalent | `security-scan` | Vetted installed scanner with version/help checks; manual boundary review is a valid stated fallback. |
| Property testing | Hegel, Hypothesis | `property-testing` | Language-specific pinned dependencies and replayable shrunk failures. |
| Formal verification | TLA+, Lean, executable models | `formal-methods` | State the model's assumptions and checked properties; unavailable tools are not successful proofs. |
| Anthropic API | Anthropic SDK/API | `claude-api` | Installed SDK version and official API docs; configured credentials, no embedded keys. |
| Image/video/audio generation | fal.ai or host image tools | `fal-ai-media`; host-owned `imagegen` | Discover current models and costs; preserve supplied media and licensing. |
| Video editing and retrieval | FFmpeg, Remotion, VideoDB and optional media services | `video-editing`, `videodb` | Choose tools needed by the edit; preserve source media and verify exports. |
| Social distribution | X API and configured platform connectors | `x-api`, `crosspost`, `content-engine` | Verify current limits/auth scopes; drafting does not authorize publishing. |

## Provider-owned skills and plugins

Use the runtime's current skills for `openai-docs`, `imagegen`, `skill-creator`,
`skill-installer`, and plugin management. Google Drive/Docs/Sheets/Slides, ChatGPT
Pages and schedules, and work-pets skills are maintained by their connected
plugins. Discover the installed plugin and read its current skill when requested;
this repository does not vendor their rapidly changing application contracts.
A missing plugin requires an explicit unavailable-capability report or a suitable
local artifact, not invented tool calls. Communications and remote writes follow
the user's authorization and the plugin's actual contract.

## Conditional upstream behavior

`continuous-learning-v2` is an optional upstream hook application, not a portable
always-on observer. Its automatic transcript collection, scoring, and storage need
an explicit setup decision. The bundle covers deliberate learning capture through
`failure-mode-capture`, `ruling-capture`, and `rules-distill`; these do not claim to
reproduce the hook application.

Skillager's generated routers carry local IDs and approval hashes. Regenerate them
through the configured skillager installation after reviewing content; copying
another machine's router does not transfer its approval state.

## Audit evidence and limits

The 2026-10-01 audit inspected native Claude, Codex, and agent skill directories,
hidden skill collections, and the project skill collection. Local executable help
was available for Codegraph, Graphify, city-search, skillager, and codeprobe.
Configured MCP names included Codegraph, Honeycomb, OpenAI documentation, SciX,
and a project-specific service; configuration alone did not establish live access.
No external service, paid evaluation, social publication, or corpus upload was
performed by this audit. Absence of invocation telemetry means usage is unknown.
