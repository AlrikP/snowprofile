# 048: Review how URLs encode search params

Status: todo

Pages keep their filters and selections in the URL, so a search or a CV can be shared and
reloaded. The router uses TanStack Router's default encoding, with no `stringifySearch`
or `parseSearch` in `src/router.tsx`: each value that isn't a plain string becomes
percent-encoded JSON. A team CV's URL reads:

```
/rabasaare/cvs?people=%5B%2201a05c32-…%22%2C%2201a05c32-…%22%5D
```

That is `people=["01a05c32-…","01a05c32-…"]`. A string that would parse as JSON gets
quotes, so a year reads `from=%222019%22`. The URLs work, but they are hard to read, edit,
or paste into a ticket.

The app also uses a second style. The DOCX download link (`cvDocumentHref` in
`src/server/cvs/cvs.schemas.ts`, read in `src/server/cvs/cv-document.server.ts`) builds
its URL by hand, with one key per value: `people=a&people=b`.

The app isn't in use yet, so no existing link needs to keep working.

## Where search params are used

- `/$organization/search`: `t`, `match`, `r`, `c`, `from`, `to`, and `leavers`
  (`src/lib/search-filters.ts`).
- `/$organization/cvs`: the search keys plus `people`, `lang`, `birth`, and `layout`
  (`src/features/cvs/cv-selection.ts`).
- `/$organization/profile`: `participation`, the participation a project page links to.
- `/sign-in`: `error` and `redirect`.
- The CV download route: the CV read's input, built by `cvDocumentHref`.

## Options to discuss

- **Keep the default JSON.** No code to own. URLs stay unreadable, and there are still two
  styles unless the download link switches to JSON too.
- **Repeated keys:** `people=a&people=b&leavers=true`. The common web convention, which
  `URLSearchParams` reads natively and the download link already uses. Needs a custom
  `parseSearch` and `stringifySearch`, and every reader must accept one value or several.
- **Comma-separated lists:** `people=a,b`. Shortest and most readable. Needs the same
  custom functions, and values must never contain a comma; IDs and period dates don't.
- **Bracket keys:** `people[]=a&people[]=b`, as `qs` writes them. Familiar from other
  stacks, but noisier, and it adds a dependency or hand-written parsing.

Questions to settle alongside the format:

- How booleans read: `leavers=true`, `leavers=1`, or a bare `leavers`.
- Whether period dates and other strings ever need quoting.
- Whether the router and `cvDocumentHref` share one serializer, so the two can't drift.
- How long a team CV's URL can get with 50 people (`CvInput`'s limit), about 1.9 KB of
  IDs, and whether that matters.

## Acceptance criteria

- [ ] The chosen scheme and the reasons are recorded in `docs/architecture.md`.
- [ ] Every route above and the download link use it, through one shared serializer.
- [ ] Each page's reader still drops a value it can't read and keeps the rest, as
      `readSearchFilters` and `readCvSelection` do now.
- [ ] Tests cover a round trip for each page's params, including lists of one and of
      several, booleans, and period dates.
- [ ] The "Make CV" link and the download link open the same selection, checked by a test.
