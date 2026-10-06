# 027: Technical characteristics

Status: todo
Depends on: task 025 (bilingual field), task cr-002 (fixes from the review of cr-001 through task 026)

The admin's checklist of yes/no questions that tenders ask about a project's solution.
Projects answer them in task 029.4. The code name is `tender_criterion`
(`docs/product.md`, "Technical characteristics").

Builds on: `prototypes/criteria.html` (states `list`, `add`, `edit`, `remove`, `empty`);
table `tender_criterion` (bilingual name, `position`); permission
`tenderCriterion: ['manage']`.

## Acceptance criteria

- [ ] Admins see the checklist in `position` order, and add, rename, reorder, and remove
      characteristics. Employees can't open the page.
- [ ] A characteristic needs at least one of its two names.
- [ ] Removing a characteristic soft-deletes it; projects' answers stay but no longer show.
      The dialog says how many projects answered it.
- [ ] A repository with tenancy cases for every function.
- [ ] The route renders `CriteriaPage`, with `CriteriaPending`.

## Spec changes

- Added: `docs/specs/technical-characteristics.md`, with requirements:
  - Admins manage the checklist: `technical-characteristics.admin-adds`,
    `technical-characteristics.admin-reorders`,
    `technical-characteristics.employee-refused`.
  - A characteristic has a name: `technical-characteristics.name-required`.
  - Removal hides the answers: `technical-characteristics.removed-answers-hidden`.
