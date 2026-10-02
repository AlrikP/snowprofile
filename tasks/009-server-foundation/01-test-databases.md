# 009.1: Test databases

Status: todo

## Acceptance criteria

- [ ] A helper gives each test a fresh, migrated, seeded file database and removes it
      afterwards.
- [ ] `bun test` runs server tests; `test:server` and the `test` script include it; the
      CI `check` job runs it.
