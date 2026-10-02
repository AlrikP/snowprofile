# 007.2: Project tables

Status: done
Depends on: task 007.1 (the actor, helpers, and catalogue the projects reference)

## Acceptance criteria

- [x] A migration creates `customer`, `contact_person`, `project`, `project_contact`,
      `project_technology`, and `project_criterion_answer`, following
      `docs/migrations.md`; `schema.ts` and the relations map them; `db:drift` reports no
      changes.
- [x] Tests cover organization consistency of references, periods (end not before start,
      at each precision), and the approximate-number qualifier.
