#!/usr/bin/env bash
# Snapshot a model-maintained working set at a context-compaction boundary.
set -uo pipefail

PROGRAM=${0##*/}
STATE_FILE=${WSS_STATE_FILE:-${WORKING_SET_FILE:-"$PWD/working-set.md"}}
SNAPSHOT_DIR=${WSS_SNAPSHOT_DIR:-${WORKING_SET_SNAPSHOT_DIR:-}}
BLOCK_CEILING=${WSS_BLOCK_CEILING:-${WORKING_SET_BLOCK_CEILING:-2}}
STALE_MINUTES=${WSS_STALE_MINUTES:-${WORKING_SET_STALE_MINUTES:-90}}
VCS_DIR=${WSS_VCS_DIR:-${WORKING_SET_VCS_DIR:-}}

emit() { # continue, message
    python3 - "$1" "$2" <<'PY'
import json
import sys

print(json.dumps({
    "continue": sys.argv[1] == "true",
    "suppressOutput": False,
    "systemMessage": sys.argv[2],
}, ensure_ascii=False))
PY
}

usage() {
    cat <<EOF
Usage: $PROGRAM [OPTIONS]

Options:
  --state-file PATH       Model-authored working-set file
  --snapshot-dir PATH     Directory for snapshots and the block counter
  --block-ceiling N       Consecutive missing/write blocks before continuing
  --stale-minutes N       Warn when the state file is older than N minutes
  --vcs-dir PATH          Directory in which to collect optional Git facts
  -h, --help              Show this help

Environment equivalents: WSS_STATE_FILE, WSS_SNAPSHOT_DIR,
WSS_BLOCK_CEILING, WSS_STALE_MINUTES, and WSS_VCS_DIR.
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --state-file|--snapshot-dir|--block-ceiling|--stale-minutes|--vcs-dir)
            option=$1
            if [ "$#" -lt 2 ]; then
                emit true "PreCompact configuration error: $option requires a value."
                exit 0
            fi
            value=$2
            case "$option" in
                --state-file) STATE_FILE=$value ;;
                --snapshot-dir) SNAPSHOT_DIR=$value ;;
                --block-ceiling) BLOCK_CEILING=$value ;;
                --stale-minutes) STALE_MINUTES=$value ;;
                --vcs-dir) VCS_DIR=$value ;;
            esac
            shift 2
            ;;
        -h|--help) usage; exit 0 ;;
        *) emit true "PreCompact configuration error: unknown option $1."; exit 0 ;;
    esac
done

case "$BLOCK_CEILING:$STALE_MINUTES" in
    *[!0-9:]*)
        emit true "PreCompact configuration error: block ceiling and staleness threshold must be non-negative integers."
        exit 0
        ;;
esac

[ -n "$SNAPSHOT_DIR" ] || SNAPSHOT_DIR="$(dirname -- "$STATE_FILE")/.working-set-snapshots"
[ -n "$VCS_DIR" ] || VCS_DIR=$(dirname -- "$STATE_FILE")
BLOCK_COUNTER="$SNAPSHOT_DIR/.block-attempts"

# Consume the whole hook payload. Only session_id is useful, and malformed or
# missing JSON deliberately becomes "unknown" rather than breaking the hook.
payload=$(cat 2>/dev/null || true)
session=$(printf '%s' "$payload" | python3 -c '
import json, sys
try:
    value = json.load(sys.stdin).get("session_id", "unknown")
    print(value if isinstance(value, (str, int, float)) else "unknown")
except Exception:
    print("unknown")
' 2>/dev/null || printf unknown)
safe_session=$(printf '%s' "$session" | tr '/[:space:]' '--' | tr -cd 'A-Za-z0-9._-')
[ -n "$safe_session" ] || safe_session=unknown

if ! mkdir -p -- "$SNAPSHOT_DIR" 2>/dev/null; then
    emit true "PreCompact: cannot create snapshot directory $SNAPSHOT_DIR; no working-set snapshot was taken."
    exit 0
fi

attempts=0
if [ -f "$BLOCK_COUNTER" ]; then
    attempts=$(cat -- "$BLOCK_COUNTER" 2>/dev/null || printf 0)
fi
case "$attempts" in ''|*[!0-9]*) attempts=0 ;; esac

bounded_failure() { # reason
    local reason=$1 next_attempt
    if [ "$attempts" -lt "$BLOCK_CEILING" ]; then
        next_attempt=$((attempts + 1))
        if ! printf '%s\n' "$next_attempt" >"$BLOCK_COUNTER" 2>/dev/null; then
            emit true "PreCompact GUARD BROKEN: $reason The bounded-attempt counter could not be written, so compaction is continuing to avoid an infinite block."
            return
        fi
        emit false "PreCompact BLOCKED (attempt $next_attempt/$BLOCK_CEILING): $reason Write or repair the model-authored working set—what is being done, decided, blocked, and next—then let compaction retrigger."
        return
    fi
    rm -f -- "$BLOCK_COUNTER"
    emit true "PreCompact: $reason Still unresolved after $BLOCK_CEILING blocks; compacting anyway so this hook cannot wedge the session."
}

