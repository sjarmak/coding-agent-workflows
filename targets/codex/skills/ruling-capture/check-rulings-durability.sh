#!/usr/bin/env bash

set -euo pipefail

# This is a heuristic aid, not a strict linter. It finds likely review targets;
# a warning is not proof that a document is incorrectly structured.

usage() {
  printf 'Usage: %s [--max-lines N] MAIN_INSTRUCTIONS_FILE DOCS_DIRECTORY\n' "$0"
  printf 'Checks for oversized ruling-shaped paragraphs and unreferenced Markdown documents.\n'
}

max_lines=12
if [[ ${1:-} == "--max-lines" ]]; then
  if [[ $# -lt 2 ]]; then
    usage >&2
    exit 2
  fi
  max_lines=$2
  shift 2
fi

if [[ $# -ne 2 ]]; then
  usage >&2
  exit 2
fi

if [[ ! $max_lines =~ ^[1-9][0-9]*$ ]]; then
  printf 'ERROR: --max-lines must be a positive integer; got %q.\n' "$max_lines" >&2
  exit 2
fi

main_file=$1
docs_dir=${2%/}

if [[ ! -f $main_file ]]; then
  printf 'ERROR: main instructions file not found: %s\n' "$main_file" >&2
  exit 2
fi
if [[ ! -d $docs_dir ]]; then
  printf 'ERROR: docs directory not found: %s\n' "$docs_dir" >&2
  exit 2
fi

printf 'Durable-rulings sanity check (heuristic aid, not a strict linter)\n'
printf 'Main instructions: %s\n' "$main_file"
printf 'Documentation: %s\n' "$docs_dir"
printf 'Maximum inline ruling paragraph: %s lines\n\n' "$max_lines"

ruling_pattern='(^|[^[:alnum:]_])(always|never|must|ruling|policy)([^[:alnum:]_]|$)'
pointer_pattern='(\[[^]]+\]\([^)]*\.md(#[^)]*)?\)|`[^`]+\.md(#[^`]*)?`|[[:alnum:]_.-]+(/[[:alnum:]_.-]+)+\.md(#[^[:space:]]*)?)'
nearby_lines=3
warnings=0
inline_warnings=0
orphan_warnings=0

mapfile -t main_lines < "$main_file"

check_paragraph() {
  local start=$1
  local end=$2
  local length=$((end - start + 1))
  local block
  local window_start
  local window_end
  local window_length
  local window

  if (( length <= max_lines )); then
    return
  fi

  printf -v block '%s\n' "${main_lines[@]:start:length}"
  if ! grep -Eiq -- "$ruling_pattern" <<< "$block"; then
    return
  fi

  window_start=$((start - nearby_lines))
  if (( window_start < 0 )); then
    window_start=0
  fi
  window_end=$((end + nearby_lines))
  if (( window_end >= ${#main_lines[@]} )); then
    window_end=$((${#main_lines[@]} - 1))
  fi
  window_length=$((window_end - window_start + 1))
  printf -v window '%s\n' "${main_lines[@]:window_start:window_length}"

  if grep -Eq -- "$pointer_pattern" <<< "$window"; then
    return
  fi

  printf 'WARN inline: lines %d-%d form a %d-line ruling-shaped paragraph with no nearby Markdown pointer.\n' \
    "$((start + 1))" "$((end + 1))" "$length"
  warnings=$((warnings + 1))
  inline_warnings=$((inline_warnings + 1))
}

paragraph_start=-1
for ((line_index = 0; line_index <= ${#main_lines[@]}; line_index += 1)); do
  if (( line_index == ${#main_lines[@]} )) || [[ ${main_lines[line_index]} =~ ^[[:space:]]*$ ]]; then
    if (( paragraph_start >= 0 )); then
      check_paragraph "$paragraph_start" "$((line_index - 1))"
      paragraph_start=-1
    fi
  elif (( paragraph_start < 0 )); then
    paragraph_start=$line_index
  fi
done

if (( inline_warnings == 0 )); then
  printf 'PASS inline: no oversized, unpointered ruling-shaped paragraphs found.\n'
fi

if [[ $main_file == */* ]]; then
  main_dir=${main_file%/*}
else
  main_dir=.
fi

shopt -s globstar nullglob
markdown_docs=("$docs_dir"/**/*.md)
for doc in "${markdown_docs[@]}"; do
  [[ -f $doc ]] || continue

  reference=$doc
  if [[ $doc == "$main_dir"/* ]]; then
    reference=${doc#"$main_dir"/}
  fi
  reference=${reference#./}

  if grep -Fq -- "$reference" "$main_file" || grep -Fq -- "./$reference" "$main_file"; then
    continue
  fi

  printf 'WARN orphan: %s is not referenced from %s.\n' "$doc" "$main_file"
  warnings=$((warnings + 1))
  orphan_warnings=$((orphan_warnings + 1))
done

if (( orphan_warnings == 0 )); then
  printf 'PASS references: every Markdown document is referenced from the main instructions file.\n'
fi

printf '\n'
if (( warnings > 0 )); then
  printf 'FAIL: %d heuristic warning(s) need human review.\n' "$warnings"
  exit 1
fi

printf 'PASS: no durability warning candidates found.\n'

