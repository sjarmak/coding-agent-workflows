#!/usr/bin/env bash
# git-template-setup.sh — make fleet registration automatic for every repo
# created on this machine.
#
# Installs a git template directory whose post-commit hook appends the repo
# path to the fleet registry on first commit. The hook writes NOTHING into
# the repo and exits 0 unconditionally; scaffolding and conformance are
# handled by the SessionStart hook and the fleet-conformance workflow.
#
# Note: template hooks land in .git/hooks at `git init` / `git clone` time.
# Repos that later set core.hooksPath (e.g. .githooks) stop running this
# hook — by then the repo is already registered, so nothing is lost.
set -euo pipefail

TEMPLATE_DIR="$HOME/.git-template"
mkdir -p "$TEMPLATE_DIR/hooks"

cat > "$TEMPLATE_DIR/hooks/post-commit" <<'EOF'
#!/usr/bin/env bash
# Fleet registry registration (installed via init.templateDir). Never blocks.
top="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -d "$top/.git" ] || exit 0
KNOWN="$HOME/.claude/fleet/known-repos.list"
mkdir -p "$(dirname "$KNOWN")" && touch "$KNOWN"
grep -qxF "$top" "$KNOWN" 2>/dev/null || echo "$top" >> "$KNOWN"
exit 0
EOF
chmod +x "$TEMPLATE_DIR/hooks/post-commit"

current="$(git config --global init.templateDir || true)"
if [ -n "$current" ] && [ "$current" != "$TEMPLATE_DIR" ]; then
  echo "init.templateDir already set to '$current' — not overriding." >&2
  echo "Merge $TEMPLATE_DIR/hooks/post-commit into it manually if wanted." >&2
  exit 0
fi
git config --global init.templateDir "$TEMPLATE_DIR"
echo "git init.templateDir → $TEMPLATE_DIR (new repos auto-register in the fleet)"
