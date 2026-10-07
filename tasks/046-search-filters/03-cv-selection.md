# 046.3: Filter CVs by role and characteristics

Status: done
Depends on: task 046.2 (the role and characteristic filters in search)

"Make CV" passes the search's roles and characteristics to CV selection, and the CV
includes only the work the whole filter matches, read as in search (task 046, decision
6). CV selection can also set them itself, as it does technologies and a period.

## Acceptance criteria

- [x] `CvInput` (`src/server/cvs/cvs.schemas.ts`) takes role and characteristic IDs, and
      the DOCX link (`cvDocumentHref`) carries them, so the download matches the screen.
- [x] The CV page's filter offers roles and characteristics, read from and written to its
      search params.
- [x] Search and CV selection share one matching rule, so a person's work in the search
      results is the work their CV includes.
- [x] Labels are in Estonian and English.

## Spec changes

- Modified: requirement "Projects to include" in `docs/specs/cv-selection.md`: with roles
  or characteristics chosen, a CV includes only the work that matches them, read as in
  search; own projects are left out while characteristics are chosen.
- Added: scenario `cv-selection.filtered-by-role`: given a person who was an architect on
  one of their three projects, when an admin reads a CV filtered to Architect, then only
  that project is in.
- Added: scenario `cv-selection.filtered-by-characteristic`: given a person whose projects
  include one with X-Road, when an admin reads a CV filtered to X-Road, then only that
  project is in.
- Modified: scenario `search.make-cv` in `docs/specs/search.md`: CV selection opens with
  the same technologies, match, roles, characteristics, and period.

## Outcome

- `matchingWork` in `src/server/search/search.server.ts` is the one matching rule: it
  resolves live roles and characteristics, then runs the matching queries, which now take
  an optional `profileIds`. Search calls it for everyone; the CV read calls it for the
  chosen people and keeps the work whose ID it returns, then applies the period as
  before. The CV's own technology check in code is gone.
- When nothing live is left to filter by, search lists no one and the CV includes every
  project, since an empty filter means "all projects" there.
- `CriteriaFilter` moved from the search page to `src/components/criteria-filter.tsx`,
  now that the CV page uses it too. The CV page's technology picker also stopped offering
  to add entries, as on the search page.
- The DOCX link carries `r` and `c` as repeated keys, like `t`; task 048 reviews the two
  URL styles.
- Checked with server and component tests; not in a browser.
