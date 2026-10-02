# 005.3: Data model generation and CI checks

Status: todo
Depends on: task 005.2 (`db:drift`), task 003 (the CI job to extend)

Once `schema.ts` exists, the diagram is generated from it rather than kept by hand.

## Acceptance criteria

- [ ] `datamodel:generate` writes the DBML from `schema.ts`; `--check` fails when the
      committed diagram is stale.
- [ ] `datamodel/README.md` describes the generated workflow.
- [ ] The CI `check` job runs `db:drift` and `datamodel:generate --check`.
