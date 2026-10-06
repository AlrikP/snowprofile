# Architecture

Decisions from the bootstrap's technology interview (2026-10-02). The fullstack and
deployment conventions are **provisional**: they adapt snowtime's proven Solid and Vercel
setup to React and a self-hosted Compose stack. Task "Harvest stack profile" feeds what
the project settles on back into the bootstrap kit.

## Stack

| Concern              | Choice                                                                                                                                                                                                                                                                                                                                                                                                                       | Reason                                                                                                                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shape            | One fullstack TypeScript app at the repository root                                                                                                                                                                                                                                                                                                                                                                          | One language from UI to database; the fastest test loop for agents                                                                                                                                                                        |
| Framework            | TanStack Start with React, server-rendered; file router and server functions                                                                                                                                                                                                                                                                                                                                                 | Close to snowtime's Solid stack; React has more agent training data and is what the team knows. Provisional                                                                                                                               |
| Runtime and packages | Bun 1.4.2 (`packageManager`) for installs, scripts, the dev server (`bun --bun run dev`), and server tests                                                                                                                                                                                                                                                                                                                   | Same as snowtime; `bun --bun` loads `.env*` files into `process.env`                                                                                                                                                                      |
| Database             | SQLite as a local file (`file:<path>`) in every environment, through `@libsql/client` 0.18.0                                                                                                                                                                                                                                                                                                                                 | snowtime's self-hosted path: no database server, Litestream backups. The data is small, so one process is enough. Moving to PostgreSQL is [deferred](#deferred--out-of-scope)                                                             |
| Database URL         | `DATABASE_URL`, no token; a `file:` URL, `file:local.db` locally (`.env.development`)                                                                                                                                                                                                                                                                                                                                        | A neutral name keeps a later move to PostgreSQL or Turso a configuration change                                                                                                                                                           |
| ORM and migrations   | Drizzle `1.0.0-rc.4` as a query layer only; hand-written SQL migrations are the source of truth, and `src/db/schema.ts` is kept by hand to match; drizzle-kit `1.0.0-rc.4` with the `turso` dialect                                                                                                                                                                                                                          | Generated migrations lose partial indexes and composite keys on SQLite. Same as snowtime. `turso` always uses `@libsql/client`, the app's driver; `sqlite` picks whichever SQLite driver is installed                                     |
| Auth                 | Better Auth 1.7 with the Drizzle adapter and the organization plugin                                                                                                                                                                                                                                                                                                                                                         | Self-hosted sessions; the organization plugin gives tenants, members, roles, and invitations                                                                                                                                              |
| Data fetching        | TanStack Query with optimistic updates                                                                                                                                                                                                                                                                                                                                                                                       | From the profile                                                                                                                                                                                                                          |
| Forms                | TanStack Form                                                                                                                                                                                                                                                                                                                                                                                                                | From the profile                                                                                                                                                                                                                          |
| Validation           | Valibot, shared by forms, server functions, and `src/env.ts`                                                                                                                                                                                                                                                                                                                                                                 | Smaller than Zod; one library everywhere. The scaffold's Zod was removed                                                                                                                                                                  |
| UI                   | shadcn/ui (Radix primitives, style `new-york`, base color `zinc`) with Tailwind CSS 4; copies in `src/components/ui/`, added with the shadcn CLI 4.21.1                                                                                                                                                                                                                                                                      | The React counterpart of snowtime's Solid-UI; the class names carry over to HTML prototypes                                                                                                                                               |
| Icons                | `lucide-react` 1.49, named imports with the `Icon` suffix (`import { ClockIcon } from 'lucide-react'`)                                                                                                                                                                                                                                                                                                                       | lucide-react has no typed per-icon paths; it is tree-shakeable (`sideEffects: false`)                                                                                                                                                     |
| i18n                 | Paraglide JS installed by hand (not the CLI add-on); `et` (base) and `en`; locale in a cookie and on the user (`docs/product.md`, "Languages")                                                                                                                                                                                                                                                                               | No localized URLs: no public pages to index. Kept on the user too, so the choice follows them across browsers                                                                                                                             |
| Client state         | No library: React state and context, URL search params                                                                                                                                                                                                                                                                                                                                                                       | From the profile                                                                                                                                                                                                                          |
| Lint and format      | oxlint 1.86 with `oxlint-tsgolint` (type-aware, warnings fail) and its React rules; oxfmt 0.71 with snowtime's style; `tsc --noEmit` with TypeScript 7.0.2; lefthook 2.1 pre-commit hook; actionlint 1.7 (Homebrew) for workflow files; knip 6.39.0 for unused code; `scripts/imports-check.ts` and `scripts/icons-check.ts` for the conventions oxlint can't express                                                        | Fast, one toolchain; same as snowtime except React rules                                                                                                                                                                                  |
| Tests                | `bun test` for server and database code (`*.test.ts`); Vitest 5.0.3 with React Testing Library 16.3.3, `user-event` 14.6.7, and `jest-dom` 7.0.1 in jsdom 30.1.1 for components (`*.test.tsx`); Playwright 1.63.0 in `e2e/`, against the production build on its own seeded database, and run in CI as its own step. Tests that check a behavior spec scenario cite its ID in their title (`docs/specs/`); no Gherkin runner | Fast local loops without cloud services. Most scenarios are server rules, best checked in `bun test`; a Gherkin runner (`playwright-bdd`) would test them through the browser and add step definitions and a second copy of each scenario |
| Behavior specs       | Markdown specs in `docs/specs/`, one per capability, after OpenSpec's capability specs; changes go through a task's "Spec changes" section                                                                                                                                                                                                                                                                                   | Not the OpenSpec tool: it has no task dependencies, doesn't fit infrastructure work, and its generated agent instructions would compete with `AGENTS.md`                                                                                  |
| Task runner          | `package.json` scripts; no `mise.toml`                                                                                                                                                                                                                                                                                                                                                                                       | One language; `packageManager` pins Bun                                                                                                                                                                                                   |
| CI                   | GitHub Actions: one `check` job on pull requests and pushes to `main`; actions pinned to major versions, kept current by Dependabot                                                                                                                                                                                                                                                                                          | Every check in one place, so branch protection requires one job                                                                                                                                                                           |
| Deployment           | Docker Compose on Hetzner (EU) following snowtime's Compose setup; local only until the first deployment                                                                                                                                                                                                                                                                                                                     | Existing Snowhound infrastructure, flat cost, commercial use allowed. Provisional, no kit profile (`hosting.md`)                                                                                                                          |
| Build                | Nitro's default `node-server` preset; the output also runs under Bun                                                                                                                                                                                                                                                                                                                                                         | Runs in any container host, on Node or Bun                                                                                                                                                                                                |

