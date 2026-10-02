# Architecture

Decisions from the bootstrap's technology interview (2026-10-02). The fullstack and
deployment conventions are **provisional**: they adapt snowtime's proven Solid and Vercel
setup to React and a self-hosted Compose stack. Task "Harvest stack profile" feeds what
the project settles on back into the bootstrap kit.

## Stack

| Concern              | Choice                                                                                                                                                                                                               | Reason                                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shape            | One fullstack TypeScript app at the repository root                                                                                                                                                                  | One language from UI to database; the fastest test loop for agents                                                                                                            |
| Framework            | TanStack Start with React, server-rendered; file router and server functions                                                                                                                                         | Close to snowtime's Solid stack; React has more agent training data and is what the team knows. Provisional                                                                   |
| Runtime and packages | Bun 1.4.2 (`packageManager`) for installs, scripts, the dev server (`bun --bun run dev`), and server tests                                                                                                           | Same as snowtime; `bun --bun` loads `.env*` files into `process.env`                                                                                                          |
| Database             | SQLite as a local file (`file:<path>`) in every environment, through `@libsql/client` 0.18.0                                                                                                                         | snowtime's self-hosted path: no database server, Litestream backups. The data is small, so one process is enough. Moving to PostgreSQL is [deferred](#deferred--out-of-scope) |
| Database URL         | `DATABASE_URL`, no token                                                                                                                                                                                             | A neutral name keeps a later move to PostgreSQL or Turso a configuration change                                                                                               |
| ORM and migrations   | Drizzle `1.0.0-rc.4` as a query layer only; hand-written SQL migrations are the source of truth, and `src/db/schema.ts` is kept by hand to match                                                                     | Generated migrations lose partial indexes and composite keys on SQLite. Same as snowtime                                                                                      |
| Auth                 | Better Auth 1.7 with the Drizzle adapter and the organization plugin                                                                                                                                                 | Self-hosted sessions; the organization plugin gives tenants, members, roles, and invitations                                                                                  |
| Data fetching        | TanStack Query with optimistic updates                                                                                                                                                                               | From the profile                                                                                                                                                              |
| Forms                | TanStack Form                                                                                                                                                                                                        | From the profile                                                                                                                                                              |
| Validation           | Valibot, shared by forms, server functions, and `src/env.ts`                                                                                                                                                         | Smaller than Zod; one library everywhere. The scaffold's Zod was removed                                                                                                      |
| UI                   | shadcn/ui (Radix primitives, style `new-york`, base color `zinc`) with Tailwind CSS 4; copies in `src/components/ui/`                                                                                                | The React counterpart of snowtime's Solid-UI; the class names carry over to HTML prototypes                                                                                   |
| Icons                | `lucide-react` 1.49, named imports with the `Icon` suffix (`import { ClockIcon } from 'lucide-react'`)                                                                                                               | lucide-react has no typed per-icon paths; it is tree-shakeable (`sideEffects: false`)                                                                                         |
| i18n                 | Paraglide JS installed by hand (not the CLI add-on), locale in a cookie, `et` and `en`                                                                                                                               | No public pages to index, so no localized URLs                                                                                                                                |
| Client state         | No library: React state and context, URL search params                                                                                                                                                               | From the profile                                                                                                                                                              |
| Lint and format      | oxlint 1.86 with `oxlint-tsgolint` (type-aware, warnings fail) and its React rules; oxfmt 0.71 with snowtime's style; `tsc --noEmit` with TypeScript 7.0.2; lefthook 2.1 pre-commit hook                             | Fast, one toolchain; same as snowtime except React rules                                                                                                                      |
| Tests                | `bun test` for server and database code (`*.test.ts`); Vitest 5.0.3 with React Testing Library 16.3.3, `user-event` 14.6.7, and `jest-dom` 7.0.1 in jsdom 30.1.1 for components (`*.test.tsx`); Playwright in `e2e/` | Fast local loops without cloud services. Playwright is installed by its task                                                                                                  |
| Task runner          | `package.json` scripts; no `mise.toml`                                                                                                                                                                               | One language; `packageManager` pins Bun                                                                                                                                       |
| Deployment           | Docker Compose on Hetzner (EU) following snowtime's Compose setup; local only until the first deployment                                                                                                             | Existing Snowhound infrastructure, flat cost, commercial use allowed. Provisional, no kit profile (`hosting.md`)                                                              |
| Build                | Nitro (generic adapter), `bun` preset for the server build                                                                                                                                                           | Runs in any container host                                                                                                                                                    |

## Repository layout

