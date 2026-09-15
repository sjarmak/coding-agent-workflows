#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
SCRIPT="$ROOT/check-rulings-durability.sh"
TESTS=0

fail() { printf 'not ok %d - %s\n' "$TESTS" "$*"; exit 1; }
pass() { printf 'ok %d - %s\n' "$TESTS" "$1"; }
run_test() { TESTS=$((TESTS + 1)); "$@"; }

# A fixture whose main file points at every doc and inlines nothing oversized.
make_clean_fixture() {
    local tmp=$1
    mkdir -p "$tmp/docs"
    cat > "$tmp/AGENTS.md" <<'EOF'
# Project

- File-deletion safety: list each target first; see `docs/file-deletion.md`.
- Review routing: see `docs/review-routing.md`.
EOF
    printf '# File deletion\n\nAlways list the target first.\n' > "$tmp/docs/file-deletion.md"
    printf '# Review routing\n\nRoute security work to a second reviewer.\n' > "$tmp/docs/review-routing.md"
}

test_clean_fixture_passes() {
    local tmp out rc
    tmp=$(mktemp -d -p "${TMPDIR:-/tmp}" rulechk-test.XXXXXX)
    trap "rm -rf -- '$tmp'" RETURN

    make_clean_fixture "$tmp"
    rc=0
    out=$("$SCRIPT" "$tmp/AGENTS.md" "$tmp/docs") || rc=$?
    [ "$rc" -eq 0 ] || fail "clean fixture exited $rc, expected 0"
    [[ $out == *'PASS inline'* ]] || fail 'clean fixture did not report the inline check passing'
    [[ $out == *'PASS references'* ]] || fail 'clean fixture did not report the reference check passing'
    pass 'a well-structured fixture passes both checks'
}

test_oversized_inline_ruling_warns() {
    local tmp out rc i
    tmp=$(mktemp -d -p "${TMPDIR:-/tmp}" rulechk-test.XXXXXX)
    trap "rm -rf -- '$tmp'" RETURN

    make_clean_fixture "$tmp"
    # 15 lines of ruling-shaped prose with no pointer anywhere near it. The
    # filler matters: the proximity window is three lines, so a pointer for an
    # unrelated rule that close would suppress the warning.
    {
        printf '\n## Push policy\n\nSome unrelated prose.\n\n'
        printf 'You must never force-push to a shared branch.\n'
        for i in $(seq 2 15); do printf 'Continuation line %d of the inlined ruling.\n' "$i"; done
    } >> "$tmp/AGENTS.md"

    rc=0
    out=$("$SCRIPT" "$tmp/AGENTS.md" "$tmp/docs") || rc=$?
    [ "$rc" -eq 1 ] || fail "oversized inline ruling exited $rc, expected 1"
    [[ $out == *'WARN inline'* ]] || fail 'oversized inline ruling was not flagged'
    [[ $out == *'PASS references'* ]] || fail 'reference check should still pass in this fixture'
    pass 'an oversized unpointered ruling paragraph is flagged'
}

test_pointer_suppresses_the_inline_warning() {
    local tmp out rc i
    tmp=$(mktemp -d -p "${TMPDIR:-/tmp}" rulechk-test.XXXXXX)
    trap "rm -rf -- '$tmp'" RETURN

    make_clean_fixture "$tmp"
    printf '# Push policy\n\nNever force-push a shared branch.\n' > "$tmp/docs/push-policy.md"
    {
        printf '\n## Push policy\n\nSome unrelated prose.\n\n'
        printf 'You must never force-push to a shared branch.\n'
        for i in $(seq 2 15); do printf 'Continuation line %d of the inlined ruling.\n' "$i"; done
        printf '\nSee `docs/push-policy.md`.\n'
    } >> "$tmp/AGENTS.md"

    rc=0
    out=$("$SCRIPT" "$tmp/AGENTS.md" "$tmp/docs") || rc=$?
    [ "$rc" -eq 0 ] || fail "pointered ruling exited $rc, expected 0"
    [[ $out == *'PASS inline'* ]] || fail 'a nearby pointer did not suppress the inline warning'
    pass 'a nearby pointer suppresses the inline warning'
}

test_orphan_document_warns() {
    local tmp out rc
    tmp=$(mktemp -d -p "${TMPDIR:-/tmp}" rulechk-test.XXXXXX)
    trap "rm -rf -- '$tmp'" RETURN

    make_clean_fixture "$tmp"
    printf '# Orphan\n\nAlways do the thing nobody links to.\n' > "$tmp/docs/orphan.md"

    rc=0
    out=$("$SCRIPT" "$tmp/AGENTS.md" "$tmp/docs") || rc=$?
    [ "$rc" -eq 1 ] || fail "orphan document exited $rc, expected 1"
    [[ $out == *'WARN orphan'* ]] || fail 'unreferenced document was not flagged'
    [[ $out == *'orphan.md'* ]] || fail 'warning did not name the orphaned file'
    [[ $out == *'PASS inline'* ]] || fail 'inline check should still pass in this fixture'
    pass 'a document nothing references is flagged'
}

test_usage_errors_exit_two() {
    local tmp rc
    tmp=$(mktemp -d -p "${TMPDIR:-/tmp}" rulechk-test.XXXXXX)
    trap "rm -rf -- '$tmp'" RETURN

    make_clean_fixture "$tmp"

    rc=0; "$SCRIPT" >/dev/null 2>&1 || rc=$?
    [ "$rc" -eq 2 ] || fail "missing arguments exited $rc, expected 2"

    rc=0; "$SCRIPT" --max-lines 0 "$tmp/AGENTS.md" "$tmp/docs" >/dev/null 2>&1 || rc=$?
    [ "$rc" -eq 2 ] || fail "non-positive --max-lines exited $rc, expected 2"

    rc=0; "$SCRIPT" "$tmp/nope.md" "$tmp/docs" >/dev/null 2>&1 || rc=$?
    [ "$rc" -eq 2 ] || fail "missing main file exited $rc, expected 2"

    rc=0; "$SCRIPT" "$tmp/AGENTS.md" "$tmp/nodir" >/dev/null 2>&1 || rc=$?
    [ "$rc" -eq 2 ] || fail "missing docs directory exited $rc, expected 2"

    pass 'usage and path errors exit 2, distinct from a warning exit of 1'
}

run_test test_clean_fixture_passes
run_test test_oversized_inline_ruling_warns
run_test test_pointer_suppresses_the_inline_warning
run_test test_orphan_document_warns
run_test test_usage_errors_exit_two

printf '1..%d\n' "$TESTS"
printf 'PASS: %d behavioral tests\n' "$TESTS"
