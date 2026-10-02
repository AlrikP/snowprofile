# 005.3: Schema drift in CI

Status: done
Depends on: task 005.2 (`db:drift`), task 003 (the CI job to extend)

Run the drift check in CI, so a migration and `schema.ts` can't diverge unnoticed from the
first migration on. Generating the diagram from `schema.ts` moved to task 019: with
`schema.ts` still empty, it would replace the reviewed diagram that tasks 006.1 and 007
build from.

## Acceptance criteria

- [x] The CI `check` job runs `db:drift`.
- [x] Diagram generation and its CI check are filed as task 019, after task 007.
