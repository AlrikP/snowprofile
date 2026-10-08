# 005: Database connection and migration tooling

Status: done
Depends on: task 004 (the SQL conventions the tooling and docs follow)

Connect the app to its SQLite file and build the migration workflow from the profile's
rules: hand-written SQL is the source of truth, `src/db/schema.ts` follows it, migrations
roll forward only and are immutable once applied. snowtime's `src/db/connection.ts`,
`scripts/db-*.ts`, and `docs/migrations.md` are examples to read, not files to copy.

## Subtasks

1. `01-connection.md`: database URL, client, and write queue.
2. `02-migration-scripts.md`: `db:*` scripts and `docs/migrations.md`.
3. `03-datamodel-check.md`: the drift check in CI. Diagram generation moved to task 019.

## Acceptance criteria

- [x] All subtasks are done.
