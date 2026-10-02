# 006.2: Demo sign-in and dev users

Status: todo
Depends on: task 006.1 (the auth tables)

## Acceptance criteria

- [ ] `DEMO_MODE` in `src/env.ts` defaults to on in dev and test and off otherwise.
- [ ] With `DEMO_MODE` on, password sign-in works for seeded users only; password
      sign-up is disabled; Google sign-in is off; the sign-in page shows a "demo version"
      notice.
- [ ] With `DEMO_MODE` off, password sign-in is rejected on the server, not only hidden.
- [ ] Dev users exist for each role in a demo organization (for example
      `admin@demo.example.com` and `employee@demo.example.com`), created by a minimal
      `db:seed` that task 008 later extends.
- [ ] A minimal sign-in page lets a seeded user sign in and out; its look comes later
      from task 012.
- [ ] Tests cover both modes.
