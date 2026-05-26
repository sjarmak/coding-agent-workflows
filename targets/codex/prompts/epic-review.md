# Workflow: Epic Review

Individual units pass their own `implement-review` gate, but the *assembled*
whole can still be wrong — interfaces that don't line up, a criterion that fell
between two units, an architectural drift only visible across the set. This
workflow reviews at the epic boundary.

## Inputs

| Input | Source | Description |
|-------|--------|-------------|
| `epic` | caller | The epic whose constituent units have all landed. |
| `base_ref` | caller | Ref before the first unit landed (the full-epic diff base). |

## Steps

### 1. assemble

Collect the full diff across all units (`git diff {base_ref}...HEAD`) and the
epic's original acceptance criteria. This is a different artifact than any one
unit's diff.

**Exit:** the whole-epic diff and the original criteria, side by side.

### 2. cross-cutting review  (needs: assemble)

Run `review` (multi-angle) plus `code-review` over the *combined* diff, looking
specifically for problems that only appear at the seams:
- interfaces between units that don't actually fit
- an epic-level acceptance criterion no single unit owned
- duplicated logic that emerged because units were built in isolation
- architectural drift from the intended target

For changes touching auth, input handling, secrets, or endpoints, also run
`security-review` over the combined surface.

**Exit:** findings classified blocking vs non-blocking.

### 3. decide  (needs: cross-cutting review)

If blocking findings exist, route fixes back as new units through
`implement-review` (don't patch inline at the epic level). If clean, record the
epic-level verification and close.

**Exit:** epic accepted, or fix-units dispatched.
