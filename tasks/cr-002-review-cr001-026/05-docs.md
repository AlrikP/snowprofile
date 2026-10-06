# CR-002.5: Docs

Status: todo
Depends on: task cr-002.2 (`AGENTS.md` describes the checks it changes)

## Acceptance criteria

- [ ] `AGENTS.md`: the `bun run check` row names the spec check, and the pre-commit hook
      description names `specs:check` and `datamodel:check`, as `lefthook.yml` runs them.
      Today both leave them out (`AGENTS.md:34`, `AGENTS.md:125`).
- [ ] `docs/migrations.md`, "Backward compatible", says that a migration may drop columns
      in the same migration as their backfill only until the first deployment, as
      `20261006074311_role_catalogue` did. Today the rule has no exception
      (`docs/migrations.md:36`).
- [ ] `docs/architecture.md`, "Audit and deletion", lists roles among the soft-deleted
      entities and their `merged_into_id` among the domain states. Today it names only
      technologies (`docs/architecture.md:179`).
- [ ] Task 026's picker criterion says the picker shows each option's category, as the
      code and `prototypes/project-edit.html` do. Today it says "groups by category"
      (`tasks/026-technology-catalogue.md:26`).
