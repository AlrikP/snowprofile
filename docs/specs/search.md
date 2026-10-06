# Search

Admins find people by the technologies they used and, optionally, when, and go from the
results to a CV. Results show each person's matching participations and own projects.

## Requirements

### Requirement: Search by technology

An admin must be able to search by one or more technologies, matching any of them or all
of them. With all, a person matches when their matching work together covers every chosen
technology. A participation must match through its own technologies, not its project's;
own projects must count too, marked as own.

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

### Requirement: Optional period

An admin can narrow the search to a period. Work matches when it overlaps the period: a
partial start reads as its first day, a partial end as its last, and ongoing work runs to
today.

#### Scenario: search.period-overlap

- **Given** work that ended in December 2018, and ongoing work that started in 2025
- **When** an admin searches within 2019, and then from October 2026
- **Then** neither matches 2019, and only the ongoing work matches from October 2026

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
