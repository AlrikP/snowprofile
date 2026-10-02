# 005.2: Migration scripts

Status: todo
Depends on: task 005.1 (the client the scripts use)

Build the scripts the migration rules need, as `package.json` scripts.

## Acceptance criteria

- [ ] The drizzle-kit dialect (`turso` or `sqlite` with the libSQL driver) is decided
      from current drizzle-kit docs; the open question in `architecture.md` is closed.
- [ ] `db:generate <name>` creates an empty `drizzle/<timestamp>_<name>/migration.sql`
      with a generated timestamp.
- [ ] `db:verify` fails when an applied migration was edited or deleted.
- [ ] `db:migrate` runs `db:verify`, then applies pending migrations.
- [ ] `db:drift` applies all migrations to an empty database and reports differences
      from `src/db/schema.ts`.
- [ ] Each script has a test or a documented manual check.
- [ ] `docs/migrations.md` holds the workflow, the rules (roll forward only, immutable
      once applied, backward compatible, never `drizzle-kit push` or `generate` without
      `--custom` against a real database), and the SQL conventions from task 004;
      `AGENTS.md` lists it under "Project context".
