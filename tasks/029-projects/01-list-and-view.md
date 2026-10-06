# 029.1: Project list and view

Status: done

Read-only views over the seeded projects. Editing is task 029.2.

## Acceptance criteria

- [x] The project list shows every live project with customer, period, and technologies,
      newest first, and a filter for the projects the signed-in person took part in
      (`projects.html` states `list`, `mine`, `no-match`, `empty`).
- [x] The project page shows the description in the UI language, the period, the
      technologies, the solution characteristics answered, and the people with their
      roles and periods, leavers included.
- [x] Cost, total hours, tender reference, and contact persons show to admins and to
      people who took part in the project; others see that the details are hidden
      (`project.html` states `participant`, `not-participant`). The server leaves them
      out of the response, not only the page.
- [x] A participant's page links to editing their participation on their profile.
- [x] The page shows who last changed the project and when.
- [x] The routes render `ProjectsPage` and `ProjectPage`, each with a pending component.

## Spec changes

- Added: `docs/specs/projects.md`, with requirements:
  - Every member sees the projects: `projects.list`, `projects.only-mine`.
  - Tender details only for admins and participants: `projects.details-for-admin`,
    `projects.details-for-participant`, `projects.details-hidden`.
  - A project shows its people: `projects.people-listed`.
  - A project shows its last change: `projects.last-change`.

## Outcome

- The project page shows the whole live checklist, with "Unanswered" for a characteristic
  the project hasn't answered, as `prototypes/project.html` does. A removed
  characteristic doesn't show.
- "Admin" for tender details means `project: ['update']`. The server sets `details` to
  `null` for anyone else, and the page shows the prototype's notice instead.
- A person with several participations on a project gets a "My participation" card for
  each. The link goes to `/$organization/profile?participation=<id>`. The profile route
  validates that param, and task 031.2's criterion now names it.
- The last change names the user from `updated_by`. For the system user, which seeds and
  scripts act as, the server sends no name and the page says "by the system". The time
  is formatted by the new `src/lib/date-time.ts`.
- The list also has the prototype's name search and customer filter, client-side. The
  "Add project" button and the edit link wait for task 029.2.
- `src/test/router.tsx` renders a page with a router and preloaded query data, for
  pages with links.
- The demo data has no leavers or removed projects, so the server tests create them.
- Checked in a browser against the prototypes. `bun run test:e2e` passes, 12 tests.
