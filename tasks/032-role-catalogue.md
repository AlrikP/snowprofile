# 032: Role catalogue

Status: done
Depends on: task 031.1 (the role tables), task 025 (bilingual field)

The roles page, where admins curate project roles, and the role picker that
participations and own projects use. It works like the technology catalogue (task 026).

Builds on: `docs/product.md` ("Role catalogue"); `prototypes/roles.html` (states `list`,
`add`, `edit`, `merge`), `profile.html` (states `role-search`, `add-role`); the tables
from task 031.1; permission `projectRole: ['create', 'curate']`.

## Acceptance criteria

- [x] Admins see the roles with how many participations and own projects use each, and
      entries without an English name flagged.
- [x] Anyone adds a role and must fill both names; a name matching a live entry is
      refused.
- [x] Admins rename a role and merge duplicates; merging moves the links to the survivor.
- [x] The role picker in `src/components/` searches both names, picks several roles, and
      adds a new one through a dialog.
- [x] A repository with tenancy cases for every function.
- [x] The route renders `RolesPage`, with `RolesPending`.

## Spec changes

- Added: `docs/specs/role-catalogue.md`, with requirements:
  - Anyone adds a role with both names: `role-catalogue.added`,
    `role-catalogue.both-names-required`, `role-catalogue.duplicate-refused`.
  - Admins curate: `role-catalogue.admin-renames`, `role-catalogue.merge-moves-links`,
    `role-catalogue.employee-cannot-curate`.
  - Missing English names are flagged: `role-catalogue.missing-english-flagged`.

## Outcome

- The roles page is admin-only, like `/criteria`: its loader sends anyone without
  `projectRole: ['curate']` to the organization's start page. Employees add roles only
  through the picker, so the catalogue read is open to every member.
- Both names are required on rename too, so an admin fills in a missing English name by
  renaming. Duplicates are found by the normalized Estonian name, the key of the unique
  index from task 031.1.
- `RoleDialog` in `src/components/` adds a role from the page or the picker, and renames
  one from the page. The picker fills the typed name into the field of the UI language.
  The picker offers a new role only when no entry has the typed name in either language.
- Nothing uses `RolePicker` yet; tasks 031.2 and 033 will. Its component tests keep knip
  satisfied, as with the technology picker.
- Left out: the prototype's "Possible duplicates" box. It finds near-duplicates, which
  task 042 plans for technologies; none of this task's criteria ask for it.
- The seeded organizations share their role names, so the tenancy case for
  `findRoleByName` adds a role only organization B has.
- Checked in a browser against `prototypes/roles.html`: the list and the edit dialog.
  `bun run test:e2e` passes, 11 tests.
