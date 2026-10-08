# 028: Members and invitations

Status: done

The members page: admins see the organization's members, change roles, and invite people
by email. Membership is by invitation only, Snowhound included (`docs/product.md`,
"Users and access", decided 2026-10-06). The organization plugin's endpoints
already exist; this task decides which of them the app calls, which task 021 needs.

Builds on: `docs/product.md` ("Members and roles", "Users and access");
`prototypes/members.html` (states `list`, `invite`, `link`, `last-admin`); tables
`member`, `invitation`, `employee_profile`; `src/lib/permissions.ts`.

## Subtasks

1. `01-member-list-and-roles.md`
2. `02-invitations.md`

## Acceptance criteria

- [x] All subtasks are done.
