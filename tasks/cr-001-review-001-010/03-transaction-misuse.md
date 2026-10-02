# CR-001.3: Client use inside a transaction

Status: todo
Depends on: task cr-001.1 (a clean checkout to test against)

## Acceptance criteria

- [ ] Using the client (or `auth.api.*`, which uses the global `db`) inside a
      `db.transaction` callback throws instead of waiting forever. Today it blocks that
      transaction and every later statement in the process (`src/db/connection.ts:43`).
      A test covers it.