if [ ! -f "$STATE_FILE" ]; then
    bounded_failure "$STATE_FILE is missing."
    exit 0
fi

content_hash=$(python3 - "$STATE_FILE" <<'PY' 2>/dev/null || true
import hashlib
import pathlib
import sys

h = hashlib.sha256()
with pathlib.Path(sys.argv[1]).open("rb") as source:
    for chunk in iter(lambda: source.read(1024 * 1024), b""):
        h.update(chunk)
print(h.hexdigest())
PY
)
if [ -z "$content_hash" ]; then
    bounded_failure "$STATE_FILE could not be hashed."
    exit 0
fi

stamp=$(date -u +%Y%m%dT%H%M%SZ)
branch=unavailable
head=unavailable
dirty_paths=unavailable
if command -v git >/dev/null 2>&1 && git -C "$VCS_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    branch=$(git -C "$VCS_DIR" symbolic-ref --quiet --short HEAD 2>/dev/null || printf detached)
    head=$(git -C "$VCS_DIR" rev-parse --short HEAD 2>/dev/null || printf unavailable)
    dirty_paths=$(git -C "$VCS_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    case "$dirty_paths" in ''|*[!0-9]*) dirty_paths=unavailable ;; esac
fi

snapshot="$SNAPSHOT_DIR/$stamp-$safe_session-${content_hash:0:12}.md"
if [ -e "$snapshot" ]; then
    snapshot="$SNAPSHOT_DIR/$stamp-$safe_session-${content_hash:0:12}-$$.md"
fi
temporary=$(mktemp "$SNAPSHOT_DIR/.snapshot.XXXXXX" 2>/dev/null || true)
if [ -z "$temporary" ] || ! {
    printf '<!-- working-set boundary snapshot %s session=%s -->\n' "$stamp" "$safe_session"
    cat -- "$STATE_FILE"
    printf '\n\n## Boundary facts (automatic)\n\n'
    printf -- '- captured: %s\n' "$stamp"
    printf -- '- branch: %s\n' "$branch"
    printf -- '- head: %s\n' "$head"
    printf -- '- dirty paths: %s\n' "$dirty_paths"
    printf -- '- content sha256: %s\n' "$content_hash"
} >"$temporary" 2>/dev/null || [ ! -s "$temporary" ] || ! mv -f -- "$temporary" "$snapshot" 2>/dev/null; then
    [ -z "$temporary" ] || rm -f -- "$temporary"
    bounded_failure "The snapshot write to $snapshot failed or produced an empty file."
    exit 0
fi
rm -f -- "$BLOCK_COUNTER"

note=""
is_stale=$(python3 - "$STATE_FILE" "$STALE_MINUTES" <<'PY' 2>/dev/null || printf unknown
import os
import sys
import time

age_seconds = time.time() - os.stat(sys.argv[1]).st_mtime
print("yes" if age_seconds > int(sys.argv[2]) * 60 else "no")
PY
)
if [ "$is_stale" = yes ]; then
    note=" WARNING: the working-set file has not been touched in over $STALE_MINUTES minutes, so this snapshot may describe older work than the conversation being compacted."
elif [ "$is_stale" = unknown ]; then
    note=" WARNING: WORKING-SET AGE CHECK BROKEN; the hook could not determine whether the state file is stale."
fi

hash_check=$(python3 - "$SNAPSHOT_DIR" <<'PY' 2>/dev/null || printf broken
import pathlib
import re
import sys

paths = sorted(pathlib.Path(sys.argv[1]).glob("*.md"), key=lambda p: p.stat().st_mtime_ns, reverse=True)
if len(paths) < 3:
    print("not-enough")
    raise SystemExit
hashes = []
for path in paths[:3]:
    match = re.search(r"(?m)^- content sha256: ([0-9a-f]{64})$", path.read_text(errors="replace"))
    if not match:
        print("broken")
        raise SystemExit
    hashes.append(match.group(1))
print("frozen" if len(set(hashes)) == 1 else "changed")
PY
)
if [ "$hash_check" = frozen ]; then
    note="$note WARNING: MODEL CONTENT UNCHANGED ACROSS 3 BOUNDARIES. The snapshots are current, but the model-authored working set has the same content hash at all three boundaries; refresh it at the next available turn."
elif [ "$hash_check" = broken ]; then
    note="$note WARNING: SNAPSHOT HASH CHECK BROKEN. At least three snapshots exist, but the hook could not read three recorded hashes."
fi

emit true "PreCompact: working set snapshotted to $snapshot.$note"
