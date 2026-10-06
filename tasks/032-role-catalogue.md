# 032: Role catalogue

Status: todo
Depends on: task 031.1 (the role tables), task 025 (bilingual field)

The roles page, where admins curate project roles, and the role picker that
participations and own projects use. It works like the technology catalogue (task 026).

Builds on: `docs/product.md` ("Role catalogue"); `prototypes/roles.html` (states `list`,
`add`, `edit`, `merge`), `profile.html` (states `role-search`, `add-role`); the tables
from task 031.1; permission `projectRole: ['create', 'curate']`.

## Acceptance criteria

- [ ] Admins see the roles with how many participations and own projects use each, and
      entries without an English name flagged.
- [ ] Anyone adds a role and must fill both names; a name matching a live entry is
      refused.
- [ ] Admins rename a role and merge duplicates; merging moves the links to the survivor.
- [ ] The role picker in `src/components/` searches both names, picks several roles, and
      adds a new one through a dialog.
- [ ] A repository with tenancy cases for every function.
- [ ] The route renders `RolesPage`, with `RolesPending`.

## Spec changes

- Added: `docs/specs/role-catalogue.md`, with requirements:
  - Anyone adds a role with both names: `role-catalogue.added`,
    `role-catalogue.both-names-required`, `role-catalogue.duplicate-refused`.
  - Admins curate: `role-catalogue.admin-renames`, `role-catalogue.merge-moves-links`,
    `role-catalogue.employee-cannot-curate`.
  - Missing English names are flagged: `role-catalogue.missing-english-flagged`.
