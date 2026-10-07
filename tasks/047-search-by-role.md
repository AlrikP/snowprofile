# 047: Search by role

Status: todo

Tenders ask for people who held a role, such as an architect, but search can't find them.
The search page (`src/features/search/`) filters only by technology and period, and
`SearchInput` in `src/server/search/search.schemas.ts` requires at least one technology.

The search page must let an admin pick one or more roles from the role catalogue
(`docs/specs/role-catalogue.md`). Participations and own projects both have roles from
the catalogue, so both can match. Results stay people with their matching work, as now.

Task 046 adds a characteristic filter and also makes the technology optional. Whichever
task lands second builds on the other's form layout and input schema.

## Open questions

1. **Technologies optional.** Can an admin search by role alone? Decide together with
   task 046's first question.
2. **Same work or anywhere.** With a role and a technology chosen, must the same
   participation have both ("an architect who used Kotlin"), or is it enough that the
   person was an architect somewhere and used Kotlin somewhere?
3. **Any or all.** With several roles chosen, is one enough, or must the person have held
   each of them?
4. **CV selection.** Does "Make CV" pass the roles on, and does CV selection filter by
   them?

Proposed:

1. A search needs at least one technology, role, or characteristic (task 046).
2. The same piece of work must have the role and the technology, since the CV shows them
   together.
3. One of the chosen roles is enough; a work item rarely holds several, and an all-match
   across the person's work can follow if a tender needs it.
4. CV selection gets the same filter, as a subtask of this task if it outgrows one commit.

## Acceptance criteria

- [ ] The decisions on the open questions are recorded in `docs/product.md`, "Search".
- [ ] The search form offers the live roles in the interface language, with the same
      picker style as technologies, and an admin can pick one or more.
- [ ] The chosen roles are in the page's search params, so a search can be bookmarked and
      reloaded.
- [ ] The server matches on the work's own roles, for participations and own projects. A
      role merged into another (`role-catalogue` merge) is found under the role it was
      merged into. Queries stay scoped by organization, with a case in
      `src/server/tenancy.test.ts` for any new repository function.
- [ ] Each result marks the chosen roles on its matching work.
- [ ] Labels and messages are translated in Estonian and English.

## Spec changes

Written against the proposal; adjust once the open questions are decided.

- Added: requirement "Search by role" in `docs/specs/search.md`: an admin can search by
  one or more roles; work matches when it has one of them, and when technologies are
  chosen too, the same work must match both.
- Added: scenario `search.role`: given one person who was an architect on a project and
  another who was only a developer, when an admin searches for Architect, then only the
  first is listed, with that project and the role marked.
- Added: scenario `search.role-with-technology`: given a person who was an architect on a
  project without Kotlin and a developer on one with Kotlin, when an admin searches for
  Architect and Kotlin, then the person isn't listed.
- Added: scenario `search.role-own-projects-included`: given a person whose own project
  has the role Architect, when an admin searches for Architect, then the person is listed
  with the own project, marked as own.
- Modified (if question 4 is decided as proposed): `search.make-cv` and the filter
  requirement in `docs/specs/cv-selection.md` carry the roles too.
