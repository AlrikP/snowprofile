# 026: Technology catalogue

Status: todo

The technologies page: the organization's catalogue by category, where anyone adds an
entry and admins rename, recategorize, and merge duplicates. The task also builds the
technology picker (search, pick, add a missing entry) in `src/components/`, which
projects, participations, own projects, search, and CV selection use.

Builds on: `docs/product.md` ("Technology catalogue"); `prototypes/technologies.html`
(states `list`, `add`, `duplicate`, `edit`, `merge`); tables `technology_category`,
`technology` (`normalized_name`, `merged_into_id`), and the link tables
`project_technology`, `participation_technology`, `own_project_technology`; permission
`technology: ['create', 'curate']`.

## Acceptance criteria

- [ ] The page lists live technologies grouped by category, in category order, with how
      many projects and people use each.
- [ ] Anyone adds a technology with a name and a category. A name whose normalized form
      matches a live entry is refused, naming the existing entry.
- [ ] Admins rename and recategorize an entry; a rename that collides with another live
      entry is refused.
- [ ] Admins merge an entry into another in one transaction: its links move to the
      survivor without duplicates, `merged_into_id` is set, and the entry is soft-deleted.
- [ ] The technology picker searches by name, groups by category, and offers to add the
      typed name when nothing matches.
- [ ] A repository with tenancy cases for every function (`src/server/tenancy.test.ts`).
- [ ] The route renders `TechnologiesPage`, with `TechnologiesPending`.

## Spec changes

- Added: `docs/specs/technology-catalogue.md`, with requirements:
  - Catalogue by category: `technology-catalogue.grouped-by-category`.
  - Anyone adds an entry: `technology-catalogue.employee-adds`,
    `technology-catalogue.duplicate-refused`.
  - Admins curate: `technology-catalogue.admin-renames`,
    `technology-catalogue.admin-recategorizes`,
    `technology-catalogue.employee-cannot-curate`.
  - Merging keeps every use: `technology-catalogue.merge-moves-links`,
    `technology-catalogue.merged-hidden`.
