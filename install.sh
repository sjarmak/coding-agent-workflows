#!/usr/bin/env bash
# Install the pre-rendered coding-agent practices into your environment.
# No build step; the artifacts in AGENTS.md and targets/ are already generated.
#
# Usage:
#   ./install.sh claude  [dest]    install Claude Code config into <dest>/.claude   (default dest: current dir)
#   ./install.sh codex   [dest]    install AGENTS.md into <dest> and Codex config into ~/.codex
#   ./install.sh agents  [dest]    just drop AGENTS.md into <dest> (for Amp, Aider, Gemini CLI, …)
#
# For user-level (not project-level) Claude install:  ./install.sh claude ~
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT="${1:-}"
DEST="${2:-$PWD}"
[ -n "$AGENT" ] && [ "$AGENT" != "-h" ] && mkdir -p "$DEST"

note() { printf '  %s\n' "$1"; }

case "$AGENT" in
  claude)
    target="$DEST/.claude"
    mkdir -p "$target"
    cp -r "$REPO/targets/claude/." "$target/"
    echo "Installed Claude Code config → $target"
    note "rules/ agents/ skills/ commands/ are now available."
    note "Overwrote any same-named files; your other .claude contents are untouched."
    note "Wanted user-level instead? re-run: ./install.sh claude ~"
    ;;
  codex)
    cp "$REPO/AGENTS.md" "$DEST/AGENTS.md"
    mkdir -p "$HOME/.codex"
    cp -r "$REPO/targets/codex/agents" "$REPO/targets/codex/prompts" "$HOME/.codex/"
    if [ -e "$HOME/.codex/config.toml" ]; then
      cp "$REPO/targets/codex/config.toml" "$HOME/.codex/config.toml.from-coding-agent-workflows"
      note "~/.codex/config.toml already exists; wrote ours as config.toml.from-coding-agent-workflows, merge manually."
    else
      cp "$REPO/targets/codex/config.toml" "$HOME/.codex/config.toml"
    fi
    echo "Installed AGENTS.md → $DEST   and Codex agents/prompts → ~/.codex"
    note "Codex reads AGENTS.md automatically from your project root."
    ;;
  agents)
    cp "$REPO/AGENTS.md" "$DEST/AGENTS.md"
    echo "Installed AGENTS.md → $DEST"
    note "Any AGENTS.md-aware agent (Amp, Aider, Gemini CLI, …) will read it from here."
    note "That AGENTS.md is the full practices bundle. For a thin, project-specific"
    note "intention layer instead, scaffold one with: ./install.sh init $DEST"
    ;;
  init)
    # Scaffold a consuming project's context layer: drop the thin, pointer-style
    # AGENTS.md template at <dest>. Placeholders ({{...}}) are filled by running the
    # `project-init` workflow inside your agent — it recons the repo, writes the
    # intention, and seeds per-area COMPASS.md maps. This is NOT the practices bundle
    # (that's `./install.sh agents`); it's the per-project intention layer.
    tmpl="$REPO/source/templates/AGENTS.project.md"
    if [ -e "$DEST/AGENTS.md" ]; then
      cp "$tmpl" "$DEST/AGENTS.md.template"
      echo "Scaffolded project AGENTS.md template → $DEST/AGENTS.md.template"
      note "$DEST/AGENTS.md already exists; wrote the template alongside it — merge by hand,"
      note "or run the project-init workflow, which enhances an existing AGENTS.md in place."
    else
      cp "$tmpl" "$DEST/AGENTS.md"
      echo "Scaffolded thin project AGENTS.md → $DEST/AGENTS.md"
    fi
    note "Next: run the 'project-init' workflow in your agent to fill {{...}} and seed compass maps."
    note "Maintenance: 'failure-mode-capture' appends a prevention; 'project-compass' refreshes a map."
    ;;
  *)
    echo "usage: ./install.sh {claude|codex|agents|init} [dest_dir]" >&2
    echo "  claude  → <dest>/.claude   (default dest: current dir; use ~ for user-level)" >&2
    echo "  codex   → AGENTS.md in <dest> + config into ~/.codex" >&2
    echo "  agents  → full practices bundle as AGENTS.md in <dest>" >&2
    echo "  init    → thin, project-specific AGENTS.md template in <dest> (filled by project-init)" >&2
    exit 1
    ;;
esac
