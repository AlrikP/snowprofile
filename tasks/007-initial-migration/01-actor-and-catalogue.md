# 007.1: Actor context and catalogue tables

Status: done

## Acceptance criteria

- [x] An actor context (`withActor`, `currentActor`) fills `created_by` and `updated_by`
      from the request's user; a write without an actor fails.
- [x] A system user, created by the migration, is the actor for scripts.
- [x] `schema.ts` has shared helpers for the audit columns and `sys_deleted`.
- [x] A migration creates `technology_category`, `technology`, and `tender_criterion`,
      with their `CHECK`s, composite foreign keys, partial unique indexes, and
      `updated_at` triggers; `schema.ts` and the relations map them; `db:drift` reports
      no changes.
- [x] Tests cover the actor, the audit columns and trigger, organization consistency of
      references, and the unique live technology name.
