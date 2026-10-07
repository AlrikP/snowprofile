# 040: Specs for built capabilities

Status: todo

Three MVP scope rows were built before behavior specs existed and have no spec, or only
part of one: Organizations (tasks 006 and 009), whose spec task 039.1 started with
creating organizations, UI languages (task 010), and Demo data (task 008).
Write their specs from the behavior on `main`, as task 023 did for sign-in, and cite each
scenario from an existing test, adding a test only where none checks it.

## Acceptance criteria

- [ ] `docs/specs/organizations.md`, extended: data isolation between organizations, the URL's
      organization slug, switching organizations, and a slug the user isn't a member of.
- [ ] `docs/specs/ui-languages.md`: switching the language, the choice kept on the user
      and in a cookie, and the default before a choice.
- [ ] `docs/specs/demo-data.md`: the seeder adds only missing demo organizations,
      `--reset <slug>` redoes one, and it refuses outside demo mode, on a non-local
      database, and on a database with a non-demo organization.
- [ ] `docs/architecture.md` links to the specs where it describes the same behavior,
      instead of repeating it.
- [ ] `bun run specs:check` passes.

## Spec changes

- Added: `docs/specs/ui-languages.md` and `docs/specs/demo-data.md`, with scenario IDs
  settled in the task from the existing tests.
- Modified: `docs/specs/organizations.md` gains the requirements above, next to task
  039.1's requirement on creating organizations.
