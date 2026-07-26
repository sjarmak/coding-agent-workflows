#!/usr/bin/env bash
# Install the pre-rendered coding-agent practices into your environment.
# No build step; the artifacts in AGENTS.md and targets/ are already generated.
#
# Usage:
#   ./install.sh claude  [dest]    install Claude Code config into <dest>/.claude   (default dest: current dir)
#   ./install.sh upgrade [dest]    re-install, then prune files dropped since the last install
#   ./install.sh remove  [dest]    remove exactly what a prior claude install placed in <dest>/.claude
#   ./install.sh codex   [dest]    install AGENTS.md + AGENTS.full.md into <dest> and config into $CODEX_HOME (or ~/.codex)
#   ./install.sh agents  [dest]    drop AGENTS.md (thin index) + AGENTS.full.md into <dest> (Amp, Aider, Gemini CLI, …)
#
# For user-level (not project-level) Claude install:  ./install.sh claude ~
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT="${1:-}"
DEST="${2:-$PWD}"
[ -n "$AGENT" ] && [ "$AGENT" != "-h" ] && mkdir -p "$DEST"

note() { printf '  %s\n' "$1"; }

case "$AGENT" in
  claude|upgrade)
    mode="$AGENT"
    target="$DEST/.claude"
    src="$REPO/targets/claude"
    manifest="$target/.coding-agent-workflows-manifest"
    mkdir -p "$target"

    # Files this install writes (relative paths), and the prior install's list.
    # Portable array fill (no mapfile) so this runs under stock macOS bash too.
    files=(); while IFS= read -r f; do files+=("$f"); done \
      < <(cd "$src" && find . -type f | sed 's|^\./||' | sort)
    prev=(); [ -f "$manifest" ] && while IFS= read -r f; do [ -n "$f" ] && prev+=("$f"); done < "$manifest"
    contains() { local x=$1; shift; local e; for e in "$@"; do [ "$e" = "$x" ] && return 0; done; return 1; }

    # Collision guard: back up any file we would overwrite that we do NOT
    # already own (absent from the prior manifest) and that differs from ours,
    # so a user-level install (./install.sh claude ~) never silently clobbers
    # hand-authored config in an existing ~/.claude.
    backup="$target/.coding-agent-workflows-backup/$(date +%Y%m%d-%H%M%S)"
    saved=0
    for f in "${files[@]}"; do
      [ -e "$target/$f" ] || continue
      contains "$f" ${prev[@]+"${prev[@]}"} && continue
      cmp -s "$src/$f" "$target/$f" && continue
      mkdir -p "$backup/$(dirname "$f")"
      cp "$target/$f" "$backup/$f"
      saved=$((saved + 1))
    done

    cp -r "$src/." "$target/"

    # upgrade: prune files the previous install owned that we no longer ship.
    pruned=0
    if [ "$mode" = upgrade ]; then
      for f in ${prev[@]+"${prev[@]}"}; do
        contains "$f" "${files[@]}" && continue
        rm -f "$target/$f" && pruned=$((pruned + 1))
      done
    fi

    printf '%s\n' "${files[@]}" > "$manifest"
    echo "Installed Claude Code config → $target"
    [ "$saved" -gt 0 ] && note "Backed up $saved pre-existing file(s) before overwrite → $backup"
    [ "$pruned" -gt 0 ] && note "Pruned $pruned file(s) the bundle no longer ships."
    note "rules/ agents/ skills/ commands/ are now available."
    note "Files you did not have are added; foreign same-named files were backed up, not lost."
    note "File list written to .claude/.coding-agent-workflows-manifest (drives upgrade/remove)."
    note "Wanted user-level instead? re-run: ./install.sh claude ~"
    ;;
  remove)
    target="$DEST/.claude"
    manifest="$target/.coding-agent-workflows-manifest"
    if [ ! -f "$manifest" ]; then
      echo "No bundle manifest at $manifest — nothing to remove." >&2
      echo "(remove only undoes a prior './install.sh claude' into this dest.)" >&2
      exit 1
    fi
    removed=0
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      [ -e "$target/$f" ] && rm -f "$target/$f" && removed=$((removed + 1))
    done < "$manifest"
    rm -f "$manifest"
    # Drop directories the install left empty, but never .claude itself.
    find "$target" -mindepth 1 -type d -empty -delete 2>/dev/null || true
    echo "Removed $removed bundle file(s) from $target"
    note "Your non-bundle .claude contents are left in place."
    note "Any collision backups remain under .claude/.coding-agent-workflows-backup/."
    ;;
  codex)
    cp "$REPO/AGENTS.md" "$DEST/AGENTS.md"
    cp "$REPO/AGENTS.full.md" "$DEST/AGENTS.full.md"
    codex_home="${CODEX_HOME:-$HOME/.codex}"
    mkdir -p "$codex_home"
    cp -r "$REPO/targets/codex/agents" "$REPO/targets/codex/prompts" \
      "$REPO/targets/codex/skills" "$codex_home/"
    if [ -e "$codex_home/config.toml" ]; then
      cp "$REPO/targets/codex/config.toml" "$codex_home/config.toml.from-coding-agent-workflows"
      note "$codex_home/config.toml already exists; wrote ours as config.toml.from-coding-agent-workflows, merge manually."
    else
      cp "$REPO/targets/codex/config.toml" "$codex_home/config.toml"
    fi
    echo "Installed AGENTS.md + AGENTS.full.md → $DEST   and Codex agents/prompts/skills → $codex_home"
    note "Codex reads AGENTS.md automatically from your project root."
    ;;
  agents)
    cp "$REPO/AGENTS.md" "$DEST/AGENTS.md"
    cp "$REPO/AGENTS.full.md" "$DEST/AGENTS.full.md"
    echo "Installed AGENTS.md (thin index) + AGENTS.full.md → $DEST"
    note "Any AGENTS.md-aware agent (Amp, Aider, Gemini CLI, …) auto-loads the index;"
    note "it reads sections of AGENTS.full.md on demand, keeping loaded context small."
    note "For an agent that can only ever read one file, copy AGENTS.full.md as its AGENTS.md."
    note "For a thin, project-specific intention layer, scaffold one with: ./install.sh init $DEST"
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
  fleet)
    # Machine-level conformance tooling: the mechanical fleet scanner plus the
    # two bootstrap hooks that make every repo on the machine register itself
    # (git template) and scaffold itself (SessionStart nudge). DEST is ignored;
    # everything installs to ~/.claude/fleet and ~/.git-template.
    bin="$HOME/.claude/fleet/bin"
    mkdir -p "$bin"
    cp "$REPO/scripts/fleet/fleet-scan.mjs" \
       "$REPO/scripts/fleet/session-bootstrap-check.sh" \
       "$REPO/scripts/fleet/git-template-setup.sh" "$bin/"
    chmod +x "$bin"/*
    bash "$bin/git-template-setup.sh"
    settings="$HOME/.claude/settings.json"
    hookcmd="$HOME/.claude/fleet/bin/session-bootstrap-check.sh"
    if command -v jq >/dev/null 2>&1 && [ -f "$settings" ]; then
      if grep -qF "session-bootstrap-check.sh" "$settings"; then
        note "SessionStart hook already wired into ~/.claude/settings.json."
      else
        cp "$settings" "$settings.bak.fleet"
        if jq --arg cmd "$hookcmd" \
          '.hooks.SessionStart = ((.hooks.SessionStart // []) + [{"hooks":[{"type":"command","command":$cmd}]}])' \
          "$settings" > "$settings.tmp"; then
          mv "$settings.tmp" "$settings"
          note "SessionStart hook wired into ~/.claude/settings.json (backup: settings.json.bak.fleet)."
        else
          rm -f "$settings.tmp"
          note "jq failed (settings.json malformed?) — settings unchanged; add to hooks.SessionStart yourself: $hookcmd"
        fi
      fi
    else
      note "jq or settings.json missing — add this to hooks.SessionStart yourself: $hookcmd"
    fi
    echo "Installed fleet conformance tooling → $HOME/.claude/fleet"
    note "Scan now:  node $bin/fleet-scan.mjs   (writes fleet.json + fleet-status.md)"
    note "Schedule the 'fleet-conformance' workflow weekly for the semantic audit + report."
    ;;
  *)
    echo "usage: ./install.sh {claude|upgrade|remove|codex|agents|init|fleet} [dest_dir]" >&2
    echo "  claude  → <dest>/.claude   (default dest: current dir; use ~ for user-level)" >&2
    echo "  upgrade → re-install into <dest>/.claude and prune files dropped since last install" >&2
    echo "  remove  → delete exactly what a prior claude install placed in <dest>/.claude" >&2
    echo "  codex   → AGENTS.md + AGENTS.full.md in <dest> + config into CODEX_HOME (default: ~/.codex)" >&2
    echo "  agents  → AGENTS.md (thin index) + AGENTS.full.md in <dest>" >&2
    echo "  init    → thin, project-specific AGENTS.md template in <dest> (filled by project-init)" >&2
    echo "  fleet   → machine-level conformance scanner + bootstrap hooks (~/.claude/fleet)" >&2
    exit 1
    ;;
esac
