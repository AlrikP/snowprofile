# CR-003.2: Sheet migration dates and file

Status: todo

The sheet parser reports dates it can only guess at, and the real sheet can't be
committed by accident (`review.md`, findings 3 and 4).

## Acceptance criteria

- [ ] A period, join, or birth date with a year after the current one goes to the report,
      and `scripts/sheet-migration/parse.test.ts` covers `03.21` and `03.20`. Today
      `LAST_YEAR` is 2100 (`scripts/sheet-migration/parse.ts:31`) and the year is padded
      with zeros (`:58`), so `parsePeriodDate('03.21')` returns `2100-03` and `03.20`
      returns `2000-03`, with no report line.
- [ ] `.gitignore` ignores `*.xlsx` and `*.docx`. Today nothing stops a copy of
      `Snowhound_CV_baas.xlsx`, put in the working tree to run `sheet:report`, from being
      committed. If a fixture ever needs a committed workbook, it is un-ignored by name.
