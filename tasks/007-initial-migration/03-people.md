# 007.3: People tables

Status: done
Depends on: task 007.2 (participations reference projects)

## Acceptance criteria

- [x] A migration creates `employee_profile`, `education`, `participation`,
      `participation_technology`, `own_project`, `own_project_technology`, and
      `update_request`, following `docs/migrations.md`; `schema.ts` and the relations map
      them; `db:drift` reports no changes.
- [x] Tests cover organization consistency of references, periods, the
      approximate-number qualifiers, `left_date` not before `join_date`, and closing an
      update request.
- [x] The hand-written diagram matches all three migrations.
