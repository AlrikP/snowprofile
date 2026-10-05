# Data model

[`snowprofile.dbml`](snowprofile.dbml) describes the database tables in
[DBML](https://dbml.dbdiagram.io/docs/). The conventions it follows (IDs, timestamps,
periods, audit columns, deletion) are in [`docs/architecture.md`](../docs/architecture.md),
"Data conventions".

The SQL migrations in `drizzle/` are the source of truth for the schema.
`src/db/schema.ts` maps them, `bun run db:drift` keeps the two in line, and
[`generate-dbml.ts`](generate-dbml.ts) writes the DBML from `schema.ts`. Don't edit the
DBML by hand.

## Viewing the model

[ChartDB](https://chartdb.io) runs locally in Docker.

1. `bun run datamodel`. This builds `snowprofile.chartdb.json` from the DBML and starts
   ChartDB on http://localhost:8080.
2. In ChartDB, open **Actions > Import > .json** and pick
   `datamodel/snowprofile.chartdb.json`. Don't import the `.dbml` file: ChartDB's DBML
   importer drops the table groups and colors.
3. When you are done, `bun run datamodel:stop`.

Diagrams live in your browser's storage, not in the container. Every import creates a new
diagram, so delete the old one after reimporting.

dbdiagram.io also reads `snowprofile.dbml` directly, groups and colors included.

## Changing the model

The diagram follows a migration (`docs/migrations.md`):

1. Change the schema with a migration and update `src/db/schema.ts`.
2. In [`notes.ts`](notes.ts), put a new table in a group and give it a note; add notes for
   columns and indexes that need explaining. Columns, types, keys, indexes, and
   references come from `schema.ts`, and so do ON DELETE rules, partial index conditions,
   and composite foreign keys, so the notes leave those out. The audit columns of
   app-owned tables get their notes from `auditNotes` unless a table gives its own.
3. `bun run datamodel:generate` writes `snowprofile.dbml` and rebuilds the ChartDB JSON.
   git ignores the JSON, so only the DBML is committed.

`bun run datamodel:check` fails when the committed DBML isn't what the generator writes;
CI and the pre-commit hook (when `schema.ts` or the generator changes) run it. The
generator warns about a table in no group, and a note naming a missing column or index.

The converter ([`dbml-to-chartdb.mjs`](dbml-to-chartdb.mjs), from snowtime) reads a subset
of DBML: single-line columns, inline `ref: >` references, `indexes` blocks, `TableGroup`,
and single-quoted notes without apostrophes.

The diagram draws a composite foreign key as its single-column part: for
`(project_id, organization_id)` that is `project_id`. The column note names the full key.
Partial indexes and `CHECK` constraints are in notes too.
