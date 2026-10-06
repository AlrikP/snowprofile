# 037: CV view

Status: in-progress
Depends on: task 036 (the selection and the CV read)

The CV shown on screen as a project and technology table that pastes into Word, Google
Docs, or a spreadsheet with its structure kept. The columns follow the prototype and stay
an open question (`docs/product.md`, "CV table columns"); the page says they are
provisional.

Builds on: `prototypes/cv.html` (states `personal`, `team-per-person`, `team-combined`)
and its copy button (`data-copy`, HTML with inline styles plus plain text).

## Acceptance criteria

- [x] The table shows the CV read in the prototype's columns, in the chosen language.
- [x] A team CV shows one table per person or one combined table, as chosen.
- [x] "Copy table" puts the table on the clipboard as HTML with inline styles and as tab-
      separated plain text.
- [ ] A manual check pastes a personal and a team CV into Word, Google Docs, and a
      spreadsheet; the Outcome records the result.

## Spec changes

- Added: `docs/specs/cv-view.md`, with requirements:
  - The CV as a table: `cv-view.personal-table`, `cv-view.provisional-columns`.
  - Team layouts: `cv-view.table-per-person`, `cv-view.combined-table`.
  - Copying keeps the structure: `cv-view.copy-html-and-text`.

## Outcome

- One model, `cvBlocks` in `src/features/cvs/cv-table.ts`, turns the CV read into person
  blocks (name, birth date, education) and tables. The screen, the HTML copy (`cvHtml`),
  and the tab-separated copy (`cvText`) all render it, so tests check the copy without a
  browser. It replaces task 036.2's preview.
- The copy writes HTML generated from the model with inline styles, not the prototype's
  computed-style clone of the DOM: it needs no layout and doesn't depend on the theme.
- Untranslated text stays highlighted in the copy too, so a pasted CV still shows what
  the missing-translations list asks to fix.
- The team layout is `layout=combined` in the URL; a table per person is the default. A
  personal CV ignores it. The shared table's period runs from the earliest start to the
  latest end, ongoing if any part is, and its size column names each person when there
  are several.
- A multi-line cell goes into the plain text quoted, as spreadsheets read it.
- Checked in a browser against the seeded e2e server: a four-person Java CV in both
  layouts, and "Copy table" succeeds in Chrome. Headless Chrome doesn't paste from its
  clipboard, so the paste check below is manual.
