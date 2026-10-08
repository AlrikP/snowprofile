# 054: Projects list size

Status: done

The projects page (`src/features/projects/projects-page.tsx`) renders every project of the
organization. At the benchmark's 300 projects that is 1.25 MB of HTML (61 KB gzipped) and
4,717 DOM nodes. It hydrates in about 940 ms at a 4× CPU slowdown and costs 23 to 33 ms of
server CPU per request, three times the other pages (tasks 041.4 and 041.5). The list
grows with every project the company records.

Task 050 changes what each row of the same page shows, so decide the two together.

## Options to discuss

- **Pagination:** the server returns one page of projects at a time, with the page in the
  URL (task 048). Smallest HTML and query, but the name, customer, and "only mine"
  filters, the customer list, and the project count then come from the server.
- **A lighter list query:** the list reads only the columns and counts a row shows. Cuts
  the read and the HTML per row, but the page still grows with the project count.
- **Rendering fewer rows at once:** a virtualized list, or showing the first rows with a
  "Show more" button. Keeps the filters on the client, but the loader still sends every
  project.

## Decision

Decided with the user on 2026-10-08, together with task 050's expandable row:

- Technology chips are plain spans, not `Badge`, whose interactive styles were about
  600 bytes of each row's 3 KB of HTML per chip.
- The list query leaves out the descriptions; nothing reads them.
- The page renders the first 50 matching projects and 50 more per "Show more". The data
  stays on the client, so the filters and the count cover every project.
- Target at the benchmark's 300 projects: well under 200 KB of HTML and under 1,000 DOM
  nodes.

## Acceptance criteria

- [x] The chosen option, agreed together with task 050's, is recorded in this task before
      the work starts, with a target for the projects page's HTML bytes and DOM nodes at
      the benchmark's 300 projects.
- [x] `bun run perf:pages` meets that target, and `perf/baselines/pages.json` holds the
      new numbers. DOM nodes met it (968; task 050 took it to 1,021, which the user
      accepted). HTML, at 314 KB, didn't; the user accepted it on 2026-10-08 (Outcome).
- [x] The name, customer, and "only mine" filters and the project count still cover
      every live project, including those not shown at first.

## Spec changes

- Modified: "Every member sees the projects" in `docs/specs/projects.md` says the page
  shows the first 50 matching projects and more on request. Added scenario
  `projects.show-more`.

## Outcome

- At 300 projects: HTML from 1,252,800 to 314,158 bytes (61 KB to 34 KB gzipped), DOM
  nodes from 4,721 to 968, hydration from about 800 ms to 570 ms at a 4× slowdown. Server
  CPU per request with 10 in flight from about 23 ms to 15 ms, and 52 to 74 requests per
  second (`perf:load`). The list read is 29% smaller.
- The rows are now the smaller part. About 210 KB of the HTML is the list data sent with
  the page, mostly every project's technologies with their IDs. The participation dialog
  uses the same list to prefill a new participation's technologies.
- Accepted at 314 KB rather than trimming the list data: it is 34 KB gzipped, and the DOM
  and server CPU were the real cost. A lighter read for this page alone (the first three
  technology names and a count) would bring it to roughly 150 KB.
