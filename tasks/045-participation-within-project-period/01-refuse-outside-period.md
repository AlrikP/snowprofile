# 045.1: Refuse a participation period outside the project's

Status: done

The form and the server refuse a participation whose period falls outside its project's
(task 045, decisions 1 and 2).

## Acceptance criteria

- [x] The decisions are recorded in `docs/product.md`, "Participation periods".
- [x] One rule in `src/lib/period.ts`, shared by the form and the server, with unit tests
      for mixed precisions (year, month, day), an ongoing project, and an ongoing
      participation on an ended project.
- [x] The form shows the error under the period's start or end, in Estonian and English.
- [x] `participationValues` refuses with `participation_outside_project`, which the client
      translates.
- [x] The demo seed creates no participation the rule refuses, checked by a seed test.

## Spec changes

- Modified: requirement "Periods" in `docs/specs/project-participation.md`: a
  participation's period must lie within its project's, compared at the coarser
  precision; an ongoing project has no end limit, and a participation can't be ongoing on
  an ended project.
- Added: scenario `project-participation.before-project-start-refused`: given a project
  starting in 03-2024, when a member saves a participation starting in 01-2024, then the
  form says the participation can't start before the project, and the server refuses it.
- Added: scenario `project-participation.after-project-end-refused`: given a project
  ending in 06-2025, when a member saves a participation ending in 09-2025, or ongoing,
  then the form says it can't end after the project, or be ongoing, and the server
  refuses it.
- Added: scenario `project-participation.coarser-date-accepted`: given a project starting
  in 03-2024, when a member saves a participation starting in 2024, then it is saved.

## Outcome

- `outsidePeriod` in `src/lib/period.ts` returns start and end errors in the form's
  `PeriodError` type, so the period input shows them under the date they concern. An
  ongoing participation on an ended project gets its own message, which asks when the
  member finished.
- A blank end with Ongoing unticked already parsed as ongoing, so on an ended project it
  now gets the ongoing error too.
- Until task 045.2, editing an ongoing participation whose project has since ended shows
  that error until the member enters an end; 045.2 opens the form with the project's end
  filled in.
- The demo seed already kept participations within their projects' months; a seed test
  now checks it. The server tests open every seeded project's period first, since seeded
  periods are random.
- Company data from the sheet migration (task 039) wasn't counted, because no copy is
  available locally. Run a query against the company database once it's migrated.
