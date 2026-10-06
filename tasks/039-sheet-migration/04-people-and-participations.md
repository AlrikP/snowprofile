# 039.4: People and participations

Status: todo
Depends on: task 039.3 (projects), task 031.1 (the role catalogue), task 028.2 (invitations)

Employees in the sheet have no accounts yet. They are matched by the company email
column added to the sheet before the migration (`docs/architecture.md`, "From the
sheet").

## Acceptance criteria

- [ ] The script reads the company email column and finds or creates a `user` per address,
      lowercased, with no linked account. A person without an email goes to the report and
      isn't loaded.
- [ ] For each person it loads the profile, education, participations with their roles and
      technologies, and own projects, and creates an `employee` invitation unless the
      user is already a member. Personal ID codes are skipped, never stored.
- [ ] Google sign-in at an imported address signs in as that user: Better Auth links the
      Google account to the existing user, and accepting the invitation keeps the
      imported profile instead of creating one. A test covers both, and
      `docs/architecture.md` records the account linking setting it needs.
- [ ] Roles fill the role catalogue with Estonian names; entries without an English name
      show as flagged on the roles page.
- [ ] Participation project references resolve to projects; unresolved ones go to the
      report.
- [ ] A re-run matches people by email, updates their profiles and participations, and
      adds nothing twice.

## Spec changes

- Modified: `docs/specs/sheet-migration.md`, adding requirements:
  - People load by company email: `sheet-migration.people-loaded`,
    `sheet-migration.missing-email-reported`, `sheet-migration.id-code-skipped`,
    `sheet-migration.unresolved-project-reported`.
  - Imported people find their profile on first sign-in:
    `sheet-migration.profile-claimed`.
