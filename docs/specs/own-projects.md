# Own projects

Projects that appear only on their owner's CV: work for an earlier employer, or several
engagements merged into one entry. A member keeps them on their profile, with the same
fields as an organization project and their own part in it.

## Requirements

### Requirement: A member records own projects

A member must be able to add, change, and delete their own projects: a name, an employer
and a customer, a description in Estonian and English, a period, roles, their hours and
tasks, technologies, and optionally the whole project's hours, cost, and tender reference.
Only the person must change their own projects: the server must change only the
signed-in user's, whatever the input names.

#### Scenario: own-projects.added

- **Given** a member on their profile
- **When** they add an own project with its fields and the optional project details
- **Then** their profile lists it with every field

#### Scenario: own-projects.other-person-refused

- **Given** another person's own project
- **When** a member sends a change or a delete naming it
- **Then** the server refuses, and the own project stays as it was

### Requirement: Own projects stay private

Own projects must stay apart from the organization's projects: they must not appear in
the project list, and only their owner sees them on the profile.

#### Scenario: own-projects.not-in-project-list

- **Given** a member's own project
- **When** an admin opens the project list, or their own profile
- **Then** neither shows the own project

### Requirement: Roles and periods as on participations

An own project's roles must come from the role catalogue, at least one. Its period must
follow the same rules as a participation's: the end empty while ongoing, and never before
the start.

#### Scenario: own-projects.roles-from-catalogue

- **Given** a member adding an own project
- **When** they save it without a role, or with a role the catalogue doesn't have
- **Then** the form asks for a role, and the server refuses

#### Scenario: own-projects.ongoing-clears-end

- **Given** an own project with an end date
- **When** the member ticks Ongoing and saves
- **Then** the end date is cleared
