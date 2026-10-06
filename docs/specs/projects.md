# Projects

The organization's projects, which participations and CVs refer to. Every member sees the
list and each project's page; admins edit the projects. Tender details stay with admins
and the people who took part (`docs/product.md`, "Projects" and "Data and privacy").

## Requirements

### Requirement: Every member sees the projects

Every member must see the organization's live projects, newest first, each with its
customer, period, and technologies. A member must be able to narrow the list to the
projects they took part in.

#### Scenario: projects.list

- **Given** an organization with projects, one of them removed
- **When** a member opens the projects page
- **Then** it lists the live projects, newest first, with customer, period, and
  technologies, and leaves out the removed one

#### Scenario: projects.only-mine

- **Given** a member who took part in some of the projects
- **When** they narrow the list to their own projects
- **Then** only the projects they took part in remain

### Requirement: Tender details only for admins and participants

A project's cost, total hours, tender reference, and contact persons must show only to
admins and to the people who took part in it. For anyone else, the server must leave them
out of the response, and the page must say that they are hidden.

#### Scenario: projects.details-for-admin

- **Given** an admin who didn't take part in a project
- **When** they open the project
- **Then** they see its cost, total hours, tender reference, and contact persons

#### Scenario: projects.details-for-participant

- **Given** an employee who took part in a project
- **When** they open the project
- **Then** they see its tender details, and a link to edit their participation on their
  profile

#### Scenario: projects.details-hidden

- **Given** an employee who didn't take part in a project
- **When** they open the project
- **Then** the response holds none of its tender details, and the page says they are
  hidden

### Requirement: A project shows its people

A project's page must list the people who took part, with their roles and periods,
including people who have since left.

#### Scenario: projects.people-listed

- **Given** a project with several participations, one of them by a person who has left
- **When** a member opens the project
- **Then** each participation shows its person, roles, and period, the leaver marked as
  having left

### Requirement: A project shows its last change

A project's page must show who last changed the project and when.

#### Scenario: projects.last-change

- **Given** a project an admin changed
- **When** a member opens it
- **Then** the page names the admin and the time of the change
