#!/usr/bin/env bash

set -euo pipefail

RULES_DIR="${RULES_DISTILL_DIR:-${AGENT_GLOBAL_RULES_DIR:-${1:-$HOME/.agents/rules}}}"

if [[ ! -d "$RULES_DIR" ]]; then
  jq -n --arg path "$RULES_DIR" '{"error":"rules directory not found","path":$path}' >&2
  exit 1
fi

files=()
while IFS= read -r f; do
  files+=("$f")
done < <(find "$RULES_DIR" -name '*.md' -not -path '*/_archived/*' -print | sort)

total=${#files[@]}

tmpdir=$(mktemp -d)
_rules_cleanup() { rm -rf "$tmpdir"; }
trap _rules_cleanup EXIT

for i in "${!files[@]}"; do
  file="${files[$i]}"
  if [[ "$file" == "$HOME/"* ]]; then
    rel_path="~/${file#"$HOME/"}"
  else
    rel_path="$file"
  fi

  headings_json=$({ grep -E '^## ' "$file" 2>/dev/null || true; } | sed 's/^## //' | jq -R . | jq -s '.')

  line_count=$(wc -l < "$file" | tr -d ' ')

  jq -n \
    --arg path "$rel_path" \
    --arg file "$(basename "$file")" \
    --argjson lines "$line_count" \
    --argjson headings "$headings_json" \
    '{path:$path,file:$file,lines:$lines,headings:$headings}' \
    > "$tmpdir/$i.json"
done

if [[ ${#files[@]} -eq 0 ]]; then
  jq -n --arg dir "$RULES_DIR" '{rules_dir:$dir,total:0,rules:[]}'
else
  jq -n \
    --arg dir "$RULES_DIR" \
    --argjson total "$total" \
    --argjson rules "$(jq -s '.' "$tmpdir"/*.json)" \
    '{rules_dir:$dir,total:$total,rules:$rules}'
fi
