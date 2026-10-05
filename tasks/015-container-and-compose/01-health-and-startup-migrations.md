# 015.1: Health endpoint and startup migrations

Status: done

## Acceptance criteria

- [x] A health endpoint answers when the app can serve requests and reach the database.
- [x] With `MIGRATE_ON_START=true`, the server entry verifies and applies migrations
      before it listens; a failed migration stops it from listening.
- [x] Tests or a documented manual check cover both.

## Outcome

- Migrations run in a start script in front of the built server (`scripts/start.ts`),
  as in snowtime, not inside the server entry: the server listens as soon as it loads,
  so migrations must finish before it's imported.
- The health check's query lives in `src/db/health.ts`, not a repository, because it
  isn't tenant data and needs no tenancy case.
- Tests cover a fresh database, a second start, an edited applied migration, and a broken
  migration. Disabling the verification made the edited-migration test fail, as it should.
- Manual check on a fresh database: verify, apply, then listen, and `/api/health` ok. The
  e2e server starts through the script, so every e2e run exercises it.
