# CR-004.2: Docs and a scenario test

Status: todo

The docs and open tasks match the code, and a test checks every part of
`project-participation.ongoing-ends-with-project` (`review.md`, finding 2 and "Doc
drift").

## Acceptance criteria

- [ ] A component test citing `project-participation.ongoing-ends-with-project` opens the
      edit dialog for a participation read with its project's end, and finds Ongoing
      unticked and that end filled in. Today only the server test at
      `src/server/profiles/participations.test.ts:243` cites it, and it checks the reads,
      not the form.
- [ ] `docs/architecture.md`, "Technology duplicates", gives the number of intended pairs
      that `technology-duplicates.test.ts` holds. Today it says 25 (`:212`, `:215`), and
      the test's `INTENDED` list has 22. If three pairs were dropped by mistake, add them
      to the test instead.
- [ ] `docs/architecture.md` lists `perf/` in "Repository layout" (`:49`) and among the
      places in "Application rules" (`:316`) that may build queries, as `AGENTS.md` and
      `.oxlintrc.json` allow.
- [ ] The intro of `docs/specs/cv-selection.md` names roles and characteristics among the
      filters. Today it says "technologies and a period" (`:4`).
- [ ] Task 048 lists `r` among the search keys and no longer says task 046.2 will add
      roles (`tasks/048-url-search-params.md:27`).
- [ ] Task 042's archived `README.md` has the acceptance criterion and the Outcome section
      the other parent tasks have.
