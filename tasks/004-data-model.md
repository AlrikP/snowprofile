# 004: Data model

Status: todo

Design the MVP's tables as a DBML diagram and review it before any migration exists.
The entities come from `docs/product.md` ("MVP scope", "Data and privacy"); the sheet's
data quality rules are in `docs/architecture.md` ("Data conventions"). snowtime's
`docs/migrations.md` ("SQL conventions") and `datamodel/` are the starting point.

## Acceptance criteria

- [ ] `datamodel/snowprofile.dbml` covers Organization, User, Membership (role),
      Invitation, Customer, ContactPerson, Project, ProjectTechnology, Technology,
      TechnologyCategory, TenderCriterion, ProjectCriterionAnswer, EmployeeProfile,
      Education, Participation, ParticipationTechnology, OwnProject, and UpdateRequest.
      Where Better Auth's organization plugin owns a table, the diagram uses its shape.
- [ ] Every tenant-owned table has a non-null `organization_id`, and references can't
      point into another organization (composite keys or an equivalent rule).
- [ ] Decided and recorded in `architecture.md`, "Data conventions", each with its
      reason: ID format, timestamps, month-precision periods with open ends, approximate
      numbers (value plus qualifier: approximately, more than), bilingual text fields,
      booleans, enums, JSON, audit columns (last changed by and at), and deletion.
- [ ] The conventions are portable to PostgreSQL, or each SQLite-only form is named
      (`architecture.md`, "Application rules").
- [ ] Contact persons can be marked as no longer valid; no column holds a personal ID
      code; birth date is optional.
- [ ] Own projects and their participation data live in a structure that keeps them off
      the organization's project list.
- [ ] `datamodel/README.md` says how to view the diagram (for example ChartDB, as in
      snowtime) and how it is maintained.
- [ ] The user has reviewed the diagram in the viewer; the matching open question in
      `architecture.md` is closed.
