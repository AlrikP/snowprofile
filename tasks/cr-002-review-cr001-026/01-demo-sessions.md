# CR-002.1: Demo sessions

Status: todo

In demo mode, a visitor can't end another visitor's session of a shared account. Every
demo visitor signs in as the same seeded user, so Better Auth counts all their sessions as
that user's own (`docs/specs/sign-in.md`, `sign-in.demo-accounts-locked`).

## Acceptance criteria

- [ ] With `DEMO_MODE` on, `/revoke-session` and `/list-sessions` are refused over HTTP.
      Today `demoDisabledPaths` (`src/server/auth/sign-in.server.ts:22`) leaves both open:
      `/list-sessions` returns every visitor's session token, and `/revoke-session` with
      another visitor's token returns 200 and signs that visitor out.
- [ ] Outside demo mode, both endpoints stay available, and `/sign-out` stays available in
      every mode.
- [ ] The `sign-in.demo-accounts-locked` test checks every path in `demoDisabledPaths`.
      Today it checks only `/change-password` and `/update-user`
      (`src/server/auth/better-auth.test.ts:116`).
