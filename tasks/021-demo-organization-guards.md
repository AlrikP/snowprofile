# 021: Demo organization guards

Status: todo

After the MVP, and before a demo stack is deployed (`docs/architecture.md`, "Environments
and deployment"). In demo mode, the seeded accounts are shared and their password is
public. Task cr-001.2 blocked Better Auth's self-service account endpoints, but the
organization plugin's endpoints stay open. The demo admin can remove members, change
roles, rename the organization, or invite others. One visitor's change then affects all
the others.

Decide which organization actions a demo visitor may take. The admin features are part
of the demo, so blocking every write may hide what the product does. Alternatives
include a scheduled `db:seed --reset` or limits on the demo organizations. The decision
depends on how the MVP's admin features use these endpoints.

## Acceptance criteria

- [ ] `docs/architecture.md` ("Sign-in modes") records which organization actions demo
      mode allows and how the demo data recovers from visitor changes.
- [ ] In demo mode, the organization endpoints that aren't allowed are refused over HTTP,
      and a test covers at least removing a member and changing a role.
- [ ] A visitor can't remove the seeded admin or employee from a demo organization, or
      change their roles.
