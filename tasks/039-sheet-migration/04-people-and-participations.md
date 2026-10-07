# 039.4: People and participations

Status: done
Depends on: task 039.3 (projects), task 031.1 (the role catalogue), task 028.2 (invitations)

Employees in the sheet have no accounts yet. They are matched by the company email
column added to the sheet before the migration (`docs/architecture.md`, "From the
sheet").

## Acceptance criteria

- [x] The script reads the company email column and finds or creates a `user` per address,
      lowercased, with no linked account. A person without an email goes to the report and
      isn't loaded.
- [x] For each person it loads the profile, education, participations with their roles and
      technologies, and own projects, and creates an `employee` invitation unless the
      user is already a member. Personal ID codes are skipped, never stored.
- [x] Google sign-in at an imported address signs in as that user: Better Auth links the
      Google account to the existing user, and accepting the invitation keeps the
      imported profile instead of creating one. A test covers both, and
      `docs/architecture.md` records the account linking setting it needs.
- [x] Roles fill the role catalogue with Estonian names; entries without an English name
      show as flagged on the roles page.
- [x] Participation project references resolve to projects; unresolved ones go to the
      report.
- [x] A participation outside its project's period is loaded and reported, except ongoing
      work on an ended project, which reads as ending with it (task 045).
- [x] A re-run matches people by email, updates their profiles and participations, and
      adds nothing twice.

## Spec changes

- Modified: `docs/specs/sheet-migration.md`, adding requirements:
  - People load by company email: `sheet-migration.people-loaded`,
    `sheet-migration.missing-email-reported`, `sheet-migration.id-code-skipped`,
    `sheet-migration.unresolved-project-reported` (which also covers work outside its
    project's period).
  - Imported people find their profile on first sign-in:
    `sheet-migration.profile-claimed`.

## Outcome

- `scripts/sheet-migration/people.ts` loads people after the projects, in the same
  transaction. The technology lookup moved from `projects.ts` to `catalogue.ts`, which
  also resolves roles, both following merges to the surviving entry, so both loaders share
  one view of the catalogues.
- Account linking needs no setting: Better Auth links a Google sign-in to an existing
  user when both sides say the address is verified, so the import creates users with
  `email_verified` set. The test stubs Google's token check and user info on the auth
  context and signs in through `signInSocial` with an ID token, the real linking path.
  Recorded in `docs/architecture.md`, "From the sheet".
- Re-run keys: people by email, education by institution and field, participations by
  project and start, own projects by name and start. Links (roles, technologies) are only
  added.
- A new participation copies the project's technologies, as the app does. Own projects
  get no roles (the sheet has none) and are reported for one; their characteristic answers
  and contact persons aren't kept, since the data model has no place for them.
- Invitations are created, not sent: the admin copies the links from the members page,
  as `docs/deployment.md` now says. They last 7 days; a later invitation from the members
  page replaces an expired one.
- Checked beyond the tests: the command run twice on a fresh local database with the
  fictional workbook. The first run loaded 1 person, 2 participations, and 1 own project
  and reported 13 values; the second updated everything and added nothing.
- Left for the parent task: the rehearsal on a copy of the real sheet with the emails
  added, against a local Compose stack.
