#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
SCRIPT="$ROOT/working-set-snapshot.sh"
TESTS=0

fail() { printf 'not ok %d - %s\n' "$TESTS" "$*"; exit 1; }
pass() { printf 'ok %d - %s\n' "$TESTS" "$1"; }
run_test() { TESTS=$((TESTS + 1)); "$@"; }
json_field() {
    python3 -c 'import json,sys; print(json.load(sys.stdin)[sys.argv[1]])' "$1"
}

test_bounded_missing_file() {
    local tmp out
    tmp=$(mktemp -d -p "${TMPDIR:-/tmp}" wss-test.XXXXXX)
    trap "rm -rf -- '$tmp'" RETURN

    out=$(printf '{malformed' | "$SCRIPT" --state-file "$tmp/state.md" --snapshot-dir "$tmp/snaps" --block-ceiling 2)
    [ "$(printf '%s' "$out" | json_field continue)" = False ] || fail 'first missing-file call did not block'
    [[ $(printf '%s' "$out" | json_field systemMessage) == *'attempt 1/2'* ]] || fail 'first block count missing'

    out=$(printf '{}' | "$SCRIPT" --state-file "$tmp/state.md" --snapshot-dir "$tmp/snaps" --block-ceiling 2)
    [ "$(printf '%s' "$out" | json_field continue)" = False ] || fail 'second missing-file call did not block'

    out=$(printf '{}' | "$SCRIPT" --state-file "$tmp/state.md" --snapshot-dir "$tmp/snaps" --block-ceiling 2)
    [ "$(printf '%s' "$out" | json_field continue)" = True ] || fail 'bounded ceiling did not eventually continue'
    [[ $(printf '%s' "$out" | json_field systemMessage) == *'Still unresolved after 2 blocks'* ]] || fail 'give-up message missing'
    [ ! -e "$tmp/snaps/.block-attempts" ] || fail 'counter was not cleared after bounded give-up'
}

test_snapshot_and_hash_without_vcs() {
    local tmp out snapshot expected
    tmp=$(mktemp -d -p "${TMPDIR:-/tmp}" wss-test.XXXXXX)
    trap "rm -rf -- '$tmp'" RETURN
    printf '# Working set\n\n## Doing\nShip it.\n' >"$tmp/state.md"
    expected=$(sha256sum "$tmp/state.md" | awk '{print $1}')

    out=$(cd "$tmp" && printf '{"session_id":"session/unsafe"}' | "$SCRIPT" --state-file "$tmp/state.md" --snapshot-dir "$tmp/snaps")
    [ "$(printf '%s' "$out" | json_field continue)" = True ] || fail 'successful snapshot did not continue'
    snapshot=$(find "$tmp/snaps" -maxdepth 1 -type f -name '*.md' -print)
    [ -n "$snapshot" ] || fail 'snapshot file not created'
    grep -Fq -- "- content sha256: $expected" "$snapshot" || fail 'content hash not stamped'
    grep -Fq -- '- branch: unavailable' "$snapshot" || fail 'non-repo branch did not degrade gracefully'
    grep -Fq -- '- head: unavailable' "$snapshot" || fail 'non-repo head did not degrade gracefully'
    grep -Fq -- '- dirty paths: unavailable' "$snapshot" || fail 'non-repo dirty count did not degrade gracefully'
    [[ ${snapshot##*/} != *'/'* ]] || fail 'unsafe session id leaked into snapshot path'
}

test_staleness_warning() {
    local tmp out
    tmp=$(mktemp -d -p "${TMPDIR:-/tmp}" wss-test.XXXXXX)
    trap "rm -rf -- '$tmp'" RETURN
    printf '## Doing\nOld work\n' >"$tmp/state.md"
    touch -d '10 minutes ago' "$tmp/state.md"
    out=$(printf '{}' | "$SCRIPT" --state-file "$tmp/state.md" --snapshot-dir "$tmp/snaps" --stale-minutes 5)
    [[ $(printf '%s' "$out" | json_field systemMessage) == *'has not been touched in over 5 minutes'* ]] || fail 'staleness warning missing'
    [ "$(printf '%s' "$out" | json_field continue)" = True ] || fail 'staleness warning blocked compaction'
}

test_frozen_content_warning() {
    local tmp out i
    tmp=$(mktemp -d -p "${TMPDIR:-/tmp}" wss-test.XXXXXX)
    trap "rm -rf -- '$tmp'" RETURN
    printf '## Doing\nSame work\n' >"$tmp/state.md"
    for i in 1 2; do
        printf '{"session_id":"s%s"}' "$i" | "$SCRIPT" --state-file "$tmp/state.md" --snapshot-dir "$tmp/snaps" >/dev/null
    done
    out=$(printf '{"session_id":"s3"}' | "$SCRIPT" --state-file "$tmp/state.md" --snapshot-dir "$tmp/snaps")
    [[ $(printf '%s' "$out" | json_field systemMessage) == *'MODEL CONTENT UNCHANGED ACROSS 3 BOUNDARIES'* ]] || fail 'frozen-content warning missing'
    [ "$(printf '%s' "$out" | json_field continue)" = True ] || fail 'frozen-content warning blocked compaction'
}

run_test test_bounded_missing_file; pass 'missing file blocks only to ceiling'
run_test test_snapshot_and_hash_without_vcs; pass 'snapshot and hash work outside a VCS repository'
run_test test_staleness_warning; pass 'stale state warns without blocking'
run_test test_frozen_content_warning; pass 'unchanged content across three boundaries warns'
printf '1..%d\nPASS: %d behavioral tests\n' "$TESTS" "$TESTS"
