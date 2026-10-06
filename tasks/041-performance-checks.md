# 041: Performance checks

Status: todo
Depends on: task 029.1 (project pages), task 035 (search), task 036 (the CV read)

Measure what the app sends and what the server reads, so a change shows its effect in
numbers. Follow snowtime's `perf/` (its `perf/README.md`): gate only counts that don't
depend on the machine (bytes, rows, query plans, DOM nodes), and print timings without
gating them. Start once the first features exist; the list of hot paths grows with them.

## Acceptance criteria

- [ ] Benchmark data: the demo generator also builds a larger organization (for example
      60 people, 300 projects, and their participations) against a fixed moment
      (`SEED_NOW`), so counts are the same on any day. It's seeded into a cached database
      that is rebuilt when the seed, schema, or migrations change.
- [ ] `bun run perf` builds the app and checks, against committed baselines: gzipped JS
      per route and CSS, the server bundle's size, `EXPLAIN QUERY PLAN` of the project
      list, project page, search, and CV read (fails on a new table scan of
      `participation`, `project`, or their link tables, or a temporary B-tree), and rows
      and bytes those reads return. `--update` accepts new baselines.
- [ ] `bun run perf:pages` loads the projects, search, and CV pages of the production build
      in Chrome, signed in as the benchmark admin, and gates HTML bytes, JS and CSS bytes,
      and DOM nodes; it reports hydration time and long tasks.
- [ ] `bun run perf:load` reports response times and requests per second for the same
      pages, without gating.
- [ ] CI runs `bun run perf`; `AGENTS.md` lists the commands and the CI step.
- [ ] A `perf/README.md` describes the harnesses, the benchmark data, and how to accept a
      baseline.
