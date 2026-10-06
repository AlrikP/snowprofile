# 038: CV document

Status: todo
Depends on: task 036 (the CV read)

A DOCX generated on request from one minimal built-in template per language. No stored
files (`docs/architecture.md`, "Application rules"), and no per-organization or
per-tender templates (`docs/product.md`, "Not in MVP").

Builds on: `docs/product.md` ("CV document"); `prototypes/cv.html` ("Download DOCX").

## Acceptance criteria

- [ ] `docs/architecture.md` records the DOCX library, chosen for running in the server
      bundle under Node and Bun without native code, with the reason.
- [ ] "Download DOCX" returns a document with the people, their education, and their
      projects, roles, periods, and technologies, in the chosen language. A team CV is
      one document with shared projects listed once.
- [ ] The file name names the person or the team, and the date.
- [ ] A server route serves it behind the same `cv: ['generate']` check as the page.
- [ ] A test opens the generated file and checks its text; a manual check opens it in
      Word and Google Docs.

## Spec changes

- Added: `docs/specs/cv-document.md`, with requirements:
  - A document per CV: `cv-document.personal`, `cv-document.team-shared-once`,
    `cv-document.language`.
  - Admins only: `cv-document.employee-refused`.
