# CR-003.2: Sheet migration dates and file

Status: todo

The sheet parser reports dates it can only guess at, and the real sheet can't be
committed by accident (`review.md`, findings 3 and 4).

## Acceptance criteria

- [ ] A dotted month whose year has fewer than four digits, and any year after the current
      one, goes to the report instead of being guessed; the operator fixes those cells in
      the sheet before the import. `scripts/sheet-migration/parse.test.ts` covers `03.21`,
      `03.20`, and `10.202`. Today `LAST_YEAR` is 2100
      (`scripts/sheet-migration/parse.ts:31`) and the year is padded with zeros (`:58`), so
      `parsePeriodDate('03.21')` returns `2100-03` and `03.20` returns `2000-03`, with no
      report line. The sheet is imported once, so the parser reports what it can't read
      rather than handling more formats; a recurring import in an agreed format is where
      that effort belongs.
- [ ] `.gitignore` ignores `*.xlsx` and `*.docx`. Today nothing stops a copy of
      `Snowhound_CV_baas.xlsx`, put in the working tree to run `sheet:report`, from being
      committed. If a fixture ever needs a committed workbook, it is un-ignored by name.
