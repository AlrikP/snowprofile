# 036: CV selection

Status: done
Depends on: task 026 (technology picker)

The CV page's selection, and the server read that assembles a CV from it. The table
(task 037) and the DOCX document (task 038) both render what this read returns.

Builds on: `docs/product.md` ("CV selection", "Bilingual content", "Personal data and
GDPR": birth date); `prototypes/cv.html` (states `personal`, `missing`, `empty`); tables
`employee_profile`, `education`, `participation` and its link tables, `own_project` and
its link tables, `project`, `customer`; permission `cv: ['generate']`.

## Subtasks

1. `01-cv-read.md`
2. `02-selection-page.md`

## Acceptance criteria

- [x] All subtasks are done.
