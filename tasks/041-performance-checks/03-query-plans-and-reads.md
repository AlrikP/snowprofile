# 041.3: Query plans and reads

Status: done
Depends on: task 041.1 (the benchmark data), task 041.2 (`bun run perf`)

`bun run perf` also runs the project list, project page, search, and CV read against the
benchmark database. It records every statement they send, explains each one, and counts
the rows and bytes they return, against committed baselines. Search and the CV read take
`DEMO_NOW`'s date as today, so periods that end "now" read the same on any day.

## Acceptance criteria

- [x] A plan fails on a new table scan of `participation`, `project`, or their link
      tables, or a temporary B-tree; other plan changes print as notes.
- [x] Rows fail when they grow; bytes when they grow by more than 1% or 200 bytes.
- [x] Timings print, ungated.
- [x] `perf/README.md` describes both checks.

## Outcome

- No clock shim was needed: `search` and `cv` take `today` as a parameter, and no SQL reads
  the clock. Pages (041.4) still need one in the browser and the server.
- 11 calls (`perf/checks/calls.ts`); the plan and read checks share them. The work tables
  watched for scans include `own_project` and its link tables, which search and the CV
  read use as much as participations.
- Every statement uses an index today: no scan of any table. The baseline holds 57
  temporary B-trees, nearly all for `ORDER BY`; only new ones fail. A unit test covers the
  scan rule with Drizzle's aliases, since no real plan exercises it yet.
- The project list returns 2,620 rows and 292 KB of JSON for 300 projects, for the admin
  and an employee alike, and the CV of 50 people 444 KB. 041.4 shows what that does to
  the pages; nothing here acts on it.
- The recorder uses a plain libSQL client rather than `openDatabase`: the app's client
  queues each statement behind the last, and a recording `execute` waited for its own
  turn and hung.
- Verified by editing the baselines: one fewer row failed the read, and one fewer temporary
  B-tree failed the plan with a note. Two runs in a row gave the same numbers. A run takes
  about 3 seconds.
