# 016: Harvest stack profile

Status: done
Depends on: task 014 (conventions enforced), task 015 (deployment conventions settled)

The fullstack and deployment conventions are provisional (`docs/architecture.md`). Feed
what this project settled on back into the bootstrap kit (`../bootstrap-kit/profiles/`).

## Acceptance criteria

- [x] A `fullstack/tanstack-start-react` profile records the differences from
      `tanstack-start-solid`: React and shadcn, the `#/` alias, suffixed Lucide imports,
      local-file SQLite with `DATABASE_URL`, the `nitro` adapter, `tsr generate` dropping
      Start's types, the empty `BETTER_AUTH_SECRET`, and that snowtime still uses T3 Env
      with Valibot.
- [x] A Hetzner Compose deploy profile records the stack, startup migrations, the image,
      and the operator duties.
- [x] Both profiles are marked `proven`, and the kit's profile list is updated.
- [x] The changes are offered to the user as a change in the kit repository; this task
      never pushes.

## Outcome

- The kit gained `profiles/fullstack/tanstack-start-react.md` and
  `profiles/deploy/hetzner-compose.md`, both `proven`, and its profile list names them.
  The changes are uncommitted in `../bootstrap-kit` for the user to review.
- The Solid profile said snowtime replaced T3 Env with Valibot; snowtime still uses T3
  Env with Valibot schemas. The kit's Solid profile now says so, and both profiles accept
  either.
- The deploy profile offers both proven image layouts: snowtime's compiled binary and
  snowprofile's runtime image with bundled scripts, with the trade-off.
- The React profile carries this project's lessons as requirements: the oxlint override
  behavior, knip's blind spots, the jsdom and router test setup, Better Auth's sign-in
  rate limit in e2e tests, and the client IP header behind a proxy.
- Writing the deploy profile showed that `docs/deployment.md` seeded beside the running
  app, a second writer to the database. The rehearsal now stops the app first, as
  snowtime does.
