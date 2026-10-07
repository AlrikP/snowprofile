# 040: Specs for built capabilities

Status: done

Three MVP scope rows were built before behavior specs existed and have no spec, or only
part of one: Organizations (tasks 006 and 009), whose spec task 039.1 started with
creating organizations, UI languages (task 010), and Demo data (task 008).
Write their specs from the behavior on `main`, as task 023 did for sign-in, and cite each
scenario from an existing test, adding a test only where none checks it.

## Acceptance criteria

- [x] `docs/specs/organizations.md`, extended: data isolation between organizations, the URL's
      organization slug, switching organizations, and a slug the user isn't a member of.
- [x] `docs/specs/ui-languages.md`: switching the language, the choice kept on the user
      and in a cookie, and the default before a choice.
- [x] `docs/specs/demo-data.md`: the seeder adds only missing demo organizations,
      `--reset <slug>` redoes one, and it refuses outside demo mode, on a non-local
      database, and on a database with a non-demo organization.
- [x] `docs/architecture.md` links to the specs where it describes the same behavior,
      instead of repeating it.
- [x] `bun run specs:check` passes.

## Spec changes

- Added: `docs/specs/ui-languages.md` and `docs/specs/demo-data.md`, with scenario IDs
  settled in the task from the existing tests.
- Modified: `docs/specs/organizations.md` gains the requirements above, next to task
  039.1's requirement on creating organizations.

## Outcome

- Scenario IDs, each cited by an existing test renamed to start with it:
  - `organizations.md`: `isolated` (every case in `tenancy.test.ts`), `non-member-refused`
    (`middleware.test.ts`), `switched` (e2e), `single-no-switch` (app frame).
  - `ui-languages.md`: `switched` (`account.test.ts`), `save-failed` (language switch),
    `follows-user` (`auth.functions.test.ts`).
  - `demo-data.md`: `repeatable`, `fictional`, `missing-added`, `changes-kept`,
    `reset-one`, `reset-refused-real` (`src/db/seed.test.ts`), and `refused-outside-demo`,
    `refused-remote`, `refused-real-organization` (`scripts/db-seed.test.ts`).
- Two scenarios had no test, so this task added them: `organizations.other-slug-redirected`
  (e2e, an admin opening `/tormilind/profile`) and `ui-languages.browser-default`
  (Paraglide's `extractLocaleFromRequest` with and without an `Accept-Language` header and
  the cookie).
- `demo-data.reset-refused-real` says only that `--reset` refuses a slug that isn't a demo
  organization's; the test doesn't check that an existing one stays unchanged.
- `docs/architecture.md` now links to the three specs in "Tenancy", "Sign-in modes", and
  the stack table, and keeps only the reasons there. It also names the sheet migration
  among the bundled scripts, which task 039.3 left out.