| Path                   | Holds                                                        |
| ---------------------- | ------------------------------------------------------------ |
| `src/routes/`          | Route files: wiring only                                     |
| `src/features/<name>/` | One view: page, pending state, subcomponents, queries, tests |
| `src/components/`      | Shared components; `ui/` holds shadcn copies only            |
| `src/lib/`             | Shared helpers, including code the server shares             |
| `src/server/<domain>/` | Server functions, rules, schemas, and tests per domain       |
| `src/db/`              | `schema.ts` and the database connection (planned)            |
| `src/env.ts`           | Server environment, validated with Valibot                   |
| `src/test/`            | Vitest setup for component tests                             |
| `drizzle/`             | SQL migrations, `<timestamp>_<name>/migration.sql` (planned) |
| `datamodel/`           | DBML diagram generated from `schema.ts` (planned)            |
| `scripts/`             | Project scripts, such as `env-init.ts`                       |
| `e2e/`                 | Playwright end-to-end tests (planned)                        |
| `prototypes/`          | Static HTML prototypes (planned)                             |
| `deploy/compose/`      | Compose stack and Caddyfile for Hetzner (planned)            |
| `docs/`                | Product scope, architecture, hosting, skills                 |
| `tasks/`               | Task files (`tasks/README.md`)                               |

## Scaffold

Created on 2026-10-02 with:

```bash
bunx @tanstack/cli@0.71.1 create snowprofile --target-dir . --framework react \
  --package-manager bun --deployment nitro \
  --add-ons better-auth,tanstack-query,form,shadcn \
  --no-toolchain --no-examples --no-git --no-intent --non-interactive --force
```

It produced `@tanstack/react-start` 1.168.60, `@tanstack/react-router` 1.170.41,
React 19.3.0, Vite 8.3.2, Tailwind CSS 4.3.3, and Better Auth 1.7.7. The shadcn add-on
copied seven components (button, input, label, select, slider, switch, textarea), which
import the `cn` package. Imports across areas use the `#/*` alias (`package.json`
`imports`).

Changes after the scaffold: dependencies pinned to exact versions; `lucide-react`
0.577.0 → 1.49.0, TypeScript 6.0.3 → 7.0.2, and `nitro` → 3.0.260903-beta; Zod, the demo
header, `.cursorrules`, and the `@/*` alias removed. The CLI's `routeTree.gen.ts` lacked
TanStack Start's type registration, so the `generate-routes` script (`tsr generate`) and
`@tanstack/router-cli` were removed; the Vite plugin regenerates the file in `dev` and
`build`.

## Data conventions

Settled now:

- Every tenant-owned record has a non-null organization ID, and queries always scope by
  it.
- IDs are generated by the app, not SQLite rowids.
- Bilingual text is a cross-cutting convention: each text field holds an Estonian and an
  English value, either of which may be missing.

What the data model must handle, from the sheet:

- **Periods** have month precision (`05.2020`) and are often open-ended ("jätkuv", "...",
  "-"). The sheet also has years only (`2018`), `6.2015`, and text such as
  "juuni-okt 2024".
- **Hours and cost** are approximate (`~3500h`, `> 10 000h`, `> 700 000€`): a number plus
  a qualifier (approximately, more than).
