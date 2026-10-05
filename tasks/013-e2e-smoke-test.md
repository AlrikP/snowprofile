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
