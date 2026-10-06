# 039.1: Organization script

Status: done
Depends on: task 028.2 (invitations)

The MVP's platform operator: a script that creates an organization and invites its first
admin (`docs/product.md`, "Users and access"). Snowhound is the first use.

## Acceptance criteria

- [x] A script (`bun run org:create <slug> <name> <admin email>`) creates the organization,
      its technology categories, and an admin invitation, acting as `SYSTEM_USER_ID`, and
      prints the invitation link.
- [x] Re-running it for an existing slug changes nothing and says so.
- [x] It's bundled by `build:scripts`, so it runs in the app container; `docs/deployment.md`
      shows how.
- [x] `AGENTS.md` lists the command.

## Spec changes

- Added: `docs/specs/organizations.md`, if task 040 hasn't written it yet, or modified:
  - The operator creates organizations: `organizations.created-by-script`,
    `organizations.first-admin-invited`, `organizations.existing-slug-unchanged`.

## Outcome

- `createOrganization` (`src/server/organizations/organizations.server.ts`) does it in one
  transaction: the organization, six default technology categories (Frontend, Backend,
  Data, Infrastructure, Testing, Other, as in `docs/product.md`), and a 7-day admin
  invitation from `SYSTEM_USER_ID`. The script (`scripts/org-create.ts`) validates the
  arguments, runs it as the system user, and prints the link on `BETTER_AUTH_URL`.
- Slugs are lowercase words joined by hyphens, and the app's top-level routes (`api`,
  `invite`, `no-access`, `sign-in`) are refused, since an organization there would be
  unreachable.
- New repository functions: `organizations.findOrganizationBySlug` takes no scope (the
  operator belongs to no organization), `organizations.insertOrganization` takes the new
  ID from a scope built for it, and `technologies.insertCategories`. Each has a case in
  `tenancy.test.ts`.
- `docs/specs/organizations.md` is new with this task's three scenarios; task 040 adds
  the rest of the capability.
- An invitation that expires before the admin uses it can't be renewed by re-running the
  script, which leaves an existing slug alone. Renewing one is left for when it happens.
- Checked beyond the tests: the bundled `.output/server/scripts/org-create.js` run twice
  against a freshly migrated database, as the container runs it, created the
  organization once and printed the link once.
