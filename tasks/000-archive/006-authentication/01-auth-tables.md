# 006.1: Better Auth on the database

Status: done

## Acceptance criteria

- [x] Better Auth uses the Drizzle adapter and the project's ID format (task 004).
- [x] The organization plugin is enabled with roles `admin` and `employee`, defined so
      another role can be added without changing access checks; a user can belong to
      several organizations and switch the active one.
- [x] The auth tables come from a hand-written migration that follows
      `docs/migrations.md`, with their `schema.ts` mapping; `db:drift` reports no
      changes.
- [x] The auth instance moves to `src/server/` as a `*.server.ts` file
      (`AGENTS.md`, "Code conventions").
