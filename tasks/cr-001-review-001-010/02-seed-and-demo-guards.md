# CR-001.2: Seed and demo-mode guards

Status: done
Depends on: task cr-001.1 (a clean checkout to test against)

The seeder and demo mode can't damage a real or shared database.

## Acceptance criteria

- [x] `db:seed` and `db:seed --reset` refuse a database that holds any organization that
      isn't a demo one, whatever the environment says. Today `seedRefusal`
      (`scripts/db-seed.ts:15`) returns `null` for `file:/data/snowprofile.db` with
      `NODE_ENV` unset, even with `DEMO_MODE=false`, and every environment uses a
      `file:` URL. The `DEMO_MODE` check follows the same rule as `src/env.ts`, where an
      unset `NODE_ENV` counts as production. Tests cover both refusals.
- [x] With `DEMO_MODE` on, Better Auth's self-service account endpoints are refused
      (at least `/change-password` and `/update-user`), through `disabledPaths` or a
      `hooks.before` check in `src/server/auth/better-auth.server.ts`. Today a demo
      visitor's `changePassword` returns 200, and the published `SEED_PASSWORD` then
      returns 401 for everyone. A test covers it.
