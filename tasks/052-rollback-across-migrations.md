# 052: Roll back across a migration

Status: done

`docs/migrations.md` requires backward-compatible migrations (add before you remove), so
the previous release can run on the newer schema. But startup's `db:verify`
(`scripts/db-verify.ts`) fails when the database has applied a migration whose folder the
release lacks, so an older release refuses to start after any migration. Rolling back a
deploy (`docs/deployment.md`, "Publish a release") then works only between releases with
the same migrations. Found in task 024.

Decide whether an older release may start on a database with migrations it doesn't know:

- Keep refusing, and say a rollback across a migration means restoring a backup.
- Accept unknown migrations that come after every migration the release has, and still
  fail on an edited or missing earlier one.

## Acceptance criteria

- [x] The decision is recorded in `docs/architecture.md` and `docs/migrations.md`.
- [x] If unknown later migrations are accepted, `db-verify.test.ts` covers that case and
      the edited and missing cases still fail.

## Outcome

- Decided with the user on 2026-10-08: accept unknown applied migrations that come after
  every migration the release has. Recorded in `docs/architecture.md` ("Environments and
  deployment"), `docs/migrations.md` ("Rules"), and `docs/deployment.md`.
- Only `db:verify` needed the change. Drizzle's migrator applies the folder's migrations
  the database lacks, by name, and ignores applied ones it doesn't know.
- "After" compares folder names, which start with their timestamp. An unknown applied
  migration that sorts before the release's latest still counts as deleted.
- `db-verify.test.ts` covers the rollback, and an earlier missing or edited migration
  beside unknown later ones. `start.test.ts` starts the current migrations on a database
  that also applied a newer one, and nothing is applied.
- A rollback across a migration that broke the backward-compatible rule still needs a
  copy of the database from before it; no backups exist yet (Litestream comes later).
