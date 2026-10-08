# 041.3: Query plans and reads

Status: todo
Depends on: task 041.1 (the benchmark data), task 041.2 (`bun run perf`)

`bun run perf` also runs the project list, project page, search, and CV read against the
benchmark database. It records every statement they send, explains each one, and counts
the rows and bytes they return, against committed baselines. The server's clock is set
to `DEMO_NOW`, so periods that end "now" read the same on any day.

## Acceptance criteria

- [ ] A plan fails on a new table scan of `participation`, `project`, or their link
      tables, or a temporary B-tree; other plan changes print as notes.
- [ ] Rows fail when they grow; bytes when they grow by more than 1% or 200 bytes.
- [ ] Timings print, ungated.
- [ ] `perf/README.md` describes both checks.
