# 031.1: Role catalogue migration

Status: todo
Depends on: task 019 (the diagram regenerates from `schema.ts`)

Move roles from text columns into a catalogue, following `docs/migrations.md`: add,
backfill, switch, drop. No UI changes.

## Acceptance criteria

- [ ] A role table (proposed `project_role`, to keep it apart from `member.role`) holds a
      catalogue entry per organization: `name_et`, `name_en` (at least one, `CHECK`), a
      normalized name unique among live entries, `merged_into_id`, audit columns, and
      `sys_deleted`, following "Data conventions" in `docs/architecture.md`.
- [ ] Link tables `participation_role` and `own_project_role` connect a participation or
      an own project to one or more roles, with composite foreign keys inside the
      organization.
- [ ] The migration fills the catalogue from the distinct `role_et` and `role_en` values of
      participations and own projects, links each row to its role, then drops the four
      columns. A test runs it on a database with roles in both languages, one language,
      and none.
- [ ] `schema.ts`, `datamodel/notes.ts`, the diagram, the demo generator, and the seed use
      the new tables; `db:drift` and `datamodel:check` pass.
- [ ] Every repository that reads the role columns by then (the project page, search, or
      the CV read, if they came first) switches to the link tables, with tenancy cases
      for the functions it touches. Doing this subtask early keeps that list short.
