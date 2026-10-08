# CR-005 review: cr-004 through task 055

Reviewed 2026-10-08. A snapshot of `21fb124`; the subtasks track the fixes.

## Summary

- **Range:** `f99e034..21fb124`, from "Add task cr-004 with fixes from the review of cr-003
  through task 041" (`52e0d5b`) to "task-055: Confirm before Esc or a click outside
  discards changes" (`21fb124`). It holds cr-004.1–.2 and tasks 043, 048, 049, 050, 051,
  052, 053, 054, and 055, plus one commit with no task, "Build the benchmark search and CV
  URLs as repeated keys" (`5481c4e`). It adds one migration,
  `20261008132035_technology_note`.
- **Checks:** all of these pass: `check`, `test` (619 server and 205 component tests),
  `specs:check` (209 scenarios in 19 specs), `db:drift`, `db:verify`, `datamodel:check`,
  `build`, `build:scripts`, `prototypes:build`, `test:e2e` (25 tests), and `perf`.
  `bun install`, `check`, and `test` pass in a clean `git archive` export of `21fb124`.
  `.github/workflows/ci.yml`, `lefthook.yml`, `package.json`, and `bun.lock` are unchanged
  in the range, so they still match `AGENTS.md`. `bun run perf:pages`, which isn't in CI,
  **fails** twice in a row (finding 1).
- **cr-004 verification:** 10 criteria verified, none partly met, regressed, or unmet.
- **Assessment:** the server side of the range is careful. A participation's project can't
  change through the input or the repository, the new repository function has an
  isolation case, the note's links take only `https`, and `db:verify` still refuses an
  edited or missing earlier migration. The gaps are in the shared dialog guard, which
  counts every `type="button"` click as a change, and in a page baseline that task 051
  outgrew without anyone noticing.

Top risks:

1. Task 051 sends every technology's note with the catalogue that the search, CV, profile,
   and project form pages load, though only the technologies page shows notes. The
   committed page baselines no longer hold, and nothing in CI catches it.
2. The discard guard asks "Discard your changes?" when nothing is unsaved: after an
   invitation link is created, and after Delete then Cancel in four edit dialogs. An admin
   who picks "Discard" on a created invitation may believe it was withdrawn.
3. The perf baselines come from macOS and CI runs them on Linux. This review still couldn't
   see a CI run ("Unverified").

## Risk map

| Area                                                                   | Risk   | Why                                                                                                                                                                          |
| ---------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Participation updates (`participations.server.ts`, task 043)           | High   | Participations decide who reads tender details; `updateParticipation` behind `scopeMiddleware` and the ownership check, now without a project                                |
| Technology notes (`technologies.*`, migration, `LinkedText`, task 051) | High   | New column and migration; new `setTechnologyNote` repository function; user text rendered as links; `updateTechnology` and `mergeTechnology` behind `technology: ['curate']` |
| Startup verification (`scripts/db-verify.ts`, task 052)                | High   | Loosens the refusal of a missing applied migration; runs before the app listens                                                                                              |
| Search params (`src/lib/search-params.ts`, `router.tsx`, task 048)     | High   | Every route's search, the sign-in `redirect`, and the CV download link (`/api/cv-document`) go through it                                                                    |
| Sheet loader report (`scripts/sheet-migration/people.ts`, cr-004.1)    | High   | Real personal data; a narrow change to which participations are reported                                                                                                     |
| Dialog guard (`src/components/ui/dialog.tsx`, task 055)                | Medium | Shared by 18 dialogs; intercepts Esc and outside clicks                                                                                                                      |
| Pickers and `useCombobox` (task 049)                                   | Medium | One hook behind the technology, role, and person pickers on 6 pages                                                                                                          |
| Code splitting (`vite.config.ts`, task 053)                            | Medium | Changes which chunk every route's page and pending component load from                                                                                                       |
| Demo seed reset (`src/db/seed.ts`)                                     | Medium | Now deletes `technology_distinct_pair` rows on reset; the fix rode along in task 051's commit                                                                                |
| Projects page and summary row (tasks 050, 054)                         | Low    | Client-only; the summary reads `getProject`, which already applies the visibility rule                                                                                       |
| Perf baselines and `perf/lib/inputs.ts`                                | Low    | Baselines only; checked by running `perf` and `perf:pages`                                                                                                                   |
| i18n                                                                   | Low    | 12 new messages per locale; keys in sync                                                                                                                                     |
| Dependencies                                                           | Low    | None added; `package.json` and `bun.lock` unchanged                                                                                                                          |

