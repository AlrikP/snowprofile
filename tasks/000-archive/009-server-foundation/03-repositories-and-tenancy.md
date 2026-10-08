# 009.3: Repositories and tenancy

Status: done
Depends on: task 009.2 (the scope the repositories receive)

## Acceptance criteria

- [x] Repository modules are the only code that imports the database; each takes the
      organization scope and applies it to every query.
- [x] A test shows a user in organization A can't read or change organization B's data
      through any repository function.
- [x] Repository SQL follows the portability rule, and SQLite-only forms are noted.
- [x] `architecture.md` records the tenancy model (one database, row scoping by
      `organization_id`, enforced in repositories) and the repository pattern.
