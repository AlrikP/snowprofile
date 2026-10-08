# 053: Split page code out of the entry chunk

Status: done

Every page loads about 267 KB of gzipped JS, and the pages differ by about 100 bytes
(`perf/baselines/budgets.json`, task 041.2). The entry chunk holds 190 KB of it, including
every feature's page. Each route file imports `<Name>Pending` from its page file for
`pendingComponent`. TanStack Router's automatic code splitting moves `component` into its
own chunk but leaves `pendingComponent` in the route definition, which the entry chunk
loads, so the whole page module comes with it.

Options:

- Split `pendingComponent` too, through the router plugin's `codeSplittingOptions`.
- Move each `<Name>Pending` into its own file, and update the convention in `AGENTS.md`.

## Acceptance criteria

- [x] A page's own code loads with its route, not with the entry: the routes' JS budgets
      differ by their pages, and the entry chunk shrinks.
- [x] The pending components still show while a loader waits.
- [x] `bun run perf --update` records the new budgets, and the commit gives the before
      and after numbers.

## Outcome

- The first option: `vite.config.ts` passes `codeSplittingOptions.defaultBehavior` with
  `component` and `pendingComponent` in one group. The router plugin's type comment says
  its default already splits `pendingComponent`; its code
  (`defaultCodeSplitGroupings`) doesn't. One group, not two, so a page and its pending
  state arrive in one request. No convention changed.
- Gzipped JS per route went from 266–267 KB to 154–235 KB: the organization pages lose
  12–20%, and sign-in, no-access, and the invitation page 32–42%. The entry chunk went
  from 190,666 to 104,899 bytes. The server bundle grew 0.7%.
- A new e2e test delays the server functions past the router's `pendingMs`, navigates to
  search, and sees the pending state, then the page.
- `bun run perf --update` writes `plans.json` in a layout `oxfmt` rewrites; format the
  baselines after updating them.
