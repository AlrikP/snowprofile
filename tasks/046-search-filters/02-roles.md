# 046.2: Search by role

Status: todo
Depends on: task 046.1 (optional technologies and the extended search input)

The search page lets an admin pick one or more roles from the role catalogue
(`docs/specs/role-catalogue.md`). Participations and own projects both have roles, so
both can match. Work matches when it has one of the chosen roles, and the same work must
also match the chosen technologies and characteristics (task 046, decisions 3 and 4).

## Acceptance criteria

- [ ] The search form offers the live roles in the interface language, with the same
      picker style as technologies, and an admin can pick one or more.
- [ ] The chosen roles are in the page's search params.
- [ ] The server matches on the work's own roles, for participations and own projects.
      Merging a role moves its links (`role-catalogue.merge-moves-links`), so a test checks
      that a search for the surviving role finds work that had the merged one. Queries
      stay scoped by organization, with a case in `src/server/tenancy.test.ts` for any new
      repository function.
- [ ] Each result marks the chosen roles on its matching work.
- [ ] Labels and messages are in Estonian and English.

## Spec changes

- Added: requirement "Search by role" in `docs/specs/search.md`: work matches when it has
  one of the chosen roles; the same work must match the chosen technologies and
  characteristics too.
- Added: scenario `search.role`: given one person who was an architect on a project and
  another who was only a developer, when an admin searches for Architect, then only the
  first is listed, with that project and the role marked.
- Added: scenario `search.role-with-technology`: given a person who was an architect on a
  project without Kotlin and a developer on one with Kotlin, when an admin searches for
  Architect and Kotlin, then the person isn't listed.
- Added: scenario `search.role-own-projects-included`: given a person whose own project
  has the role Architect, when an admin searches for Architect, then the person is listed
  with the own project, marked as own.
