# CV document

Admins download the CV they chose (`cv-selection.md`) as a DOCX document, from one
minimal built-in template, to submit with a tender.

## Requirements

### Requirement: A document per CV

"Download DOCX" must return a document with the chosen people, their education, and
their projects with roles, periods, hours, and technologies, in the CV's language. A
team CV must be one document that lists a shared project once, with each person's part.
The file name must name the person, or say it is a team CV, and give the date.

#### Scenario: cv-document.personal

- **Given** a person with education and projects
- **When** an admin downloads a CV of them
- **Then** the document opens with the person's name, then their education and a table
  of their projects with roles, periods, and technologies
- **And** the file is named `CV <name> <date>.docx`

#### Scenario: cv-document.team-shared-once

- **Given** two people who worked on the same project
- **When** an admin downloads a CV of both
- **Then** one document names both people and lists the project once, with each
  person's part
- **And** the file is named `Team CV <date>.docx`

#### Scenario: cv-document.language

- **Given** a team CV
- **When** an admin downloads it in Estonian
- **Then** the document's headings and file name are in Estonian

### Requirement: Admins only

The document must be served only to a signed-in member who can generate CVs, as on the
CV page.

#### Scenario: cv-document.employee-refused

- **Given** an employee, and a visitor who isn't signed in
- **When** they open a CV document's link
- **Then** the server refuses both
