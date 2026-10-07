# CR-003: Fixes from the review of cr-002 through task 039

Status: todo

A code review of the commits from cr-002 through task 039.2 (`0034e9e..d1cf192`,
reviewed 2026-10-07) found the issues below. `check`, `test`, `specs:check`, `db:drift`,
`db:verify`, `datamodel:check`, `build`, `build:scripts`, `prototypes:build`, and
`test:e2e` pass, in the working copy and in a clean `git archive` export. Every cr-002
criterion still holds. Repository scoping and isolation cases, client IDs checked against
the organization, permission checks in the rules, the CV document route's own checks, and
the server-side hiding of tender details and birth dates held up. Fix these before task
039.3. Who sees a project's tender details goes to proposed task 043. The full report is
in [`review.md`](review.md).

## Subtasks

1. `01-plugin-endpoints.md`: close the organization plugin's endpoints the app doesn't use.
2. `02-sheet-migration.md`: future years in the sheet, and the sheet kept out of git.
3. `03-ui-errors-and-text.md`: a translated error page, placeholders, and the copy button.
4. `04-docs.md`: docs in line with the code, and cr-002 archived.

## Acceptance criteria

- [ ] All subtasks are done.
