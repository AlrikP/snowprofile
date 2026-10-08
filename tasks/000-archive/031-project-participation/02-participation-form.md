# 031.2: Participation form

Status: done
Depends on: task 030 (the profile page), task 032 (role picker), task 025 (inputs)

## Acceptance criteria

- [x] On their profile, a member adds, edits, and deletes participations: project, period
      or ongoing, one or more roles, approximate hours, and tasks (ET/EN). The list shows
      newest first.
- [x] The period uses the day, month, and year input, and saving with Ongoing ticked
      clears the end date (carried from task 011.6).
- [x] Roles come from the role picker, which can add a new role with both names.
- [x] A person can have several participations on one project, for different periods or
      roles.
- [x] Only the person changes their participations; an admin's project edit never does.
- [x] "Edit my participation" on the project page opens that participation on the
      profile. Task 029.1 links to `/$organization/profile?participation=<id>`, and the
      profile route already validates the search param.

## Spec changes

- Added: `docs/specs/project-participation.md`, with requirements:
  - A member records their participations: `project-participation.added`,
    `project-participation.several-on-one-project`,
    `project-participation.other-person-refused`.
  - Roles from the catalogue: `project-participation.several-roles`,
    `project-participation.new-role-added`.
  - Periods: `project-participation.ongoing-clears-end`,
    `project-participation.end-before-start-refused`.

## Outcome

- Participations sit in the profiles domain (`participations.server.ts` and its
  repository in `src/server/profiles/`), since they belong to the profile. Like the rest of
  the profile, no function takes a profile ID: each works on the session user's, and an
  unknown ID or another person's participation is `participation_not_found`.
- A member without a profile gets one on their first participation, as with education
  (task 030). Each participation change also counts as a change to the profile.
- The project must be live and the roles live catalogue entries (`project_not_found`,
  `role_not_found`); at least one role is required. A participation on a deleted project
  leaves the profile list, as the project page already hides it.
- The project select lists every live project as "name (customer)". `projectsQuery`
  moved to `src/lib/project-list.ts`, since the projects pages and the profile now share it.
- The project page's link (`?participation=<id>`) opens that participation's dialog;
  closing it drops the search param, so a reload doesn't reopen it.
- The dialog has no technologies yet; task 031.3 adds them.
- Checked in a browser against `prototypes/profile.html` (states `participation`,
  `role-search`). `bun run test:e2e` passes, 15 tests, including the link from the
  project page.
