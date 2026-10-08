# CR-004 review: cr-003 through task 041

Reviewed 2026-10-08. A snapshot of `f99e034`; the subtasks track the fixes.

## Summary

- **Range:** `d1cf192..f99e034`, from "Add task cr-003 with fixes from the review of
  cr-002 through task 039" (`4f00536`) to "Archive the done tasks" (`f99e034`). It holds
  cr-003.1–.4 and tasks 024, 037 and 038 (manual checks), 039.3–.4, 040, 041.1–.5,
  042.1–.2, 044, 045.1–.2, and 046.1–.3. It also holds plans 043 and 048–053. It adds one
  migration, `20261007141237_technology_distinct_pair`.
- **Checks:** all of these pass: `check`, `test` (598 server and 190 component tests),
  `specs:check` (199 scenarios in 19 specs), `db:drift`, `db:verify`, `datamodel:check`,
  `build`, `build:scripts`, `prototypes:build`, `test:e2e` (22 tests), and `perf`.
  `bun install`, `check`, and `test` pass in a clean `git archive` export of `f99e034`.
  `.github/workflows/ci.yml`, `lefthook.yml`, and the "Running things" table match
  `AGENTS.md` and `package.json`.
- **cr-003 verification:** 14 criteria verified, none partly met, regressed, or unmet.
- **Assessment:** the new work is careful. Search and CV selection share one matching
  rule, scoped by organization, with isolation cases for every new repository function.
  The closed plugin endpoints hold against path variants. The period rule is one function
  shared by the form, the server, and the sheet loader. The one real gap is in the sheet
  loader's report, which matters for task 039's rehearsal on the real sheet.

Top risks:

1. The sheet loader doesn't report ongoing work that starts after its project ended. Such
   work then reads as ongoing on the profile and in CVs.
2. The perf baselines come from macOS, and CI runs them on Linux. This review couldn't
   confirm that CI passes since task 041.2 ("Unverified").
3. The sheet's characteristic answers read as yes unless they start with "Ei" or "No". The
   report never lists an answer, so a negative word such as "Puudub" would mark the
   project as having the characteristic without anyone seeing it ("Unverified").

## Risk map

| Area                                                                       | Risk   | Why                                                                                                                                                                            |
| -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Better Auth `disabledPaths` (`sign-in.server.ts`, `better-auth.server.ts`) | High   | cr-003.1 closes every plugin endpoint but `set-active`, using a list built from the plugin; every HTTP request passes through it                                               |
| Search and CV read (`search.server.ts`, `search.repository.server.ts`)     | High   | New `EXISTS` filters for roles and characteristics; `matchingWork` shared with `cvs.server.ts`; client ID lists; `scopeMiddleware`, `profile: ['readAll']`, `cv: ['generate']` |
| Participation periods (`src/lib/period.ts`, `participationEndDate`)        | High   | One rule for the form, the server, and the sheet loader; a SQL `CASE` used by four repositories                                                                                |
| `technology_distinct_pair` and `markNotDuplicate`                          | High   | New migration with composite keys; new named mutation behind `technology: ['curate']`                                                                                          |
| Sheet migration loaders (`scripts/sheet-migration/`)                       | High   | Writes real personal data outside a request as `SYSTEM_USER_ID`; creates users and invitations; re-runs must add nothing twice                                                 |
| Demo mode                                                                  | Medium | No new refusals needed: `markNotDuplicate` is an admin write like the others task 021 covers                                                                                   |
| CI image steps and the deploy workflow                                     | Medium | Pushes images with `packages: write`; the smoke test runs the bundled seeder                                                                                                   |
| `perf/` harnesses                                                          | Medium | Import server and database modules (`.oxlintrc.json` override); start a production server in demo mode; run in CI                                                              |
| Shared components (`technology-picker`, `role-picker`, `criteria-filter`)  | Medium | `canAdd` on 5 pickers; search and CV pickers must never add to a catalogue                                                                                                     |
| Frontend pages (search, CV, technologies, participation dialog)            | Low    | Reviewed through component tests and the diff                                                                                                                                  |
| i18n                                                                       | Low    | 31 new or changed messages per locale; keys in sync                                                                                                                            |
| Dependencies                                                               | Low    | None added; `bun.lock` unchanged                                                                                                                                               |

Removed code: `replacedPaths` in `sign-in.server.ts` (replaced by the plugin's full list,
cr-003.1); the technology check in `cvs.server.ts` (replaced by `matchingWork`, task
046.3); and the dotted-month zero padding in `parse.ts` (cr-003.2). Removed test titles
are renames that cite scenario IDs (task 040), and one test cr-003.2 removed on purpose.
No scope condition, permission check, or demo refusal was removed, and no test was
skipped. Two inline disables, both with a reason, are in `perf/lib/clock.ts`. No new
environment variables reach app code. `PERF_NOW` is read only by the perf preload.

