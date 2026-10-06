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

### Requirement: Admins edit projects

Admins must be able to create and change a project: its name, description in Estonian
and English, customer, period, tender reference, total hours, and cost. The customer is
an existing one or a new one added by name. Each save must record who made it and when.
Employees must not create, change, or delete projects.

#### Scenario: projects.admin-creates

- **Given** an admin
- **When** they create a project with a new customer, tender details, and a period
- **Then** the project lists for every member, with the new customer, and names the
  admin as its last change

#### Scenario: projects.admin-edits

- **Given** an admin and an existing project
- **When** they change its name, customer, description, and period
- **Then** the project shows the new values, and names the admin and the time as its last
  change

#### Scenario: projects.employee-cannot-edit

- **Given** an employee
- **When** they try to create, change, or delete a project, or open its edit form
- **Then** the server refuses

### Requirement: Periods as precise as known

A project's start and end must each be a day, a month, or a year, as precisely as they
are known, and the end must be empty while the project is ongoing. An end before the
start, compared at the end's precision, must be refused.

#### Scenario: projects.year-only-period

- **Given** an admin who knows only the year a project started
- **When** they save the project with the year alone
- **Then** the start is stored as that year, and the form says a year alone is vague in a
  CV

#### Scenario: projects.end-before-start-refused

- **Given** a project starting in 03-2024
- **When** an admin saves it with an end in 2023
- **Then** the form says the end can't be before the start, and the server refuses the
  period

#### Scenario: projects.ongoing-clears-end

- **Given** a project with an end date
- **When** an admin ticks Ongoing and saves
- **Then** the end date is cleared

### Requirement: Similar names are flagged

When a project's name normalizes like another project's name, the form must warn and
link to the other project, but still let the admin save.

#### Scenario: projects.similar-name-warned

- **Given** a project named "Võrguandmete platvorm"
- **When** an admin types "Võrguandmete-platvorm" as a project's name
- **Then** the form names the existing project with its customer and links to it, and
  saving still works

### Requirement: Deleted projects disappear

Deleting a project must remove it from every list, search, and CV, and its participations
must stop showing and stop counting. The rows stay stored, so a mistaken delete can be
undone by hand.

#### Scenario: projects.deleted-hidden

- **Given** a project with participations
- **When** an admin deletes it
- **Then** it leaves the project list, its page is not found, and the role catalogue no
  longer counts its participations

### Requirement: Contacts belong to the customer

Contact persons are the customer's: an admin adds them to the project's customer with a
name and, optionally, an email and a phone, and picks which of them are references for
the project. A project must link only contacts of its own customer. Changing the
project's customer must ask before removing the links to the old customer's contacts.

#### Scenario: projects.contact-added

- **Given** an admin editing a project with a stored customer
- **When** they add a contact person with a name and an email
- **Then** the contact is stored with the customer and ticked as the project's reference,
  and the project shows it after saving

#### Scenario: projects.contact-other-customer-refused

- **Given** a contact person of one customer
- **When** a project of another customer, or of none, is saved with that contact
- **Then** the server refuses

### Requirement: Contacts can stop being valid

An admin must be able to mark a contact person as no longer valid, with an optional note,
and to delete one. A deleted contact must leave the customer and every project. Only
admins must see former contacts, and whoever sees a former contact must see its note;
participants must see only the current contacts, without notes. The server must leave
the rest out of the response, not only the page.

#### Scenario: projects.contact-no-longer-valid

- **Given** a project's contact person
- **When** an admin marks them as no longer valid with a note
- **Then** the contact stays on the project for admins, marked as no longer valid, with
  the note

#### Scenario: projects.former-contacts-admin-only

- **Given** a project with a current contact and a former one, each with a note
- **When** a participant opens the project
- **Then** the response holds only the current contact, without its note, while an admin
  sees both contacts with their notes
