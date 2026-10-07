# Sheet migration

A one-off script loads Snowhound's CV sheet (`Snowhound_CV_baas.xlsx`) into Snowhound's
organization. The sheet's values are free text, so the script reads what it can and
lists the rest for an admin to fix in the app.

## Requirements

### Requirement: Values that can't be parsed are reported

The script must read the sheet's dates, periods, hours, costs, project references, and
technologies in every form the sheet uses, and must list each value it can't read with
its sheet, cell, and the reason, when it ends.

#### Scenario: sheet-migration.unparsed-reported

- **Given** a sheet with a period written as "juuni-okt 2024", a reversed period, text
  beside an hour count, a date where a project number belongs, and an employee without
  a company email
- **When** the operator runs the script on it
- **Then** it prints each of those values with its sheet, cell, and reason

### Requirement: Projects load into the organization

The script must load the Projektid sheet into an existing organization, in one
transaction, as the system user: customers, contact persons, projects with their period,
size, cost, and tender reference, the projects' technologies, and their answers to the
technical characteristics. Estonian text must fill the Estonian fields. A project
without a readable start must go into the report instead. The script must refuse an
organization that doesn't exist, and a database that isn't a local file.

#### Scenario: sheet-migration.projects-loaded

- **Given** a sheet with projects, one of them with a start written as "juuni-okt 2024"
- **When** the operator runs the script for an existing organization
- **Then** the projects are in it with their customer, contact person, size, and answers,
  and the one without a readable start is in the report, not the organization

### Requirement: Technologies match the catalogue

A technology must match a live catalogue entry by its normalized name, and a name merged
into another entry must map to that entry. A new name must join the catalogue in the
category the sheet's prefix names, or "Other".

#### Scenario: sheet-migration.technologies-matched

- **Given** a catalogue with React, and Typescript merged into "TypeScript (TS)"
- **When** the sheet lists React, Typescript, and Redux under "Frontend:"
- **Then** the project links the existing React and "TypeScript (TS)", and Redux joins
  the Frontend category

### Requirement: A re-run updates

Running the script again must update what an earlier run loaded and add nothing twice, so
the migration can be rehearsed.

#### Scenario: sheet-migration.rerun-updates

- **Given** a sheet the script has loaded
- **When** the operator runs it again
- **Then** the projects are updated, and no project, customer, contact, technology,
  characteristic, link, or answer is added twice

### Requirement: People load by company email

The script must load each employee sheet with a company email: a user for the address,
with no linked account, the profile, education, participations with their roles, and own
projects, and an employee invitation unless the person is already a member. A sheet
without a company email must go into the report and not be loaded. The personal ID code
must never be stored. Work that names an unknown project, or that falls outside its
project's period, must go into the report. Roles must join the catalogue with their
Estonian names.

#### Scenario: sheet-migration.people-loaded

- **Given** an employee sheet with a company email, education, participations, and an own
  project
- **When** the operator runs the script
- **Then** the person is in the organization with all of it, their roles are in the
  catalogue without English names, and they have a pending invitation

#### Scenario: sheet-migration.missing-email-reported

- **Given** an employee sheet without a company email
- **When** the operator runs the script
- **Then** the report names the sheet, and the person isn't loaded

#### Scenario: sheet-migration.id-code-skipped

- **Given** an employee sheet with a personal ID code
- **When** the operator runs the script
- **Then** the code is stored nowhere

#### Scenario: sheet-migration.unresolved-project-reported

- **Given** a participation naming a project the sheet doesn't have, and one outside its
  project's period
- **When** the operator runs the script
- **Then** the first is reported and not loaded, and the second is loaded and reported

### Requirement: Imported people find their profile on first sign-in

When an imported employee first signs in with Google at their company address, the
session must belong to the imported user, and accepting their invitation must keep the
imported profile.

#### Scenario: sheet-migration.profile-claimed

- **Given** an imported employee who has never signed in
- **When** they sign in with Google at their company address and accept their invitation
- **Then** they are the imported user, with the imported profile, as an employee
