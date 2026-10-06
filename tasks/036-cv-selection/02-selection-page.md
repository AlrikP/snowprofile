# 036.2: CV selection page

Status: done
Depends on: task 036.1 (the CV read)

## Acceptance criteria

- [x] Admins pick one person (personal CV) or several (team CV), the language (ET/EN),
      and which projects to include: all by default, or filtered by technology or
      period. The selection lives in the URL search params, so search can link to it.
- [x] Leavers are left out of the people picker unless asked for.
- [x] The birth date is included only when ticked.
- [x] Missing translations are listed before generating, each with a link to where it is
      fixed (`missing` state); the CV still shows, with the other language marked.
- [x] Employees can't open the page.
- [x] The route renders `CvPage`, with `CvPending`.
- [x] `knip.json` no longer ignores `src/server/cvs/cvs.functions.ts`, which task 036.1
      added before the page used it.

## Spec changes

- Modified: `docs/specs/cv-selection.md`, adding:
  - Leavers on request: `cv-selection.leavers-hidden`.
  - Missing translations shown with their fixes, in the scenario
    `cv-selection.missing-translations-listed`.

## Outcome

- The page (`src/features/cvs/`) keeps the selection in the URL: search's keys (`t`,
  `from`, `to`, `leavers`) plus `people`, `lang`, and `birth`, read by `readCvSelection`.
  Search's `match` is ignored here, as the read ignores it.
- "By technology or period" stays chosen while its fields are empty, as local state;
  "All projects" clears `t`, `from`, and `to`.
- Until task 037's table, the CV shows as a plain preview (`cv-preview.tsx`): people with
  education and birth date, then projects with each person's part, fallbacks highlighted
  and labelled "No English" or "No Estonian". Task 037 replaces it with the table.
- A missing translation links to the project's edit form, the roles page, or the People
  page ("Ask to update").
- Shared now, because a second feature needed them: `peopleQuery` moved to
  `src/lib/people.ts`, the From and To fields to `src/components/period-filter.tsx`
  (messages renamed `period_filter_*`), and the joined radio buttons to
  `src/components/radio-toggle.tsx`. The CV page was the last placeholder, so
  `PagePlaceholder` and `page_not_built` are gone.
- Checked in a browser against the seeded e2e server: search's "Make CV" opens a
  four-person Java CV; switching to English lists four missing translations with their
  links, and the page works at 420 px.
- `test:e2e` now checks that the CV opens from search and that an employee is sent away.
