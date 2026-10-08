# 041: Performance checks

Status: done
Depends on: task 029.1 (project pages), task 035 (search), task 036 (the CV read)

Measure what the app sends and what the server reads, so a change shows its effect in
numbers. Follow snowtime's `perf/` (its `perf/README.md`): gate only counts that don't
depend on the machine (bytes, rows, query plans, DOM nodes), and print timings without
gating them. Start once the first features exist; the list of hot paths grows with them.

## Acceptance criteria

- [x] Benchmark data: the demo generator also builds a larger organization (for example
      60 people, 300 projects, and their participations) against a fixed moment
      (`SEED_NOW`), so counts are the same on any day. It's seeded into a cached database
      that is rebuilt when the seed, schema, or migrations change.
- [x] `bun run perf` builds the app and checks, against committed baselines: gzipped JS
      per route and CSS, the server bundle's size, `EXPLAIN QUERY PLAN` of the project
      list, project page, search, and CV read (fails on a new table scan of
      `participation`, `project`, or their link tables, or a temporary B-tree), and rows
      and bytes those reads return. `--update` accepts new baselines.
- [x] `bun run perf:pages` loads the projects, search, and CV pages of the production build
      in Chrome, signed in as the benchmark admin, and gates HTML bytes, JS and CSS bytes,
      and DOM nodes; it reports hydration time and long tasks.
- [x] `bun run perf:load` reports response times and requests per second for the same
      pages, without gating.
- [x] CI runs `bun run perf`; `AGENTS.md` lists the commands and the CI step.
- [x] A `perf/README.md` describes the harnesses, the benchmark data, and how to accept a
      baseline.

## Subtasks

1. `01-benchmark-data.md`: the larger organization and its cached database.
2. `02-bundle-budgets.md`: `bun run perf` with bundle budgets, in CI.
3. `03-query-plans-and-reads.md`: query plans and read sizes in `bun run perf`.
4. `04-pages.md`: `bun run perf:pages`.
5. `05-load.md`: `bun run perf:load`.

## Outcome

- `perf/README.md` describes the three harnesses; each subtask's Outcome has its findings.
- The benchmark's fixed moment is the generator's `DEMO_NOW`, not a new `SEED_NOW`.
- The numbers point at two costs: every page loads the same 267 KB of JS, because page
  code lands in the entry chunk (task 053), and the projects page renders all 300 projects
  into 1.25 MB of HTML and 4,717 DOM nodes, at three times the server CPU of the others.
  The second has no task yet.
- `bun run perf` runs in CI; `perf:pages` and `perf:load` run by hand.
