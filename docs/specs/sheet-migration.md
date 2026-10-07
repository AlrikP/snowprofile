# Sheet migration

A one-off script loads Snowhound's CV sheet (`Snowhound_CV_baas.xlsx`) into Snowhound's
organization. The sheet's values are free text, so the script reads what it can and
lists the rest for an admin to fix in the app.

## Requirements

### Requirement: Values that can't be parsed are reported

The script must read the sheet's dates, periods, hours, costs, project references, and
technologies in every form the sheet uses, and must list each value it can't read with
its sheet, cell, and the reason, when it ends.

#### Scenario: sheet-migration.unparsed-reported

- **Given** a sheet with a period written as "juuni-okt 2024", a reversed period, text
  beside an hour count, a date where a project number belongs, and an employee without
  a company email
- **When** the operator runs the script on it
- **Then** it prints each of those values with its sheet, cell, and reason
