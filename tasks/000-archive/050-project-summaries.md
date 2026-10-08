# 050: Technologies and characteristics in project summaries

Status: done

The projects page (`src/features/projects/projects-page.tsx`) shows each project as one
table row: name, customer, period, technologies, and people. The technologies column
shows the first three (`SHOWN_TECHNOLOGIES`) and a "+N more" badge, and hides below the
`lg` breakpoint. Characteristics don't show at all, so a reader has to open each project
to see its solution, though that is often what they are looking for when preparing a
tender.

This task explores how to show a project's full technology list and its characteristics
wherever a project's summary line appears, and builds the chosen option.

## Where project summaries appear

- The projects page table: every member.
- Search results (`src/features/search/search-page.tsx`): a person's matching work, with
  the participation's own technologies and, since task 046, the chosen characteristics.
- "My profile" participations and own projects (`src/features/profile/profile-page.tsx`):
  the participation's own technologies, all of them.
- The project page itself already shows everything, so it is the reference.

## Options to discuss

- **Expandable row:** a toggle on each row opens a panel under it with every technology,
  grouped by category, and the characteristics answered yes. Keeps the table compact, and
  works on narrow screens, where the technologies column is hidden today.
- **Characteristic icons:** a small icon per yes answer in its own column, with the name in
  a tooltip and an accessible label. Compact, but needs an icon per characteristic, which
  admins define freely, so it may fall back to initials or a count.
- **Count badges with a popover:** "+5 more" and "4 characteristics" open a popover with
  the full lists. Small change, but popovers are harder on touch and for screen readers.
- **Card list instead of a table:** each project as a card with every technology and
  characteristic as badges, like the search results. Shows everything, but the list gets
  long, and sorting by column goes away.
- **Filter by characteristic on the projects page:** related, not required: the list
  could take the same characteristic checklist as search (`CriteriaFilter`).

## Questions to settle

- Who sees characteristics in the list. The project page shows them to every member, but
  the notes are internal (`project_section_criteria_hint`), so the list must leave notes
  out unless only admins see it.
- Whether "no" answers and unanswered characteristics show, or only "yes".
- Whether the list query (`listProjects` and `getProjects`) returns the answers for every
  project, and its cost at the sizes task 041 checks.
- Whether search results and profile items use the same component as the project list.

## Decision

Decided with the user on 2026-10-08, together with task 054:

- **Expandable row, on the projects page only.** A toggle beside the name opens a row
  under it with every technology, grouped by category in the catalogue's order, and the
  characteristics answered yes. Search results and profile items already show all of a
  participation's technologies, so they don't change.
- **Read when opened,** from the project page's query (`getProject`) and the technology
  catalogue, not added to the list query. The list stays as light as task 054 made it,
  and opening a row warms the project page's cache.
- **Only "yes" answers, and no notes.** The summary shows nothing the project page doesn't
  show the same member; notes stay on the project page.

## Acceptance criteria

- [x] The chosen option, and where it applies, is agreed and recorded in the task before
      the work starts.
- [x] Every technology and every "yes" characteristic of a project can be seen from its
      summary, on wide and narrow screens, with a keyboard and a screen reader.
- [x] Notes stay where they are visible today.
- [x] Component tests cover the summary in each place it applies.

## Spec changes

- Modified: "Every member sees the projects" in `docs/specs/projects.md` says a member can
  open a row to see its technologies by category and its "yes" characteristics. Added
  scenario `projects.summary-opened`.

## Outcome

- The toggle is a native `<button>` with `aria-expanded`, `aria-controls`, and a label
  naming the project, so it works by keyboard and exposes its state; not tried with a
  screen reader. Checked in Chromium at 1280 and 390 pixels wide; the summary row spans
  every column, so it shows the technologies that narrow screens hide.
- The toggle is one element per row with a text chevron, positioned in the cell's
  padding. A shadcn `Button` with a Lucide icon and wrappers added 28 KB of HTML and 253
  DOM nodes at 50 rows; this one adds 15 KB and 53. The page is at 329 KB and 1,021 DOM
  nodes, just over task 054's 1,000.
- Tests: `projects.summary-opened` in the component tests (categories, yes only, no
  notes, closing again, and no read until opened) and in the e2e suite as an employee.
