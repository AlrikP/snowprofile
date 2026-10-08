# CR-004.1: Sheet participations outside their project

Status: todo

The sheet loader reports every participation outside its project's period, except
ongoing work that reads as ending with its project (`review.md`, finding 1).

## Acceptance criteria

- [ ] Ongoing work whose project ended before the work started is loaded and reported,
      like other work outside its project's period. Today
      `scripts/sheet-migration/people.ts:232` skips every `ongoing_after_outer_end`, so
      work from 03.2022 to "jätkuv" on a project that ended 06.2021 loads with no report
      line and reads as ongoing (`participationEndDate` keeps the stored end when the
      project ended before the start).
- [ ] Ongoing work on a project that ended after the work started still isn't reported.
- [ ] The fictional workbook has such a participation, and the
      `sheet-migration.unresolved-project-reported` test expects its report line.
