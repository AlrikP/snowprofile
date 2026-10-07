# Search

Admins find people by the technologies they used, their roles, the solution
characteristics of their projects, and, optionally, when, and go from the results to a CV. Results show each
person's matching participations and own projects (`docs/product.md`, "Search filters").

## Requirements

### Requirement: Search by technology and solution characteristic

An admin must be able to search by one or more technologies, one or more solution
characteristics, or both, and by roles ("Search by role"). Each is optional, but a search
must name at least one technology, role, or characteristic. The technology and role
pickers must offer only the catalogues' entries: search never adds to a catalogue.

Technologies match any or all, as the admin chooses. With all, a person matches when their
matching work together covers every chosen technology. A participation must match through
its own technologies, not its project's; own projects must count too, marked as own.

A participation matches the characteristics when its project answered yes to every chosen
one, and the same participation must match the chosen technologies. A characteristic
removed from the checklist no longer narrows a search. Own projects have no answers, so
they must be left out while characteristics are chosen.

#### Scenario: search.filter-required

- **Given** the search page
- **When** an admin searches with no technology, role, or characteristic
- **Then** the page asks for one, and the server refuses

#### Scenario: search.any-technology

- **Given** one person who used Kotlin and another who used Elixir
- **When** an admin searches for Kotlin or Elixir
- **Then** both are listed, each with the work that used one of them, and the chosen
  technologies marked

#### Scenario: search.all-technologies

- **Given** one person who used Zig and Elixir on different projects, and one who used
  only Zig
- **When** an admin searches for all of Zig and Elixir
- **Then** only the first person is listed, with both projects

#### Scenario: search.participation-technologies-only

- **Given** a project that lists Kotlin, and a participant whose own list doesn't
- **When** an admin searches for Kotlin
- **Then** the participant isn't listed for that participation

#### Scenario: search.own-projects-included

- **Given** a person whose own project used Kotlin
- **When** an admin searches for Kotlin
- **Then** the person is listed with the own project, marked as own

#### Scenario: search.pickers-catalogue-only

- **Given** the search page
- **When** an admin types a technology or role name that matches no entry
- **Then** the picker offers nothing to add

#### Scenario: search.characteristics-all

- **Given** one project with X-Road and containers, and another with X-Road only
- **When** an admin searches for X-Road and containers
- **Then** only the first project's participants are listed, with that project and its
  characteristics

#### Scenario: search.characteristics-only

- **Given** a project with X-Road
- **When** an admin searches for X-Road with no technology
- **Then** its participants are listed

#### Scenario: search.characteristics-with-technology

- **Given** a participant who used Kotlin on a project without containers
- **When** an admin searches for Kotlin and containers
- **Then** the participant isn't listed for that participation

#### Scenario: search.characteristics-own-projects-left-out

- **Given** a person whose own project used Kotlin
- **When** an admin searches for Kotlin and X-Road
- **Then** the own project isn't listed

### Requirement: Search by role

An admin must be able to search by one or more roles from the role catalogue. Work matches
when it has one of the chosen roles, and the same participation or own project must match
the chosen technologies and characteristics too. Results must mark the chosen roles. A role
merged into another no longer narrows a search; its work is found under the role that
stayed.

#### Scenario: search.role

- **Given** one person who was an architect on a project, and another who was only a
  developer
- **When** an admin searches for Architect
- **Then** only the first is listed, with that project and the role marked

#### Scenario: search.role-with-technology

- **Given** a person who was an architect on a project without Kotlin, and a developer on
  one with Kotlin
- **When** an admin searches for Architect and Kotlin
- **Then** the person isn't listed

#### Scenario: search.role-own-projects-included

- **Given** a person whose own project has the role Architect
- **When** an admin searches for Architect
- **Then** the person is listed with the own project, marked as own

### Requirement: Optional period

An admin can narrow the search to a period. Work matches when it overlaps the period: a
partial start reads as its first day, a partial end as its last, and ongoing work runs to
today. Ongoing work on a project that has ended ends with the project.

#### Scenario: search.period-overlap

- **Given** work that ended in December 2018, and ongoing work that started in 2025
- **When** an admin searches within 2019, and then from October 2026
- **Then** neither matches 2019, and only the ongoing work matches from October 2026

#### Scenario: search.ongoing-ends-with-project

- **Given** an ongoing participation on a project that ended in 2023
- **When** an admin searches from 2024
- **Then** the participation doesn't match

#### Scenario: search.partial-dates

- **Given** work from 31 December 2020 to February 2021
- **When** an admin searches within 2020
- **Then** the work matches, because 2020 runs to its last day

### Requirement: Leavers on request

Search must leave out people who have left, unless the admin asks for them; then they
show with their leaving date.

#### Scenario: search.leavers-hidden

- **Given** a leaver whose work matches
- **When** an admin searches
- **Then** the leaver isn't listed

#### Scenario: search.leavers-shown

- **Given** a leaver whose work matches
- **When** an admin searches with "Show leavers" ticked
- **Then** the leaver is listed with their leaving date

### Requirement: From results to a CV

The results must lead to CV selection with the people the admin chose, everyone but
leavers at first, and the same filter.

#### Scenario: search.make-cv

- **Given** search results for React from 2019, with a leaver among them
- **When** the admin chooses "Make CV"
- **Then** CV selection opens with the chosen people and the same technologies, match,
  and period

### Requirement: Admins only

Members who can't read every profile must not open the page, and the server must refuse
their searches.

#### Scenario: search.employee-refused

- **Given** an employee
- **When** they search
- **Then** the server refuses
