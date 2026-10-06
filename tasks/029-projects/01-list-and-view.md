# 029.1: Project list and view

Status: todo

Read-only views over the seeded projects. Editing is task 029.2.

## Acceptance criteria

- [ ] The project list shows every live project with customer, period, and technologies,
      newest first, and a filter for the projects the signed-in person took part in
      (`projects.html` states `list`, `mine`, `no-match`, `empty`).
- [ ] The project page shows the description in the UI language, the period, the
      technologies, the solution characteristics answered, and the people with their
      roles and periods, leavers included.
- [ ] Cost, total hours, tender reference, and contact persons show to admins and to
      people who took part in the project; others see that the details are hidden
      (`project.html` states `participant`, `not-participant`). The server leaves them
      out of the response, not only the page.
- [ ] A participant's page links to editing their participation on their profile.
- [ ] The page shows who last changed the project and when.
- [ ] The routes render `ProjectsPage` and `ProjectPage`, each with a pending component.

## Spec changes

- Added: `docs/specs/projects.md`, with requirements:
  - Every member sees the projects: `projects.list`, `projects.only-mine`.
  - Tender details only for admins and participants: `projects.details-for-admin`,
    `projects.details-for-participant`, `projects.details-hidden`.
  - A project shows its people: `projects.people-listed`.
  - A project shows its last change: `projects.last-change`.
