# 013: End-to-end smoke test

Status: done
Depends on: task 006 (sign-in), task 008 (seeded users), task 012 (the frame)

## Acceptance criteria

- [x] Playwright in `e2e/` runs against the local stack with `DEMO_MODE` and the seeded
      demo data.
- [x] Tests check that the app loads and that a seeded admin and a seeded employee can
      each sign in; one saved session per role is reused by later tests.
- [x] `test:e2e` runs it; `AGENTS.md` and the README list it. Whether it runs in CI is
      decided and recorded.

## Outcome

- The e2e server runs the production build on port 3100 with a fresh seeded database and
  no `.env` files (`e2e/server.ts`). The dev server was dropped: its dependency
  optimization reloads the page mid-test.
- Better Auth rate-limits sign-in in production, so a second sign-in per role failed in
  repeated runs. Each role signs in once in the setup project, and tests open pages by URL
  instead of relying on which organization `/` picks.
- Repeated three times with two workers in parallel: 14 of 14 passed.
- CI runs `test:e2e` as its own step; `test` stays browser-free (the user's choice).
  Playwright traces aren't uploaded on failure; one upload step would add them.
