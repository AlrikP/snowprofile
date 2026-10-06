# 035: Search

Status: todo
Depends on: task 026 (technology picker)

Find people by technology and, optionally, a period, and go from the results to a CV.
The seed has participations, so the participation tasks don't block this one.

Builds on: `docs/product.md` ("Search"); `docs/architecture.md` ("Data conventions":
how a period filter reads partial dates); `prototypes/search.html` (states `results`,
`leavers`, `prompt`, `no-match`); tables `participation`, `participation_technology`,
`own_project`, `own_project_technology`, `employee_profile`; permission
`profile: ['readAll']`.

## Acceptance criteria

- [ ] Admins pick one or more technologies, match any or all of them, and optionally a
      period; the filters live in the URL search params.
- [ ] Results list each matching person with the participations and own projects that
      match, own projects marked; a participation matches through its own technologies,
      not the project's.
- [ ] A period matches a participation that overlaps it; a partial start reads as its
      first day and a partial end as its last, and an ongoing participation runs to today.
- [ ] Leavers are left out unless "Show leavers" is ticked.
- [ ] "Make a CV" opens CV selection with the matching people and the same filter.
- [ ] Employees can't open the page.
- [ ] The route renders `SearchPage`, with `SearchPending`.

## Spec changes

- Added: `docs/specs/search.md`, with requirements:
  - Search by technology: `search.any-technology`, `search.all-technologies`,
    `search.participation-technologies-only`, `search.own-projects-included`.
  - Optional period: `search.period-overlap`, `search.partial-dates`.
  - Leavers on request: `search.leavers-hidden`, `search.leavers-shown`.
  - From results to a CV: `search.make-cv`.
  - Admins only: `search.employee-refused`.
