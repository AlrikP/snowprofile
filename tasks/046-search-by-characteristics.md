# 046: Search by solution characteristics

Status: todo

Tenders ask for people who worked on projects with a given solution, such as X-Road or
containers, but nothing filters by a project's solution characteristics. The search page
(`src/features/search/`) finds people only by technology and period: `SearchInput` in
`src/server/search/search.schemas.ts` requires at least one technology.

The search page must let an admin pick one or more characteristics from the checklist
(`docs/specs/technical-characteristics.md`). A participation then matches only when its
project answered yes to the chosen characteristics. Results stay people with their
matching work, as now.

## Open questions

1. **Technologies optional.** Can an admin search by characteristics alone, with no
   technology? Today at least one technology is required.
2. **Any or all.** Must a project have all the chosen characteristics, or is one enough?
   Should the existing any/all switch apply to both, or should each have its own?
3. **Own projects.** Own projects have no characteristic answers. With characteristics
   chosen, are they left out, or shown regardless?
4. **CV selection.** "Make CV" passes the search filter to CV selection
   (`search.make-cv`). Does CV selection also filter by characteristics, or does the
   characteristic filter stop at the search results?

Proposed:

1. A search needs at least one technology or one characteristic.
2. A project must have every chosen characteristic, the way a tender's requirements read.
   The any/all switch stays for technologies only.
3. Own projects are left out while characteristics are chosen, since nothing says they
   have them.
4. CV selection gets the same filter, as a subtask of this task if it outgrows one commit.

## Acceptance criteria

- [ ] The decisions on the open questions are recorded in `docs/product.md`, "Search".
- [ ] The search form offers the live characteristics, in checklist order and in the
      interface language, and an admin can pick one or more.
- [ ] The chosen characteristics are in the page's search params, so a search can be
      bookmarked and reloaded.
- [ ] The server matches on the project's yes answers and ignores removed
      characteristics. The query stays scoped by organization, with a case in
      `src/server/tenancy.test.ts` if a new repository function is added.
- [ ] Each result shows which chosen characteristics its projects have.
- [ ] Labels and messages are translated in Estonian and English.

## Spec changes

Written against the proposal; adjust once the open questions are decided.

- Modified: requirement "Search by technology", renamed "Search by technology and
  solution characteristic", in `docs/specs/search.md`: a search names one or more
  technologies, one or more characteristics, or both.
- Added: scenario `search.characteristics-all`: given one project with X-Road and
  containers and another with X-Road only, when an admin searches for X-Road and
  containers, then only the first project's participants are listed, with that project.
- Added: scenario `search.characteristics-only`: given a project with X-Road, when an
  admin searches for X-Road with no technology, then its participants are listed.
- Added: scenario `search.characteristics-with-technology`: given a participant who used
  Kotlin on a project without X-Road, when an admin searches for Kotlin and X-Road, then
  the participant isn't listed for that participation.
- Added: scenario `search.characteristics-own-projects-left-out`: given a person whose own
  project used Kotlin, when an admin searches for Kotlin and X-Road, then the own project
  isn't listed.
- Modified (if question 4 is decided as proposed): `search.make-cv` and the filter
  requirement in `docs/specs/cv-selection.md` carry the characteristics too.
