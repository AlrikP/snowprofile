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

### Requirement: Pickers suggest before typing

A technology picker must suggest entries when its empty field gets focus or a click, so a
person sees what the catalogue holds: on a participation, the project's technologies the
person hasn't chosen first, then the entries most projects use. Typing narrows the list
as before.

#### Scenario: technology-catalogue.picker-suggests

- **Given** a participation on a project with technologies, one of them already chosen
- **When** the person focuses the empty technology field
- **Then** the list shows the project's other technologies first, then the most used
  entries, without the chosen one

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

### Requirement: Admins describe an entry

An admin must be able to add, change, and clear a plain-text note on an entry, up to
1,000 characters: what it covers, why it isn't a duplicate of a look-alike, or links to
its documentation. Every member must see the note on the technologies page, with links
that start with `https://` clickable and no other kind of link. Employees must not change
notes.

#### Scenario: technology-catalogue.note-edited

- **Given** an admin and an entry without a note
- **When** they write a note with an https link in the edit dialog, and later clear it
- **Then** the technologies page shows the note with the link clickable, and then no note

#### Scenario: technology-catalogue.employee-cannot-edit-note

- **Given** an employee
- **When** they send a change to an entry's note
- **Then** the server refuses, and the note stays as it was

### Requirement: Merging keeps every use

Merging a duplicate into another entry must move every project, participation, and own
project that listed the duplicate to the entry that stays, without listing it twice, and
must take the duplicate out of the catalogue. The duplicate's note, named, goes below the
note of the entry that stays.

#### Scenario: technology-catalogue.merge-moves-links

- **Given** a duplicate listed on projects, participations, and own projects, some of which
  also list the entry that stays
- **When** an admin merges the duplicate into that entry
- **Then** each of them lists the entry that stays, once

#### Scenario: technology-catalogue.merge-keeps-notes

- **Given** two entries with notes
- **When** an admin merges one into the other
- **Then** the survivor's note is followed by the merged entry's name and note

#### Scenario: technology-catalogue.merged-hidden

- **Given** a merged duplicate
- **When** anyone opens the catalogue or a picker
- **Then** the duplicate isn't there

### Requirement: Pick or add from a form

A form that takes technologies must let people search the catalogue by name and pick
entries, and offer to add the typed name when nothing matches. A picker that only filters,
as in search and CV selection, offers only the catalogue's entries.

#### Scenario: technology-catalogue.picker-adds-missing

- **Given** a technology picker
- **When** someone types a name that matches no entry
- **Then** the picker offers to add that name to the catalogue

### Requirement: Near-duplicates are suggested

Admins must see the catalogue's near-duplicate pairs, such as Postgres and PostgreSQL, each
with both entries' uses, so they can merge one into the other or mark the pair "Not a
duplicate". A pair marked so must never be suggested again. Employees must not see the
suggestions.

Adding an entry, or renaming one, to a near-duplicate of a live entry must warn and name
that entry, and must still let the user go on. A rename must not warn about an entry it is
marked "Not a duplicate" of.

#### Scenario: technology-catalogue.near-duplicates-listed

- **Given** a catalogue with Postgres and PostgreSQL
- **When** an admin opens the technologies page and chooses Merge on the pair
- **Then** the merge dialog opens for Postgres with PostgreSQL chosen as the entry that
  stays

#### Scenario: technology-catalogue.near-duplicate-dismissed

- **Given** a suggested pair of two different technologies, such as Angular and AngularJS
- **When** an admin marks it "Not a duplicate"
- **Then** the pair leaves the suggestions and stays out after a reload

#### Scenario: technology-catalogue.near-duplicate-warned

- **Given** a catalogue with React
- **When** someone adds React.js
- **Then** the dialog warns that React is already in the catalogue and may be the same
  technology
- **And** "Add anyway" adds React.js
