# Architecture diagram (LikeC4)

Architecture-as-code model of `coding-agent-workflows`, rendered with
[LikeC4](https://likec4.dev). The model is the source of truth across
[`spec.c4`](spec.c4) (element kinds, tags, deployment node kinds),
[`model.c4`](model.c4) (the system), and [`views.c4`](views.c4) (structure,
walkthrough, and risk views), with the deployment model in
[`deployment.c4`](deployment.c4). The narrative companions are the repo-root
[`README.md`](../README.md) and [`AGENTS.md`](../AGENTS.md).

Every element `link`s to its source (`source/…`, `build/…`, `targets/…`,
`scripts/fleet/…`) — so any box in the explorer is one click from the code.

## What this models

`coding-agent-workflows` is a **build pipeline for an agent-neutral coding-practices
bundle**. One hand-edited layer (`source/`) renders through `build/render.mjs` into
per-agent `targets/`: a thin always-loaded `AGENTS.md` index over a read-on-demand
`AGENTS.full.md`, a native Claude Code layout, and a native Codex layout. `install.sh`
copies the chosen target into a consuming project; a separate machine-level
`scripts/fleet/` track scans every repo on the machine for conformance.

The rendered output is **pre-rendered and committed** — there is no build step before
use. Two CI gates protect that invariant: a *staleness* gate (committed output must
match a fresh render of `source/`) and a *release* gate (rendered output must carry no
absolute paths, PII, or internal jargon).

## Delivery state is tagged, not guessed

Every element carries a tag so **planned and in-flight work renders distinctly
from what is already built** (legend in `spec.c4`):

| Tag | Meaning | Render |
|---|---|---|
| `#built` | code path exists and is exercised (rendered output is committed) | solid |
| `#evolving` | built, but the content/scope is still moving | solid |
| `#planned` | designed; not yet implemented | **dashed, dimmed** |
| `#research` | speculative track | **dashed, indigo** |

The machinery is built: the renderer, both gates, the installer, and all three
rendered target layouts. What carries `#evolving` is the *content* (the rules, agent
roles, skills, and workflows in `source/`) and the machine-level fleet tooling. The
one `#planned` item is the consuming-project context-layer scheme (`install.sh init`
plus the `project-init` workflow), which is scaffolded by the agent at consume time,
not by the installer.

## Views

**Structure** — the static map:

| View | Scope |
|---|---|
| `index` | system landscape — `coding-agent-workflows` in context of the coding agents that consume it, the CI/git host, and the recommended companion tools |
| `cawSystem` | the system decomposed into containers (`source` → `build` → `targets` → `install`, plus the fleet track) |
| `sourceContainer` | `source/` — the only hand-edited layer (manifest, rules, agents, skills, workflows, templates) |
| `buildContainer` | `build/` — the renderer plus the staleness and release gates |
| `targetsContainer` | `targets/` + `AGENTS` — the rendered, committed per-agent output |
| `fleetContainer` | `scripts/fleet/` — the machine-level conformance track |
| `planned` | planned + in-flight work, with built dependencies dimmed |
| `deployment` | where each piece runs — process & data boundaries (dev/CI host, CI runner, consumer, fleet track) |

**Walkthrough flows** (dynamic / numbered-step views) — the narrative spine for
a design-review walkthrough:

| View | Flow |
|---|---|
| `buildFlow` | render `source/` into every target (read manifest → reset → emit AGENTS + native layouts → inject the rule catalog) |
| `releaseFlow` | the staleness + release gates that protect the committed output |
| `installFlow` | install into a consuming project and consume it (file copy → agent auto-loads the thin index, reads sections on demand) |

**Risk lens:**

| View | Scope |
|---|---|
| `risks` | the `#risk`-flagged elements with each open question stated in-box (fork-specific sanitize blocklist, global git-template side effect) |

### Running the walkthrough

For a design review, present in this order: `index` → `cawSystem` (orient on
structure) → the three walkthrough flows in sequence (build → release → install) →
`deployment` (where it runs) → `risks` (what to probe) → `planned` (what's next).
In `npx likec4 start`, the dynamic views animate step-by-step.

## Viewing & regenerating

```bash
# Interactive, hot-reloading explorer (recommended)
npx likec4 start architecture

# Re-export static PNGs (needs a one-time browser download:
#   npx playwright install chromium-headless-shell)
npx likec4 export png architecture -o architecture/exports

# Validate the model (strict — the source of truth for correctness)
npx likec4 validate architecture
```

### Viewing the interactive explorer over SSH (headless remote)

`likec4 start` serves a Vite dev server on `localhost:5173`. From a headless
remote, forward that port to your laptop and open it locally — three options,
easiest first:

1. **VS Code / Cursor Remote-SSH** — run `npx likec4 start architecture` in the
   integrated terminal; the editor auto-forwards 5173 and offers "Open in
   Browser". Nothing else to configure.
2. **SSH local port-forward** — on your laptop:
   ```bash
   ssh -N -L 5173:localhost:5173 user@remote   # leave running
   ```
   then on the remote `npx likec4 start architecture` and open
   <http://localhost:5173> locally. (Already in an SSH session? Add the tunnel
   without reconnecting: press `~C` then type `-L 5173:localhost:5173`.)
3. **Bind + reach directly** — `npx likec4 start architecture --listen 0.0.0.0`
   and browse to `http://<remote-ip>:5173` (only if that port is reachable /
   firewall-open; the tunnel in option 2 is safer).
