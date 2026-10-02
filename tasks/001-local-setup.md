# 001: Local setup

Status: todo

Make a fresh clone run with the README's commands alone. The scaffold left two traps:
`BETTER_AUTH_SECRET` empty in `.env.local`, and a `generate-routes` script (`tsr generate`)
that writes a `src/routeTree.gen.ts` without TanStack Start's type registration, which
fails the type check (`docs/architecture.md`, "Scaffold").

## Acceptance criteria

- [ ] A script (for example `bun run env:init`) creates `.env.local` from `.env.example`
      and generates `BETTER_AUTH_SECRET`; it never overwrites an existing value.
- [ ] Non-secret local defaults (for example `BETTER_AUTH_URL=http://localhost:3000`) live
      in a tracked `.env.development`, as in snowtime; secrets only in `.env.local`.
- [ ] `generate-routes` is removed, or replaced by a command that produces the same
      `routeTree.gen.ts` as the Vite plugin; `bun run typecheck` passes after running it.
- [ ] In a fresh clone, `bun install`, the env script, and `bun --bun run dev` serve `/`
      and `/api/auth/ok` without manual steps; the README lists exactly these steps.
