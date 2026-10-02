# 007: Initial migration

Status: done
Depends on: task 004 (the reviewed model), task 006 (domain tables reference users and organizations)

Create the MVP's domain tables from the reviewed diagram, one table group per subtask, so
each lands as a reviewable commit.

## Subtasks

1. `01-actor-and-catalogue.md`: the actor context, the system user, the shared schema
   helpers, and the catalogue tables.
2. `02-projects.md`: customers, contact persons, projects, and their links.
3. `03-people.md`: profiles, education, participations, own projects, and update
   requests.

## Acceptance criteria

- [x] All subtasks are done.
- [x] Hand-written migrations create every domain table in the diagram, with the
      conventions from task 004 (IDs, audit columns, deletion, constraints, indexes).
- [x] `src/db/schema.ts` and the relations map them; `db:drift` reports no changes; the
      hand-written diagram matches the migrations (task 019 then generates it).
