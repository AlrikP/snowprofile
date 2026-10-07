# 039.3: Projects and catalogues

Status: done
Depends on: task 039.1 (the organization), task 039.2 (parsing)

## Acceptance criteria

- [x] The script (`bun run sheet:migrate <file> <slug>`) loads customers, contact persons,
      projects, project technologies, and tender criteria answers, as `SYSTEM_USER_ID`,
      in one transaction.
- [x] Estonian text fills the `_et` columns.
- [x] Technologies match live catalogue entries by `normalized_name`, and merged names
      map to the survivor; new names are added to the catalogue.
- [x] Criteria answers beyond yes or no ("REST", "Both") keep the detail in the note.
- [x] A re-run updates projects by `import_ref` and adds nothing twice; a test runs it
      twice on the fictional workbook.
- [x] It refuses an organization that doesn't exist, and a database that isn't a local
      file.

## Spec changes

- Modified: `docs/specs/sheet-migration.md`, adding requirements:
  - Projects load into the organization: `sheet-migration.projects-loaded`,
    `sheet-migration.technologies-matched`.
  - A re-run updates: `sheet-migration.rerun-updates`.

## Outcome

- `scripts/sheet-migrate.ts` checks the arguments, the database URL, and the organization,
  then runs `loadProjects` (`scripts/sheet-migration/projects.ts`) in one transaction as
  `SYSTEM_USER_ID`. It writes through Drizzle directly, as scripts may
  (`docs/architecture.md`, "Application rules"), so its matching rules stay in one file.
- Matching: projects by `import_ref` (the sheet number); customers by exact name; contact
  persons by normalized name within their customer; technologies by `normalized_name`,
  following `merged_into_id` to the live survivor; characteristics by normalized Estonian
  or English name. A new technology goes into the category its prefix names, or "Other".
- An answer reads as yes unless it is "Ei"/"No" or starts with one; anything beyond a
  plain yes or no stays in the note. These rules are in `docs/architecture.md`, "From the
  sheet".
- A re-run overwrites a project's fields from the sheet but only adds links, so it never
  drops a technology or contact added in the app since. The sheet's project header cell
  (`cell` on each read project) lets the report name projects it didn't load.
- The script is bundled into the image (`build:scripts`), and `docs/deployment.md` has
  the Compose command, with the sheet mounted read-only.
- Checked beyond the tests: the command run twice against a fresh local database on the
  fictional workbook, with 3 projects added and then 3 updated, nothing added. The report
  also lists the employee sheets' values, since the reader reads every sheet; task 039.4
  loads people.
