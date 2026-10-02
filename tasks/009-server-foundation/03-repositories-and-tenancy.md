# 009.3: Repositories and tenancy

Status: todo
Depends on: task 009.2 (the scope the repositories receive)

## Acceptance criteria

- [ ] Repository modules are the only code that imports the database; each takes the
      organization scope and applies it to every query.
- [ ] A test shows a user in organization A can't read or change organization B's data
      through any repository function.
- [ ] Repository SQL follows the portability rule, and SQLite-only forms are noted.
- [ ] `architecture.md` records the tenancy model (one database, row scoping by
      `organization_id`, enforced in repositories) and the repository pattern.
