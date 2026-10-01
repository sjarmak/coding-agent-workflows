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

# cp that is a no-op when source and destination are the same file, so
# `./install.sh codex|agents` run from inside this repo does not abort on
# "AGENTS.md and AGENTS.md are the same file".
cp_unless_same() {
  local src=$1 dst=$2
  if has_symlink_ancestor "$dst"; then
    echo "refusing to install: destination is or contains a symlink ($dst)" >&2
    return 1
  fi
  if [ -e "$dst" ] && [ "$src" -ef "$dst" ]; then
    note "$dst is this repo's own file; left as is."
    return 0
  fi
  cp "$src" "$dst"
}

has_symlink_ancestor() {
  local input=$1 current rest part
  case "$input" in
    /*) current=/; rest=${input#/} ;;
    *) current=; rest=$input ;;
  esac
  IFS=/ read -ra path_parts <<< "$rest"
  for part in "${path_parts[@]}"; do
    [ -n "$part" ] || continue
    [ "$part" = . ] && continue
    [ "$part" = .. ] && return 0
    if [ "$current" = / ]; then current="/$part"; elif [ -n "$current" ]; then current="$current/$part"; else current="$part"; fi
    [ -L "$current" ] && return 0
  done
  return 1
}

valid_relative_path() {
  case "$1" in
    ''|/*|*..*|*//* ) return 1 ;;
  esac
}

safe_copy_tree() {
  local src=$1 dst=$2 prefix=${3:-}
  has_symlink_ancestor "$dst" && return 0
  mkdir -p "$dst"
  while IFS= read -r rel; do
    local target="$dst/$rel" parent part current
    parent=$(dirname "$target")
    current="$dst"
    IFS=/ read -ra parts <<< "${rel%/*}"
    for part in "${parts[@]}"; do
      [ -n "$part" ] || continue
      current="$current/$part"
      if [ -L "$current" ]; then
        target=""
        break
      fi
    done
    [ -n "$target" ] || continue
    [ -L "$target" ] && continue
    mkdir -p "$parent"
    cp "$src/$rel" "$target"
    [ -n "$prefix" ] && installed+=("$prefix/$rel")
  done < <(cd "$src" && find -P . -type f | sed 's|^./||' | sort)
  return 0
}

safe_copy_file() {
  local src=$1 dst=$2
  has_symlink_ancestor "$dst" && return 0
  [ -L "$dst" ] && return 0
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
}

case "$AGENT" in
  claude|upgrade)
    mode="$AGENT"
    target="$DEST/.claude"
    src="$REPO/targets/claude"
    manifest="$target/.coding-agent-workflows-manifest"
    if has_symlink_ancestor "$target"; then
      echo "refusing to install: Claude destination is or contains a symlink ($target)" >&2
      exit 1
    fi
    mkdir -p "$target"
    if has_symlink_ancestor "$manifest"; then
      echo "refusing to install: Claude ownership manifest is or contains a symlink ($manifest)" >&2
      exit 1
    fi

    # Files this install writes (relative paths), and the prior install's list.
    # Portable array fill (no mapfile) so this runs under stock macOS bash too.
    files=(); while IFS= read -r f; do files+=("$f"); done \
      < <(cd "$src" && find . -type f | sed 's|^\./||' | sort)
    for f in "${files[@]}"; do
      case "$f" in rules/reference/*)
        echo "refusing to install: bundle ships $f, and Claude Code auto-loads rules/reference/ into every session" >&2
        exit 1 ;;
      esac
    done
    if [ -e "$target/rules/reference" ]; then
      echo "refusing to install: $target/rules/reference exists and is auto-loaded into every session; move it to $target/rules-reference and re-run" >&2
      exit 1
    fi
    prev=(); [ -f "$manifest" ] && while IFS= read -r f; do [ -n "$f" ] && prev+=("$f"); done < "$manifest"
    contains() { local x=$1; shift; local e; for e in "$@"; do [ "$e" = "$x" ] && return 0; done; return 1; }

    # Collision guard: back up any file we would overwrite that we do NOT
    # already own (absent from the prior manifest) and that differs from ours,
    # so a user-level install (./install.sh claude ~) never silently clobbers
    # hand-authored config in an existing ~/.claude.
    backup="$target/.coding-agent-workflows-backup/$(date +%Y%m%d-%H%M%S)"
    if has_symlink_ancestor "$backup"; then
      echo "refusing to install: Claude backup path is or contains a symlink ($backup)" >&2
      exit 1
    fi
    saved=0
    for f in "${files[@]}"; do
      has_symlink_ancestor "$target/$f" && continue
      [ -e "$target/$f" ] || continue
      contains "$f" ${prev[@]+"${prev[@]}"} && continue
      cmp -s "$src/$f" "$target/$f" && continue
      backup_file="$backup/$f"
      has_symlink_ancestor "$backup_file" && { echo "refusing to install: Claude backup path is or contains a symlink ($backup_file)" >&2; exit 1; }
      mkdir -p "$(dirname "$backup_file")"
      cp "$target/$f" "$backup_file"
      saved=$((saved + 1))
    done

    # A pre-existing symlink in the destination (a skill dir linked to a
    # collection the user maintains elsewhere) cannot be overwritten by a
    # directory, and writing through it would edit files outside $target.
    # Skip those paths and report them instead of failing the whole install.
    skipped_links=()
    while IFS= read -r d; do
      [ -n "$d" ] || continue
      [ -L "$target/$d" ] || continue
      skipped_links+=("$d")
    done < <(cd "$src" && find . -mindepth 1 -type d | sed 's|^\./||' | sort)

    under_skipped() {
      local f=$1 d
      for d in ${skipped_links[@]+"${skipped_links[@]}"}; do
        case "$f" in "$d"/*) return 0 ;; esac
      done
      return 1
    }

    installed=()
    for f in "${files[@]}"; do
      under_skipped "$f" && continue
      has_symlink_ancestor "$target/$f" && continue
      mkdir -p "$target/$(dirname "$f")"
      cp "$src/$f" "$target/$f"
      installed+=("$f")
    done

    # upgrade: prune files the previous install owned that we no longer ship.
    pruned=0
    if [ "$mode" = upgrade ]; then
      for f in ${prev[@]+"${prev[@]}"}; do
        contains "$f" ${installed[@]+"${installed[@]}"} && continue
        valid_relative_path "$f" || continue
        has_symlink_ancestor "$target/$f" && continue
        rm -f "$target/$f" && pruned=$((pruned + 1))
      done
    fi

    printf '%s\n' ${installed[@]+"${installed[@]}"} > "$manifest"
    echo "Installed Claude Code config → $target"
    [ "$saved" -gt 0 ] && note "Backed up $saved pre-existing file(s) before overwrite → $backup"
    [ "$pruned" -gt 0 ] && note "Pruned $pruned file(s) the bundle no longer ships."
    if [ "${#skipped_links[@]}" -gt 0 ]; then
      note "Skipped ${#skipped_links[@]} path(s) that are symlinks in $target (left untouched):"
      for d in "${skipped_links[@]}"; do note "  $d -> $(readlink "$target/$d")"; done
      note "Remove a symlink and re-run to install the bundle's version there."
    fi
    note "rules/ agents/ skills/ commands/ are now available."
    note "Files you did not have are added; foreign same-named files were backed up, not lost."
    note "File list written to .claude/.coding-agent-workflows-manifest (drives upgrade/remove)."
    note "Wanted user-level instead? re-run: ./install.sh claude ~"
    ;;
  remove)
    target="$DEST/.claude"
    manifest="$target/.coding-agent-workflows-manifest"
    if has_symlink_ancestor "$manifest"; then
      echo "refusing to remove: ownership manifest is or contains a symlink ($manifest)" >&2
      exit 1
    fi
    if [ ! -f "$manifest" ]; then
      echo "No bundle manifest at $manifest — nothing to remove." >&2
      echo "(remove only undoes a prior './install.sh claude' into this dest.)" >&2
      exit 1
    fi
    removed=0
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      valid_relative_path "$f" || continue
      has_symlink_ancestor "$target/$f" && continue
      [ -e "$target/$f" ] && rm -f "$target/$f" && removed=$((removed + 1))
    done < "$manifest"
    rm -f "$manifest"
    # Drop directories the install left empty, but never .claude itself.
    find "$target" -mindepth 1 -type d -empty -delete 2>/dev/null || true
    echo "Removed $removed bundle file(s) from $target"
    note "Your non-bundle .claude contents are left in place."
    note "Any collision backups remain under .claude/.coding-agent-workflows-backup/."
    ;;
  codex|codex-upgrade)
    cp_unless_same "$REPO/AGENTS.md" "$DEST/AGENTS.md"
    cp_unless_same "$REPO/AGENTS.full.md" "$DEST/AGENTS.full.md"
    codex_home="${CODEX_HOME:-$HOME/.codex}"
    if has_symlink_ancestor "$codex_home"; then
      echo "refusing to install: CODEX_HOME is or contains a symlink ($codex_home)" >&2
      exit 1
    fi
    mkdir -p "$codex_home"
    codex_manifest="$codex_home/.coding-agent-workflows-manifest"
    if has_symlink_ancestor "$codex_manifest"; then
      echo "refusing to install: Codex ownership manifest is or contains a symlink ($codex_manifest)" >&2
      exit 1
    fi
    valid_owned_path() {
      case "$1" in
        agents/*|prompts/*|skills/*|rules/*) ;;
        *) return 1 ;;
      esac
      case "$1" in
        /*|*..*|*//* ) return 1 ;;
      esac
    }
    prev=()
    if [ -f "$codex_manifest" ]; then
      while IFS= read -r f; do
        [ -n "$f" ] || continue
        if ! valid_owned_path "$f"; then
          echo "refusing to install: invalid Codex ownership path '$f'" >&2
          exit 1
        fi
        prev+=("$f")
      done < "$codex_manifest"
    fi
    contains() { local x=$1; shift; local e; for e in "$@"; do [ "$e" = "$x" ] && return 0; done; return 1; }
    files=(); while IFS= read -r f; do files+=("$f"); done < <(cd "$REPO/targets/codex" && find -P agents prompts skills rules -type f | sort)
    backup="$codex_home/.coding-agent-workflows-backup/$(date +%Y%m%d-%H%M%S)"
    if has_symlink_ancestor "$backup"; then
      echo "refusing to install: Codex backup path is or contains a symlink ($backup)" >&2
      exit 1
    fi
    saved=0
    for f in "${files[@]}"; do
      [ -e "$codex_home/$f" ] || continue
      has_symlink_ancestor "$codex_home/$f" && continue
      contains "$f" ${prev[@]+"${prev[@]}"} && continue
      cmp -s "$REPO/targets/codex/$f" "$codex_home/$f" && continue
      backup_file="$backup/$f"
      has_symlink_ancestor "$backup_file" && { echo "refusing to install: Codex backup path is or contains a symlink ($backup_file)" >&2; exit 1; }
      mkdir -p "$(dirname "$backup_file")"
      cp -L "$codex_home/$f" "$backup_file"
      saved=$((saved + 1))
    done
    installed=()
    for kind in agents prompts skills rules; do
      safe_copy_tree "$REPO/targets/codex/$kind" "$codex_home/$kind" "$kind"
    done
    if [ "$AGENT" = codex ]; then
      for f in "${prev[@]}"; do
        has_symlink_ancestor "$codex_home/$f" && continue
        contains "$f" ${installed[@]+"${installed[@]}"} || installed+=("$f")
      done
    fi
    pruned=0
    if [ "$AGENT" = codex-upgrade ]; then
      for f in ${prev[@]+"${prev[@]}"}; do
        contains "$f" ${installed[@]+"${installed[@]}"} && continue
        valid_owned_path "$f" || continue
        prune_target="$codex_home/$f"
        has_symlink_ancestor "$prune_target" && continue
        [ -f "$prune_target" ] && rm -f "$prune_target" && pruned=$((pruned + 1))
      done
    fi
    printf '%s\n' ${installed[@]+"${installed[@]}"} > "$codex_manifest"
    if [ -L "$codex_home/config.toml" ]; then
      note "$codex_home/config.toml is a symlink; left untouched."
    elif [ -e "$codex_home/config.toml" ]; then
      config_backup="$codex_home/config.toml.from-coding-agent-workflows"
      if has_symlink_ancestor "$config_backup"; then
        echo "refusing to install: Codex config backup path is or contains a symlink ($config_backup)" >&2
        exit 1
      fi
      cp "$REPO/targets/codex/config.toml" "$codex_home/config.toml.from-coding-agent-workflows"
      note "$codex_home/config.toml already exists; wrote ours as config.toml.from-coding-agent-workflows, merge manually."
    else
      cp "$REPO/targets/codex/config.toml" "$codex_home/config.toml"
    fi
    echo "Installed AGENTS.md + AGENTS.full.md → $DEST   and Codex agents/prompts/skills/rules → $codex_home"
    [ "$saved" -gt 0 ] && note "Backed up $saved pre-existing file(s) before overwrite → $backup"
    [ "$pruned" -gt 0 ] && note "Pruned $pruned file(s) the bundle no longer ships."
    note "Codex reads AGENTS.md automatically from your project root."
    ;;
  agents)
    cp_unless_same "$REPO/AGENTS.md" "$DEST/AGENTS.md"
    cp_unless_same "$REPO/AGENTS.full.md" "$DEST/AGENTS.full.md"
    while IFS= read -r skill; do
      [ -n "$skill" ] || continue
      safe_copy_tree "$REPO/targets/codex/skills/$skill" "$DEST/.agents/skills/$skill"
    done < "$REPO/targets/codex/universal-skills.list"
    while IFS= read -r rule; do
      [ -n "$rule" ] || continue
      safe_copy_file "$REPO/targets/codex/rules/$rule" "$DEST/.agents/rules/$rule"
    done < "$REPO/targets/codex/universal-rules.list"
    echo "Installed AGENTS.md (thin index) + AGENTS.full.md + .agents/skills + .agents/rules → $DEST"
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
    echo "  codex-upgrade → update Codex files and prune files previously owned by this bundle" >&2
    echo "  agents  → AGENTS.md + AGENTS.full.md + .agents/skills + .agents/rules in <dest>" >&2
    echo "  init    → thin, project-specific AGENTS.md template in <dest> (filled by project-init)" >&2
    echo "  fleet   → machine-level conformance scanner + bootstrap hooks (~/.claude/fleet)" >&2
    exit 1
    ;;
esac
