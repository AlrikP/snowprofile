# 041.2: Bundle budgets

Status: todo
Depends on: task 041.1 (the `perf/` folder)

`bun run perf` builds the app and checks gzipped JS per route, gzipped CSS, and the server
bundle's size against `perf/baselines/budgets.json`, as snowtime's bundle budgets do. A
number fails when it grows by more than 1% or 200 bytes; `--update` accepts new
baselines.

## Acceptance criteria

- [ ] `bun run perf` checks the budgets and prints each change, pass or fail.
- [ ] A failure lists the chunks that grew.
- [ ] CI runs `bun run perf`; `AGENTS.md` lists the command and the CI step.
- [ ] `perf/README.md` describes the harness, the benchmark data, and how to accept a
      baseline.
