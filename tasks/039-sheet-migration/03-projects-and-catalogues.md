# 039.3: Projects and catalogues

Status: todo
Depends on: task 039.1 (the organization), task 039.2 (parsing)

## Acceptance criteria

- [ ] The script (`bun run sheet:migrate <file> <slug>`) loads customers, contact persons,
      projects, project technologies, and tender criteria answers, as `SYSTEM_USER_ID`,
      in one transaction.
- [ ] Estonian text fills the `_et` columns.
- [ ] Technologies match live catalogue entries by `normalized_name`, and merged names
      map to the survivor; new names are added to the catalogue.
- [ ] Criteria answers beyond yes or no ("REST", "Both") keep the detail in the note.
- [ ] A re-run updates projects by `import_ref` and adds nothing twice; a test runs it
      twice on the fictional workbook.
- [ ] It refuses an organization that doesn't exist, and a database that isn't a local
      file.

## Spec changes

- Modified: `docs/specs/sheet-migration.md`, adding requirements:
  - Projects load into the organization: `sheet-migration.projects-loaded`,
    `sheet-migration.technologies-matched`.
  - A re-run updates: `sheet-migration.rerun-updates`.
