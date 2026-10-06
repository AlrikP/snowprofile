# Role catalogue

Each organization keeps one list of project roles, such as arendaja / developer, which
participations and own projects pick from. A CV shows a role's name in the CV's language.
Anyone in the organization adds a missing role; admins keep the list tidy by renaming
roles and merging duplicates (`docs/product.md`, "Role catalogue").

## Requirements

### Requirement: Anyone adds a role with both names

Every member must be able to add a role, with an Estonian and an English name. A role
whose Estonian name matches a live entry, ignoring case, spaces, and punctuation other
than `#` and `+`, must be refused.

#### Scenario: role-catalogue.added

- **Given** an employee picking roles
- **When** they add a role with both names
- **Then** it joins the catalogue and is picked

#### Scenario: role-catalogue.both-names-required

- **Given** someone adding or renaming a role
- **When** they leave either name empty
- **Then** the form doesn't save, and the server refuses such a role

#### Scenario: role-catalogue.duplicate-refused

- **Given** a catalogue with Arendaja
- **When** someone adds a role named "arendaja "
- **Then** the addition is refused, and the dialog names the existing entry

### Requirement: Admins curate

Admins must be able to rename a role and merge a duplicate into the role that stays.
Merging must move every participation and own project that listed the duplicate to the
survivor, listing it once. Employees must not be able to rename or merge, and the roles
page must send them to their organization's start page.

#### Scenario: role-catalogue.admin-renames

- **Given** an admin
- **When** they rename a role
- **Then** the new names show in the catalogue

#### Scenario: role-catalogue.merge-moves-links

- **Given** a duplicate role used by participations and own projects, some of which also
  list the role that stays
- **When** an admin merges the duplicate into it
- **Then** each of those participations and own projects lists the survivor once, and the
  duplicate leaves the catalogue

#### Scenario: role-catalogue.employee-cannot-curate

- **Given** an employee
- **When** they open the roles page, or call the rename or merge server functions
- **Then** the page sends them to their organization's start page, and the server refuses
  each call

### Requirement: Missing English names are flagged

Roles from the sheet migration can lack an English name. The roles page must show each
role's uses and flag a missing English name, so an admin can fill it in.

#### Scenario: role-catalogue.missing-english-flagged

- **Given** a role without an English name
- **When** an admin opens the roles page
- **Then** its row is marked as missing the English name
