# 026: Technology catalogue

Status: done

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

- [x] The page lists live technologies grouped by category, in category order, with how
      many projects and people use each.
- [x] Anyone adds a technology with a name and a category. A name whose normalized form
      matches a live entry is refused, naming the existing entry.
- [x] Admins rename and recategorize an entry; a rename that collides with another live
      entry is refused.
- [x] Admins merge an entry into another in one transaction: its links move to the
      survivor without duplicates, `merged_into_id` is set, and the entry is soft-deleted.
- [x] The technology picker searches by name, shows each option's category, and offers to
      add the typed name when nothing matches.
- [x] A repository with tenancy cases for every function (`src/server/tenancy.test.ts`).
- [x] The route renders `TechnologiesPage`, with `TechnologiesPending`.

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
  - Pick or add from a form: `technology-catalogue.picker-adds-missing` (added while
    building the picker, so its behavior has a scenario).

## Outcome

- The first data feature, so it sets the client pattern: the route's loader fills the
  TanStack Query cache (`ensureQueryData`), taking the organization from the
  `/$organization` loader through `parentMatchPromise`; the page reads it with
  `useSuspenseQuery`; mutations invalidate the query. No optimistic updates yet: every
  write here changes counts or groups the client can't compute, so a refetch is simpler.
- The catalogue query, `findDuplicate`, and `categoryName` are in
  `src/lib/technology-catalogue.ts`, and the add dialog and the picker in
  `src/components/`, because later features (projects, participations, search, CV) use
  them. `normalizeName` moved to `src/lib/normalize-name.ts`, shared with the seed.
- Drizzle leaves out table names in a one-table select, so a correlated subquery written
  with column objects compared a column with itself and every count was 0. The count
  subqueries are plain SQL with aliases; the rule test caught it.
- A merge moves links with `INSERT … SELECT … ON CONFLICT DO NOTHING`, then deletes the old
  ones, and re-points entries merged into the duplicate earlier, so `merged_into_id` never
  chains.
- The seed's merged "Postgres" entry had `merged_into_id` but wasn't soft-deleted, so it
  showed as a live entry with no uses. The generator now soft-deletes it, as the data model
  says.
- The prototype's near-duplicate suggestions (Postgres → PostgreSQL, "Add anyway") need a
  matching rule that doesn't pair Java with JavaScript; they went to task 042.
- Checked in a browser on the production build with the seeded database, as admin and
  employee, at 1440 and 390 pixels wide: the grouped list, the duplicate warning, adding,
  and merging; no console errors. shadcn's `dialog`, `card`, and `alert` were added.
