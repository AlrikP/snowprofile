# 036: CV selection

Status: todo
Depends on: task 026 (technology picker)

The CV page's selection, and the server read that assembles a CV from it. The table
(task 037) and the DOCX document (task 038) both render what this read returns.

Builds on: `docs/product.md` ("CV selection", "Bilingual content", "Personal data and
GDPR": birth date); `prototypes/cv.html` (states `personal`, `missing`, `empty`); tables
`employee_profile`, `education`, `participation` and its link tables, `own_project` and
its link tables, `project`, `customer`; permission `cv: ['generate']`.

## Acceptance criteria

- [ ] Admins pick one person (personal CV) or several (team CV), the language (ET/EN),
      and which projects to include: all by default, or filtered by technology or
      period. The selection lives in the URL search params, so search can link to it.
- [ ] Leavers are left out of the people picker unless asked for.
- [ ] The birth date is included only when ticked.
- [ ] The CV read returns people, education, and projects (organization and own) with
      roles, periods, hours, tasks, and technologies in the chosen language, shared
      projects once in a team CV, and the missing translations it found.
- [ ] Missing translations are listed before generating, each with a link to where it is
      fixed (`missing` state); the CV still shows, with the other language marked.
- [ ] Employees can't open the page.
- [ ] The route renders `CvPage`, with `CvPending`.

## Spec changes

- Added: `docs/specs/cv-selection.md`, with requirements:
  - Personal and team CVs: `cv-selection.personal`, `cv-selection.team`,
    `cv-selection.employee-refused`.
  - Projects to include: `cv-selection.all-projects`,
    `cv-selection.filtered-by-technology`, `cv-selection.filtered-by-period`,
    `cv-selection.own-projects-included`.
  - Language and missing translations: `cv-selection.language`,
    `cv-selection.missing-translations-listed`.
  - Birth date only on request: `cv-selection.birth-date-opt-in`.
  - Leavers on request: `cv-selection.leavers-hidden`.