## cr-003 verification

| Criterion                                                                          | Result   | Evidence                                                                                                                           |
| ---------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1: every `/organization/*` endpoint but `set-active` returns 404, list from plugin | Verified | `sign-in.server.ts:48`, `better-auth.server.ts:30`; a probe got 404 for trailing slashes, `//`, `./`, `%2D`, and case variants too |
| 1: the test checks every closed path and that `set-active` works                   | Verified | `better-auth.test.ts:181` sends every path as admin and employee; passes                                                           |
| 1: `docs/architecture.md`, "Roles", says only `set-active` stays open              | Verified | `docs/architecture.md:366`                                                                                                         |
| 2: short and future years go to the report; tests cover `03.21`, `03.20`, `10.202` | Verified | `parse.ts:32`, `:58`; `parse.test.ts:51`                                                                                           |
| 2: `.gitignore` ignores `*.xlsx` and `*.docx`                                      | Verified | `.gitignore`; no such file anywhere in the history                                                                                 |
| 3: a failed loader shows a translated message in the frame                         | Verified | `router.tsx:17` sets `RouteError`; `route-error.test.tsx` passes                                                                   |
| 3: the invite placeholder and period hint come from `messages/`                    | Verified | `invite-dialog.tsx:137`, `period-filter.tsx:41`                                                                                    |
| 3: the invitation copy button says when the clipboard refuses                      | Verified | `invite-dialog.tsx:54`; `members-page.test.tsx` covers it                                                                          |
| 4: `build:scripts` names the organization script                                   | Verified | `docs/architecture.md`, "Environments and deployment", names all four scripts                                                      |
| 4: task 040 extends `organizations.md`                                             | Verified | `tasks/000-archive/040-specs-for-built-capabilities.md:13`                                                                         |
| 4: `docs/product.md` says "Infrastructure"                                         | Verified | `docs/product.md:39`                                                                                                               |
| 4: task 043 records the tender details decision                                    | Verified | `tasks/043-tender-details-for-participants.md`, with the three options                                                             |
| 4: cr-002 is archived                                                              | Verified | `tasks/000-archive/cr-002-review-cr001-026/`                                                                                       |
| All subtasks are done                                                              | Verified | All four subtask files say `Status: done`                                                                                          |

cr-003's doc drift went to subtask 4, finding 2 went to task 043, and the review proposed
no other follow-up. cr-003 is archived in `tasks/000-archive/cr-003-review-cr002-039/`.

## Findings

### 1. Ongoing work that starts after its project ended isn't reported

- **Severity:** medium
- **Area:** Database, migrations, and queries (scripts); task 039.4
- **Location:** `scripts/sheet-migration/people.ts:232`
- **What's wrong:** the loader flags a participation outside its project's period unless
  `outsidePeriod` returns `ongoing_after_outer_end`, on the grounds that ongoing work on
  an ended project reads as ending with it. That holds only when the project ended after
  the work started. `participationEndDate`
  (`src/server/profiles/participations.repository.server.ts:20`) leaves the stored values
  unchanged when the project ended before the participation's start. So such work loads
  as ongoing, with no report line. `docs/architecture.md`, "From the sheet", and
  `sheet-migration.unresolved-project-reported` require work outside its project's period
  to be reported. Task 039.4's ticked criterion makes the exception only for work that
  "reads as ending with it".
- **Failure scenario:** an employee sheet names Projekt7, which ran from 01.2020 to
  06.2021, from 03.2022 to "jätkuv". The migration loads it. The report says nothing, and
  the person's profile and CV show "03-2022 – ongoing" on a project that ended in 2021.
  When the person edits the participation, the form refuses to save it as ongoing.
- **Evidence (confirmed):** a scratch test in a `git archive` export called `loadPeople`
  with that participation on a project ending `2021-06`. It printed
  `report entries: []`, and `listParticipations` read it back as
  `{"start":"2022-03","end":null}`.
- **Suggested fix:** also flag ongoing work whose project ended before it started
  (`endsBeforeStart(work.period.startDate, onProject.endDate)`). Then add that case to the
  fixture and to the `sheet-migration.unresolved-project-reported` test.

### 2. The test for `ongoing-ends-with-project` doesn't open the edit form

- **Severity:** low
- **Area:** Tests; task 045.2
- **Location:** `src/server/profiles/participations.test.ts:243`
- **What's wrong:** `project-participation.ongoing-ends-with-project` says the
  participation's "edit form opens with that end". The only test citing it is a server
  test of the profile, project page, and CV reads. No component test opens the form for a
  participation whose read end differs from its stored one, so a change to
  `periodInputValue` or to the dialog's initial values could reopen it as ongoing. The
  form would then refuse to save it, and nothing would fail.