- **Project references** in employee sheets mix numbers (`10`), names ("Telia
  iseteenindus"), and spelling variants ("Projekt 19", "Projekt8").
- **Technologies** are free text with variants and categories in the text ("Frontend:
  React, ...").
- **Tender criteria answers** go beyond yes/no ("REST", "Both", "Liquibase for
  translations"); the optional note keeps them.

The ID format, timestamps, month periods, booleans, enums, JSON, audit columns, and
deletion are decided by the data model task (see [Open questions](#open-questions)).
snowtime's `docs/migrations.md` ("SQL conventions") is the starting point.

## Application rules

- **Data access only through repository modules,** one per area. They apply the
  organization scoping in one place. No SQL or ORM calls in routes, server functions, or
  UI code, so a database change stays inside the repositories.
- **Authorization is checked in the server rules** (`*.server.ts`); SQLite has no
  row-level security. Server functions are thin: pick a middleware, validate with Valibot,
  call the rules.
- **Writes are named mutations,** not generic CRUD.
- **The server returns error codes, keys, dates, and numbers;** the client translates and
  formats them.
- **Portable SQL.** Prefer SQL that PostgreSQL also accepts. Where SQLite needs its own
  form, keep it inside the repository or migration and note it.
- **One SQLite writer.** Statements queue while a transaction is open, so concurrent
  requests never fail on SQLite's write lock (snowtime's `src/db/connection.ts`, task
  043, is the reference). Code inside a transaction uses its handle, never the client.
- **No stored files:** CVs are generated on request. Background work, if ever needed,
  runs in the app process.
- **No hosting-platform SDKs or services in app code.**

### Sign-in modes

- `DEMO_MODE` is one runtime setting. It enables password sign-in for seeded users,
  disables Google sign-in and password sign-up, and shows a "demo version" notice on the
  sign-in page. It defaults to on in dev and test, and off otherwise.
- The seeder refuses a database that isn't a local file, and refuses a production stack
  unless `DEMO_MODE` is on. Password accounts exist only in seeded data.
- `ALLOWED_LOGIN_DOMAINS` (for example `snowhound.eu`) restricts sign-in to company
  addresses. The app refuses to start with both `DEMO_MODE` and `ALLOWED_LOGIN_DOMAINS`
  set, because seeded users have `example.com` addresses. A test checks this.
- The Google path gets a manual check after each deploy to the company stack. A local mock
  identity provider can be added if that path proves fragile.

## Environments and deployment

| Environment   | Where                          | Database                                        | Sign-in                         | Notes                                              |
| ------------- | ------------------------------ | ----------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| Local dev     | `bun --bun run dev`, port 3000 | `file:local.db`                                 | `DEMO_MODE`, seeded users       | Generated demo data only                           |
| Test          | `bun test`, Vitest, Playwright | A fresh file or in-memory database per test run | `DEMO_MODE`                     | Same seed as dev                                   |
| Local Compose | `deploy/compose/` on a laptop  | A file on a Docker volume                       | `DEMO_MODE`                     | Rehearses a deployment (planned)                   |
| Demo stack    | Hetzner, later                 | Its own volume                                  | `DEMO_MODE`                     | Fictional data only (planned)                      |
| Company stack | Hetzner, later                 | Its own volume, Litestream backups              | Google, `ALLOWED_LOGIN_DOMAINS` | Real data; can't go live without backups (planned) |

- **One container image,** configured only through environment variables, logging to
  standard output, with a health endpoint.
- **Images** are built by a manual "Compose deploy" GitHub Actions workflow, pushed to
  GitHub Container Registry, and tagged with the commit's short ID (`RELEASE`). Rolling
  back means picking an earlier tag.
- **Migrations run on startup** (`MIGRATE_ON_START`) in Compose: a failed migration keeps
  the app from listening, so the deploy fails. Locally, `db:migrate` applies them. This
  departs from the kit profile, which never migrates on startup because Vercel's previous
  deployment keeps serving.
- **One app process per database.** No second instance or zero-downtime handover; a
  restart pauses requests for about a second while Caddy holds them.

## Open questions

- **Data conventions:** ID format (UUIDv7 as text, like snowtime?), timestamps, month
  periods, booleans, enums, JSON, audit columns, and deletion. The data model task decides
  them.
- **drizzle-kit dialect:** `turso` (snowtime, libSQL driver, accepts `file:` URLs) or
  `sqlite` with the libSQL driver. The migration tooling task checks the current
  drizzle-kit docs and decides.
- **Locale storage:** a cookie only, or also a per-user setting so the choice follows the
  user across browsers. The i18n task decides.
- **Image layout:** a compiled Bun binary (snowtime) or the Bun runtime image. The
  deployment task decides from image size and build time.
- **Litestream storage:** which S3-compatible storage holds backups (for example Hetzner
  Object Storage in another location, or another provider). Decide before the company
  stack holds real data.
- **Platform operator:** who creates organizations and their first admin, and how. A
  script is the MVP candidate.
- **First deployment:** when, and whether a deployed demo stack is needed before the
  company stack goes live.

## Deferred / out of scope

- **Move to PostgreSQL.** File it as a task when any trigger occurs:
  - The load needs more than one app process, or the restart pause becomes a problem.
  - Several companies on one stack write more than one SQLite writer handles.
  - A feature needs PostgreSQL: richer reporting SQL, row-level security, or
    `LISTEN`/`NOTIFY`.
  - A requirement for a managed database, or a database server separate from the app.

  The task covers a PostgreSQL schema and migrations (Drizzle `pg-core`); repositories
  switched, with their tests run against both databases during the move; a one-off import
  from the SQLite file (snowtime's `snowtime-import` shows the verify, copy, and check
  pattern); backups replacing Litestream (`pg_dump`, or WAL archiving with WAL-G or
  pgBackRest); and tests moved (for example PGlite). PostgreSQL then runs either as a
  container in the Compose stack (no extra cost; backups and upgrades are ours) or as a
  managed EU service (a monthly fee; the provider operates it). That choice is part of the
  task. The repository rule and portable SQL keep the move cheap. Turso would also work
  with only a URL and token change, as a fallback.

- **Vercel.** Ruled out: Hobby forbids commercial use. The portability rules keep other
  platforms (a bigger VPS, Kubernetes, Cloud Run) open.
