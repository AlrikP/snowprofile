# CR-004.1: Sheet participations outside their project

Status: done

The sheet loader reports every participation outside its project's period, except
ongoing work that reads as ending with its project (`review.md`, finding 1).

## Acceptance criteria

- [x] Ongoing work whose project ended before the work started is loaded and reported,
      like other work outside its project's period. Today
      `scripts/sheet-migration/people.ts:232` skips every `ongoing_after_outer_end`, so
      work from 03.2022 to "jätkuv" on a project that ended 06.2021 loads with no report
      line and reads as ongoing (`participationEndDate` keeps the stored end when the
      project ended before the start).
- [x] Ongoing work on a project that ended after the work started still isn't reported.
- [x] The fictional workbook has such a participation, and the
      `sheet-migration.unresolved-project-reported` test expects its report line.

## Outcome

- The loader flags ongoing work when `endsBeforeStart(start, projectEnd)` holds, the
  opposite of the condition under which `participationEndDate` applies the project's end,
  so the report and the reads can't disagree.
- Anna's fictional sheet has a second Projekt1 participation, from 03.2022 to "jätkuv",
  after the project's 02.2022 end. Her Projekt1 work from 05.2020 stays unreported, and
  the test checks both by cell. With the old loader, the test fails.
- `docs/architecture.md`, "From the sheet", narrows the exception to match.
