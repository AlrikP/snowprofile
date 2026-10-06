# Technical characteristics

Admins keep a checklist of yes/no questions that tenders ask about a project's solution,
such as automated tests or X-Road. Each project answers them, and the answers show as the
project's solution characteristics (`docs/product.md`, "Technical characteristics").

## Requirements

### Requirement: Admins manage the checklist

Admins must be able to add, rename, reorder, and remove characteristics. The checklist
must show the characteristics in their order, each with how many projects answered it.
Employees must not be able to see or change it.

#### Scenario: technical-characteristics.admin-adds

- **Given** an admin
- **When** they add a characteristic named only in Estonian
- **Then** it appears last in the checklist, marked as missing its English name

#### Scenario: technical-characteristics.admin-reorders

- **Given** an admin and a checklist of several characteristics
- **When** they move one up
- **Then** it swaps places with the one above it, and the new order stays after a reload

#### Scenario: technical-characteristics.employee-refused

- **Given** an employee
- **When** they open the technical characteristics page, or call its server functions
- **Then** the page sends them to their organization's start page, and the server refuses
  each call

### Requirement: A characteristic has a name

A characteristic must have a name in at least one of the two languages.

#### Scenario: technical-characteristics.name-required

- **Given** an admin adding or editing a characteristic
- **When** they save with both names empty
- **Then** the form asks for at least one language, and the server refuses such a
  characteristic

### Requirement: Removal keeps the answers

Removing a characteristic must take it off the checklist without deleting the projects'
answers to it. Before the admin confirms, the dialog must say how many projects answered
it.

#### Scenario: technical-characteristics.removed-answers-hidden

- **Given** a characteristic that projects answered
- **When** an admin removes it, after the dialog names how many projects answered it
- **Then** it leaves the checklist, and the projects' answers stay stored
