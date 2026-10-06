# 028.1: Member list and roles

Status: todo

## Acceptance criteria

- [ ] Admins see the members with name, email, role, and join date, marked "you" on their
      own row. Employees can't open the page.
- [ ] An admin changes a member's role between `admin` and `employee`; the check asks for
      the `member: ['update']` permission, not a role name.
- [ ] The last admin can't be made an employee, and the page says why
      (`last-admin` state).
- [ ] A member whose role changes while they're signed in gets the new role's navigation
      and page guards without a full reload. Today the frame, with the role, loads once
      per organization (`staleTime: Infinity` in `src/routes/$organization/route.tsx`).
      An admin demoted while on `/criteria` sees the server's `criterion_forbidden` error
      instead of the redirect that task 027 gives employees. For example, reload the frame
      when a server call returns `FORBIDDEN`.
- [ ] The route renders `MembersPage`, with `MembersPending`.

## Spec changes

- Added: `docs/specs/members-and-roles.md`, with requirements:
  - Admins see the members: `members-and-roles.admin-lists`,
    `members-and-roles.employee-refused`.
  - Admins change roles: `members-and-roles.role-changed`,
    `members-and-roles.employee-cannot-change-role`.
  - An organization keeps an admin: `members-and-roles.last-admin-kept`.
  - A role change applies while signed in: `members-and-roles.role-change-applied`.
