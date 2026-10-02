# 005.1: Database connection

Status: todo

Open the SQLite file through `@libsql/client` 0.18.0 and keep concurrent requests from
failing on SQLite's write lock (`docs/architecture.md`, "Application rules", One SQLite
writer).

## Acceptance criteria

- [ ] `DATABASE_URL` is validated in `src/env.ts`, listed in `.env.example`, and defaults
      to `file:local.db` locally; database files (`*.db`, `-wal`, `-shm`) are gitignored.
- [ ] The client sets a busy timeout and queues statements while a transaction is open,
      as snowtime's `src/db/connection.ts` does; a comment states the reason.
- [ ] Drizzle (`1.0.0-rc.4`, pinned) wraps the client; only repository modules will
      import it.
- [ ] A `bun test` test runs concurrent writes inside and outside a transaction against a
      file database and shows no write is lost and none fails with `SQLITE_BUSY`.
