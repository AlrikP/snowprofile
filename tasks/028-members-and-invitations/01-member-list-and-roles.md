# 028.1: Member list and roles

Status: todo

## Acceptance criteria

- [ ] Admins see the members with name, email, role, and join date, marked "you" on their
      own row. Employees can't open the page.
- [ ] An admin changes a member's role between `admin` and `employee`; the check asks for
      the `member: ['update']` permission, not a role name.
- [ ] The last admin can't be made an employee, and the page says why
      (`last-admin` state).
- [ ] The route renders `MembersPage`, with `MembersPending`.

## Spec changes

- Added: `docs/specs/members-and-roles.md`, with requirements:
  - Admins see the members: `members-and-roles.admin-lists`,
    `members-and-roles.employee-refused`.
  - Admins change roles: `members-and-roles.role-changed`,
    `members-and-roles.employee-cannot-change-role`.
  - An organization keeps an admin: `members-and-roles.last-admin-kept`.
