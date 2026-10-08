# CR-005.1: Page baselines and technology notes

Status: todo

`bun run perf:pages` passes, and only pages that show notes send them (`review.md`,
finding 1).

## Acceptance criteria

- [ ] The user decides whether the pickers' catalogue carries notes, and the decision is in
      task 051's Outcome. Today `listTechnologies`
      (`src/server/technologies/technologies.repository.server.ts:84`) returns every note
      to the search, CV, profile, and project form pages, whose pickers never show them.
- [ ] `bun run perf:pages` passes twice in a row. Today it fails on search (HTML 39,296 to
      41,852 bytes, gzipped 8,764 to 9,997) and the team CV (56,373 to 58,929, gzipped
      10,862 to 12,094) against `perf/baselines/pages.json:17` and `:24`.
- [ ] If the notes stay in the catalogue, the commit that updates `pages.json` says why the
      pages grew.
