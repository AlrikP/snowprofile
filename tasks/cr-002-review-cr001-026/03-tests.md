# CR-002.3: Tests

Status: todo

## Acceptance criteria

- [ ] The role migration test applies only the migrations named before the role catalogue
      migration. Today it copies every other migration into its "before" folder
      (`src/db/roles.test.ts:100`). drizzle applies migrations by name, so a later
      migration that touches `project_role` would run first and fail.
- [ ] `technology-catalogue.grouped-by-category` checks one technology's exact people
      count, including a person who used it in both a participation and an own project.
      Today it only checks that some count is above 0
      (`src/server/technologies/technologies.test.ts:75`).
- [ ] An e2e test opens `/demo/technologies` and adds an entry, so the route's loader
      wiring is covered. Today no e2e test opens a data page.
