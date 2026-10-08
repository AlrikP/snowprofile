# CR-004: Fixes from the review of cr-003 through task 041

Status: done

A code review of the commits from cr-003 through task 041.5 (`d1cf192..f99e034`,
reviewed 2026-10-08) found the issues below. These pass in the working copy and in a
clean `git archive` export: `check`, `test`, `specs:check`, `db:drift`, `db:verify`,
`datamodel:check`, `build`, `build:scripts`, `prototypes:build`, `test:e2e`, and `perf`.
Every cr-003 criterion still holds, including the closed plugin endpoints under path
variants. Search and CV selection share one matching rule, scoped by organization, and
every new repository function has an isolation case. Fix subtask 1 before task 039's
rehearsal on the real sheet, and both before task 043. The full report is in
[`review.md`](review.md).

## Subtasks

1. `01-sheet-period-report.md`: report ongoing work that starts after its project ended.
2. `02-docs-and-scenario-test.md`: docs in line with the code, and the edit form's
   effective end tested.

## Acceptance criteria

- [x] All subtasks are done.

## Outcome

- Both subtasks are done; their Outcome sections hold the details.
- The review's follow-up is task 054 (projects list size).
- Still open from the review: CI's `bun run perf` on Linux, and the real sheet's negative
  characteristic answers, which task 039's rehearsal can list.
