# 016: Harvest stack profile

Status: todo
Depends on: task 014 (conventions enforced), task 015 (deployment conventions settled)

The fullstack and deployment conventions are provisional (`docs/architecture.md`). Feed
what this project settled on back into the bootstrap kit (`../bootstrap-kit/profiles/`).

## Acceptance criteria

- [ ] A `fullstack/tanstack-start-react` profile records the differences from
      `tanstack-start-solid`: React and shadcn, the `#/` alias, suffixed Lucide imports,
      local-file SQLite with `DATABASE_URL`, the `nitro` adapter, `tsr generate` dropping
      Start's types, the empty `BETTER_AUTH_SECRET`, and that snowtime still uses T3 Env
      with Valibot.
- [ ] A Hetzner Compose deploy profile records the stack, startup migrations, the image,
      and the operator duties.
- [ ] Both profiles are marked `proven`, and the kit's profile list is updated.
- [ ] The changes are offered to the user as a change in the kit repository; this task
      never pushes.
