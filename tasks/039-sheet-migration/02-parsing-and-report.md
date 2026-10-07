# 039.2: Parsing and the report

Status: done

Pure functions that turn the sheet's cells into the app's types, each returning a value or
a reason it couldn't. No database yet. The cases are listed in `docs/architecture.md`,
"From the sheet".

## Acceptance criteria

- [x] A fictional workbook in the sheet's layout under `scripts/` (or its test folder),
      including the company email column added before the migration, with every variant
      below, and the reader that loads it. The XLSX library is recorded in
      `docs/architecture.md` with the reason.
- [x] Periods: `05.2020`, `6.2015`, `2018`, and open ends ("jätkuv", "...", "-") parse;
      text such as "juuni-okt 2024" goes to the report.
- [x] Hours and cost: `~3500h`, `> 10 000h`, and `> 700 000€` parse to a value and a
      qualifier.
- [x] Project references: numbers, names, and variants ("Projekt 19", "Projekt8") resolve
      to a project number or a normalized name.
- [x] Technologies: free text split into names, with categories taken from prefixes
      ("Frontend: React, ...").
- [x] The report lists each unparsed value with its sheet, cell, and the reason, printed
      when the script ends.

## Spec changes

- Added: `docs/specs/sheet-migration.md`, with requirements:
  - Values that can't be parsed are reported: `sheet-migration.unparsed-reported`.

## Outcome

- The real sheet's layout came from a copy, read for structure only: sheet names, labels,
  number formats, and the shapes of values. Every sheet is vertical (labels in column A,
  one record per column), which `docs/architecture.md`, "From the sheet", now records
  with the variants found. No data from it is in the repository.
- The company email goes in an "E-post:" row under "Nimi:" on each employee sheet; the
  sheet doesn't have it yet. Rows are found by label, so the row can go anywhere if that
  changes.
- `scripts/sheet-migration/`: `parse.ts` (values), `read.ts` (sheets to projects and
  people), `report.ts`, and `fixture.ts`, the fictional workbook, built in code with
  `write-excel-file` so it can be reviewed; `bun scripts/sheet-migration/fixture.ts
<out.xlsx>` writes it for Excel.
- `bun run sheet:report <file>` prints what would load and the report without a
  database, so the sheet can be fixed before a migration. Task 039.3's `sheet:migrate`
  prints the same report when it ends.
- Variants beyond the list in the task: month-formatted date cells (the most common
  form), months typed as numbers that lose a trailing zero (10.202), `dd.mm.yy` birth
  dates, `3350+` and "üle 10 000 töötunni", "Isiklikult ~400" as an own project's
  hours, and technologies with versions and Estonian descriptors (RabbitMQ liidestus).
- On the copy: 20 projects, 15 people, 69 participations, and 14 own projects; the
  report has 28 values, 15 of them the missing emails. One sheet holds scratch figures in
  its project columns, which the report and task 039.4's unresolved references catch.
- Join dates the sheet has as months become the month's first day.
- The criteria answers, contacts, and roles are read as written; tasks 039.3 and 039.4
  interpret them against the database.
