# 041.2: Bundle budgets

Status: done
Depends on: task 041.1 (the `perf/` folder)

`bun run perf` builds the app and checks gzipped JS per route, gzipped CSS, and the server
bundle's size against `perf/baselines/budgets.json`, as snowtime's bundle budgets do. A
number fails when it grows by more than 1% or 200 bytes; `--update` accepts new
baselines.

## Acceptance criteria

- [x] `bun run perf` checks the budgets and prints each change, pass or fail.
- [x] A failure lists the chunks that grew.
- [x] CI runs `bun run perf`; `AGENTS.md` lists the command and the CI step.
- [x] `perf/README.md` describes the harness, the benchmark data, and how to accept a
      baseline.

## Outcome

- The measured routes come from the manifest's route tree: every route without children,
  15 today. A new page shows as `new` rather than needing an edit to the harness.
- Every page loads about 267 KB of gzipped JS, and the pages differ by about 100 bytes.
  Each route's split component chunk is about 260 bytes; the page modules sit in the
  190 KB entry chunk, because routes import `<Name>Pending` from the page file and
  `pendingComponent` isn't split. Task 053 fixes it; the budgets will show the change.
- The server manifest holds the checkout's absolute path 17 times, so the server size
  leaves it out and reads the same locally and in CI.
- Building takes about 3 seconds, so `bun run perf` always builds rather than offering
  `--no-build`. It runs `i18n:compile` first, as `check` and `test` do.
- Verified by lowering the baseline by hand: the route failed with the grown chunk listed,
  and a 100-byte CSS growth passed within the tolerance. Two runs in a row gave the same
  numbers.
- CI's numbers come from Linux and the baseline from macOS; the first CI run shows whether
  they match. If they differ beyond the tolerance, that needs a fix before 041.3.
