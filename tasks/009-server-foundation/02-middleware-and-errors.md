# 009.2: Middleware and errors

Status: done
Depends on: task 009.1 (tests run against seeded databases)

## Acceptance criteria

- [x] Session middleware rejects requests without a session.
- [x] Scope middleware takes the organization from the request, checks the user's
      membership and role, and gives the handler the organization ID and role.
- [x] `AppError` carries a code; server functions return codes, never translated text;
      the client maps codes to messages.
- [x] One example server function shows the pattern (middleware, Valibot validation,
      rules in `*.server.ts`); tests cover the rejected cases.