The inlang message-format plugin that compiles the messages is a pinned dev dependency,
loaded from `node_modules` (`project.inlang/settings.json`), not from jsDelivr. Compiling
messages then needs no network, and the lockfile checks the plugin like any package.

The theme follows snowhound.eu, because the app can be opened from Snowhound's site and
should look part of it: navy `#071535`, mint `#0ff4bd`, slate text `#506273`, pale blue
`#eff7fb`, Roboto for text, and Barlow Condensed for headings. `src/styles.css` maps them
onto shadcn's tokens. The sidebar is navy, as the site's header is, and mint fills
buttons and marks the active item; mint never carries text or outlines on white, where its
contrast is about 1.4:1. The fonts come from `@fontsource` packages served with the app,
not from Google, so pages make no requests to Google. The Snowhound mark is
`public/snowhound-mark.png`, copied from the site.

## Repository layout

| Path                   | Holds                                                        |
| ---------------------- | ------------------------------------------------------------ |
| `src/routes/`          | Route files: wiring only                                     |
| `src/features/<name>/` | One view: page, pending state, subcomponents, queries, tests |
| `src/components/`      | Shared components; `ui/` holds shadcn copies only            |
| `src/lib/`             | Shared helpers, including code the server shares             |
| `src/server/<domain>/` | Server functions, rules, schemas, and tests per domain       |
| `src/db/`              | Database connection, `schema.ts`, relations, seed, demo data |
| `src/integrations/`    | TanStack Query setup and devtools, from the scaffold         |
| `src/env.ts`           | Server environment, validated with Valibot                   |
| `src/test/`            | Test setup: Vitest for components, a preload for `bun test`  |
| `messages/`            | UI messages per locale (`et.json`, `en.json`)                |
| `project.inlang/`      | Paraglide settings; `i18n:compile` builds `src/paraglide/`   |
| `drizzle/`             | SQL migrations, `<timestamp>_<name>/migration.sql`           |
| `datamodel/`           | DBML diagram and ChartDB viewer (`datamodel/README.md`)      |
| `scripts/`             | Project scripts, such as `env-init.ts`                       |
| `e2e/`                 | Playwright end-to-end tests and their server (`server.ts`)   |
| `prototypes/`          | Static HTML prototypes (`prototypes/README.md`)              |
| `public/`              | Files served as they are, such as the Snowhound mark         |
| `deploy/compose/`      | Compose stack and Caddyfile (`docs/deployment.md`)           |
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

