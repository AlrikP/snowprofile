# 053: Split page code out of the entry chunk

Status: todo

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

- [ ] A page's own code loads with its route, not with the entry: the routes' JS budgets
      differ by their pages, and the entry chunk shrinks.
- [ ] The pending components still show while a loader waits.
- [ ] `bun run perf --update` records the new budgets, and the commit gives the before
      and after numbers.
