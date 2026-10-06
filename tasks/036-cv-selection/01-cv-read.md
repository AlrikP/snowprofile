# 036.1: CV read

Status: done

The server read that assembles a CV from a selection. The selection page (task 036.2),
the table (task 037), and the DOCX document (task 038) all render what it returns.

## Acceptance criteria

- [x] For one or more people, the read returns each person, their education, and their
      projects (organization and own) with roles, periods, hours, tasks, and
      technologies, in the chosen language (ET/EN). Text missing in that language falls
      back to the other, marked.
- [x] A team CV lists a project shared by several people once, with each person's part.
- [x] All projects by default, or only those matching the technologies (any or all) and
      the period, by the same rules as search (task 035).
- [x] The birth date is included only when asked for.
- [x] The read lists the missing translations it found, each with where it is fixed.
- [x] Only members with `cv: ['generate']` can read a CV.

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

## Outcome

- Task 036 is split in two: this read, and the selection page (task 036.2), so each
  lands as a reviewable commit. The README keeps the overall criteria.
- The read (`getCv`, `src/server/cvs/`) returns `people` (education, and the birth date
  only when asked), `projects` (each once, newest by anyone's part, with each person's
  `parts`), and `missing`. Every bilingual text is `{ text, lang, fallback }`, so the
  table and the DOCX mark a fallback the same way. Tasks 037 and 038 render this shape.
- Filtering by technology keeps the work that used any chosen technology; the search's
  "all" only picks people, and here the people are already chosen. The period reads as in
  search, through `overlaps` in `src/lib/period.ts`.
- Where a missing translation is fixed: a project description on the project's form, a
  role on the roles page, and anything only the person edits (tasks, own projects,
  education) on the People page, where an admin asks them to update. Admins can't edit
  other people's profiles in the app.
- Roles and technologies per item reuse the search repository's lookups.
- `knip.json` ignores `cvs.functions.ts` until task 036.2's page calls it; that task's
  criteria remove the entry.
- No UI in this subtask, so no browser check; `bun run test:e2e` is unchanged.
