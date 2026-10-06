# 039: Sheet migration

Status: in-progress

A one-off script, with no UI, that creates Snowhound's organization and loads
`Snowhound_CV_baas.xlsx` into it on the company stack. Re-running it updates matched
records instead of duplicating them, so it can be rehearsed, and it reports the values it
can't parse for an admin to fix in the app.

The sheet holds real personal data: it never enters the repository, and tests use a
fictional workbook with the same layout.

Builds on: `docs/product.md` ("Sheet migration", "Users and access": platform operator);
`docs/architecture.md` ("From the sheet", "Audit and deletion": `SYSTEM_USER_ID`); tables
`project` (`import_ref`, `normalized_name`), `technology` (`normalized_name`,
`merged_into_id`), and every table the sheet fills.

## Subtasks

1. `01-organization-script.md`
2. `02-parsing-and-report.md`
3. `03-projects-and-catalogues.md`
4. `04-people-and-participations.md`

## Acceptance criteria

- [ ] All subtasks are done.
- [ ] A rehearsal on a copy of the sheet, against a local Compose stack, runs twice with
      the same result; the Outcome records the report's size.
