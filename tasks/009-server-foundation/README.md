# 009: Server foundation and tenancy

Status: in-progress
Depends on: task 006 (sessions and memberships), task 007 (tables), task 008 (seed for test databases)

The base every server feature builds on: test databases, middleware, errors, and
repository modules that apply organization scoping in one place
(`docs/architecture.md`, "Application rules"). snowtime's `src/server/` and
`src/db/testing.ts` are examples to read.

## Subtasks

1. `01-test-databases.md`: seeded throwaway databases for `bun test`.
2. `02-middleware-and-errors.md`: session and scope middleware, `AppError`.
3. `03-repositories-and-tenancy.md`: repository modules and isolation.

## Acceptance criteria

- [ ] All subtasks are done.
