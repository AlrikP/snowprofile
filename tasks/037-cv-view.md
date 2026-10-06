# 037: CV view

Status: todo
Depends on: task 036 (the selection and the CV read)

The CV shown on screen as a project and technology table that pastes into Word, Google
Docs, or a spreadsheet with its structure kept. The columns follow the prototype and stay
an open question (`docs/product.md`, "CV table columns"); the page says they are
provisional.

Builds on: `prototypes/cv.html` (states `personal`, `team-per-person`, `team-combined`)
and its copy button (`data-copy`, HTML with inline styles plus plain text).

## Acceptance criteria

- [ ] The table shows the CV read in the prototype's columns, in the chosen language.
- [ ] A team CV shows one table per person or one combined table, as chosen.
- [ ] "Copy table" puts the table on the clipboard as HTML with inline styles and as tab-
      separated plain text.
- [ ] A manual check pastes a personal and a team CV into Word, Google Docs, and a
      spreadsheet; the Outcome records the result.

## Spec changes

- Added: `docs/specs/cv-view.md`, with requirements:
  - The CV as a table: `cv-view.personal-table`, `cv-view.provisional-columns`.
  - Team layouts: `cv-view.table-per-person`, `cv-view.combined-table`.
  - Copying keeps the structure: `cv-view.copy-html-and-text`.
