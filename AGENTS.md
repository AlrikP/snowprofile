# Agent rules

## Project context

- Product scope: `docs/product.md`
- Architecture decisions: `docs/architecture.md`
- Hosting constraints: `docs/hosting.md`
- Database migrations: `docs/migrations.md`
- Task tracking: `tasks/` (see `tasks/README.md`)
- Writing docs: `.claude/skills/google-style/SKILL.md`
- Checking UI in a browser: `docs/skills/ui-review/SKILL.md`

Follow the recorded decisions; if a change contradicts one, update the doc in the same
change or ask first. An open question in `docs/` stays open until the user decides it;
don't settle it in code.

## Working on tasks

Work on one task at a time, as `tasks/README.md` describes. When a task is done, stop for
review before starting the next one, so each task lands as its own commit. The user
commits after reviewing.

## Running things

| Command                      | Does                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `bun install`                | Installs dependencies; no install script may be relied on (`ignore-scripts`)              |
| `bunx lefthook install`      | Installs the pre-commit hook; `prepare` does it only when scripts run                     |
| `bun run env:init`           | Creates `.env.local` with a generated `BETTER_AUTH_SECRET`; keeps existing values         |
| `bun run i18n:compile`       | Compiles `messages/` into `src/paraglide/`; `check` and `test` run it first               |
| `bun --bun run dev`          | Starts the dev server on port 3000. `--bun` runs Vite under Bun, which loads `.env.local` |
| `bun run check`              | Compiles messages, then format check, lint, the import and icon checks, type check, knip  |
| `bun run lint`               | oxlint, type-aware; warnings fail                                                         |
| `bun run imports:check`      | Fails on a relative import across areas, or a `#/` import inside one                      |
| `bun run icons:check`        | Fails on an icon name without the `Icon` suffix; `--fix` renames Lucide imports           |
| `bun run format`             | Formats with oxfmt (`format:check` only checks)                                           |
| `bun run typecheck`          | `tsc --noEmit`                                                                            |
| `bun run knip`               | Fails on unused files, exports, and dependencies (`knip.json`)                            |
| `bun run build`              | Production build into `.output/`; also regenerates `src/routeTree.gen.ts`                 |
| `bun run db:generate <name>` | Creates an empty migration in `drizzle/`                                                  |
| `bun run db:migrate`         | Checks applied migrations, then applies pending ones to `DATABASE_URL`                    |
| `bun run db:drift`           | Fails if `src/db/schema.ts` no longer matches the migrations                              |
| `bun run db:verify`          | Fails if an applied migration was edited or deleted                                       |
| `bun run db:seed`            | Adds missing demo organizations locally; `--reset <slug>` redoes one                      |
| `bun run prototypes:build`   | Builds the UI prototypes into `prototypes/build/`; `--watch` rebuilds                     |
| `bun run test`               | Compiles messages, then runs `test:server` and `test:components`                          |
| `bun run test:server`        | Server and database tests (`*.test.ts`), in random order; it prints `--seed`              |
| `bun run test:components`    | Component tests (`*.test.tsx`) with Vitest in jsdom                                       |
| `bun run test:e2e`           | Playwright against the production build on port 3100, with a fresh seeded database        |

`test:e2e` stays out of `test`, so `test` needs no browser; CI runs it as its own step.
Install the browser once with `bunx playwright install chromium`.

The dev server is the user's. Check whether it is running before starting one, and never
kill a process you didn't start.

## Shared skills

Codex discovers the skills through symlinks in `.agents/skills/`. Edit their source
files at the paths above so both agents use the same instructions.

## Code conventions

These conventions are **provisional**: they adapt snowtime's proven Solid conventions to
React. Task "Harvest stack profile" feeds corrections back into the bootstrap kit. Each
convention names its check; the ones under "Checked in review" have none.

- Frontend code is grouped by feature in `src/features/<name>/`, with its page component
  (`<Name>Page` in `<name>-page.tsx`), subcomponents, queries, helpers, and tests.
- Route files only wire the route and pass search params and context to the page as
  props. A prop read once for an initial value is named `initial<Name>`.
- A page whose loader waits on the server has a `<Name>Pending` component.
- Features don't import from each other: only routes and `src/router.tsx` import from
  `src/features/` (check: oxlint `no-restricted-imports`). Code moves to `src/components/` or `src/lib/`
  once a second feature needs it.
- Backend code is grouped by domain in `src/server/<domain>/`. Server-only code lives in
  `*.server.ts` files under `src/server/` (the auth instance is
  `src/server/auth/better-auth.server.ts`). Client code imports a domain's
  `*.functions.ts` and `*.schemas.ts`, and the shared `src/server/errors.ts` and
  `src/server/schemas.ts`, never `*.server.ts`. `src/server/middleware.ts` is server-only
  code without the suffix: only `*.functions.ts` import it. Route files that only define
  server handlers (under `src/routes/api/`) are server code. Check: oxlint
  `no-restricted-imports`, with one set of restrictions per file group in `.oxlintrc.json`.
