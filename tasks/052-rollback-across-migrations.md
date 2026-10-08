# 052: Roll back across a migration

Status: todo

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

- [ ] The decision is recorded in `docs/architecture.md` and `docs/migrations.md`.
- [ ] If unknown later migrations are accepted, `db-verify.test.ts` covers that case and
      the edited and missing cases still fail.
