# 045: Check a participation's period against the project's

Status: todo

Neither the participation form nor the server compares a participation's period with its
project's. A member can save a participation on a project that ran 2022–2023 with the
period 2019–2025, and the CV then shows it. `participationValues` in
`src/server/profiles/participations.server.ts` checks that the project, roles, and
technologies are live, but not the dates.

Task 044 shows the project's period in the form; it helps whichever option is chosen here.

## Open questions

The rule needs a decision before the work starts:

1. **Refuse or warn.** A hard refusal keeps CVs consistent. A warning that still saves
   allows real cases the project's dates don't cover, such as pre-sales work before the
   start or warranty work after the end, and project dates an admin entered wrong.
2. **Existing participations.** The sheet migration (task 039) and the demo seed may hold
   participations outside their project's period. With a hard refusal, the member can't
   save any change to such a participation until they fix the dates.
3. **Admin changes the project's period.** With a hard refusal, should the server refuse
   a project period that leaves existing participations outside it, or accept it and let
   them stand?

Proposed: refuse on the server and in the form, comparing at each date's own precision
the way `endsBeforeStart` in `src/lib/period.ts` does (a 2024 start fits a 2024-03
project start). Accept an admin's project period change and leave existing participations
as they are; list participations outside the project's period with `sheet:report` or a
one-off query, so they can be fixed by hand.

## Acceptance criteria

- [ ] The decision on the open questions is recorded in `docs/product.md`, "Project
      participation".
- [ ] The rule lives in `src/lib/period.ts`, shared by the form and the server, with unit
      tests for mixed precisions (year, month, day) and an ongoing project or
      participation.
- [ ] The form shows the error (or warning) under the period input, in Estonian and
      English.
- [ ] If the rule refuses, `participationValues` refuses with an error code the client
      translates, and the seed creates no participation the rule refuses.
- [ ] The existing data that breaks the rule is counted and listed in the task's Outcome.

## Spec changes

Written against the proposal; adjust once the open questions are decided.

- Modified: requirement "Periods" in `docs/specs/project-participation.md`: a
  participation's period must lie within its project's, compared at each date's
  precision; an ongoing project has no end limit.
- Added: scenario `project-participation.before-project-start-refused`: given a project
  starting in 03-2024, when a member saves a participation starting in 01-2024, then the
  form says the participation can't start before the project, and the server refuses it.
- Added: scenario `project-participation.after-project-end-refused`: given a project
  ending in 06-2025, when a member saves a participation ending in 09-2025, or ongoing,
  then the form says the participation can't end after the project, and the server
  refuses it.
- Added: scenario `project-participation.coarser-date-accepted`: given a project starting
  in 03-2024, when a member saves a participation starting in 2024, then it is saved.
