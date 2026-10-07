# 046.1: Search by solution characteristics

Status: todo

The search page lets an admin pick one or more characteristics from the checklist
(`docs/specs/technical-characteristics.md`). A participation matches only when its
project answered yes to every chosen one (task 046, decisions 1, 2, 4, and 5). The
technology becomes optional, so a search by characteristics alone works.

## Acceptance criteria

- [ ] `SearchInput` accepts no technologies when a characteristic is chosen, and refuses
      a search with neither.
- [ ] The search form offers the live characteristics, in checklist order and in the
      interface language, and an admin can pick one or more.
- [ ] The chosen characteristics are in the page's search params, so a search can be
      bookmarked and reloaded.
- [ ] The server matches on the project's yes answers and ignores removed
      characteristics. Queries stay scoped by organization, with a case in
      `src/server/tenancy.test.ts` for any new repository function.
- [ ] Each result shows which chosen characteristics its project has.
- [ ] Labels and messages are in Estonian and English.

## Spec changes

- Modified: requirement "Search by technology", renamed "Search by technology, role, and
  solution characteristic", in `docs/specs/search.md`: a search names one or more
  technologies, characteristics, or both; each is optional, but not all.
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
- Added: scenario `search.filter-required`: given the search page, when an admin searches
  with no technology, role, or characteristic, then the form asks for one and the server
  refuses.
