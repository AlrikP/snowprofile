# CR-002.1: Demo sessions

Status: done

In demo mode, a visitor can't end another visitor's session of a shared account. Every
demo visitor signs in as the same seeded user, so Better Auth counts all their sessions as
that user's own (`docs/specs/sign-in.md`, `sign-in.demo-accounts-locked`).

## Acceptance criteria

- [x] With `DEMO_MODE` on, `/revoke-session` and `/list-sessions` are refused over HTTP.
      Today `demoDisabledPaths` (`src/server/auth/sign-in.server.ts:22`) leaves both open:
      `/list-sessions` returns every visitor's session token, and `/revoke-session` with
      another visitor's token returns 200 and signs that visitor out.
- [x] Outside demo mode, both endpoints stay available, and `/sign-out` stays available in
      every mode.
- [x] The `sign-in.demo-accounts-locked` test checks every path in `demoDisabledPaths`.
      Today it checks only `/change-password` and `/update-user`
      (`src/server/auth/better-auth.test.ts:116`).

## Outcome

- `/list-sessions` and `/revoke-session` join `demoDisabledPaths`. Better Auth checks
  `disabledPaths` before routing, for every method, so they return 404 in demo mode.
- The test looks each disabled path up in `auth.api`, so a misspelled path fails instead
  of passing with a 404 from the router. It also revokes a second visitor's session by
  token and checks that the session survives.
- A second test, with `DEMO_MODE` off, lists the sessions, revokes one, and signs out.
  It cites no scenario, as `docs/specs/sign-in.md` has none for session management.
- `sign-in.demo-accounts-locked` and the "Sign-in modes" bullet in
  `docs/architecture.md` now name the session endpoints and that signing out stays open.
