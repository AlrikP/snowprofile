# Project participation

A person's work on one of the organization's projects: when, in which roles, about how
many hours, and what they did. Each member keeps their own participations on their
profile; the project's page lists them, and CVs are built from them.

## Requirements

### Requirement: A member records their participations

A member must be able to add, change, and delete their own participations: a live
project, a period, one or more roles, approximate hours, and their tasks in Estonian and
English. Their profile must list them newest first. A member can have several
participations on one project. Only the person must change their participations: the
server must change only the signed-in user's, whatever the input names. A participation
must keep its project once saved, so the record of who took part in a project, which
shows its tender details (`projects.md`), can't be rewritten.

#### Scenario: project-participation.added

- **Given** a member and a live project
- **When** they add a participation with a period, a role, hours, and tasks
- **Then** their profile lists it, and the project's page lists them as a participant

#### Scenario: project-participation.several-on-one-project

- **Given** a member with a participation on a project
- **When** they add another participation on the same project, for another period
- **Then** their profile lists both

#### Scenario: project-participation.project-kept

- **Given** a saved participation
- **When** the member edits it
- **Then** the form shows its project without letting them change it, and the server
  keeps the project whatever the change names

#### Scenario: project-participation.other-person-refused

- **Given** another person's participation
- **When** a member sends a change or a delete naming it
- **Then** the server refuses, and the participation stays as it was

### Requirement: Roles from the catalogue

A participation must have at least one role from the role catalogue, and can have
several. A member can add a missing role to the catalogue from the form, with both
names, and use it at once.

#### Scenario: project-participation.several-roles

- **Given** a member editing a participation with one role
- **When** they add a second role and save
- **Then** the participation keeps both roles

#### Scenario: project-participation.new-role-added

- **Given** a role the catalogue doesn't have
- **When** a member adds it from the form and saves the participation
- **Then** the participation has the new role

### Requirement: Periods

A participation's start and end must each be a day, a month, or a year. The end must be
empty while the participation is ongoing, and an end before the start must be refused. The
form must show the chosen project's period, so the member can see when the project ran.

The period must lie within the project's, each pair of dates compared at the coarser
precision; an ongoing project has no end limit, and a participation must not be saved as
ongoing on a project that has ended. A period outside the project's must be refused
(`docs/product.md`, "Participation periods"). An ongoing participation saved before its
project ended must read everywhere as ending with the project, while its stored end stays
empty.

#### Scenario: project-participation.project-period-shown

- **Given** a project running from 03-2024 to 06-2025
- **When** a member picks it in the participation form
- **Then** the form shows the project's period

#### Scenario: project-participation.before-project-start-refused

- **Given** a project starting in 03-2024
- **When** a member saves a participation on it starting in 01-2024
- **Then** the form says the participation can't start before the project, and the
  server refuses the period

#### Scenario: project-participation.after-project-end-refused

- **Given** a project ending in 06-2025
- **When** a member saves a participation on it ending in 09-2025, or ongoing
- **Then** the form says it can't end after the project, or be ongoing, and the server
  refuses the period

#### Scenario: project-participation.coarser-date-accepted

- **Given** a project starting in 03-2024
- **When** a member saves a participation on it starting in 2024
- **Then** the participation is saved

#### Scenario: project-participation.ongoing-ends-with-project

- **Given** an ongoing participation on a project
- **When** an admin sets the project's end to 06-2025
- **Then** the profile, the project page, and the CV show the participation ending in
  06-2025, and its edit form opens with that end

#### Scenario: project-participation.ongoing-clears-end

- **Given** a participation with an end date
- **When** the member ticks Ongoing and saves
- **Then** the end date is cleared

#### Scenario: project-participation.end-before-start-refused

- **Given** a participation starting in 05-2024
- **When** the member saves it with an end in 03-2024
- **Then** the form says the end can't be before the start, and the server refuses the
  period

### Requirement: Technologies start from the project's

A participation's technologies appear in the person's CV, so they are the person's own
list. A new participation must start with a copy of the project's technologies, which the
person trims and adds to with the technology picker. Later changes to the project's
technologies must never change a saved participation (`docs/product.md`, "Technologies on
projects and participations").

#### Scenario: project-participation.technologies-prefilled

- **Given** a project with technologies
- **When** a member starts a new participation on it
- **Then** the form lists the project's technologies, and saves the list as the member
  leaves it

#### Scenario: project-participation.own-copy

- **Given** a saved participation with its technologies
- **When** an admin changes the project's technologies
- **Then** the participation keeps its own list

### Requirement: Missing project technologies are suggested

When a member edits a participation, the form must offer the project's technologies that
the participation lacks, each added with one click. The suggestions are computed when
shown; nothing records them.

#### Scenario: project-participation.project-technologies-suggested

- **Given** a participation that lacks one of the project's technologies
- **When** the member edits it
- **Then** the form offers that technology under "Also on the project", and adding it
  removes the suggestion
