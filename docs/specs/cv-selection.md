# CV selection

Admins make a CV of one person (a personal CV) or several (a team CV), in Estonian or
English, from all of their projects or only those matching technologies and a period. They
choose on the CV page, the CV read assembles the CV, and the table and the DOCX document
render what it returns.

## Requirements

### Requirement: Personal and team CVs

A CV of one person must list their education and projects, organization and own, with
their roles, periods, hours, tasks, and technologies, newest first. A team CV must list a
project several of the people worked on once, with each person's part. Members who can't
generate CVs must be refused.

#### Scenario: cv-selection.personal

- **Given** a person with education, two projects, and an own project
- **When** an admin reads a CV of them
- **Then** it has their education and the three projects, newest first, each with the
  person's roles, period, hours, tasks, and technologies

#### Scenario: cv-selection.team

- **Given** two people who worked on the same project
- **When** an admin reads a CV of both
- **Then** the project is listed once, with each person's part

#### Scenario: cv-selection.employee-refused

- **Given** an employee
- **When** they read a CV
- **Then** the server refuses

### Requirement: Leavers on request

The CV page must leave people who have left out of its people picker unless the admin
asks for them.

#### Scenario: cv-selection.leavers-hidden

- **Given** a person who has left
- **When** an admin looks for them in the CV page's people picker
- **Then** they aren't offered until the admin ticks "Show leavers"

### Requirement: Projects to include

A CV must include every project by default. When technologies or a period are chosen, it
must include only the work that used one of the technologies and overlaps the period, read
as in search. Own projects are included like organization projects.

#### Scenario: cv-selection.all-projects

- **Given** a person with three projects
- **When** an admin reads a CV without a filter
- **Then** all three are in

#### Scenario: cv-selection.filtered-by-technology

- **Given** a person who used Elixir on two of their three projects
- **When** an admin reads a CV filtered to Elixir
- **Then** only those two are in

#### Scenario: cv-selection.filtered-by-period

- **Given** a person with projects from 2016, 2018, and 2024
- **When** an admin reads a CV from 2024, and then one up to June 2017
- **Then** the first has only the 2024 project, the second only the 2016 one

#### Scenario: cv-selection.own-projects-included

- **Given** a person with an own project from an earlier employer
- **When** an admin reads a CV of them
- **Then** the own project is in, with its employer and customer

### Requirement: Language and missing translations

A CV must be in the chosen language. Text missing in that language must fall back to the
other, marked, and the read must list each missing translation with where it is fixed:
the project's form for a project description, the role catalogue for a role, and the
People page, where the person is asked to update, for what only they edit. The CV page
must show the list with a link to each fix, and still show the CV.

#### Scenario: cv-selection.language

- **Given** a project described only in Estonian, and tasks and roles in both languages
- **When** an admin reads an English CV
- **Then** the tasks and roles are in English, and the description is in Estonian, marked
  as a fallback

#### Scenario: cv-selection.missing-translations-listed

- **Given** a project description, a role, tasks, and education missing in English
- **When** an admin reads an English CV
- **Then** the read lists each, with where it is fixed, and an Estonian CV lists none
- **And** the CV page lists them with a link to each fix, above the CV with the Estonian
  text marked

### Requirement: Birth date only on request

A CV must include the birth date only when the admin asks for it.

#### Scenario: cv-selection.birth-date-opt-in

- **Given** a person with a birth date
- **When** an admin reads a CV without asking for it, and then asking for it
- **Then** the first has no birth date, the second has it
