# 038: CV document

Status: in-progress
Depends on: task 036 (the CV read)

A DOCX generated on request from one minimal built-in template per language. No stored
files (`docs/architecture.md`, "Application rules"), and no per-organization or
per-tender templates (`docs/product.md`, "Not in MVP").

Builds on: `docs/product.md` ("CV document"); `prototypes/cv.html` ("Download DOCX").

## Acceptance criteria

- [x] `docs/architecture.md` records the DOCX library, chosen for running in the server
      bundle under Node and Bun without native code, with the reason.
- [x] "Download DOCX" returns a document with the people, their education, and their
      projects, roles, periods, and technologies, in the chosen language. A team CV is
      one document with shared projects listed once.
- [x] The file name names the person or the team, and the date.
- [x] A server route serves it behind the same `cv: ['generate']` check as the page.
- [ ] A test opens the generated file and checks its text; a manual check opens it in
      Word and Google Docs.

## Spec changes

- Added: `docs/specs/cv-document.md`, with requirements:
  - A document per CV: `cv-document.personal`, `cv-document.team-shared-once`,
    `cv-document.language`.
  - Admins only: `cv-document.employee-refused`.

## Outcome

- `docx` 9.8.1 builds the document in code (`src/server/cvs/cv-document.server.ts`); the
  choice and the reason are in `docs/architecture.md`, "Stack". `jszip` 3.10.2, already
  `docx`'s own dependency, is a dev dependency so tests can open the file.
- The document reuses the CV view's model, which moved to `src/lib/cv-table.ts`, always
  in the shared-table layout, so a team CV lists a shared project once. One template
  serves both languages; only the text differs.
- `GET /api/cv-document` (`src/routes/api/cv-document.ts`) takes the CV read's input as
  search params (`cvDocumentHref` and `readCvDocumentParams` in `cvs.schemas.ts`), checks
  the session, the membership, and `cv: ['generate']`, and answers 400, 401, or 403
  otherwise.
- Files are `CV <name> <date>.docx` or `Team CV <date>.docx` (`Meeskonna CV` in
  Estonian), sent with an ASCII fallback name beside the UTF-8 one.
- A4 portrait, 1.5 cm margins, Calibri 10 pt with a 9 pt table. Periods use
  non-breaking hyphens so Word never splits a date. Fallback text stays highlighted, as
  in the copy.
- Checked beyond the tests: sample personal (English) and team (Estonian) documents
  rendered in macOS Quick Look; the first render showed the Size column too narrow,
  which set the widths and table size above. `test:e2e` downloads a DOCX through the
  production build.
