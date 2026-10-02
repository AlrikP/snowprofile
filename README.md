# snowprofile

snowprofile records Snowhound's projects, the technologies used, and who worked on them,
and produces personal and team CVs for public procurement tenders. It replaces the
`Snowhound_CV_baas.xlsx` sheet. Scope: [`docs/product.md`](docs/product.md).

Built with TanStack Start (React), Bun, SQLite, Drizzle, and Better Auth
([`docs/architecture.md`](docs/architecture.md)).

## Run locally

Requires Bun 1.4.2 (the version in `package.json`'s `packageManager`).

```bash
bun install        # dependencies and the pre-commit hook
bun run env:init   # creates .env.local with a generated BETTER_AUTH_SECRET
bun --bun run dev  # http://localhost:3000
```

Changing a GitHub Actions workflow also needs [actionlint](https://github.com/rhysd/actionlint):
`brew install actionlint`. The pre-commit hook runs it on staged workflow files and fails
without it; other commits don't need it.

Non-secret local defaults live in the tracked `.env.development`; secrets go only in
`.env.local`, which git ignores. `env:init` never overwrites a value that is already set.

Run the dev server with `bun --bun`: it runs Vite under Bun, which loads `.env.local`.
Plain `bun run dev` runs Vite under Node, and the env validation in `src/env.ts` stops
the server.

| Command                   | Does                                                                      |
| ------------------------- | ------------------------------------------------------------------------- |
| `bun run check`           | Format check, lint, and type check                                        |
| `bun run lint`            | oxlint, type-aware; warnings fail                                         |
| `bun run format`          | Formats with oxfmt (`format:check` only checks)                           |
| `bun run typecheck`       | `tsc --noEmit`                                                            |
| `bun run build`           | Production build into `.output/`; also regenerates `src/routeTree.gen.ts` |
| `bun run test`            | Runs every test runner present (Vitest for now)                           |
| `bun run test:components` | Component tests (`*.test.tsx`) with Vitest in jsdom                       |

The database, seed data, and server and end-to-end tests arrive with their tasks in
`tasks/`.

## Docs and tasks

- [`docs/product.md`](docs/product.md): what the MVP does and doesn't do.
- [`docs/architecture.md`](docs/architecture.md): technical decisions and their reasons.
- [`docs/hosting.md`](docs/hosting.md): where it runs and the limits that follow.
- [`tasks/`](tasks/README.md): the work, one file per task, in order.
- [`AGENTS.md`](AGENTS.md): how agents (and people) work in this repository.