The tables are in [`datamodel/snowprofile.dbml`](../datamodel/snowprofile.dbml). These
conventions apply to every app-owned table; Better Auth's tables keep the plugin's shape.

### Tenancy

- All organizations share one database, and rows belong to an organization through
  `organization_id`. A SQLite file per organization would be simple, but it doesn't carry
  over to the [PostgreSQL move](#deferred--out-of-scope): a PostgreSQL database per
  organization isn't feasible to run. One database also keeps a single migration path,
  backup, and writer.
- Every tenant-owned table has a non-null `organization_id`, and queries always scope by
  it. The repositories apply the scope ([Application rules](#application-rules)), and the
  composite keys below stop a cross-organization reference even where a query misses it.
- A reference between tenant-owned rows is a composite foreign key on
  `(<ref>_id, organization_id)` to the target's `(id, organization_id)`, which carries a
  unique index. A row then can't point into another organization, even if the app has a
  bug. Link tables carry `organization_id` too, for the same keys.
- A server function on tenant data names its organization in its input
  (`organizationId`). `scopeMiddleware` (`src/server/middleware.ts`) checks the caller's
  membership and gives the rules a scope with the organization and role. The session's
  active organization doesn't decide it: switching in one tab changes it for every tab, so
  a form opened in one organization could save into another. The active organization only
  picks where the app opens after sign-in.
- **A signed-in page's URL starts with its organization's slug** (`/demo/projects`). The
  URL is the one place a tab keeps its own organization, and a link opens in the right
  one. The `/$organization` layout route loads the frame and checks the membership; a
  slug the user isn't a member of redirects to `/`, which opens the active organization.
  Its pages take the organization's ID from that route's loader data and pass it to
  scoped server functions.

### Types

- **IDs:** UUIDv7 stored as `text`, generated in the app (on the client for rows it
  creates, so optimistic updates keep a stable key; through Better Auth's `generateId` for
  its own tables). Not SQLite rowids, which differ between databases and leak row counts.
  `text` over a 16-byte `blob`: readable in any SQL console and native to Drizzle and
  Better Auth. UUIDv7 sorts by creation time, which keeps index inserts local.
- **Timestamps** (`*_at`): UTC epoch milliseconds in `integer` columns. SQLite has no
  timestamp type; integers take 8 bytes instead of about 24 for ISO text, and make range
  filters plain arithmetic. Read them with `datetime(x / 1000, 'unixepoch')`.
- **Calendar dates** (`join_date`, `left_date`, `birth_date`): `text` in ISO 8601 form, `YYYY-MM-DD`.
  A date has no time zone, so an epoch value would shift it by a day across zones.
- **Periods** (`start_date`, `end_date`): `text` as `YYYY-MM-DD`, `YYYY-MM`, or `YYYY`,
  as precise as known. The sheet has months and years; projects entered in the app can
  have exact days. Each form is an ISO 8601 date at reduced precision, so the length
  gives the precision and all forms sort as text. The UI shows them as `DD-MM-YYYY`, `MM-YYYY`, or
  `YYYY`. A null end means ongoing. A `CHECK` keeps the end at or after the start,
  compared on the end's precision (`end_date >= substr(start_date, 1, length(end_date))`).
  A period filter reads a partial start as its first day and a partial end as its last.
  The sheet's other forms ("juuni-okt 2024") go into the migration script's report.
- **Approximate numbers** (hours, cost): an `integer` value plus a `*_qualifier` column,
  `exact`, `approximately`, or `more_than`, so `~3500h` and `> 10 000h` keep their meaning
  and still sort and sum. A `CHECK` makes the qualifier null exactly when the value is.
  Cost is in whole euros.
- **Bilingual text:** a column pair, `<name>_et` and `<name>_en`; either may be null.
  Columns, not a translation table or JSON, so a CV query reads one row and the
  missing-translation check is `IS NULL`. Text that appears in a CV is bilingual; proper
  names (people, customers, projects, technologies) and internal notes are single
  columns. Where a row needs a name, a `CHECK` requires at least one of the pair.
  Reconsider a JSON object per field (`{"et": ..., "en": ...}`) if a third content
  language becomes a requirement. Until then, columns keep per-language checks and
  single-language updates that JSON would lose. The switch is an add, backfill, switch,
  drop migration inside the repositories.
- **Booleans:** `integer` with `CHECK (x IN (0, 1))`. SQLite has no boolean type; Drizzle
  maps 0/1.
- **Enums:** `text` with a `CHECK` listing the values, readable in a console. Changing the
  list rebuilds the table, so a list expected to grow (Better Auth's `member.role`) has no
  `CHECK` and the app validates it.
- **JSON:** none in app tables. Every field the MVP needs has a known shape, and columns
  keep constraints and indexes. Better Auth's `organization.metadata` is the plugin's.

### Audit and deletion

- **Audit columns** on every app-owned table: `created_at` and `created_by`, plus
  `updated_at` and `updated_by` on tables whose rows change. They record who last changed
  a project or profile and when (`product.md`, "Change tracking"). The timestamps default
  to the current time in the database; the app sets `updated_at` on every update, and a
  guarded `AFTER UPDATE` trigger sets it when a statement didn't. `*_by` is the acting
  user from the request, `NOT NULL` with no default, so a write without an actor fails;
  scripts act as a fixed system user (`SYSTEM_USER_ID` in `src/db/actor.ts`), which a
  migration creates without an account, so nobody can sign in as it. Insert-and-delete link tables have only `created_*`.
- **Deletion:** entities that users delete from a list (customers, contact persons,
  projects, technologies, roles, criteria, education, participations, own projects) carry
  `sys_deleted` (0/1) and are excluded from every query, list, search, and CV. A mistaken
  delete can then be undone by hand, and references from other rows stay valid. Partial
  unique indexes include `sys_deleted = 0`. Link rows (`project_technology` and the like)
  are hard-deleted. Domain states are separate columns, not deletion: a contact person's
  `no_longer_valid`, a merged technology's or role's `merged_into_id`.
- **Users are never hard-deleted,** so audit references to `user` stay valid. GDPR
  erasure anonymizes the row.
- **Leavers** are a domain state, not deletion. An admin marks a person as left in one
  action, which sets `employee_profile.left_date` and removes the membership, so access
  ends with it. Search and CV selection leave leavers out by default, and their
  participations stay on projects as references. Whether and when a leaver's profile is
  anonymized is open (`product.md`, "Leavers").

### PostgreSQL portability

The conventions use SQL that PostgreSQL also accepts, except for these SQLite forms, which
a move to PostgreSQL ([deferred](#deferred--out-of-scope)) replaces:

- Epoch-millisecond columns are `integer` in SQLite and need `bigint` in PostgreSQL.
- Booleans as `integer` 0/1 become `boolean`; UUIDs as `text` can become `uuid`.
- Timestamp defaults use `unixepoch('subsec')`; PostgreSQL uses `now()`.
- Format checks on periods and dates use `GLOB`; PostgreSQL uses `~` with a regular
  expression.
- Triggers use SQLite's inline `BEGIN ... END` body; PostgreSQL needs a trigger function.
- Better Auth's `user` table name is a reserved word in PostgreSQL, so raw SQL there must
  quote it as `"user"`.

### From the sheet

A one-off script loads `Snowhound_CV_baas.xlsx`, not an import page in the app. The sheet
is an informal document, so an in-app import would be built around a single file;
a template-based import and export is a later product question (`product.md`, "Not in
MVP"). What the script must handle:

- **Periods** have month precision (`05.2020`) and are often open-ended ("jätkuv", "...",
  "-"). The sheet also has years only (`2018`), `6.2015`, and text such as
  "juuni-okt 2024".
- **Hours and cost** are approximate (`~3500h`, `> 10 000h`, `> 700 000€`).
- **Project references** in employee sheets mix numbers (`10`), names ("Telia
  iseteenindus"), and spelling variants ("Projekt 19", "Projekt8"). `project.import_ref`
  holds the sheet's number, so a re-run updates instead of duplicating, and
  `project.normalized_name` (indexed, not unique) matches name variants.
- **Technologies** are free text with variants and categories in the text ("Frontend:
  React, ..."). `technology.normalized_name` matches variants, and `merged_into_id` maps
  merged names.
- **Tender criteria answers** go beyond yes/no ("REST", "Both", "Liquibase for
  translations"); the answer's note keeps them.
- **People** are matched by company email. Before the migration, a column with each
  employee's company email is added to the sheet in Excel; every employee's address is
  known, because the data is internal (decided 2026-10-06). The script finds or creates
  a `user` row for each address, with no linked account, and attaches the profile and
  work history to it, and a re-run matches the same people by email. When the employee
  first signs in with Google at that address, the session belongs to that user, and
  accepting their invitation keeps the imported profile. A row without an email goes to
  the report.

## Application rules

- **Data access only through repository modules,** one per area:
  `src/server/<domain>/<domain>.repository.server.ts`. Only they build queries or import
  `#/db/schema` and `drizzle-orm`; routes, server functions, rules, and UI code don't, so
  a database change stays inside the repositories. The exceptions are `src/db/` itself
  (schema, seed, test helpers), `scripts/`, tests, and Better Auth's adapter.
- **Every repository function takes the scope and applies it.** Its parameters are
  `(db, scope, ...)`; every query filters by `scope.organizationId`, and every insert sets
  it from the scope, never from input. Two kinds of function take no scope: the
  membership lookup that builds it (`organizations.findMemberRole`), and the account
  repository, which reaches only the signed-in user's own row by the session's user ID.
  `src/server/tenancy.test.ts` needs a case for every exported repository function showing
  that a scope in one organization can't read or change another's rows, and fails when a
  function has none.
- **The database handle comes from the middleware** as `context.db`. Server functions pass
  it to the rules, which pass it, or a transaction, to the repositories. Tests call the
  rules with a test database. A test that needs the middleware chain, or a handler's
  cookies, calls the server function through `callServerFn` in `src/server/testing.ts`.
  It relies on Start internals, which `src/test/bun-preload.ts` and that helper wrap. The
  rules own transactions; a repository function runs on whichever handle it gets.
- **Authorization is checked in the server rules** (`*.server.ts`); SQLite has no
  row-level security. Server functions are thin: pick a middleware, validate with Valibot,
  call the rules.
- **Writes are named mutations,** not generic CRUD.
- **The server returns error codes, keys, dates, and numbers;** the client translates and
  formats them.
- **Portable SQL.** Prefer SQL that PostgreSQL also accepts. Where SQLite needs its own
  form, keep it inside the repository or migration and note it in a comment there.
- **One SQLite writer.** Statements queue while a transaction is open, so concurrent
  requests never fail on SQLite's write lock (`src/db/connection.ts`, after snowtime's
  task 043). Code inside a transaction uses its handle, never the client; the client
  throws if it's used there, instead of waiting for the transaction forever.
- **No stored files:** CVs are generated on request. Background work, if ever needed,
  runs in the app process.
- **No hosting-platform SDKs or services in app code.**

### Roles

- Each membership has a role, `admin` or `employee`, stored in Better Auth's `member.role`.
  The organization creator becomes `admin`.
- `src/lib/permissions.ts` defines permission statements (`project: ['update']`,
  `profile: ['requestUpdate']`, and so on) and grants them to each role. Access checks
  ask for a permission, never a role name, so a new role (for example sales or read-only)
  is a new entry in that file, with no change to the checks and no migration
  (`member.role` has no `CHECK`).
- Permissions cover actions on other people's data and on shared data. Rules about a
  person's own data (an employee edits their own profile) are ownership checks in the
  server rules.
- Users can't create organizations; platform operators do (`product.md`). Organizations
  can't be deleted, because they own all their data.
- A page that needs a permission, such as the technical characteristics page, is left out
  of the navigation for roles without it, and its route loader sends them to the
  organization's start page. The server functions check the permission themselves, so the
  page's checks only spare a member a page they can't use.

### Sign-in modes

What sign-in does in each mode is specified in [`specs/sign-in.md`](specs/sign-in.md).
This section holds the reasons and where the code lives.

- `DEMO_MODE` is one runtime setting. Unset, it defaults to on when `NODE_ENV` is
  `development` or `test`, and off otherwise, including when `NODE_ENV` is unset, so
  demo behavior stays off unless something turns it on.
- `src/server/auth/sign-in.server.ts` holds the sign-in rules, and both the auth instance
  and the sign-in page build from it. The server's own refusal of password sign-in
  outside demo mode is the guard, not the page hiding the form. Password accounts exist
  only in seeded data.
- In demo mode, Better Auth's self-service account and session endpoints return 404
  (`disabledPaths`). The seeded accounts are shared and their password is published, so
  one visitor must not lock the others out, see their sessions, or sign them out.
- The seeder (`bun run db:seed`, also with `--reset`) refuses three cases: a database
  that isn't a local file, `DEMO_MODE` off by the rule above, and a database that holds
  any organization that isn't a demo one. Bun leaves `NODE_ENV` unset for scripts, so
  `.env.development` sets `DEMO_MODE=true` for a local seed.
- The seeder adds only the demo organizations the database lacks, so it never overwrites
  data; `--reset <slug>` replaces one demo organization's data and leaves the others
  alone. Users are kept on reset, because users are never hard-deleted.
- Google sign-in needs both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; the app refuses
  to start with only one of them. The README has the OAuth client setup.
- `ALLOWED_LOGIN_DOMAINS` is checked in Better Auth's database hooks
  (`src/server/auth/login-policy.server.ts`) on every new user and every new session,
  not only at sign-up, which is why narrowing the list locks out existing users at their
  next sign-in. Demo mode and an allowlist are exclusive because the seeded users have
  `example.com` addresses.
- A session hook makes a new session start with the user's first organization active;
  switching changes it ([Tenancy](#tenancy)).
- The Google path gets a manual check after each deploy to the company stack. A local mock
  identity provider can be added if that path proves fragile.

## Environments and deployment

| Environment   | Where                          | Database                           | Sign-in                         | Notes                                              |
| ------------- | ------------------------------ | ---------------------------------- | ------------------------------- | -------------------------------------------------- |
| Local dev     | `bun --bun run dev`, port 3000 | `file:local.db`                    | `DEMO_MODE`, seeded users       | Generated demo data only                           |
| Test          | `bun test`, Vitest, Playwright | A fresh, seeded file per test file | `DEMO_MODE`                     | Same seed as dev                                   |
| Local Compose | `deploy/compose/` on a laptop  | A file on a Docker volume          | `DEMO_MODE`                     | Rehearses a deployment (`docs/deployment.md`)      |
| Demo stack    | Hetzner, later                 | Its own volume                     | `DEMO_MODE`                     | Fictional data only (planned)                      |
| Company stack | Hetzner, later                 | Its own volume, Litestream backups | Google, `ALLOWED_LOGIN_DOMAINS` | Real data; can't go live without backups (planned) |

- **One container image,** configured only through environment variables, logging to
  standard output, with a health endpoint (`/api/health`).
- **The app image is the Bun runtime image** (`oven/bun` slim) running the production
  build as the non-root `bun` user, with the database on `/data`. `build:scripts` bundles
  the start script and the seeder into `.output/server/scripts/`, where they find the
  libSQL addon Nitro traced, so the image carries no other `node_modules`: 216 MB, built
  in about 35 seconds with a warm cache. A compiled Bun binary (snowtime's layout) would
  be about 10% smaller, but needs a plugin that patches libSQL's addon loading and a
  build per CPU architecture; snowtime needs it to run without Bun, which a container
  doesn't. A second image, `caddy`, serves `.output/public` (`Dockerfile`).
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

- **Litestream storage:** which S3-compatible storage holds backups (for example Hetzner
  Object Storage in another location, or another provider). Decide before the company
  stack holds real data.
- **Platform operator:** who creates organizations after the MVP, and how. In the MVP the
  seed creates the demo organizations and a script creates any other organization with
  an invitation for its first admin (`product.md`, "Users and access").
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
