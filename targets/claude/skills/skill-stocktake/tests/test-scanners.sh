#!/usr/bin/env bash
set -euo pipefail

root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
base=$(mktemp -d)
trap 'rm -rf "$base"' EXIT
outside="$base/outside dir"
rules="$outside/rules"
global="$outside/global skills"
project="$outside/project skills"
mkdir -p "$rules" "$global/a skill" "$project/b skill"
printf '## Heading\n' > "$rules/rule file.md"
printf 'not a skill\n' > "$global/README.md"
cat > "$global/a skill/SKILL.md" <<'EOF'
---
name: global-spaced
description: Global skill
---
EOF
cat > "$project/b skill/SKILL.md" <<'EOF'
---
name: project-spaced
description: Project skill
---
EOF

rules_json=$("$root/rules-distill/scripts/scan-rules.sh" "$rules")
test "$(jq -r '.rules[0].path' <<<"$rules_json")" = "$rules/rule file.md"

skills_json=$(RULES_DISTILL_GLOBAL_DIR="$global" RULES_DISTILL_PROJECT_DIR="$project" "$root/rules-distill/scripts/scan-skills.sh")
test "$(jq -r '.skills[0].path' <<<"$skills_json")" = "$global/a skill/SKILL.md"

stock_json=$(SKILL_STOCKTAKE_GLOBAL_DIR="$global" SKILL_STOCKTAKE_PROJECT_DIR="$project" SKILL_STOCKTAKE_OBSERVATIONS="$base/missing observations.jsonl" "$root/skill-stocktake/scripts/scan.sh")
test "$(jq '.skills | length' <<<"$stock_json")" = 2
test "$(jq -r '.skills[] | select(.name == "global-spaced") | .path' <<<"$stock_json")" = "$global/a skill/SKILL.md"
test "$(jq -r '.skills[] | select(.name == "global-spaced") | .use_7d' <<<"$stock_json")" = null
