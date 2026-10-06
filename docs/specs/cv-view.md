# CV view

The CV page shows the CV that admins chose (`cv-selection.md`) as headings and tables, in
the CV's language, and copies it so it pastes into Word, Google Docs, or a spreadsheet
with its structure kept.

## Requirements

### Requirement: The CV as a table

A CV must show each person's name, birth date when chosen, and education, then their
projects as a table with the columns project, customer, period, role, size, and
technologies, headed in the CV's language. Text in the other language must be
highlighted. The page must say that the columns are provisional.

#### Scenario: cv-view.personal-table

- **Given** a person with an organization project and an own project
- **When** an admin views an English CV of them
- **Then** the page shows their name, birth date, and education, then a table with a row
  per project: the name and description, the customer, the period, the roles and tasks,
  the hours, and the technologies
- **And** an own project's name shows its employer

#### Scenario: cv-view.provisional-columns

- **Given** a CV on the page
- **When** an admin views it
- **Then** the page says the columns are provisional

### Requirement: Team layouts

A team CV must show either a table per person, the default, or one shared table, as the
admin chooses. The shared table must list a project once, with each person's roles,
tasks, and hours, the period from the earliest start to the latest end, and every
technology used.

#### Scenario: cv-view.table-per-person

- **Given** two people who worked on the same project
- **When** an admin views a CV of both
- **Then** each person has a heading and a table of their own parts, and the project is
  in both tables

#### Scenario: cv-view.combined-table

- **Given** two people who worked on the same project
- **When** an admin views a CV of both as one shared table
- **Then** the project is one row, with each person's roles, tasks, and hours
- **And** a CV of one person offers no choice of layout

### Requirement: Copying keeps the structure

"Copy table" must put the CV on the clipboard as HTML with inline styles, so the headings
and tables keep their structure and highlighting when pasted, and as plain text with
each table as tab-separated rows.

#### Scenario: cv-view.copy-html-and-text

- **Given** a CV on the page
- **When** an admin clicks "Copy table"
- **Then** the clipboard holds the CV as HTML with inline styles and as tab-separated text
- **And** the page says it was copied