- **Failure scenario:** a later change starts the dialog from the stored participation
  instead of the profile read. The form opens with Ongoing ticked on an ended project and
  shows the ongoing error, and every check still passes.
- **Evidence (traced):** `grep -rn ongoing-ends-with-project src e2e` finds only
  `participations.test.ts:243` and `search.test.ts:249`. `profile-page.test.tsx` has no
  case that edits a participation with an effective end.
- **Suggested fix:** add a component test, citing the scenario, that opens the edit dialog
  for a participation read with the project's end. It checks that Ongoing is unticked and
  the end is filled in.

## Doc drift

- `docs/architecture.md:212` and `:215`, "Technology duplicates", say the rule finds "all
  25 intended pairs" and that `technology-duplicates.test.ts` keeps the list. The test's
  `INTENDED` list has 22 pairs (`src/lib/technology-duplicates.test.ts:9`), as task
  042.1's Outcome says. Task 042's decision 2 also says 25. Either the doc or the test is
  behind. The test holds what was checked, so the doc looks wrong, unless three pairs
  were dropped from the test by mistake.
- `docs/architecture.md`, "Repository layout" (`:49`), has no row for `perf/`.
  "Application rules" (`:316`) names `src/db/`, `scripts/`, tests, and Better Auth's
  adapter as the only places that build queries, but `AGENTS.md` and `.oxlintrc.json`
  allow `perf/` too (task 041.1). The architecture doc is behind.
- `docs/specs/cv-selection.md:4` says a CV includes all projects "or only those matching
  technologies and a period". Since task 046.3 it also filters by roles and
  characteristics, as "Projects to include" says. The intro is behind.
- `tasks/048-url-search-params.md:27` says "task 046.2 adds roles" and lists the search
  keys without `r`. Task 046.2 is done and `r` is in `src/lib/search-filters.ts`. The
  open task is behind.
- `tasks/000-archive/042-technology-duplicate-suggestions/README.md` has no acceptance
  criteria and no Outcome section, unlike the other parent tasks (041, 045, 046) and the
  format in `tasks/README.md`.

## Open manual checks

- Task 039: the rehearsal on a copy of the real sheet, against a local Compose stack, run
  twice; the Outcome records the report's size. Finding 1 changes what that report shows,
  so fix it first. Task 045.1's Outcome also asks for a count of the company's
  participations outside their projects' periods once the sheet is loaded.

## Outside the range

None found.

## Unverified

- **CI's `bun run perf` on Linux.** Task 041.2's Outcome says the macOS baselines might
  not match Linux, and that a mismatch needs a fix before 041.3. No later Outcome records
  a CI run with the perf step, and `gh` isn't installed here, so this review couldn't
  read the Actions history. To confirm, check that the CI run for `f99e034` (or any
  commit after `46db5e3`) passed its "Performance budgets" step.
- **Negative characteristic answers.** `readAnswer` (`scripts/sheet-migration/projects.ts:57`)
  reads any answer as yes unless it starts with "Ei" or "No", as `docs/architecture.md`
  records. A negative word that doesn't start with either, such as "Puudub" or "None", reads
  as yes, and the report lists no answers. To confirm, list the distinct answer cells of
  the real sheet during the task 039 rehearsal.

## Coverage

- Frontend changes were reviewed through component tests and the diff, not in a browser.
  Phone width, keyboard use in the role and characteristic filters, and the possible
  duplicates list weren't checked by hand.
- `perf:pages` and `perf:load` weren't run; only `bun run perf`, which CI runs, was.
- The bundled `sheet-migrate.js` and `org-create.js` were run from a build of the export
  on a scratch database with the fictional workbook, and loaded it as the tests do. CI's
  smoke test runs only the bundled seeder.
- The CI image steps and the "Compose deploy" workflow were read, not run. Task 024's
  Outcome records both passing on GitHub.
- Plans reviewed: 043 and 048–053. Only 048 disagrees with the code (doc drift above).

## Follow-up tasks

- `054-projects-list-size.md`: the projects page renders every project. At the
  benchmark's 300 projects that is 1.25 MB of HTML, 4,717 DOM nodes, and three times the
  server CPU of the other pages (task 041.4 and 041.5), and task 041's Outcome says it has
  no task yet. Decide between pagination, a lighter list query, and rendering fewer rows
  at once, together with task 050's changes to the same page.

Findings 1 and 2 and the doc drift go to cr-004's subtasks.
