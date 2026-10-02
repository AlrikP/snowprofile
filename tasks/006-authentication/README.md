# 006: Authentication

Status: todo
Depends on: task 005 (migrations for the auth tables)

Sign-in and membership as `docs/product.md` ("Users and access") describes, with the
guardrails in `docs/architecture.md` ("Sign-in modes"). Better Auth with the Drizzle
adapter and the organization plugin provides users, sessions, organizations, members,
roles, and invitations.

## Subtasks

1. `01-auth-tables.md`: Better Auth on the database.
2. `02-demo-sign-in.md`: `DEMO_MODE` password sign-in and dev users.
3. `03-google-and-domains.md`: Google sign-in and login domains.

## Acceptance criteria

- [ ] All subtasks are done.
- [ ] `architecture.md` records the sign-in methods, the roles, and how roles can be
      extended.
- [ ] The Snowhound domain auto-join question stays open in `product.md` unless the user
      decides it.
