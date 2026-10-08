# CR-005: Fixes from the review of cr-004 through task 055

Status: todo

A code review of the commits from cr-004 through task 055 (`f99e034..21fb124`, reviewed
2026-10-08) found the issues below. These pass in the working copy, and the first three in
a clean `git archive` export too: `check`, `test`, `specs:check`, `db:drift`, `db:verify`,
`datamodel:check`, `build`, `build:scripts`, `prototypes:build`, `test:e2e`, and `perf`.
`perf:pages` fails. Every cr-004 criterion still holds. A participation's project can't
change through the input or the repository, the new repository function has an isolation
case, note links take only `https`, and `db:verify` still refuses an edited or missing
earlier migration. Fix these before task 018. The full report is in
[`review.md`](review.md).

## Subtasks

1. `01-page-baselines.md`: the search and CV pages back within their page baselines.
2. `02-discard-guard.md`: the discard guard asks only about unsaved changes.
3. `03-docs-and-tests.md`: specs, docs, and plans in line with the code.

## Acceptance criteria

- [ ] All subtasks are done.
