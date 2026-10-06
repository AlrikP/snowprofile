# CR-002: Fixes from the review of cr-001 through task 026

Status: in-progress

A code review of the commits from cr-001 through task 026 (`233fbf5..0034e9e`, reviewed
2026-10-06) found the issues below. `check`, `test`, `specs:check`, `db:drift`,
`db:verify`, `datamodel:check`, `build`, `build:scripts`, `prototypes:build`, and
`test:e2e` pass, in the working copy and in a clean `git archive` export. Every cr-001
criterion still holds. Tenancy scoping, the technology repository's isolation cases, the
role catalogue backfill, startup migrations, and the image's non-root user held up. Fix
these before task 027. Running the bundled scripts in CI went to task 024.

## Subtasks

1. `01-demo-sessions.md`: demo visitors can't sign each other out.
2. `02-import-checks.md`: import and spec checks catch what they claim.
3. `03-tests.md`: role migration and catalogue tests.
4. `04-ui-text.md`: dialog labels, plurals, and field errors.
5. `05-docs.md`: docs in line with the code.

## Acceptance criteria

- [ ] All subtasks are done.
