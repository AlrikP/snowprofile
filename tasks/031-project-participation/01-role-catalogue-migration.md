# 031.1: Role catalogue migration

Status: done
Depends on: task 019 (the diagram regenerates from `schema.ts`)

Move roles from text columns into a catalogue, following `docs/migrations.md`: add,
backfill, switch, drop. No UI changes.

## Acceptance criteria

- [x] A role table (proposed `project_role`, to keep it apart from `member.role`) holds a
      catalogue entry per organization: `name_et`, `name_en` (at least one, `CHECK`), a
      normalized name unique among live entries, `merged_into_id`, audit columns, and
      `sys_deleted`, following "Data conventions" in `docs/architecture.md`.
- [x] Link tables `participation_role` and `own_project_role` connect a participation or
      an own project to one or more roles, with composite foreign keys inside the
      organization.
- [x] The migration fills the catalogue from the distinct `role_et` and `role_en` values of
      participations and own projects, links each row to its role, then drops the four
      columns. A test runs it on a database with roles in both languages, one language,
      and none.
- [x] `schema.ts`, `datamodel/notes.ts`, the diagram, the demo generator, and the seed use
      the new tables; `db:drift` and `datamodel:check` pass.
- [x] Every repository that reads the role columns by then (the project page, search, or
      the CV read, if they came first) switches to the link tables, with tenancy cases
      for the functions it touches. Doing this subtask early keeps that list short.

## Outcome

- The table is `project_role`, as proposed. Its `normalized_name` comes from `name_et`, or
  `name_en` when that is missing, so English-only entries from the sheet still get a key.
- No repository read the role columns yet, so nothing else switched. Only the demo
  generator and the seed wrote them.
- The backfill normalizes in SQL: `lower()`, Estonian letters without diacritics, and no
  spaces or punctuation. That approximates the app's normalization, which SQLite can't do
  exactly (it has no Unicode lowercasing or decomposition). It only affects local and test
  databases; real roles arrive through the sheet migration (task 039.4) and the app's
  normalization.
- Where spellings differ inside one group ("Arendaja", " arendaja"), the entry takes the
  `min()`, which prefers a capitalized one; `max()` picked the lowercase spelling in the
  first test run.
- The four columns are dropped in the same migration as the backfill, not a later one.
  `docs/migrations.md` asks for add-then-drop across deploys so a rollback still works,
  but no deployed database exists yet; the migration says so in a comment.
- The generator now builds the seven `ROLES` as catalogue entries (English sometimes
  missing, so task 032's flag has data) and gives about 15% of participations and own
  projects two roles. That changes the random stream, so the generated data differs from
  before; no test depended on the old values.
- Checked on the local database: 22 entries, and every one of the 111 participations and
  17 own projects linked to a role. `bun run test`, `test:e2e`, `check`, `db:drift`, and
  `datamodel:check` pass.
