# 054: Projects list size

Status: todo

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

## Acceptance criteria

- [ ] The chosen option, agreed together with task 050's, is recorded in this task before
      the work starts, with a target for the projects page's HTML bytes and DOM nodes at
      the benchmark's 300 projects.
- [ ] `bun run perf:pages` meets that target, and `perf/baselines/pages.json` holds the
      new numbers.
- [ ] The name, customer, and "only mine" filters and the project count still cover
      every live project, including those not shown at first.

## Spec changes

To decide with the option; likely a modified `projects.list` scenario in
`docs/specs/projects.md`, and `projects.only-mine` if the filters move to the server.
