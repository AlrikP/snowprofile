# 036.2: CV selection page

Status: todo
Depends on: task 036.1 (the CV read)

## Acceptance criteria

- [ ] Admins pick one person (personal CV) or several (team CV), the language (ET/EN),
      and which projects to include: all by default, or filtered by technology or
      period. The selection lives in the URL search params, so search can link to it.
- [ ] Leavers are left out of the people picker unless asked for.
- [ ] The birth date is included only when ticked.
- [ ] Missing translations are listed before generating, each with a link to where it is
      fixed (`missing` state); the CV still shows, with the other language marked.
- [ ] Employees can't open the page.
- [ ] The route renders `CvPage`, with `CvPending`.
- [ ] `knip.json` no longer ignores `src/server/cvs/cvs.functions.ts`, which task 036.1
      added before the page used it.

## Spec changes

- Modified: `docs/specs/cv-selection.md`, adding:
  - Leavers on request: `cv-selection.leavers-hidden`.
  - Missing translations shown with their fixes, in the scenario
    `cv-selection.missing-translations-listed`.