Removed code: `projectId` from `UpdateParticipationInput` and the repository's update
(task 043); the project descriptions from `listProjects` (task 054, nothing read them);
`Badge` in the project rows (task 054); the perf harness's JSON URL helper (`5481c4e`,
replaced by `stringifySearch`). Two test lines that set `descriptionEt` and `descriptionEn`
went with the descriptions, and two assertions that parsed JSON search params now read
repeated keys. No scope condition, permission check, or demo refusal was removed, no test
was skipped, and no inline lint disable was added. No new environment variables.

## cr-004 verification

| Criterion                                                                                | Result   | Evidence                                                                                                                                    |
| ---------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1: ongoing work that starts after its project ended is loaded and reported               | Verified | `people.ts:233` flags `ongoing_after_outer_end` when `endsBeforeStart(start, projectEnd)`; `sheet-migrate.test.ts:408` expects the F14 line |
| 1: ongoing work on a project that ended after the work started isn't reported            | Verified | `sheet-migrate.test.ts:411` expects no B14 line                                                                                             |
| 1: the fictional workbook has such a participation, and the test expects its line        | Verified | `fixture.ts:105` (column F); `read.test.ts:124`                                                                                             |
| 2: a component test opens a participation read with its project's end                    | Verified | `profile-page.test.tsx:500`: Ongoing unticked, end 06-2025, and the save sends it                                                           |
| 2: `architecture.md` gives the test's number of intended pairs                           | Verified | `docs/architecture.md:213` says 22; `INTENDED` in `technology-duplicates.test.ts` has 22                                                    |
| 2: `architecture.md` lists `perf/` in the layout and among the places that build queries | Verified | `docs/architecture.md:67`, `:318`                                                                                                           |
| 2: `cv-selection.md`'s intro names roles and characteristics                             | Verified | `docs/specs/cv-selection.md:4`                                                                                                              |
| 2: task 048 lists `r` and drops the 046.2 note                                           | Verified | `tasks/000-archive/048-url-search-params.md:26`                                                                                             |
| 2: task 042's README has the criterion and Outcome                                       | Verified | `tasks/000-archive/042-technology-duplicate-suggestions/README.md:36`, `:38`                                                                |
| All subtasks are done                                                                    | Verified | Both subtask files say `Status: done`                                                                                                       |

cr-004's doc drift went to subtask 2, and its follow-up, task 054, is done. cr-004 is
archived in `tasks/000-archive/cr-004-review-cr003-041/`. Its two "Unverified" items stayed
in its Outcome only: CI's `bun run perf` on Linux is still unverified (below), and task
039's rehearsal criterion doesn't ask for the real sheet's negative characteristic answers
(finding 4).

## Findings

### 1. `perf:pages` fails: the search and CV pages carry every technology note

- **Severity:** high (a failing check; it runs only locally, so nothing caught it)
- **Area:** 10. Tests, and 13. Design; task 051
- **Location:** `src/server/technologies/technologies.repository.server.ts:84`,
  `perf/baselines/pages.json:17`, `:24`
- **What's wrong:** `listTechnologies` now returns `note` to every caller of the catalogue.
  The search, CV, profile, and project form routes load the catalogue for their pickers,
  which never show notes (task 051: "Pickers don't show it"). The baseline was last updated
  by task 050, and task 051 didn't update it or say why the pages grew.
- **Failure scenario:** `bun run perf:pages` on `21fb124` fails on four numbers, the same in
  two runs:

  ```
  search htmlBytes grew: 39296 to 41852
  search htmlGzip grew: 8764 to 9997
  cv (team of 10) htmlBytes grew: 56373 to 58929
  cv (team of 10) htmlGzip grew: 10862 to 12094
  ```

  Both pages grew by the same 2,556 bytes; the 37 demo notes come to about 2,970 bytes as
  JSON. The projects and project pages, which don't load the catalogue, didn't change.
  With the real catalogue, notes of up to 1,000 characters each go to every page with a
  picker. **Confirmed** (failure); the attribution to the notes is **traced**.

- **Suggested fix:** decide whether pickers need notes. If not, leave `note` out of the
  catalogue query the pickers use and read it only for the technologies page; if so,
  update `pages.json` with `--update` and give the reason in the commit.

### 2. The discard guard asks about changes that were saved or never made

- **Severity:** medium (a ticked task 055 criterion that is partly unmet)
- **Area:** 7. Frontend; task 055
- **Location:** `src/components/ui/dialog.tsx:57`; `src/features/members/invite-dialog.tsx:115`;
  `src/features/profile/participation-dialog.tsx:331`, `education-dialog.tsx:185`,
  `own-project-dialog.tsx:319`, `src/features/projects/contact-dialog.tsx:199`
