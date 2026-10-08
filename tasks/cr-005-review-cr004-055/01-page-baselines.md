# CR-005.1: Page baselines and technology notes

Status: done

`bun run perf:pages` passes, and only pages that show notes send them (`review.md`,
finding 1).

## Acceptance criteria

- [x] The user decides whether the pickers' catalogue carries notes, and the decision is in
      task 051's Outcome. Today `listTechnologies`
      (`src/server/technologies/technologies.repository.server.ts:84`) returns every note
      to the search, CV, profile, and project form pages, whose pickers never show them.
- [x] `bun run perf:pages` passes twice in a row. Today it fails on search (HTML 39,296 to
      41,852 bytes, gzipped 8,764 to 9,997) and the team CV (56,373 to 58,929, gzipped
      10,862 to 12,094) against `perf/baselines/pages.json:17` and `:24`.
- [x] If the notes stay in the catalogue, the commit that updates `pages.json` says why the
      pages grew.

## Outcome

- The user decided that search filters and lists don't show notes, and the project form's
  picker does; task 056 adds that. Task 051's Outcome records it.
- `listTechnologies` no longer selects `note`. The new `listTechnologyNotes` returns the
  entries that have one, through `getTechnologyNotes` and `technologyNotesQuery`. Its key
  sits under the catalogue's, so the existing invalidations after an edit or merge
  refresh it.
- The technologies page loads both queries and passes the note to the edit dialog as
  `initialNote`.
- `perf:pages` passes twice without `--update`: the search and CV HTML are back at 39,296
  and 56,373 bytes. `pages.json` is unchanged, so the third criterion doesn't apply.
