# 019: Generated data model diagram

Status: todo
Depends on: task 007 (schema.ts holds every table)

Once `schema.ts` maps every table, generate `datamodel/snowprofile.dbml` from it instead of
keeping it by hand, so the diagram can't fall behind the migrations. Until then the
hand-written diagram is the blueprint for tasks 006.1 and 007, and generating it from a
partial `schema.ts` would drop the tables not yet migrated. snowtime's
`datamodel/generate-dbml.ts` and `notes.ts` are the reference.

## Acceptance criteria

- [ ] `datamodel:generate` writes the DBML from `schema.ts`, with table groups and the
      table and column notes from the hand-written diagram; `--check` fails when the
      committed diagram is stale.
- [ ] The generated diagram has the same tables, columns, and references as the reviewed
      one, or each difference is explained in the review summary.
- [ ] `datamodel/README.md` and `docs/migrations.md` describe the generated workflow.
- [ ] The CI `check` job runs `datamodel:generate --check`.
