#!/usr/bin/env bash

set -euo pipefail

GLOBAL_DIR="${SKILL_STOCKTAKE_GLOBAL_DIR:-${AGENT_GLOBAL_SKILLS_DIR:-$HOME/.agents/skills}}"
CWD_SKILLS_DIR="${SKILL_STOCKTAKE_PROJECT_DIR:-${1:-${AGENT_PROJECT_SKILLS_DIR:-$PWD/.agents/skills}}}"
OBSERVATIONS="${SKILL_STOCKTAKE_OBSERVATIONS:-$HOME/.agent-observations.jsonl}"

if [[ -n "$CWD_SKILLS_DIR" && -d "$CWD_SKILLS_DIR" && "$CWD_SKILLS_DIR" != */.agents/skills* ]]; then
  echo "Warning: CWD_SKILLS_DIR does not look like a project skills path: $CWD_SKILLS_DIR" >&2
fi

extract_field() {
  local file="$1" field="$2"
  awk -v f="$field" '
    BEGIN { fm=0 }
    /^---$/ { fm++; next }
    fm==1 {
      n = length(f) + 2
      if (substr($0, 1, n) == f ": ") {
        val = substr($0, n+1)
        gsub(/^"/, "", val)
        gsub(/"$/, "", val)
        print val
        exit
      }
    }
    fm>=2 { exit }
  ' "$file"
}

date_ago() {
  local n="$1"
  date -u -v-"${n}d" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null ||
  date -u -d "${n} days ago" +%Y-%m-%dT%H:%M:%SZ
}

count_obs() {
  local file="$1" cutoff="$2"
  if [[ ! -f "$OBSERVATIONS" ]]; then
    echo null
    return
  fi
  jq -r --arg p "$file" --arg c "$cutoff" \
    'select(.tool=="Read" and .path==$p and .timestamp>=$c) | 1' \
    "$OBSERVATIONS" 2>/dev/null | wc -l | tr -d ' '
}

scan_dir_to_json() {
  local dir="$1"
  local c7 c30
  c7=$(date_ago 7)
  c30=$(date_ago 30)

  local tmpdir
  tmpdir=$(mktemp -d)
  local _scan_tmpdir="$tmpdir"
  _scan_cleanup() { rm -rf "$_scan_tmpdir"; }
  trap _scan_cleanup RETURN

  local i=0
  while IFS= read -r file; do
    local name desc mtime u7 u30 dp
    name=$(extract_field "$file" "name")
    desc=$(extract_field "$file" "description")
    mtime=$(date -u -r "$file" +%Y-%m-%dT%H:%M:%SZ)
    u7=$(count_obs "$file" "$c7")
    u30=$(count_obs "$file" "$c30")
    if [[ "$file" == "$HOME/"* ]]; then
      dp="~/${file#"$HOME/"}"
    else
      dp="$file"
    fi

    jq -n \
      --arg path "$dp" \
      --arg name "$name" \
      --arg description "$desc" \
      --arg mtime "$mtime" \
      --argjson use_7d "$u7" \
      --argjson use_30d "$u30" \
      '{path:$path,name:$name,description:$description,use_7d:$use_7d,use_30d:$use_30d,mtime:$mtime}' \
      > "$tmpdir/$i.json"
    i=$((i+1))
  done < <(find "$dir" -name "SKILL.md" -type f 2>/dev/null | sort)

  if [[ $i -eq 0 ]]; then
    echo "[]"
  else
    jq -s '.' "$tmpdir"/*.json
  fi
}


global_found="false"
global_count=0
global_skills="[]"

if [[ -d "$GLOBAL_DIR" ]]; then
  global_found="true"
  global_skills=$(scan_dir_to_json "$GLOBAL_DIR")
  global_count=$(echo "$global_skills" | jq 'length')
fi

project_found="false"
project_path=""
project_count=0
project_skills="[]"

if [[ -n "$CWD_SKILLS_DIR" && -d "$CWD_SKILLS_DIR" ]]; then
  project_found="true"
  project_path="$CWD_SKILLS_DIR"
  project_skills=$(scan_dir_to_json "$CWD_SKILLS_DIR")
  project_count=$(echo "$project_skills" | jq 'length')
fi

all_skills=$(jq -s 'add' <(echo "$global_skills") <(echo "$project_skills"))

jq -n \
  --arg global_found "$global_found" \
  --argjson global_count "$global_count" \
  --arg project_found "$project_found" \
  --arg project_path "$project_path" \
  --argjson project_count "$project_count" \
  --argjson skills "$all_skills" \
  '{
    scan_summary: {
      global: { found: ($global_found == "true"), count: $global_count },
      project: { found: ($project_found == "true"), path: $project_path, count: $project_count }
    },
    skills: $skills
  }'
