# Technology catalogue

Each organization keeps one list of technologies, grouped by category, which projects,
participations, own projects, search, and CVs pick from. Anyone in the organization adds a
missing entry; admins keep the list tidy by renaming, recategorizing, and merging
duplicates (`docs/product.md`, "Technology catalogue").

## Requirements

### Requirement: Catalogue by category

Every member must see the organization's live technologies grouped by category, in the
categories' order, with how many projects and people use each.

#### Scenario: technology-catalogue.grouped-by-category

- **Given** a catalogue with technologies in several categories
- **When** a member opens the technologies page
- **Then** each category lists its technologies, with the number of projects that list each
  and the number of people who used it

### Requirement: Anyone adds an entry

Every member must be able to add a technology with a name and a category. A name that
matches a live entry, ignoring case, spaces, and punctuation other than # and +, must be
refused.

#### Scenario: technology-catalogue.employee-adds

- **Given** an employee
- **When** they add a technology with a new name and a category
- **Then** it appears in the catalogue under that category

#### Scenario: technology-catalogue.duplicate-refused

- **Given** a catalogue with PostgreSQL
- **When** someone adds "postgre-sql"
- **Then** the addition is refused, and the dialog names the existing PostgreSQL

### Requirement: Admins curate

Admins must be able to rename an entry and move it to another category. A rename that
matches another live entry must be refused. Employees can't rename or move entries.

#### Scenario: technology-catalogue.admin-renames

- **Given** an admin
- **When** they rename an entry
- **Then** every project, participation, and own project that lists it shows the new name

#### Scenario: technology-catalogue.admin-recategorizes

- **Given** an admin
- **When** they move an entry to another category
- **Then** it appears under that category

#### Scenario: technology-catalogue.employee-cannot-curate

- **Given** an employee
- **When** they try to rename, move, or merge an entry
- **Then** the server refuses it, and the page offers them none of these actions

### Requirement: Merging keeps every use

Merging a duplicate into another entry must move every project, participation, and own
project that listed the duplicate to the entry that stays, without listing it twice, and
must take the duplicate out of the catalogue.

#### Scenario: technology-catalogue.merge-moves-links

- **Given** a duplicate listed on projects, participations, and own projects, some of which
  also list the entry that stays
- **When** an admin merges the duplicate into that entry
- **Then** each of them lists the entry that stays, once

#### Scenario: technology-catalogue.merged-hidden

- **Given** a merged duplicate
- **When** anyone opens the catalogue or a picker
- **Then** the duplicate isn't there

### Requirement: Pick or add from a form

A form that takes technologies must let people search the catalogue by name and pick
entries, and offer to add the typed name when nothing matches.

#### Scenario: technology-catalogue.picker-adds-missing

- **Given** a technology picker
- **When** someone types a name that matches no entry
- **Then** the picker offers to add that name to the catalogue
