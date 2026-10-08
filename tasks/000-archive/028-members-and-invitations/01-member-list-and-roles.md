# 028.1: Member list and roles

Status: done

## Acceptance criteria

- [x] Admins see the members with name, email, role, and join date, marked "you" on their
      own row. Employees can't open the page.
- [x] An admin changes a member's role between `admin` and `employee`; the check asks for
      the `member: ['update']` permission, not a role name.
- [x] The last admin can't be made an employee, and the page says why
      (`last-admin` state).
- [x] A member whose role changes while they're signed in gets the new role's navigation
      and page guards without a full reload. Today the frame, with the role, loads once
      per organization (`staleTime: Infinity` in `src/routes/$organization/route.tsx`).
      An admin demoted while on `/criteria` sees the server's `criterion_forbidden` error
      instead of the redirect that task 027 gives employees. For example, reload the frame
      when a server call returns `FORBIDDEN`.
- [x] The route renders `MembersPage`, with `MembersPending`.

## Spec changes

- Added: `docs/specs/members-and-roles.md`, with requirements:
  - Admins see the members: `members-and-roles.admin-lists`,
    `members-and-roles.employee-refused`.
  - Admins change roles: `members-and-roles.role-changed`,
    `members-and-roles.employee-cannot-change-role`.
  - An organization keeps an admin: `members-and-roles.last-admin-kept`.
  - A role change applies while signed in: `members-and-roles.role-change-applied`.

## Outcome

- The list and the role change are the app's own server functions in
  `src/server/members/`, not the organization plugin's endpoints, so the "keep an admin"
  rule and the tenancy checks apply like everywhere else. The plugin's
  `update-member-role` would skip the rule, so it is now closed over HTTP in every mode
  (`docs/architecture.md`, "Roles"). Task 021 decides the rest of the plugin's endpoints.
- "Admin" in the rule means a member with `member: ['update']`, checked with
  `roleHasPermission` on each member's stored role, so a future role needs no change. The
  members page and its navigation entry now ask for that permission too (the navigation
  asked for `member: ['create']`, which task 028.2's invite needs).
- A role change while signed in: `src/lib/forbidden-reload.ts` reloads the router's
  loaders when any query or mutation answers `FORBIDDEN`, at most once in ten seconds.
  The fresh frame then drives the navigation and the page guards. An e2e test demotes the
  employee mid-session and checks the redirect.
- The role label moved to `src/lib/member-role.ts`, shared with the organization
  switcher.
- The demo organization has two admins, so the last-admin state only shows in tests.
- Checked in a browser against `prototypes/members.html` (state `list`).
  `bun run test:e2e` passes, 16 tests.