- Database access goes only through repository modules
  (`src/server/<domain>/<domain>.repository.server.ts`). Each function takes
  `(db, scope, ...)` and scopes every query by `scope.organizationId`; the user's own
  account data takes the session's user ID instead
  (`docs/architecture.md`, "Application rules"). Server functions get the database as
  `context.db` from the middleware. Check: `src/server/tenancy.test.ts` fails for a
  repository function without an isolation case, and oxlint `no-restricted-imports`
  allows `#/db/schema` and `drizzle-orm` only in repositories, `src/db/`,
  `better-auth.server.ts`, scripts, and tests.
- Import with a relative path inside the importer's area, and through the `#/` alias for
  everything else. An area is one feature folder (`src/features/<name>/`), `src/server/`,
  or another top-level folder of `src/` (`src/components/`, `src/lib/`, `src/routes/`).
  Files at the `src/` root belong to no area. Check: `imports:check`, both directions.
- Named functions are `function` declarations; shadcn copies in `src/components/ui/` are
  exempt. Check: oxlint `func-style`.
- Icon components end in `Icon`, so JSX shows what they are. Import Lucide icons by their
  suffixed names: `import { ClockIcon } from 'lucide-react'`. Name hand-written icons the
  same way. Check: `icons:check`.
- Server functions are thin: pick a middleware, validate with Valibot, call the rules in
  `*.server.ts`. Authorization is checked there. Writes are named mutations, not generic
  CRUD.
- The server returns error codes, keys, dates, and numbers; the client translates and
  formats them.
- Read environment variables only through `src/env.ts`, from server code.
- Comment only where the code is hard to follow without it, and say only what a reader of
  that code needs: why, a constraint, or a contract the code can't show. Don't restate the
  next line, and don't describe earlier versions or the task that added the code; history
  belongs in git. If most of a block needs explaining, simplify the code first.
- When a convention is easy for a later session to lose, enforce it with a lint rule or a
  script check that runs in the pre-commit hook or CI, and name the check next to the
  convention here.
- A lefthook pre-commit hook (`lefthook.yml`) runs the linters and formatters on staged
  files, actionlint on staged workflow files, and the whole-repository checks
  (`imports:check`, `icons:check`, knip) when code is staged. CI checks the whole repository. Disable a
  lint rule inline only with a reason.
- CI is one `check` job in `.github/workflows/ci.yml`, on pull requests and pushes to
  `main`. Its steps: install, compile messages, format check, lint, import areas, icon
  names, type check, knip, test, schema drift, build, and end-to-end tests. A task that
  adds a check adds it as a step there and to the table above; the data model check
  (task 019) joins this way.
- Unused code fails knip. A file only a later task uses goes in `knip.json`'s `ignore`
  with that task named, rather than staying unchecked by accident; shadcn copies in
  `src/components/ui/` are ignored because unused parts of them are normal.

### Checked in review

No tool checks these; reviews do:

- The feature folder layout and its names (`<Name>Page`, `<Name>Pending`).
- Route files that only wire, and `initial<Name>` props.
- Thin server functions, authorization in the rules, and named mutations.
- Error codes, keys, dates, and numbers from the server, formatted by the client.
- Environment variables read only through `src/env.ts`.
- What comments say.

## Deployment

These conventions are **provisional**, drafted from snowtime's Compose deployment; no kit
profile exists for them yet.

- One container image for every environment. Configuration comes only from environment
  variables, logs go to standard output, and the app has a health endpoint.
- No hosting-platform SDKs or services in app code. Deploy files live in
  `deploy/<target>/` (`deploy/compose/` first).
- One app process per SQLite database. Never add a second instance or a worker that writes
  to the same file.
- Migrations run on startup (`MIGRATE_ON_START`) and must be backward compatible: add
  before you remove, and split renames into add, backfill, switch, drop. A migration that
  rewrites a large table runs with the app stopped.
- `DEMO_MODE` and `ALLOWED_LOGIN_DOMAINS` are never on together, and a demo stack and the
  company stack never share a database volume.
- Never run `docker compose down -v` against a deployed stack: it deletes the database.

## Git

- The repository is on GitHub, `AlrikP/snowprofile`; the default branch is `main`.
- Never push, and never create, delete, or change anything on the remote (branches, pull
  requests, settings). The user pushes after reviewing. When a task needs something done
  on GitHub, list it for the user in the review summary.

## Commits

- **Subject:** `<ref>: <summary>` in the imperative mood, at most 72 characters. `<ref>`
  is `task-003` for task 003 in `tasks/`, `task-003.2` for its second subtask, and `iss-3`
  for GitHub issue 3. A commit that belongs to no task has no prefix.
- **Body:** after a blank line, a few lines on the main effort: what changed and what a
  reviewer should know. The task and `docs/` hold the full reasoning.
- **Size:** one commit per task or subtask, small enough to review. If the work outgrows
  one commit, split the task into subtasks first.
- No `Co-Authored-By` or any other trailers.
