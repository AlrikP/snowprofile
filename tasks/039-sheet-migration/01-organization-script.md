# 039.1: Organization script

Status: todo
Depends on: task 028.2 (invitations)

The MVP's platform operator: a script that creates an organization and invites its first
admin (`docs/product.md`, "Users and access"). Snowhound is the first use.

## Acceptance criteria

- [ ] A script (`bun run org:create <slug> <name> <admin email>`) creates the organization,
      its technology categories, and an admin invitation, acting as `SYSTEM_USER_ID`, and
      prints the invitation link.
- [ ] Re-running it for an existing slug changes nothing and says so.
- [ ] It's bundled by `build:scripts`, so it runs in the app container; `docs/deployment.md`
      shows how.
- [ ] `AGENTS.md` lists the command.

## Spec changes

- Added: `docs/specs/organizations.md`, if task 040 hasn't written it yet, or modified:
  - The operator creates organizations: `organizations.created-by-script`,
    `organizations.first-admin-invited`, `organizations.existing-slug-unchanged`.
