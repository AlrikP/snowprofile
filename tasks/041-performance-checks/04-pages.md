# 041.4: Page checks

Status: done
Depends on: task 041.2 (the production build the harness serves)

`bun run perf:pages` loads the projects, search, and CV pages of the production build in
Chrome, signed in as the benchmark admin, with the browser's clock at `DEMO_NOW`.

## Acceptance criteria

- [x] It gates HTML bytes, JS and CSS bytes, and DOM nodes against
      `perf/baselines/pages.json`, and `--update` accepts new ones.
- [x] It reports hydration time and long tasks without gating them.
- [x] `AGENTS.md` and `perf/README.md` describe it.

## Outcome

- Four pages: the projects list, the busiest project, search by one technology, and the CV
  page for 10 people, opened with the inputs the read checks use (`perf/lib/inputs.ts`).
- Hydration is React's first commit, read through a stub of its DevTools hook, which
  production builds call too. Snowtime's Solid marker doesn't exist in React.
- It uses Playwright's Chromium, which the end-to-end tests already install, rather than
  snowtime's installed Chrome. CI doesn't run it, as the task asked only for `bun run perf`
  there.
- The projects page sends 1.25 MB of HTML (61 KB gzipped) and has 4,717 DOM nodes for 300
  projects, and hydrates in about 940 ms at a 4× slowdown, twice the other pages. Every
  page loads the same 267 KB of JS (task 053).
- Three runs in a row gave identical sizes. Screenshots of the search, CV, and projects
  pages showed the benchmark data, not an error page.
- The server's log stays in `perf/.cache/server-<port>.log` for a failed run.
