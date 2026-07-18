#!/usr/bin/env bash
# session-bootstrap-check.sh — SessionStart hook.
#
# Two jobs, both quiet on the happy path:
#   1. Register this repo in the fleet registry so the scanner discovers it
#      even outside the configured scan roots.
#   2. If the repo has no agent context layer (no AGENTS.md / CLAUDE.md) and
#      is not marked scratch, inject a one-line nudge so the session scaffolds
#      it before doing work. The hook never writes into the repo itself —
#      scaffolding is the agent's job (project-init workflow), per ZFC.
set -euo pipefail

FLEET_DIR="$HOME/.claude/fleet"
KNOWN="$FLEET_DIR/known-repos.list"

top="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
# Linked worktrees have .git as a file; the primary checkout covers them.
[ -d "$top/.git" ] || exit 0
# Never register transient checkouts (scratch repos under temp dirs). They
# accrete into the registry forever and never get cleaned up otherwise.
case "$top" in /tmp/*|/var/tmp/*) exit 0 ;; esac

mkdir -p "$FLEET_DIR"
touch "$KNOWN"
grep -qxF "$top" "$KNOWN" 2>/dev/null || echo "$top" >> "$KNOWN"

# Scratch repos opt out of everything downstream.
[ -f "$top/.repo-tier" ] && grep -qi '^scratch' "$top/.repo-tier" && exit 0

if [ ! -e "$top/AGENTS.md" ] && [ ! -e "$top/CLAUDE.md" ]; then
  cat <<'EOF'
This repo has no agent context layer (no AGENTS.md or CLAUDE.md). Before substantive work:
- run the project-init workflow to scaffold a thin AGENTS.md and seed compass maps, or
- if this is a throwaway directory, mark it: echo scratch > .repo-tier
EOF
fi
exit 0