- **What's wrong:** `markChanged` counts every click on a `button[type="button"]` and every
  `input` event as a change, and nothing clears it. Task 055's first criterion says Esc
  closes a dialog at once while nothing has changed.
- **Failure scenarios:**
  - An admin types an address, creates the invitation, and presses Esc on the link view.
    The dialog asks "Discard your changes?" with "What you changed in this dialog will be
    lost." The invitation is already saved, and "Discard" leaves it pending, so the admin
    may think they withdrew it. Clicking "Copy" alone also counts as a change.
  - A member opens a saved participation, clicks Delete, then Cancel, and presses Esc with
    nothing changed. The dialog asks to discard. The education, own project, and contact
    dialogs have the same Delete and back flow.

  **Confirmed** with two component tests in a scratch copy of `21fb124`: after
  `members-and-roles.invite-link`'s steps plus Esc, and after Edit, Delete, Cancel, and Esc
  in `profile-page.test.tsx`, an `alertdialog` "Discard your changes?" is shown.

- **Suggested fix:** count only changes to the form's values, for example by letting a
  dialog mark its state clean (after a save that keeps it open, and when it switches back
  from a confirmation view), and by not counting buttons that change no value.

### 3. The `own-copy` scenario still lets a member pick another project, and its test passes without doing it

- **Severity:** low (doc drift and a vacuous test)
- **Area:** 1. Acceptance criteria and specs; task 043
- **Location:** `docs/specs/project-participation.md:139`,
  `src/features/profile/profile-page.test.tsx:627`
- **What's wrong:** task 043 made a saved participation's project read-only, but
  `project-participation.own-copy` still says "or the member picks another project for
  the participation". The component test that cites it calls `selectOptions` on the
  now-disabled select, which changes nothing, so the list trivially keeps React.
- **Failure scenario:** the test passes whatever the form does with a project change.
  **Confirmed** in a scratch copy: after the same `selectOptions(select, 'tax')`, the
  select is disabled and its value is still the original project.
- **Suggested fix:** drop the project half of the scenario, and remove the component test
  or make it check the admin half; the server test at `participations.test.ts:396` already
  covers project changes.

### 4. Smaller doc and plan gaps

- **Severity:** low
- **Area:** 9. Conventions and 12. Planning; tasks 049, 050, 051, 055, and cr-004
- **Items** (each **traced**):
  - `docs/specs/cv-selection.md:39` says the empty people field "suggests everyone it
    offers"; `person-picker.tsx:42` shows the first 8. An organization with more than 8
    current people sees only the first 8 by name.
  - `LinkedText` sits in `src/components/` with one caller,
    `src/features/technologies/technologies-page.tsx`. `AGENTS.md` moves code there only
    once a second feature needs it.
  - `docs/architecture.md:55` says `ui/` holds shadcn copies only; `ui/dialog.tsx` now
    holds the app's discard guard and its own tests. A `shadcn add dialog --overwrite`
    would replace it (the tests would then fail).
  - Task 054's ticked criterion says the projects page met its target of under 1,000 DOM
    nodes (968). After task 050 the baseline is 1,021 (`perf/baselines/pages.json:7`).
    Task 050's Outcome notes it, but neither task records the user accepting it.
  - cr-004 left the real sheet's negative characteristic answers ("Puudub" read as yes) to
    task 039's rehearsal, but `tasks/039-sheet-migration/README.md:28` doesn't ask for
    them.
- **Suggested fix:** correct the spec sentence, move `LinkedText` into the technologies
  feature, note the guard in the layout table, record a decision on 1,021 nodes, and add a
  criterion to task 039.

## Doc drift

- `docs/specs/project-participation.md:139` (finding 3): the spec is wrong; the code
  follows task 043.
- `docs/specs/cv-selection.md:39` (finding 4): the spec overstates; the code follows task
  049's decision of 8 at most.
- `docs/architecture.md:55` (finding 4): the doc is behind the code.

## Open manual checks

None. Every task in the range is done with its criteria ticked. Tasks 049, 050, and 055
weren't tried with a screen reader, as their Outcomes say.

## Outside the range

None.

## Unverified

- CI's `bun run perf` on Linux, against baselines recorded on macOS (carried from cr-004).
  The GitHub plugin failed to connect and `gh` isn't installed, so this review saw no CI
  run. A green `check` job on `21fb124` would confirm it.

## Coverage

- `perf:pages` was run in addition to the skill's checks; `perf:load` wasn't.
- The dialog guard was checked in jsdom and through the e2e test, not in a browser by hand.
  Click-outside handling for the other 17 dialogs was read, not run.
- No screen reader was used.

## Follow-up tasks

None. Every finding fits a cr-005 subtask.
