# 039.2: Parsing and the report

Status: todo

Pure functions that turn the sheet's cells into the app's types, each returning a value or
a reason it couldn't. No database yet. The cases are listed in `docs/architecture.md`,
"From the sheet".

## Acceptance criteria

- [ ] A fictional workbook in the sheet's layout under `scripts/` (or its test folder),
      including the company email column added before the migration, with every variant
      below, and the reader that loads it. The XLSX library is recorded in
      `docs/architecture.md` with the reason.
- [ ] Periods: `05.2020`, `6.2015`, `2018`, and open ends ("jätkuv", "...", "-") parse;
      text such as "juuni-okt 2024" goes to the report.
- [ ] Hours and cost: `~3500h`, `> 10 000h`, and `> 700 000€` parse to a value and a
      qualifier.
- [ ] Project references: numbers, names, and variants ("Projekt 19", "Projekt8") resolve
      to a project number or a normalized name.
- [ ] Technologies: free text split into names, with categories taken from prefixes
      ("Frontend: React, ...").
- [ ] The report lists each unparsed value with its sheet, cell, and the reason, printed
      when the script ends.

## Spec changes

- Added: `docs/specs/sheet-migration.md`, with requirements:
  - Values that can't be parsed are reported: `sheet-migration.unparsed-reported`.
