# 031.2: Participation form

Status: todo
Depends on: task 030 (the profile page), task 032 (role picker), task 025 (inputs)

## Acceptance criteria

- [ ] On their profile, a member adds, edits, and deletes participations: project, period
      or ongoing, one or more roles, approximate hours, and tasks (ET/EN). The list shows
      newest first.
- [ ] The period uses the day, month, and year input, and saving with Ongoing ticked
      clears the end date (carried from task 011.6).
- [ ] Roles come from the role picker, which can add a new role with both names.
- [ ] A person can have several participations on one project, for different periods or
      roles.
- [ ] Only the person changes their participations; an admin's project edit never does.
- [ ] "Edit my participation" on the project page opens that participation on the
      profile.

## Spec changes

- Added: `docs/specs/project-participation.md`, with requirements:
  - A member records their participations: `project-participation.added`,
    `project-participation.several-on-one-project`,
    `project-participation.other-person-refused`.
  - Roles from the catalogue: `project-participation.several-roles`,
    `project-participation.new-role-added`.
  - Periods: `project-participation.ongoing-clears-end`,
    `project-participation.end-before-start-refused`.
