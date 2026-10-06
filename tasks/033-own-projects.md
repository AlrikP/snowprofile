# 033: Own projects

Status: todo
Depends on: task 030 (the profile page), task 032 (role picker), task 026 (technology picker), task 025 (inputs)

Projects that appear only on their owner's CV: from an earlier employer, or several
engagements merged into one.

Builds on: `docs/product.md` ("Own projects"); `prototypes/profile.html` (state
`own-project`); tables `own_project`, `own_project_technology`, and `own_project_role`
from task 031.1.

## Acceptance criteria

- [ ] On their profile, a member adds, edits, and deletes own projects: name, employer,
      customer, description (ET/EN), period, roles, hours, tasks (ET/EN), technologies,
      and the optional project details (total hours, cost, tender reference).
- [ ] The period uses the day, month, and year input, and saving with Ongoing ticked
      clears the end date (carried from task 011.6).
- [ ] Roles come from the role picker, replacing the free-text role (carried from task
      011.6).
- [ ] Own projects are separate from the organization's: they don't appear in the project
      list, and only their owner sees them on the profile.

## Spec changes

- Added: `docs/specs/own-projects.md`, with requirements:
  - A member records own projects: `own-projects.added`,
    `own-projects.other-person-refused`.
  - Own projects stay private: `own-projects.not-in-project-list`.
  - Roles and periods as on participations: `own-projects.roles-from-catalogue`,
    `own-projects.ongoing-clears-end`.
