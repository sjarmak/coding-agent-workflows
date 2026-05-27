# {{PROJECT_NAME}} — Agent Operating Notes

> The **intention + failure-mode-prevention** layer for agents working in this repo.
> It holds only what lives nowhere else; everything general is referenced, not copied.
> Keep it under ~120 lines. Boundary rules: see the `context-layering` practice in the bundle.

## What this project is

<!-- Intention, not a README. What this codebase is for, who depends on it, and the
     invariants that must hold. List only the non-obvious constraints a capable agent
     would otherwise get wrong. Delete this comment once filled. -->

- {{INTENTION}}

## Failure-mode preventions

<!-- Append-only log of "don't do X here, it breaks Y" lessons from real incidents.
     One line each: the prevention, then the consequence it avoids.
     Add entries with the `failure-mode-capture` command, which dedupes against memory
     first so the same lesson is never stored in two layers. -->

<!-- example:
- Don't run migrations against the read replica — it has no write grant and fails silently mid-batch.
-->

## Where to look (references)

- **Coding practices, agent roles, skills, workflows:** {{BUNDLE_REF}}
- **Codebase compass (the "why" and gotchas, per area):** the `COMPASS.md` files indexed below
- **Project docs:** {{PROJECT_DOCS}}

### Compass index

<!-- Generated and refreshed by the `project-compass` command. One line per area. -->

- {{COMPASS_INDEX}}
