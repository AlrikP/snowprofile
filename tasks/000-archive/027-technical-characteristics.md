# 027: Technical characteristics

Status: done
Depends on: task 025 (bilingual field), task cr-002 (fixes from the review of cr-001 through task 026)

The admin's checklist of yes/no questions that tenders ask about a project's solution.
Projects answer them in task 029.4. The code name is `tender_criterion`
(`docs/product.md`, "Technical characteristics").

Builds on: `prototypes/criteria.html` (states `list`, `add`, `edit`, `remove`, `empty`);
table `tender_criterion` (bilingual name, `position`); permission
`tenderCriterion: ['manage']`.

## Acceptance criteria

- [x] Admins see the checklist in `position` order, and add, rename, reorder, and remove
      characteristics. Employees can't open the page.
- [x] A characteristic needs at least one of its two names. The form says so with a new
      message, such as "Fill in at least one language.", which task cr-002.4 removed
      while nothing used it.
- [x] Removing a characteristic soft-deletes it; projects' answers stay but no longer show.
      The dialog says how many projects answered it.
- [x] A repository with tenancy cases for every function.
- [x] The route renders `CriteriaPage`, with `CriteriaPending`.

## Spec changes

- Added: `docs/specs/technical-characteristics.md`, with requirements:
  - Admins manage the checklist: `technical-characteristics.admin-adds`,
    `technical-characteristics.admin-reorders`,
    `technical-characteristics.employee-refused`.
  - A characteristic has a name: `technical-characteristics.name-required`.
  - Removal hides the answers: `technical-characteristics.removed-answers-hidden`.

## Outcome

- An employee who opens `/criteria` is redirected by the route loader to the
  organization's start page, and the server refuses every checklist call. No page had a
  permission guard before. `docs/architecture.md`, "Roles", now records the pattern for
  later admin pages.
- A new characteristic goes after the last live one. A move renumbers the whole live list
  from 0, so seeded or tied positions can't keep two characteristics in place. Moving
  past either end is a no-op.
- The answer count includes yes and no answers, from live projects only. The remove
  dialog uses the same count, with its own text when nobody answered and an English
  plural for one project.
- `BilingualField` gained a `hint` prop, so both inputs are described by the hint and
  then by any error.
- Task 029.4 now says that answers to a removed characteristic don't show, and adds
  `projects.removed-characteristic-hidden` to its spec changes.
- Checked in a browser against `prototypes/criteria.html`: the checklist, the add dialog
  with the empty-name error, and the remove dialog. `bun run test:e2e` passes, 10 tests.
