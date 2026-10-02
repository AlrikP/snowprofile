# Data model

[`snowprofile.dbml`](snowprofile.dbml) describes the database tables in
[DBML](https://dbml.dbdiagram.io/docs/). The conventions it follows (IDs, timestamps,
periods, audit columns, deletion) are in [`docs/architecture.md`](../docs/architecture.md),
"Data conventions".

Until the first migration exists, the DBML is written by hand. Task 005.3 then generates it
from `src/db/schema.ts`, and from then on the SQL migrations are the source of truth.

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

1. Edit `snowprofile.dbml`. Put a new table in a `TableGroup`, and give it a note.
2. `bun run datamodel:build` rebuilds the ChartDB JSON. git ignores the JSON, so only the
   DBML is committed.

The converter ([`dbml-to-chartdb.mjs`](dbml-to-chartdb.mjs), from snowtime) reads a subset
of DBML: single-line columns, inline `ref: >` references, `indexes` blocks, `TableGroup`,
and single-quoted notes without apostrophes.

The diagram draws a composite foreign key as its single-column part: for
`(project_id, organization_id)` that is `project_id`. The column note names the full key.
Partial indexes and `CHECK` constraints are in notes too.
