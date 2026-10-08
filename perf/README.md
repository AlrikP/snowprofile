# Performance checks

Checks that measure what the app sends and what the server reads, so a change shows its
effect in numbers (task 041). They follow snowtime's `perf/`.

| Command        | Needs           | Measures                                 |
| -------------- | --------------- | ---------------------------------------- |
| `bun run perf` | Nothing but Bun | Gzipped JS per route, CSS, server bundle |

## Gated and reported

No machine gives stable timings, so the checks fail only on numbers that don't depend on
the machine: bytes, rows, query plans, and DOM nodes. Timings are printed, never gated.
Committed baselines hold counts only.

## The benchmark data

The checks that read data use the demo organizations plus a larger benchmark organization
(`benchmarkOrganization` in `src/db/seed.ts`): 300 projects, 60 people, and 885
participations. `db:seed` never adds it. `perf/lib/database.ts` seeds both into
`perf/.cache/benchmark-<hash>.db` and reuses the file until the seed, the generator, the
schema, or the migrations change. Seeding takes under a second.

The generator dates everything from a fixed moment, `DEMO_NOW` (2026-09-01), so the counts
are the same on any day. Every generated user signs in with the seed password;
`USERS.admin` and `USERS.employee` in `perf/lib/database.ts` name the benchmark admin and
an employee.

## Quick checks: `bun run perf`

Builds the app (about 3 seconds), copies the build to `perf/.cache/build`, and checks it
against `perf/baselines/budgets.json`. CI runs it after the build. JS and CSS are gzipped
at level 9.

| Number       | How it's measured                                                          |
| ------------ | -------------------------------------------------------------------------- |
| JS per route | The entry, the route's and its parents' preloads, and their static imports |
| CSS          | Every stylesheet                                                           |
| Server bytes | The server build without `server/node_modules`, the traced native packages |

A number fails when it grows by more than 1% or 200 bytes, whichever is larger. A number
that shrinks never fails. Each run prints every number with its change.

- **Routes** are the page routes in TanStack Start's manifest in the server build: every
  route without children. A new page shows as `new` and doesn't fail. A dynamic
  `import()` is its own lazy load and isn't counted.
- **Server bytes** leave out the checkout's absolute path, which the manifest holds, so
  the number is the same on a laptop and in CI.
- **A failure** lists the chunks that grew. A feature's own chunk growing is expected;
  growth in a chunk that every route loads, such as the entry, deserves a look.

## Update a baseline on purpose

When a change moves a number for a reason you accept, or an optimization lowers one,
rewrite the baseline and commit it with the change, saying why in the commit:

```sh
bun run perf --update
```
