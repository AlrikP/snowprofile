# 041.5: Server load

Status: todo
Depends on: task 041.4 (signing in to the served build)

`bun run perf:load` signs in as the benchmark admin over HTTP and reports response times,
requests per second, and CPU per request for the projects, search, and CV pages. Nothing
is gated.

## Acceptance criteria

- [ ] It reports p50 and p95 one request at a time, and requests per second with 10 in
      flight.
- [ ] `AGENTS.md` and `perf/README.md` describe it.
