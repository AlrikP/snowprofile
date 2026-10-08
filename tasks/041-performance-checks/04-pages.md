# 041.4: Page checks

Status: todo
Depends on: task 041.2 (the production build the harness serves)

`bun run perf:pages` loads the projects, search, and CV pages of the production build in
Chrome, signed in as the benchmark admin, with the browser's clock at `DEMO_NOW`.

## Acceptance criteria

- [ ] It gates HTML bytes, JS and CSS bytes, and DOM nodes against
      `perf/baselines/pages.json`, and `--update` accepts new ones.
- [ ] It reports hydration time and long tasks without gating them.
- [ ] `AGENTS.md` and `perf/README.md` describe it.
