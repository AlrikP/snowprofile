# CR-001: Fixes from the review of tasks 001–010

Status: done

A code review of tasks 001–010 (commits `5e59fbe..3c74466`, reviewed 2026-10-02) found the
issues below. `check`, `test`, `db:drift`, `db:verify`, and `build` pass in the working
copy, but `test` fails in a clean checkout (subtask 1). Tenancy scoping,
composite foreign keys, the auth guards, and the migrations held up. Fix these before
task 011.

## Subtasks

1. `01-clean-checkout.md`: clean checkout and CI build.
2. `02-seed-and-demo-guards.md`: seed and demo-mode guards.
3. `03-transaction-misuse.md`: client use inside a transaction.
4. `04-test-coverage.md`: test order and coverage.
5. `05-schema.md`: indexes and relations.
6. `06-cleanup.md`: auth checks and cleanup.
7. `07-docs.md`: docs.

## Acceptance criteria

- [x] All subtasks are done.
