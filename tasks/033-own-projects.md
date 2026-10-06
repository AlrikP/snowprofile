# 033: Own projects

Status: done
Depends on: task 030 (the profile page), task 032 (role picker), task 026 (technology picker), task 025 (inputs)

Projects that appear only on their owner's CV: from an earlier employer, or several
engagements merged into one.

Builds on: `docs/product.md` ("Own projects"); `prototypes/profile.html` (state
`own-project`); tables `own_project`, `own_project_technology`, and `own_project_role`
from task 031.1.

## Acceptance criteria

- [x] On their profile, a member adds, edits, and deletes own projects: name, employer,
      customer, description (ET/EN), period, roles, hours, tasks (ET/EN), technologies,
      and the optional project details (total hours, cost, tender reference).
- [x] The period uses the day, month, and year input, and saving with Ongoing ticked
      clears the end date (carried from task 011.6).
- [x] Roles come from the role picker, replacing the free-text role (carried from task
      011.6).
- [x] Own projects are separate from the organization's: they don't appear in the project
      list, and only their owner sees them on the profile.

## Spec changes

- Added: `docs/specs/own-projects.md`, with requirements:
  - A member records own projects: `own-projects.added`,
    `own-projects.other-person-refused`.
  - Own projects stay private: `own-projects.not-in-project-list`.
  - Roles and periods as on participations: `own-projects.roles-from-catalogue`,
    `own-projects.ongoing-clears-end`.

## Outcome

- Own projects follow participations closely: rules in
  `src/server/profiles/own-projects.server.ts`, its repository beside it, and no function
  takes a profile ID. Another person's own project is `own_project_not_found`, and the
  first own project creates a member's profile when they have none.
- At least one role is required, as for participations; every seeded own project has
  one. Roles and technologies must be live catalogue entries.
- The prototype's free-text ET/EN role fields became the role picker, as the task asks.
  The period uses the shared period input instead of the prototype's MM-YYYY fields.
- The project details (tender reference, total hours, cost) sit in a collapsed
  `<details>`, as in the prototype; it opens on save when one of its numbers is invalid.
- The list shows the tasks, or the description when there are no tasks, under each own
  project, with an "Employer" badge when one is set.
- Checked in a browser against `prototypes/profile.html` (state `own-project`).
  `bun run test:e2e` passes, 15 tests.
