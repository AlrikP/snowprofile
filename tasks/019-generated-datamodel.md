# 019: Generated data model diagram

Status: done
Depends on: task 007 (schema.ts holds every table)

Once `schema.ts` maps every table, generate `datamodel/snowprofile.dbml` from it instead of
keeping it by hand, so the diagram can't fall behind the migrations. Until then the
hand-written diagram is the blueprint for tasks 006.1 and 007, and generating it from a
partial `schema.ts` would drop the tables not yet migrated. snowtime's
`datamodel/generate-dbml.ts` and `notes.ts` are the reference.

## Acceptance criteria

- [x] `datamodel:generate` writes the DBML from `schema.ts`, with table groups and the
      table and column notes from the hand-written diagram; `--check` fails when the
      committed diagram is stale.
- [x] The generated diagram has the same tables, columns, and references as the reviewed
      one, or each difference is explained in the review summary.
- [x] `datamodel/README.md` and `docs/migrations.md` describe the generated workflow.
- [x] The CI `check` job runs `datamodel:generate --check`.

## Outcome

- The generator is snowtime's, with snowprofile's names; the notes, groups, and colors
  were extracted from the reviewed diagram by a one-off script, not retyped. Index notes
  are keyed by the index names in `schema.ts`; every hand-written index note matched one.
- Compared with the reviewed diagram, the generated one has the same tables, columns,
  types, keys, indexes, references, and notes. The differences: the header now says the
  file is generated; in the five link tables the composite primary key comes first in the
  `indexes` block (the reviewed order put it between two indexes, which no rule
  reproduces); and `technology.merged_into_id` now names its composite key's target
  table, as every other composite key does.
- Audit-column notes became shared defaults (`auditNotes`); the dozen tables with their
  own wording keep it as overrides.
- `datamodel:check` was shown to fail on a changed note and pass after restoring it. It
  runs in CI and in the pre-commit hook when `schema.ts` or the generator changes.
- The ChartDB converter reads the generated file (23 tables, 71 relationships).
