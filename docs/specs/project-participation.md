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
server must change only the signed-in user's, whatever the input names.

#### Scenario: project-participation.added

- **Given** a member and a live project
- **When** they add a participation with a period, a role, hours, and tasks
- **Then** their profile lists it, and the project's page lists them as a participant

#### Scenario: project-participation.several-on-one-project

- **Given** a member with a participation on a project
- **When** they add another participation on the same project, for another period
- **Then** their profile lists both

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
empty while the participation is ongoing, and an end before the start must be refused.

#### Scenario: project-participation.ongoing-clears-end

- **Given** a participation with an end date
- **When** the member ticks Ongoing and saves
- **Then** the end date is cleared

#### Scenario: project-participation.end-before-start-refused

- **Given** a participation starting in 05-2024
- **When** the member saves it with an end in 03-2024
- **Then** the form says the end can't be before the start, and the server refuses the
  period
