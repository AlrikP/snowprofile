# Performance checks

Checks that measure what the app sends and what the server reads, so a change shows its
effect in numbers (task 041). They follow snowtime's `perf/`.

| Command        | Needs           | Measures                                                 |
| -------------- | --------------- | -------------------------------------------------------- |
| `bun run perf` | Nothing but Bun | Bundle budgets, query plans, and rows and bytes of reads |

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

Builds the app (about 3 seconds), copies the build to `perf/.cache/build`, and runs three
checks against the files in `perf/baselines/`. A run takes about 4 seconds with a seeded
database. CI runs it after the build.

| Check          | Measures                                                         | Fails when                                                 |
| -------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| Bundle budgets | Gzipped JS per route, gzipped CSS, and the server bundle's size  | A number grows by more than 1% or 200 bytes                |
| Query plans    | `EXPLAIN QUERY PLAN` of every statement the hot reads run        | A call gains a scan of a work table or a `USE TEMP B-TREE` |
| Reads          | Rows the statements return and bytes of the result, per hot read | Rows grow, or bytes grow by more than 1% or 200 bytes      |

A number that shrinks never fails. Each check prints every number with its change.

### Bundle budgets

JS and CSS are gzipped at level 9.

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

### Hot reads

`perf/checks/calls.ts` lists the reads both data checks run, on the benchmark organization
and with `DEMO_NOW` as today: the project list and the busiest project's page, as the admin
and as an employee; search by one technology, by all of three since 2022, and by a role
and a characteristic with leavers; and the CV read for one person, a team of 10 (also
filtered by a technology), and 50 people, the most a CV takes. Inputs come from the
generated data, so they are the same on any day. The calls run the rules in `*.server.ts`
on a copy of the benchmark database, `perf/.cache/check.db`, through a plain libSQL client
that records every statement.

### Query plans

The check explains each distinct statement a call runs, and stores the plans in
`perf/baselines/plans.json`. It fails when a call has more scans of a work table than its
baseline, or more temporary B-trees. The work tables are `project`, `participation`,
`own_project`, and their link tables; a scan under an alias Drizzle gives the table counts,
and so does a scan through a covering index, which still reads every row. Any other plan
change prints as a note.

### Reads

Rows are the rows the statements returned, not the rows SQLite visited, which libSQL
doesn't expose. Bytes are the result as JSON. The time per call is the median of 5 runs
after one warm-up, printed and never gated.

## Update a baseline on purpose

When a change moves a number for a reason you accept, or an optimization lowers one,
rewrite the baseline and commit it with the change, saying why in the commit:

```sh
bun run perf --update
```
