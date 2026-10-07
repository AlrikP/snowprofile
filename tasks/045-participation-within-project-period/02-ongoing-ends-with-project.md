# 045.2: Read an ongoing participation on an ended project as ending with it

Status: todo
Depends on: task 045.1 (the rule refusing ongoing participations on ended projects)

An ongoing participation saved before its project ended reads as ending on the project's
end, although its stored end stays empty (task 045, decision 2). Every view that reads a
participation's period uses that effective end: the profile, the project page, search, and
CVs. The repositories read it in `participations.repository.server.ts`,
`projects.repository.server.ts`, `search.repository.server.ts`, and
`cvs.repository.server.ts`.

Because the profile reads the effective end, the participation form opens such a
participation with that end filled in and Ongoing unticked, so saving it passes task
045.1's rule.

## Acceptance criteria

- [ ] One shared SQL expression for the effective end, used by all four repositories.
- [ ] When the project's end is before the participation's start, the stored values are
      read unchanged; such a participation is outside the project and fixed by hand.
- [ ] If an admin clears the project's end again, the participation reads as ongoing.
- [ ] Search's period overlap and CV selection's period filter use the effective end.

## Spec changes

- Added: scenario `project-participation.ongoing-ends-with-project`: given an ongoing
  participation on a project, when an admin sets the project's end to 06-2025, then the
  profile, the project page, and the CV show the participation ending in 06-2025, and its
  edit form opens with that end.
- Added: scenario `search.ongoing-ends-with-project`: given an ongoing participation on a
  project that ended in 2023, when an admin searches from 2024, then the participation
  doesn't match.
