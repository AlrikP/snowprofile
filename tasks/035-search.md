# 035: Search

Status: done
Depends on: task 026 (technology picker)

Find people by technology and, optionally, a period, and go from the results to a CV.
The seed has participations, so the participation tasks don't block this one.

Builds on: `docs/product.md` ("Search"); `docs/architecture.md` ("Data conventions":
how a period filter reads partial dates); `prototypes/search.html` (states `results`,
`leavers`, `prompt`, `no-match`); tables `participation`, `participation_technology`,
`own_project`, `own_project_technology`, `employee_profile`; permission
`profile: ['readAll']`.

## Acceptance criteria

- [x] Admins pick one or more technologies, match any or all of them, and optionally a
      period; the filters live in the URL search params.
- [x] Results list each matching person with the participations and own projects that
      match, own projects marked; a participation matches through its own technologies,
      not the project's.
- [x] A period matches a participation that overlaps it; a partial start reads as its
      first day and a partial end as its last, and an ongoing participation runs to today.
- [x] Leavers are left out unless "Show leavers" is ticked.
- [x] "Make a CV" opens CV selection with the matching people and the same filter.
- [x] Employees can't open the page.
- [x] The route renders `SearchPage`, with `SearchPending`.

## Spec changes

- Added: `docs/specs/search.md`, with requirements:
  - Search by technology: `search.any-technology`, `search.all-technologies`,
    `search.participation-technologies-only`, `search.own-projects-included`.
  - Optional period: `search.period-overlap`, `search.partial-dates`.
  - Leavers on request: `search.leavers-hidden`, `search.leavers-shown`.
  - From results to a CV: `search.make-cv`.
  - Admins only: `search.employee-refused`.

## Outcome

- "All" means the person used every chosen technology across their matching work, not
  on one project: a tender asks for people who know Java and X-Road, whether or not it was
  the same project. The results list the work that used any of them.
- The period rule lives in `src/lib/period.ts` (`firstDay`, `lastDay`, `overlaps`), the
  one place that reads partial dates, and the server applies it in code after a query
  for the work with a chosen technology. The organization's data is small enough for that.
- The filters are URL search params (`t`, `match`, `from`, `to`, `leavers`), read by
  `src/lib/search-filters.ts`, which drops a value it can't read instead of failing the
  page. The period fields take `YYYY`, `MM-YYYY`, or `DD-MM-YYYY` and enter the URL on
  Enter or leaving the field.
- "Make CV" links to `/$organization/cvs` with the chosen people (`people`, profile IDs)
  and the same filter; the CV route already validates them, for task 036. Everyone but
  leavers starts out chosen, as in the prototype.
- People are ordered by how much of their work matches, then by name.
- Checked in a browser against `prototypes/search.html` (state `results`).
  `bun run test:e2e` passes, 19 tests.
