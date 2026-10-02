# 007: Initial migration

Status: todo
Depends on: task 004 (the reviewed model), task 006 (domain tables reference users and organizations)

Create the MVP's domain tables from the reviewed diagram.

## Acceptance criteria

- [ ] One or more hand-written migrations create every domain table in the diagram, with
      the conventions from task 004 (IDs, audit columns, deletion, constraints, indexes).
- [ ] `src/db/schema.ts` and the relations map them; `db:drift` reports no changes;
      the hand-written diagram matches the migrations (task 019 then generates it).
- [ ] An actor context fills the audit columns (last changed by and at) from the
      request's user.
- [ ] Tests check the constraints that matter most: organization consistency of
      references, periods (end not before start), and the approximate-number qualifier.
