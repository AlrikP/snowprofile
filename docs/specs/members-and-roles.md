# Members and roles

Who belongs to an organization, and with which role. Admins see the members on the
members page and change their roles; the role decides what each member may do
(`docs/architecture.md`, "Roles").

## Requirements

### Requirement: Admins see the members

Admins must see the organization's members, each with name, email, role, and join date,
their own row marked. Members who can't manage the members must not open the page, and
the server must refuse them the list.

#### Scenario: members-and-roles.admin-lists

- **Given** an organization with several members
- **When** an admin opens the members page
- **Then** it lists every member with name, email, role, and join date, and marks the
  admin's own row

#### Scenario: members-and-roles.employee-refused

- **Given** an employee
- **When** they ask for the member list
- **Then** the server refuses

### Requirement: Admins change roles

An admin must be able to change a member's role between admin and employee. The server
must check the permission to manage members, not a role name, and refuse anyone without
it.

#### Scenario: members-and-roles.role-changed

- **Given** an admin and an employee
- **When** the admin makes the employee an admin, and back
- **Then** the employee's role changes each time

#### Scenario: members-and-roles.employee-cannot-change-role

- **Given** an employee
- **When** they try to change a member's role
- **Then** the server refuses, and the role stays

### Requirement: An organization keeps an admin

An organization must always keep a member who can manage the members: the last admin
can't become an employee, and the page says why.

#### Scenario: members-and-roles.last-admin-kept

- **Given** an organization with one admin
- **When** that admin tries to make themselves an employee
- **Then** the page doesn't offer it and says why, and the server refuses

### Requirement: A role change applies while signed in

A member whose role changes while they're signed in must get the new role's navigation
and page guards without reloading the page.

#### Scenario: members-and-roles.role-change-applied

- **Given** a signed-in member with the admin pages in their navigation
- **When** an admin makes them an employee, and they open an admin page
- **Then** they land on their start page, and the admin pages leave their navigation
