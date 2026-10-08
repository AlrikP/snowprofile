# CR-003.2: Sheet migration dates and file

Status: done

The sheet parser reports dates it can only guess at, and the real sheet can't be
committed by accident (`review.md`, findings 3 and 4).

## Acceptance criteria

- [x] A dotted month whose year has fewer than four digits, and any year after the current
      one, goes to the report instead of being guessed; the operator fixes those cells in
      the sheet before the import. `scripts/sheet-migration/parse.test.ts` covers `03.21`,
      `03.20`, and `10.202`. Today `LAST_YEAR` is 2100
      (`scripts/sheet-migration/parse.ts:31`) and the year is padded with zeros (`:58`), so
      `parsePeriodDate('03.21')` returns `2100-03` and `03.20` returns `2000-03`, with no
      report line. The sheet is imported once, so the parser reports what it can't read
      rather than handling more formats; a recurring import in an agreed format is where
      that effort belongs.
- [x] `.gitignore` ignores `*.xlsx` and `*.docx`. Today nothing stops a copy of
      `Snowhound_CV_baas.xlsx`, put in the working tree to run `sheet:report`, from being
      committed. If a fixture ever needs a committed workbook, it is un-ignored by name.

## Outcome

- The fixture's `10.202` participation start (Anna, C15) now goes to the report instead of
  loading as October 2020, so the fixture reports 8 values, not 7. On the real sheet, task
  039.2 found such cells; expect them in the report and fix them in the sheet.
- The current-year cap also reports an education period that ends in a later year, such
  as an expected graduation; the sheet writes an ongoing one as `2019-`.
- `parseDay`'s two-digit years (`14.06.90`) stay: they are explicit days, and the century
  rule already refuses the future.
