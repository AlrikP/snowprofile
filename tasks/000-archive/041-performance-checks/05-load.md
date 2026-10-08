# 041.5: Server load

Status: done
Depends on: task 041.4 (signing in to the served build)

`bun run perf:load` signs in as the benchmark admin over HTTP and reports response times,
requests per second, and CPU per request for the projects, search, and CV pages. Nothing
is gated.

## Acceptance criteria

- [x] It reports p50 and p95 one request at a time, and requests per second with 10 in
      flight.
- [x] `AGENTS.md` and `perf/README.md` describe it.

## Outcome

- One run on this laptop (Apple Silicon, 2026-10-08), p50 one at a time and requests per
  second with 10 in flight: projects 23 ms and 52/s, project 4 ms and 280/s, search 11 ms
  and 113/s, CV of 10 people 10 ms and 106/s. RSS ended at 290 MB, peaking at 376 MB.
- The projects page costs about 23 to 33 ms of server CPU per request, three times the
  others: it renders all 300 projects (task 041.4's 1.25 MB of HTML).
- Left out from snowtime: `--executable` for a compiled binary, which this app doesn't
  build, and `--url`/`--pid` for a running server, which the Hetzner server task can add
  when there is one to measure.
- `benchmarkPages` moved to `perf/lib/inputs.ts`, so both harnesses load the same pages;
  the page check's baseline still passed after the move.
