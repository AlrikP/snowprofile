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
