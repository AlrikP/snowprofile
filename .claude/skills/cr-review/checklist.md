# Review areas

The areas section 6 of the review goes through. Areas 2 through 6 start as high risk
in the risk map; the triage can raise any other area.

## 1. Acceptance criteria and specs

- For each ticked criterion in the tasks in the range, find the code or test that meets
  it. Flag criteria that are ticked but unmet, or only partly met.
- For each task with a "Spec changes" section, check that the spec in `docs/specs/`
  matches it.
- Check that the tests citing each scenario ID actually check the behavior the scenario
  describes. A test that only mentions an ID doesn't count.
- New capabilities without a spec: is there a task for them?

## 2. Tenancy and authorization

- Every database read and write goes through a repository that scopes by
  `scope.organizationId`, or by the session's user ID for the user's own account data
  (`docs/architecture.md`, "Tenancy" and "Application rules").
- Every new repository has isolation cases in `src/server/tenancy.test.ts`.
- IDs from the client: every ID a user picks or a URL carries (records, people, catalogue
  entries, invitations) is checked against the organization before use, including IDs
  nested in a payload or a list.
- Joins: a join can't reach a row from another organization, even when the outer table
  is scoped.
- Server functions and server routes use the right middleware, and check the role in the
  rules (`*.server.ts`), not only in the UI. Server routes under `src/routes/api/` don't
  pass through server-function middleware: check that each one does the same session,
  organization, and permission checks itself.
- Compare `src/lib/permissions.ts` with the specs: what an employee can do to someone
  else's data, who can change roles, and whether the last admin can be demoted or
  removed.

## 3. Authentication, sessions, and demo mode

- Changes to Better Auth, sessions, the app frame's signed-in guard, and the health
  endpoint. Is anything newly reachable without a session?
- Flows that start before sign-in (invitations, links in email): guessable or reusable
  IDs, expiry, accepting into the wrong organization or with another email.
- Demo mode still refuses everything earlier reviews made it refuse (search the cr-
  tasks for `DEMO_MODE` and `demo`), and new writes that affect other visitors are
  refused too.

## 4. Database, migrations, and queries

- New migrations follow `docs/migrations.md`: SQL conventions, tenant references, audit
  columns, backward compatibility, add before remove, and renames split into add,
  backfill, switch, and drop. Backfills are correct for existing rows.
- `src/db/schema.ts`, `drizzle/`, and `datamodel/snowprofile.dbml` agree.
- Indexes on tenant and foreign keys. Uniqueness rules, and whether matching is
  case-insensitive where the spec says so.
- Queries: soft-deleted and leaver rows left out where the specs say so, multi-row
  writes in a transaction, audit columns set, period and date filters correct at the
  boundaries (open-ended periods, same-month start and end), `LIKE` patterns escaped,
  and no N+1 queries on list and search pages.
- Scripts that write outside a request (`scripts/`) scope and validate what they write,
  and are idempotent where their task says so.

## 5. Deployment and scripts

- Against `AGENTS.md`, "Deployment", and `docs/deployment.md`: one image, configuration
  only from environment variables, logs to standard output, one writer per SQLite file,
  no hosting-platform SDKs, `DEMO_MODE` and `ALLOWED_LOGIN_DOMAINS` never on together,
  and data volumes that survive a redeploy.
- Startup fails before listening when a migration fails.
- The image runs as non-root and leaves secrets and `.env.local` out.
- Every script `build:scripts` bundles runs in the image as `docs/deployment.md` says.

## 6. Input, output, and personal data

- Injection: SQL built from strings, HTML built from user text
  (`dangerouslySetInnerHTML`, generated HTML for the clipboard or documents), file names
  in `Content-Disposition` headers, and redirects to a URL from the request.
- Uploaded or imported files (spreadsheets, documents): unexpected cell types, formulas,
  oversized or zip-bomb files, and paths taken from file content.
- Personal data stays out of logs, error responses, and test fixtures. Real data files,
  names, and exports are not in git: search the history, not only the end commit.
- Error responses carry codes and keys, not stack traces or SQL.

## 7. Frontend

- Accessibility: labels, keyboard use, focus trapping and return in dialogs, and error
  messages tied to their fields.
- Loading, empty, and error states, and a `<Name>Pending` component for each page whose
  loader waits on the server.
- The client formats dates and numbers and translates error codes; the server sends none
  of it pre-formatted.
- Behavior at phone width, bilingual content falling back to the other language as the
  spec says, filters that round-trip through the URL, and clipboard or download failures
  handled.

## 8. i18n

- New `et` and `en` messages are present and in sync, plurals are handled, and no
  user-facing text is hard-coded in components, generated documents, or copied text.
- Locale handling is unchanged from task 010, or the change is recorded in `docs/`.

## 9. Conventions

- `AGENTS.md`, "Code conventions", including "Checked in review": feature layout and
  names (`<Name>Page`, `<Name>Pending`), route files that only wire, `initial<Name>`
  props, `*.server.ts` never imported from client code, `#/` vs relative imports,
  `function` declarations, `Icon` suffixes, environment access only through
  `src/env.ts`, comment quality, and inline lint disables without a reason.
- Code moved to `src/lib/` or `src/components/` serves at least two features.
- Do the checks catch what they claim? Try a violation of each, in your head, against the
  rule's config (`.oxlintrc.json`, `scripts/*-check.ts`), and say whether it would fail.

## 10. Tests

- Tests cover behavior that matters: scoping, auth and role denials, demo refusals,
  input validation edge cases, and boundaries, not only the happy path. Name important
  untested paths.
- Component tests use the DOM as a user would.
- The e2e smoke test runs against the production build with a fresh database, and
  reaches the new pages.
- Tests are isolated and not flaky: time, ordering (`test:server` runs in random order),
  and shared state.

## 11. Dependencies

- New dependencies are pinned to exact versions, work with `ignore-scripts`, and sit in
  `dependencies` or `devDependencies` by where they run.
- License, maintenance, and size. A server-only library doesn't end up in the client
  bundle.
- `bun.lock` changes match the `package.json` changes.

## 12. Planning

- Open task files agree with `docs/product.md`, the specs, and each other.
- They don't settle questions `docs/` lists as open.

## 13. Design and general quality

- The change fits `docs/architecture.md`, or updates it. Code sits in the layer and
  folder the conventions name.
- Bugs, error handling, race conditions (concurrent edits, double submits, accepting a
  link twice), dead code, duplication, and complexity a simpler design would remove.
