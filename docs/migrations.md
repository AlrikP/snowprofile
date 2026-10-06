# Database migrations

Read this before changing the schema. The reasons behind the conventions are in
[`architecture.md`](architecture.md), "Data conventions"; this is the how.

## Workflow

```bash
bun run db:generate <name>   # new empty drizzle/<timestamp>_<name>/migration.sql
bun run db:migrate           # check applied migrations, then apply pending ones
bun run db:drift             # fail if src/db/schema.ts no longer matches the migrations
bun run db:verify            # only check that applied migrations are unchanged
bun run datamodel:generate   # regenerate datamodel/snowprofile.dbml from schema.ts
```

1. `bun run db:generate <name>`, with a snake_case name such as `add_project_color`. Never
   create the folder or pick the timestamp yourself.
2. Write the SQL. Separate statements with `--> statement-breakpoint`.
3. `bun run db:migrate` against the local database (`file:local.db`, from
   `.env.development`).
4. Update `src/db/schema.ts` by hand to match.
5. `bun run db:drift` must report that `schema.ts` matches.
6. Give a new table its group and notes in `datamodel/notes.ts`, then
   `bun run datamodel:generate`. Commit the regenerated `snowprofile.dbml`; CI's
   `datamodel:check` fails when it's stale (`datamodel/README.md`).

The scripts target the database in `DATABASE_URL`. To target another file, set it in the
gitignored `.env.local` or on the command line.

## Rules

- **Roll forward only.** No down migrations. Fix a mistake with a new migration.
- **Never edit or delete an applied migration.** `db:migrate` refuses to run if you do.
  A migration that has only run on your local database may still be edited: delete
  `local.db` and migrate again.
- **Backward compatible.** Deployed stacks migrate on startup (`AGENTS.md`, "Deployment"),
  and the previous image must keep working against the migrated database for a rollback:
  add before you remove, and split renames into add, backfill, switch, drop. A migration
  that rewrites a large table runs with the app stopped. Until the first deployment, no
  previous image needs the old columns, so one migration may backfill and drop them, as
  `20261006074311_role_catalogue` does. Once a stack is deployed, the rule has no
  exception.
- **Never run `drizzle-kit push`, or `drizzle-kit generate` without `--custom`,** against
  a real database. `schema.ts` follows the database, not the other way round.

## SQL conventions

The data conventions in `architecture.md` take these SQL forms. Several keep `db:drift`
accurate, because drizzle-kit sees only part of the schema.

- Tables and columns: singular `snake_case`. Primary keys: `id text PRIMARY KEY NOT NULL`
  (UUIDv7, set by the app).
- Booleans: `integer NOT NULL DEFAULT 0` with `CHECK (x IN (0, 1))`. In `schema.ts`, write
  the default as ``.default(sql`0`)``, not `.default(false)`, or drift reports a false
  difference.
- Enums: `text` with a `CHECK` listing the values.
- Calendar dates: `text`, `CHECK (x GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')`.
- Write each `CHECK` expression on one line, as `schema.ts` writes it: `db:drift` compares
  the text, line breaks included.
- Period dates: `text` in one of three lengths, and the end compared at its own precision.
  `schema.ts` builds these with `periodChecks`:

  ```sql
  CONSTRAINT project_start_date CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]' OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT project_end_date CHECK (end_date IS NULL OR end_date GLOB '[0-9][0-9][0-9][0-9]' OR end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' OR end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT project_period CHECK (end_date IS NULL OR end_date >= substr(start_date, 1, length(end_date)))
  ```

- Approximate numbers: two checks, built by `approximateChecks` in `schema.ts`. One lists
  the qualifier's values, the other keeps the value and the qualifier null together:
  `CONSTRAINT project_cost_pair CHECK ((cost IS NULL) = (cost_qualifier IS NULL))`.
- Name every `CHECK` and composite foreign key with `CONSTRAINT <table>_<what>`.
- Unique constraints: a named `CREATE UNIQUE INDEX`, never an inline `UNIQUE (...)`, which
  drizzle-kit's introspection can't see.
- Tenant tables get an index that leads with `organization_id`, such as
  `<table>_organization_id_idx`, so a list per organization doesn't scan the table. A
  unique index that leads with it already counts; `(id, organization_id)` doesn't.
- Partial indexes: drizzle-kit can't see `WHERE` clauses, so reviewers check them by hand.
  Unique indexes on soft-deleted tables include `WHERE sys_deleted = 0`. Queries compare
  `sys_deleted` with a literal `0`, not a bound parameter: SQLite uses a partial index only
  when it can prove the query matches its `WHERE`.

### Tenant references

A reference between tenant-owned rows is a composite foreign key, and its target has a
unique index on `(id, organization_id)`:

```sql
CREATE UNIQUE INDEX customer_id_organization ON customer (id, organization_id);
--> statement-breakpoint
CREATE TABLE contact_person (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  customer_id text NOT NULL,
  -- ... domain and audit columns ...
  CONSTRAINT contact_person_customer FOREIGN KEY (customer_id, organization_id)
    REFERENCES customer (id, organization_id)
);
```

### Audit columns

Every app-owned table ends with the audit columns:

```sql
CREATE TABLE my_table (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  -- ... domain columns ...
  created_at integer NOT NULL DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)),
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer NOT NULL DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)),
  updated_by text NOT NULL REFERENCES user(id),
  sys_deleted integer NOT NULL DEFAULT 0 CONSTRAINT my_table_sys_deleted CHECK (sys_deleted IN (0, 1))
);
--> statement-breakpoint
CREATE TRIGGER my_table_updated_at AFTER UPDATE ON my_table FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE my_table SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
```

- Keep the `ROUND` and `CAST`: without them SQLite can store the value as a float.
- Insert-and-delete link tables keep only `created_at` and `created_by`, with no trigger.
  Tables that aren't soft-deleted drop `sys_deleted`.
- In `schema.ts`, `updated_at` gets `$onUpdate`, so the trigger is only a fallback, and
  `created_by` and `updated_by` get `$defaultFn` and `$onUpdateFn` from the request's
  actor.
- drizzle-kit can't see triggers. A table rebuild drops them; recreate them in the same
  migration.

### Changing constraints

SQLite can't alter most constraints in place. Changing one rebuilds the table: create the
new table, copy the rows, drop the old table, and rename the new one, with
`PRAGMA foreign_keys=OFF` around it. Recreate the table's indexes and triggers in the same
migration.

## Checking the scripts

`bun test` covers `db:verify` (`scripts/db-verify.test.ts`). Check the other scripts by
hand after changing them, against a throwaway database such as
`DATABASE_URL=file:/tmp/check.db`:

1. `bun run db:generate Bad-Name` fails with the usage line.
2. `bun run db:generate probe` creates `drizzle/<timestamp>_probe/migration.sql` and no
   `snapshot.json`. Write `CREATE TABLE probe (id text PRIMARY KEY NOT NULL);` into it.
3. `bun run db:migrate` applies it; a second run reports one applied migration unchanged.
4. `bun run db:drift` fails and prints the statement that would drop `probe`, because
   `schema.ts` doesn't have it.
5. Append a comment to the migration: `bun run db:migrate` refuses, naming it as edited.
6. Delete the migration folder and the database file.
