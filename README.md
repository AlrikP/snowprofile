# snowprofile

snowprofile records Snowhound's projects, the technologies used, and who worked on them,
and produces personal and team CVs for public procurement tenders. It replaces the
`Snowhound_CV_baas.xlsx` sheet. Scope: [`docs/product.md`](docs/product.md).

Built with TanStack Start (React), Bun, SQLite, Drizzle, and Better Auth
([`docs/architecture.md`](docs/architecture.md)).

## Run locally

Requires Bun 1.4.2 (the version in `package.json`'s `packageManager`).

```bash
bun install           # dependencies
bunx lefthook install # the pre-commit hook; `prepare` skips it with ignore-scripts
bun run env:init      # creates .env.local with a generated BETTER_AUTH_SECRET
bun run db:migrate    # creates local.db and applies the migrations
bun run db:seed       # adds the demo organizations and users; it prints how to sign in
bun --bun run dev     # http://localhost:3000, then /sign-in
```

Changing a GitHub Actions workflow also needs [actionlint](https://github.com/rhysd/actionlint):
`brew install actionlint`. The pre-commit hook runs it on staged workflow files and fails
without it; other commits don't need it.

Non-secret local defaults live in the tracked `.env.development`; secrets go only in
`.env.local`, which git ignores. `env:init` never overwrites a value that is already set.

Run the dev server with `bun --bun`: it runs Vite under Bun, which loads `.env.local`.
Plain `bun run dev` runs Vite under Node, and the env validation in `src/env.ts` stops
the server.

| Command                      | Does                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `bun run i18n:compile`       | Compiles `messages/`; `check` and `test` run it first                        |
| `bun run check`              | Compiles messages, then format check, lint, type check                       |
| `bun run lint`               | oxlint, type-aware; warnings fail                                            |
| `bun run format`             | Formats with oxfmt (`format:check` only checks)                              |
| `bun run typecheck`          | `tsc --noEmit`                                                               |
| `bun run build`              | Production build into `.output/`; also regenerates `src/routeTree.gen.ts`    |
| `bun run db:generate <name>` | Creates an empty migration in `drizzle/`                                     |
| `bun run db:migrate`         | Checks applied migrations, then applies pending ones to `DATABASE_URL`       |
| `bun run db:drift`           | Fails if `src/db/schema.ts` no longer matches the migrations                 |
| `bun run db:verify`          | Fails if an applied migration was edited or deleted                          |
| `bun run db:seed`            | Adds missing demo organizations locally; `--reset <slug>` redoes one         |
| `bun run test`               | Compiles messages, then runs `test:server` and `test:components`             |
| `bun run test:server`        | Server and database tests (`*.test.ts`), in random order; it prints `--seed` |
| `bun run test:components`    | Component tests (`*.test.tsx`) with Vitest in jsdom                          |

The migration workflow is in [`docs/migrations.md`](docs/migrations.md). End-to-end
tests arrive with their task in `tasks/`.

## Google sign-in

Deployed environments sign in with Google; local development uses the seeded demo users
(`DEMO_MODE`). To try Google locally, or to set up a deployed stack:

1. In the [Google Cloud console](https://console.cloud.google.com/), pick or create a
   project, then open **APIs & Services > OAuth consent screen**. Choose **Internal** for a
   Google Workspace organization (only its accounts can sign in), or **External** with test
   users while trying it out. Request only the `openid`, `email`, and `profile` scopes.
2. Open **APIs & Services > Credentials > Create credentials > OAuth client ID**, with
   application type **Web application**.
3. Add the environment's URL (`BETTER_AUTH_URL`) under **Authorized JavaScript origins**,
   and `<BETTER_AUTH_URL>/api/auth/callback/google` under **Authorized redirect URIs**, for
   example `http://localhost:3000/api/auth/callback/google`. Each environment needs its own
   entries.
4. Put the client ID and secret in `.env.local` (or the deployed stack's environment) as
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Google sign-in stays off while
   `DEMO_MODE` is on, so set `DEMO_MODE=false` to try it locally.
5. Optionally set `ALLOWED_LOGIN_DOMAINS` (for example `snowhound.eu`) to refuse other
   domains. It can't be combined with `DEMO_MODE`.

A Google account with no membership signs in to a "no access" page until an organization
admin invites it.

## Docs and tasks

- [`docs/product.md`](docs/product.md): what the MVP does and doesn't do.
- [`docs/architecture.md`](docs/architecture.md): technical decisions and their reasons.
- [`docs/hosting.md`](docs/hosting.md): where it runs and the limits that follow.
- [`tasks/`](tasks/README.md): the work, one file per task, in order.
- [`AGENTS.md`](AGENTS.md): how agents (and people) work in this repository.
