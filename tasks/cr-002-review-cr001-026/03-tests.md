# CR-002.3: Tests

Status: done

## Acceptance criteria

- [x] The role migration test applies only the migrations named before the role catalogue
      migration. Today it copies every other migration into its "before" folder
      (`src/db/roles.test.ts:100`). drizzle applies migrations by name, so a later
      migration that touches `project_role` would run first and fail.
- [x] `technology-catalogue.grouped-by-category` checks one technology's exact people
      count, including a person who used it in both a participation and an own project.
      Today it only checks that some count is above 0
      (`src/server/technologies/technologies.test.ts:75`).
- [x] An e2e test opens `/demo/technologies` and adds an entry, so the route's loader
      wiring is covered. Today no e2e test opens a data page.

## Outcome

- The role migration test copies the migrations named before the role catalogue for its
  "before" run, and those through it for the second run, so a later migration can't run
  in the middle. A throwaway later migration that alters `project_role` broke the old
  version and leaves the new one passing.
- `technology-catalogue.grouped-by-category` adds its own technology: one person uses it
  in a participation and an own project, another in a participation, and one project
  lists it. It expects 1 project and 2 people. Counting each use instead of each person
  gives 3 and fails the test.
- The e2e test signs in as the employee, adds an entry through the dialog on
  `/demo/technologies`, and reloads the page so the entry also arrives through the
  server-rendered loader. It cites `technology-catalogue.employee-adds`.
- `bun run test:e2e` passes, 8 tests.
